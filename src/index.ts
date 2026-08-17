#!/usr/bin/env node
import { Command } from 'commander'
import { auditWorkspace } from './audit.js'
import { catalogWarnings, loadCatalog, summarizeCatalog, writeCatalog } from './catalog.js'
import { loadCatalogSet, mergeCatalogs } from './catalog-set.js'
import { categoryDiagnostics } from './category-resolver.js'
import { listBundledCatalogues } from './catalogues.js'
import { hulyConnectionFromEnv } from './config.js'
import { connectHuly } from './huly.js'
import { inspectWorkspace } from './inspector.js'
import { buildImportPlan, executeImportPlan } from './importer.js'
import { collectSuggestions, exportSuggestionsCatalog, summarizeSuggestions } from './suggestions.js'
import { exportWorkspaceCatalog } from './workspace-export.js'
import type { SkillCatalog, SkillUpdateChange } from './types.js'

function printSummary(summary: Record<string, number>): void {
  const rows = Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))
  if (rows.length === 0) return
  const width = Math.max(...rows.map(([name]) => name.length), 8)
  for (const [name, count] of rows) {
    console.log(`${name.padEnd(width)}  ${String(count).padStart(3)}`)
  }
}

function printCatalogWarnings(warnings: string[]): void {
  if (warnings.length === 0) return
  console.log('\nWarnings')
  for (const warning of warnings) console.log(`- ${warning}`)
}

function formatChangeValue(value: string | number): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

function printChanges(changes: SkillUpdateChange[]): void {
  for (const change of changes) {
    console.log(`    ${change.field}: ${formatChangeValue(change.from)} -> ${formatChangeValue(change.to)}`)
  }
}

async function loadOneOrMergedCatalog(paths: string[]): Promise<SkillCatalog> {
  if (paths.length === 1) return await loadCatalog(paths[0]!)
  const sources = await loadCatalogSet(paths)
  return mergeCatalogs(sources)
}

const program = new Command()
  .name('huly-skills-importer')
  .description('Community CLI for controlled Huly Recruiting skill taxonomies.')
  .version('0.4.1')

program
  .command('catalogues')
  .description('List bundled industry catalogues and verify shared skill definitions.')
  .option('--json', 'print machine-readable JSON')
  .action(async (options: { json?: boolean }) => {
    const result = await listBundledCatalogues()

    if (options.json) {
      console.log(JSON.stringify(result, null, 2))
      if (result.definitionConflicts > 0) process.exitCode = 2
      return
    }

    console.log('Bundled industry skill catalogues')
    console.log('---------------------------------')
    console.log(`Industry catalogues:             ${result.catalogues.length}`)
    console.log(`Industry skill entries:          ${result.totalSkillEntries}`)
    console.log(`Industry unique normalized names:${result.uniqueNormalizedSkills}`)
    console.log(`All bundled skill entries:       ${result.allBundledSkillEntries}`)
    console.log(`All bundled unique names:        ${result.allBundledUniqueNormalizedSkills}`)
    console.log(`Shared normalized skills:        ${result.sharedNormalizedSkills}`)
    console.log(`Definition conflicts:            ${result.definitionConflicts}`)
    console.log('')

    const width = Math.max(...result.catalogues.map((catalog) => catalog.file.length), 4)
    for (const catalog of result.catalogues) {
      console.log(
        `${catalog.file.padEnd(width)}  ` +
        `${String(catalog.skills).padStart(3)} skills  ` +
        `${String(catalog.usedCategories).padStart(2)} categories  ` +
        `${String(catalog.otherSkills).padStart(2)} Other`
      )
    }

    if (result.definitionConflicts > 0) {
      console.log('\nERROR: bundled catalogues disagree about shared skill definitions.')
      process.exitCode = 2
    }
  })

program
  .command('check')
  .description('Validate a YAML skill catalogue without connecting to Huly.')
  .argument('[catalog]', 'catalogue YAML file', 'skills/import-skills.yaml')
  .action(async (catalogPath: string) => {
    const catalog = await loadCatalog(catalogPath)
    console.log(`Catalogue: ${catalog.name}`)
    console.log(`Skills:    ${catalog.skills.length}`)
    console.log(`Categories:${Object.keys(catalog.categories).length}`)
    console.log('')
    printSummary(summarizeCatalog(catalog))
    printCatalogWarnings(catalogWarnings(catalog))
  })

