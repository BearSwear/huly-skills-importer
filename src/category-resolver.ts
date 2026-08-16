import { normalize } from './catalog.js'
import type { HulyTagCategory, SkillCatalog } from './types.js'

export interface ResolvedCategory {
  id: string
  label: string
}

/** Resolve a catalogue category to a Huly TagCategory by label/alias. */
export function resolveCategory(
  requested: string,
  catalog: SkillCatalog,
  categories: HulyTagCategory[]
): ResolvedCategory | undefined {
  const definition = catalog.categories[requested]
  const candidates = [requested, ...(definition?.aliases ?? [])].map(normalize)

  for (const category of categories) {
    const label = String(category.label ?? '')
    if (candidates.includes(normalize(label))) {
      return { id: String(category._id), label }
    }
  }

  return undefined
}

export function categoryDiagnostics(categories: HulyTagCategory[]): Array<Record<string, unknown>> {
  return categories.map((category) => ({
    id: String(category._id),
    label: String(category.label ?? ''),
    targetClass: String(category.targetClass ?? ''),
    default: Boolean(category.default),
    builtInSuggestionCount: Array.isArray(category.tags) ? category.tags.length : 0,
    builtInSuggestionSample: Array.isArray(category.tags) ? category.tags.slice(0, 8) : []
  }))
}
