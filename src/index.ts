#!/usr/bin/env node
import { Command } from 'commander'
import { loadCatalog, summarizeCatalog } from './catalog.js'
import { categoryDiagnostics } from './category-resolver.js'
import { hulyConnectionFromEnv } from './config.js'
import { connectHuly } from './huly.js'
import { buildImportPlan, executeImportPlan } from './importer.js'

function printSummary(summary: Record<string, number>): void {
  const rows = Object.entries(summary).sort(([a], [b]) => a.localeCompare(b))
  const width = Math.max(...rows.map(([name]) => name.length), 8)
  for (const [name, count] of rows) {
    console.log(`${name.padEnd(width)}  ${String(count).padStart(3)}`)
  }
}

const program = new Command()
  .name('huly-skills-importer')
  .description('Discover and populate Huly Recruiting skills using the official Huly API client.')
  .version('0.1.0')

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
  })

program
  .command('discover')
  .description('List Huly skill categories visible to the configured account/workspace.')
  .option('--json', 'print JSON instead of a table')
  .action(async (options: { json?: boolean }) => {
    const adapter = await connectHuly(hulyConnectionFromEnv())
    try {
      const categories = await adapter.listCategories()
      const diagnostics = categoryDiagnostics(categories)

      if (options.json) {
        console.log(JSON.stringify(diagnostics, null, 2))
        return
      }

      console.log(`Found ${diagnostics.length} category records\n`)
      for (const category of diagnostics) {
        console.log(`Label:       ${String(category.label) || '(empty)'}`)
        console.log(`ID:          ${String(category.id)}`)
        console.log(`Target class:${String(category.targetClass)}`)
        console.log(`Default:     ${String(category.default)}`)
        console.log(`Sample tags: ${(category.sampleTags as string[]).join(', ') || '(none)'}`)
        console.log('')
      }
    } finally {
      await adapter.close()
    }
  })

program
  .command('import')
  .description('Import missing skills from a YAML catalogue.')
  .argument('[catalog]', 'catalogue YAML file', 'skills/import-skills.yaml')
  .option('--dry-run', 'show planned changes without writing to Huly', false)
  .option('--update-existing', 'synchronize description/category/color for existing skills', false)
  .action(async (
    catalogPath: string,
    options: { dryRun: boolean; updateExisting: boolean }
  ) => {
    const catalog = await loadCatalog(catalogPath)
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