program
  .command('merge')
  .description('Merge compatible YAML catalogues into one deduplicated catalogue.')
  .argument('<catalogues...>', 'two or more catalogue YAML files')
  .requiredOption('-o, --output <file>', 'output YAML file')
  .option('--name <name>', 'name for the merged catalogue')
  .action(async (cataloguePaths: string[], options: { output: string; name?: string }) => {
    if (cataloguePaths.length < 2) throw new Error('merge requires at least two catalogue files')
    const sources = await loadCatalogSet(cataloguePaths)
    const catalog = mergeCatalogs(sources, { name: options.name })
    await writeCatalog(options.output, catalog)
    console.log(`Merged ${cataloguePaths.length} catalogues into ${options.output}`)
    console.log(`Unique skills: ${catalog.skills.length}`)
  })

program
  .command('discover')
  .description('Discover Recruiting categories, built-in suggestions and materialized skill counts.')
  .option('--json', 'print JSON instead of human-readable output')
  .action(async (options: { json?: boolean }) => {
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const [categories, skills] = await Promise.all([
        adapter.listCategories(),
        adapter.listSkills()
      ])
      const diagnostics = categoryDiagnostics(categories)
      const builtInSuggestions = categories.reduce(
        (total, category) => total + (Array.isArray(category.tags) ? category.tags.length : 0),
        0
      )

      if (options.json) {
        console.log(JSON.stringify({
          categories: diagnostics.length,
          builtInSuggestions,
          materializedSkills: skills.length,
          records: diagnostics
        }, null, 2))
        return
      }

      console.log('Huly Recruiting discovery')
      console.log('-------------------------')
      console.log(`Categories:            ${diagnostics.length}`)
      console.log(`Built-in suggestions:  ${builtInSuggestions}`)
      console.log(`Materialized skills:   ${skills.length}\n`)

      for (const category of diagnostics) {
        console.log(`Label:       ${String(category.label) || '(empty)'}`)
        console.log(`ID:          ${String(category.id)}`)
        console.log(`Target class:${String(category.targetClass)}`)
        console.log(`Default:     ${String(category.default)}`)
        console.log(`Suggestions: ${String(category.builtInSuggestionCount)}`)
        console.log(`Sample:      ${(category.builtInSuggestionSample as string[]).join(', ') || '(none)'}`)
        console.log('')
      }
    } finally {
      await adapter.close()
    }
  })

program
  .command('suggestions')
  .description('Inspect or export the built-in Recruiting suggestion vocabulary.')
  .option('--all', 'print every built-in suggestion grouped by category')
  .option('--json', 'print machine-readable JSON')
  .option('--export <file>', 'export unique built-in suggestions as an importable YAML catalogue')
  .action(async (options: { all?: boolean; json?: boolean; export?: string }) => {
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const categories = await adapter.listCategories()
      const summary = summarizeSuggestions(categories)
      const suggestions = collectSuggestions(categories)

      if (options.export) {
        const exported = await exportSuggestionsCatalog(categories, options.export)
        console.log(`Exported ${exported} unique suggestion names to ${options.export}`)
        console.log(`Raw suggestion occurrences: ${summary.suggestions}`)
        console.log(`Duplicate occurrences removed: ${summary.duplicateOccurrences}`)
        return
      }

      if (options.json) {
        console.log(JSON.stringify({ summary, records: options.all ? suggestions : undefined }, null, 2))
        return
      }

      console.log('Huly built-in Recruiting suggestions')
      console.log('-------------------------------------')
      console.log(`Categories:             ${summary.categories}`)
      console.log(`Suggestion occurrences: ${summary.suggestions}`)
      console.log(`Unique normalized names:${summary.uniqueSuggestions}`)
      console.log(`Duplicate occurrences:  ${summary.duplicateOccurrences}\n`)

      for (const category of summary.byCategory) {
        console.log(`${category.label.padEnd(36)} ${String(category.count).padStart(3)}`)
      }

      if (options.all) {
        console.log('\nSuggestions')
        console.log('===========')
        for (const category of categories) {
          const tags = Array.isArray(category.tags) ? category.tags : []
          console.log(`\n${String(category.label ?? category._id)} (${tags.length})`)
          for (const suggestion of tags) console.log(`- ${suggestion}`)
        }
      }
    } finally {
      await adapter.close()
    }
  })

