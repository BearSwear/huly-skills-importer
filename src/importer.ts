import type { TagElement } from '@hcengineering/tags'
import { normalize } from './catalog.js'
import { resolveCategory } from './category-resolver.js'
import type {
  HulySkillAdapter,
  ImportPlanItem,
  ImportSummary,
  SkillCatalog
} from './types.js'

export interface PlanOptions {
  updateExisting: boolean
}

export async function buildImportPlan(
  adapter: HulySkillAdapter,
  catalog: SkillCatalog,
  options: PlanOptions
): Promise<ImportPlanItem[]> {
  const [categories, existingSkills] = await Promise.all([
    adapter.listCategories(),
    adapter.listSkills()
  ])

  const existingByName = new Map<string, TagElement>()
  for (const existing of existingSkills) {
    existingByName.set(normalize(existing.title), existing)
  }

  const resolvedCategories = new Map<string, { id: string; label: string }>()
  const unresolved = new Set<string>()

  for (const requested of Object.keys(catalog.categories)) {
    const resolved = resolveCategory(requested, catalog, categories)
    if (resolved === undefined) unresolved.add(requested)
    else resolvedCategories.set(requested, resolved)
  }

  if (unresolved.size > 0) {
    const available = categories
      .map((category) => String(category.label || category._id))
      .sort()
      .join(', ')
    throw new Error(
      `Could not resolve Huly skill categories: ${Array.from(unresolved).sort().join(', ')}. ` +
      `Run the discover command and update category aliases in the catalogue. ` +
      `Categories returned by Huly: ${available || '(none)'}`
    )
  }

  return catalog.skills.map((skill) => {
    const category = resolvedCategories.get(skill.category)
    if (category === undefined) {
      throw new Error(`Internal error: category ${skill.category} was not resolved`)
    }

    const existing = existingByName.get(normalize(skill.name))
    if (existing === undefined) {
      return {
        skill,
        action: 'create' as const,
        categoryId: category.id,
        categoryLabel: category.label
      }
    }

    return {
      skill,
      action: options.updateExisting ? 'update' as const : 'skip' as const,
      categoryId: category.id,
      categoryLabel: category.label,
      existing,
      reason: options.updateExisting ? 'existing skill will be synchronized' : 'skill already exists'
    }
  })
}

export async function executeImportPlan(
  adapter: HulySkillAdapter,
  plan: ImportPlanItem[],
  dryRun: boolean
): Promise<ImportSummary> {
  const summary: ImportSummary = {
    requested: plan.length,
    existing: plan.filter((item) => item.existing !== undefined).length,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  }

  for (const item of plan) {
    const prefix = dryRun ? '[dry-run]' : '[apply]'
    try {
      if (item.action === 'skip') {
        console.log(`${prefix} SKIP   ${item.skill.name} (${item.categoryLabel})`)
        summary.skipped += 1
        continue
      }

      if (item.action === 'create') {
        console.log(`${prefix} CREATE ${item.skill.name} (${item.categoryLabel})`)
        if (!dryRun) await adapter.createSkill(item.skill, item.categoryId)
        summary.created += 1
        continue
      }

      console.log(`${prefix} UPDATE ${item.skill.name} (${item.categoryLabel})`)
      if (!dryRun && item.existing !== undefined) {
        await adapter.updateSkill(item.existing, item.skill, item.categoryId)
      }
      summary.updated += 1
    } catch (error) {
      summary.errors += 1
      console.error(`${prefix} ERROR  ${item.skill.name}:`, error)
    }
  }

  return summary
}
