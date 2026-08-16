import { normalize } from './catalog.js'
import { resolveCategory } from './category-resolver.js'
import { desiredSkillColor } from './skill-values.js'
import type {
  HulySkillAdapter,
  HulyTagElement,
  ImportPlanItem,
  ImportSummary,
  SkillCatalog,
  SkillUpdateChange
} from './types.js'

export interface PlanOptions {
  updateExisting: boolean
}

function valueForDisplay(value: string | number | undefined): string | number {
  if (value === undefined) return '(unset)'
  return value
}

function changesForExisting(
  existing: HulyTagElement,
  skill: ImportPlanItem['skill'],
  categoryId: string,
  categoryLabel: string,
  categoryLabelsById: Map<string, string>
): SkillUpdateChange[] {
  const changes: SkillUpdateChange[] = []
  const desiredColor = desiredSkillColor(skill)
  const existingDescription = existing.description ?? ''

  if (existing.title !== skill.name) {
    changes.push({ field: 'title', from: existing.title, to: skill.name })
  }

  if (existingDescription !== skill.description) {
    changes.push({
      field: 'description',
      from: existingDescription,
      to: skill.description
    })
  }

  if (existing.category !== categoryId) {
    changes.push({
      field: 'category',
      from: existing.category === undefined
        ? '(unset)'
        : (categoryLabelsById.get(existing.category) ?? existing.category),
      to: categoryLabel
    })
  }

  if (existing.color !== desiredColor) {
    changes.push({
      field: 'color',
      from: valueForDisplay(existing.color),
      to: desiredColor
    })
  }

  return changes
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

  const existingByName = new Map<string, HulyTagElement>()
  for (const existing of existingSkills) {
    existingByName.set(normalize(existing.title), existing)
  }

  const categoryLabelsById = new Map<string, string>()
  for (const category of categories) {
    categoryLabelsById.set(category._id, String(category.label || category._id))
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

    if (!options.updateExisting) {
      return {
        skill,
        action: 'skip' as const,
        categoryId: category.id,
        categoryLabel: category.label,
        existing,
        reason: 'skill already exists'
      }
    }

    const changes = changesForExisting(
      existing,
      skill,
      category.id,
      category.label,
      categoryLabelsById
    )

    if (changes.length === 0) {
      return {
        skill,
        action: 'skip' as const,
        categoryId: category.id,
        categoryLabel: category.label,
        existing,
        changes,
        reason: 'existing skill already matches catalogue'
      }
    }

    return {
      skill,
      action: 'update' as const,
      categoryId: category.id,
      categoryLabel: category.label,
      existing,
      changes,
      reason: 'existing skill differs from catalogue'
    }
  })
}

function formatChangeValue(value: string | number): string {
  return typeof value === 'string' ? JSON.stringify(value) : String(value)
}

function printChanges(item: ImportPlanItem): void {
  for (const change of item.changes ?? []) {
    console.log(
      `          ${change.field}: ${formatChangeValue(change.from)} -> ${formatChangeValue(change.to)}`
    )
  }
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
      printChanges(item)
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