program
  .command('inspect')
  .description('Inspect materialized skills, candidate references, proficiency levels and optimizer risks.')
  .option('--skills', 'print the materialized skill/reference table')
  .option('--candidates', 'print candidate skill assignments')
  .option('--candidate <text>', 'show candidate assignments whose display name contains this text')
  .option('--json', 'print the complete inspection result as JSON')
  .action(async (options: { skills?: boolean; candidates?: boolean; candidate?: string; json?: boolean }) => {
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const result = await inspectWorkspace(adapter)

      if (options.json) {
        console.log(JSON.stringify(result, null, 2))
        return
      }

      console.log('Huly Recruiting workspace')
      console.log('-------------------------')
      console.log(`Categories:                  ${result.summary.categories}`)
      console.log(`Built-in suggestions:        ${result.summary.builtInSuggestions}`)
      console.log(`Materialized skills:         ${result.summary.materializedSkills}`)
      console.log(`Candidate skill references:  ${result.summary.skillReferences}`)
      console.log(`Candidates with skills:      ${result.summary.candidatesWithSkills}`)

      console.log('\nReference levels')
      console.log('----------------')
      console.log(`Unset:       ${result.levels.Unset}`)
      console.log(`Initial:     ${result.levels.Initial}`)
      console.log(`Meaningful:  ${result.levels.Meaningful}`)
      console.log(`Expert:      ${result.levels.Expert}`)
      console.log(`Unknown:     ${result.levels.Unknown}`)

      console.log('\nSkills Optimizer indicators')
      console.log('---------------------------')
      console.log(`Other-category skills:               ${result.optimizer.otherSkills}`)
      console.log(`Low-reference Other skills (<2):     ${result.optimizer.lowReferenceOtherSkills}`)
      console.log(`Materialized skills with 0 refs:     ${result.optimizer.unreferencedSkills}`)
      console.log(`Distinct expert-level skill titles:  ${result.optimizer.expertTitles}`)
      console.log(`Expert titles enabled by default*:   ${result.optimizer.expertTitlesEnabledByDefault}`)
      console.log('* Huly v0.7.426 optimizer threshold observed as at least 5 expert references.')

      if (result.optimizer.lowReferenceOtherSkills > 0) {
        console.log('\nWarning: low-reference skills in the default Other category may be proposed for cleanup/deletion by the Huly Skills Optimizer. Review the optimizer plan before applying it.')
      }

      if (options.skills) {
        console.log('\nMaterialized skills')
        console.log('===================')
        console.table(result.skills.map((row) => ({
          skill: row.skill,
          category: row.category,
          references: row.references,
          expert: row.expert,
          meaningful: row.meaningful,
          initial: row.initial,
          unset: row.unset,
          optimizerRisk: row.optimizerRisk ? 'yes' : ''
        })))
      }

      const showCandidates = options.candidates || Boolean(options.candidate)
      if (showCandidates) {
        const filter = options.candidate?.trim().toLocaleLowerCase('en-US')
        const candidates = filter
          ? result.candidates.filter((candidate) => candidate.name.toLocaleLowerCase('en-US').includes(filter))
          : result.candidates

        console.log('\nCandidate skill assignments')
        console.log('===========================')
        if (candidates.length === 0) console.log('(no matching candidates)')

        for (const candidate of candidates) {
          console.log(`\nCandidate: ${candidate.name}`)
          console.log(`ID:        ${candidate.id}`)
          console.log(`Skills:    ${candidate.skills.length}`)
          console.table(candidate.skills.map((row) => ({
            skill: row.skill,
            category: row.category,
            weight: row.weight ?? '(unset)',
            level: row.level,
            tagId: row.tagId,
            referenceId: row.referenceId
          })))
        }
      }
    } finally {
      await adapter.close()
    }
  })

