import { loadCatalog, normalize } from './catalog.js'
import type { CatalogCategory, CatalogSkill, SkillCatalog } from './types.js'

export interface CatalogSource {
  path: string
  catalog: SkillCatalog
}

export interface CatalogConflictDefinition {
  source: string
  name: string
  category: string
  description: string
  color?: number
}

export interface CatalogConflict {
  normalizedName: string
  fields: Array<'name' | 'category' | 'description' | 'color'>
  definitions: CatalogConflictDefinition[]
}

function skillSignature(skill: CatalogSkill): Record<'name' | 'category' | 'description' | 'color', string | number | undefined> {
  return {
    name: skill.name,
    category: skill.category,
    description: skill.description,
    color: skill.color
  }
}

export async function loadCatalogSet(paths: string[]): Promise<CatalogSource[]> {
  return await Promise.all(paths.map(async (path) => ({ path, catalog: await loadCatalog(path) })))
}

export function findCatalogConflicts(sources: CatalogSource[]): CatalogConflict[] {
  const byName = new Map<string, CatalogConflictDefinition[]>()

  for (const source of sources) {
    for (const skill of source.catalog.skills) {
      const key = normalize(skill.name)
      const definitions = byName.get(key) ?? []
      definitions.push({
        source: source.path,
        name: skill.name,
        category: skill.category,
        description: skill.description,
        color: skill.color
      })
      byName.set(key, definitions)
    }
  }

  const conflicts: CatalogConflict[] = []
  for (const [normalizedName, definitions] of byName.entries()) {
    if (definitions.length < 2) continue

    const fields: CatalogConflict['fields'] = []
    for (const field of ['name', 'category', 'description', 'color'] as const) {
      const values = new Set(definitions.map((definition) => definition[field]))
      if (values.size > 1) fields.push(field)
    }

    if (fields.length > 0) conflicts.push({ normalizedName, fields, definitions })
  }

  return conflicts.sort((a, b) => a.normalizedName.localeCompare(b.normalizedName))
}

export function countSharedNormalizedSkills(sources: CatalogSource[]): number {
  const counts = new Map<string, number>()
  for (const source of sources) {
    for (const skill of source.catalog.skills) {
      const key = normalize(skill.name)
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return Array.from(counts.values()).filter((count) => count > 1).length
}

function mergeCategory(
  categories: Record<string, CatalogCategory>,
  categoryKeyByNormalized: Map<string, string>,
  requestedKey: string,
  requested: CatalogCategory
): string {
  const normalized = normalize(requestedKey)
  const existingKey = categoryKeyByNormalized.get(normalized)

  if (existingKey === undefined) {
    const aliases = Array.from(new Set([requestedKey, ...requested.aliases].map((value) => value.trim()).filter(Boolean)))
    categories[requestedKey] = { aliases }
    categoryKeyByNormalized.set(normalized, requestedKey)
    return requestedKey
  }

  const existing = categories[existingKey]
  if (existing === undefined) throw new Error(`Internal error: missing merged category ${existingKey}`)
  existing.aliases = Array.from(new Set([...existing.aliases, requestedKey, ...requested.aliases]))
  return existingKey
}

export function mergeCatalogs(
  sources: CatalogSource[],
  options?: { name?: string; description?: string }
): SkillCatalog {
  if (sources.length === 0) throw new Error('At least one catalogue is required')

  const conflicts = findCatalogConflicts(sources)
  if (conflicts.length > 0) {
    const details = conflicts.slice(0, 10).map((conflict) => {
      const sourceList = conflict.definitions.map((definition) => definition.source).join(', ')
      return `${conflict.normalizedName} [${conflict.fields.join(', ')}] in ${sourceList}`
    }).join('; ')
    const suffix = conflicts.length > 10 ? `; ... ${conflicts.length - 10} more` : ''
    throw new Error(`Cannot merge catalogues with conflicting shared skill definitions: ${details}${suffix}`)
  }

  const categories: Record<string, CatalogCategory> = {}
  const categoryKeyByNormalized = new Map<string, string>()
  const sourceCategoryMaps = new Map<string, Map<string, string>>()

  for (const source of sources) {
    const categoryMap = new Map<string, string>()
    for (const [key, category] of Object.entries(source.catalog.categories)) {
      categoryMap.set(normalize(key), mergeCategory(categories, categoryKeyByNormalized, key, category))
    }
    sourceCategoryMaps.set(source.path, categoryMap)
  }

  const skillsByName = new Map<string, CatalogSkill>()
  for (const source of sources) {
    const categoryMap = sourceCategoryMaps.get(source.path)
    if (categoryMap === undefined) throw new Error(`Internal error: missing category map for ${source.path}`)

    for (const skill of source.catalog.skills) {
      const key = normalize(skill.name)
      if (skillsByName.has(key)) continue
      const mergedCategory = categoryMap.get(normalize(skill.category))
      if (mergedCategory === undefined) {
        throw new Error(`Could not map category ${skill.category} from ${source.path}`)
      }
      skillsByName.set(key, { ...skill, category: mergedCategory })
    }
  }

  const skills = Array.from(skillsByName.values()).sort((a, b) => {
    const categoryOrder = a.category.localeCompare(b.category)
    return categoryOrder !== 0 ? categoryOrder : a.name.localeCompare(b.name)
  })

  return {
    version: 1,
    name: options?.name ?? (sources.length === 1 ? sources[0]!.catalog.name : 'Merged Huly Recruiting skill catalogue'),
    description: options?.description ?? (
      sources.length === 1
        ? sources[0]!.catalog.description
        : `Merged from ${sources.length} compatible huly-skills-importer catalogues.`
    ),
    categories,
    skills
  }
}

export function definitionForDisplay(skill: CatalogSkill): ReturnType<typeof skillSignature> {
  return skillSignature(skill)
}
