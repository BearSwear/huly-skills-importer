#!/usr/bin/env node
import { Command } from 'commander'
import { catalogWarnings, loadCatalog, summarizeCatalog } from './catalog.js'
import { categoryDiagnostics } from './category-resolver.js'
import { hulyConnectionFromEnv } from './config.js'
import { connectHuly } from './huly.js'
import { inspectWorkspace } from './inspector.js'
import { buildImportPlan, executeImportPlan } from './importer.js'
import { collectSuggestions, exportSuggestionsCatalog, summarizeSuggestions } from './suggestions.js'

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

const program = new Command()
  .name('huly-skills-importer')
  .description('Community CLI for materializing and inspecting controlled Huly Recruiting skill taxonomies.')
  .version('0.3.0')

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
  .command('discover')
  .description('Discover Huly Recruiting categories, built-in suggestions and materialized skill counts.')
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
  .description('Inspect or export the built-in Recruiting suggestion vocabulary stored on Huly categories.')
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
        console.log(JSON.stringify({
          summary,
          records: options.all ? suggestions : undefined
        }, null, 2))
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
  .command('import')
  .description('Materialize missing Recruiting skills from a YAML catalogue.')
  .argument('[catalog]', 'catalogue YAML file', 'skills/import-skills.yaml')
  .option('--dry-run', 'show planned changes without writing to Huly', false)
  .option('--update-existing', 'synchronize description/category/color for existing skills', false)
  .action(async (
    catalogPath: string,
    options: { dryRun: boolean; updateExisting: boolean }
  ) => {
    const catalog = await loadCatalog(catalogPath)
    const warnings = catalogWarnings(catalog)
    const adapter = await connectHuly(hulyConnectionFromEnv())

    try {
      const plan = await buildImportPlan(adapter, catalog, {
        updateExisting: options.updateExisting
      })

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