program
  .command('audit')
  .description('Compare one or more catalogues with the materialized Recruiting taxonomy without writing changes.')
  .argument('[catalogues...]', 'catalogue YAML files; defaults to skills/import-skills.yaml')
  .option('--json', 'print machine-readable JSON')
  .action(async (cataloguePaths: string[], options: { json?: boolean }) => {
    const paths = cataloguePaths.length > 0 ? cataloguePaths : ['skills/import-skills.yaml']
    const catalog = await loadOneOrMergedCatalog(paths)
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const result = await auditWorkspace(adapter, catalog)
      if (options.json) {
        console.log(JSON.stringify({ catalogues: paths, ...result }, null, 2))
        return
      }

      console.log('Huly Recruiting taxonomy audit')
      console.log('------------------------------')
      console.log(`Catalogue skills:                       ${result.summary.catalogSkills}`)
      console.log(`Materialized workspace skills:          ${result.summary.materializedSkills}`)
      console.log(`Present and matching:                   ${result.summary.presentMatching}`)
      console.log(`Missing from workspace:                 ${result.summary.missing}`)
      console.log(`Divergent from catalogue:               ${result.summary.divergent}`)
      console.log(`Workspace-only skills:                  ${result.summary.workspaceOnly}`)
      console.log(`Duplicate normalized workspace names:   ${result.summary.duplicateWorkspaceNames}`)
      console.log(`Candidate skill references:             ${result.summary.candidateReferences}`)
      console.log(`References to catalogue skills:         ${result.summary.candidateReferencesToCatalog}`)
      console.log(`References to workspace-only skills:    ${result.summary.candidateReferencesToWorkspaceOnly}`)

      if (result.missing.length > 0) {
        console.log('\nMissing skills')
        for (const row of result.missing) console.log(`- ${row.skill} (${row.category})`)
      }
      if (result.divergent.length > 0) {
        console.log('\nDivergent skills')
        for (const row of result.divergent) {
          console.log(`- ${row.skill} (${row.desiredCategory})`)
          printChanges(row.changes)
        }
      }
      if (result.workspaceOnly.length > 0) {
        console.log('\nWorkspace-only skills')
        for (const row of result.workspaceOnly) {
          console.log(`- ${row.skill} (${row.category}) — ${row.references} reference(s)`)
        }
      }
      if (result.duplicateWorkspaceNames.length > 0) {
        console.log('\nDuplicate normalized workspace names')
        for (const row of result.duplicateWorkspaceNames) {
          console.log(`- ${row.normalizedName}: ${row.skills.join(', ')}`)
        }
      }
    } finally {
      await adapter.close()
    }
  })

program
  .command('export')
  .description('Export materialized Huly Recruiting skills as an importable YAML catalogue.')
  .argument('<file>', 'output YAML file')
  .action(async (outputPath: string) => {
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const count = await exportWorkspaceCatalog(adapter, outputPath)
      console.log(`Exported ${count} materialized Recruiting skills to ${outputPath}`)
    } finally {
      await adapter.close()
    }
  })

program
  .command('import')
  .description('Materialize missing Recruiting skills from a YAML catalogue.')
  .argument('[catalog]', 'catalogue YAML file', 'skills/import-skills.yaml')
  .option('--dry-run', 'show planned changes without writing to Huly', false)
  .option('--update-existing', 'synchronize title, description, category and color for existing skills', false)
  .action(async (
    catalogPath: string,
    options: { dryRun: boolean; updateExisting: boolean }
  ) => {
    const catalog = await loadCatalog(catalogPath)
    const warnings = catalogWarnings(catalog)
    const adapter = await connectHuly(hulyConnectionFromEnv())

    try {
      const plan = await buildImportPlan(adapter, catalog, { updateExisting: options.updateExisting })
      const createCount = plan.filter((item) => item.action === 'create').length
      const updateCount = plan.filter((item) => item.action === 'update').length
      const skipCount = plan.filter((item) => item.action === 'skip').length

      console.log(`Catalogue: ${catalog.name}`)
      console.log(`Requested: ${plan.length}`)
      console.log(`Create:    ${createCount}`)
      console.log(`Update:    ${updateCount}`)
      console.log(`Skip:      ${skipCount}`)
      console.log(`Mode:      ${options.dryRun ? 'DRY RUN' : 'APPLY'}`)
      printCatalogWarnings(warnings)
      console.log('')

      const summary = await executeImportPlan(adapter, plan, options.dryRun)
      console.log('\nSummary')
      console.log(`Requested: ${summary.requested}`)
      console.log(`Existing:  ${summary.existing}`)
      console.log(`Created:   ${summary.created}`)
      console.log(`Updated:   ${summary.updated}`)
      console.log(`Skipped:   ${summary.skipped}`)
      console.log(`Errors:    ${summary.errors}`)

      if (summary.errors > 0) process.exitCode = 2
    } finally {
      await adapter.close()
    }
  })

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
