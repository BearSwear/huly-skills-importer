import { writeFile } from 'node:fs/promises'
import { stringify } from 'yaml'
import { normalize } from './catalog.js'
import type { HulyTagCategory, SkillCatalog } from './types.js'

export interface SuggestionRecord {
  name: string
  categoryId: string
  categoryLabel: string
}

export interface SuggestionSummary {
  categories: number
  suggestions: number
  uniqueSuggestions: number
  duplicateOccurrences: number
  byCategory: Array<{
    id: string
    label: string
    count: number
  }>
}

export function collectSuggestions(categories: HulyTagCategory[]): SuggestionRecord[] {
  const result: SuggestionRecord[] = []
  for (const category of categories) {
    const label = String(category.label ?? category._id)
    for (const raw of Array.isArray(category.tags) ? category.tags : []) {
      const name = String(raw).trim()
      if (!name) continue
      result.push({
        name,
        categoryId: String(category._id),
        categoryLabel: label
      })
    }
  }
  return result
}

export function summarizeSuggestions(categories: HulyTagCategory[]): SuggestionSummary {
  const suggestions = collectSuggestions(categories)
  const unique = new Set(suggestions.map((item) => normalize(item.name)))

  return {
    categories: categories.length,
    suggestions: suggestions.length,
    uniqueSuggestions: unique.size,
    duplicateOccurrences: suggestions.length - unique.size,
    byCategory: categories.map((category) => ({
      id: String(category._id),
      label: String(category.label ?? category._id),
      count: Array.isArray(category.tags) ? category.tags.length : 0
    })).sort((a, b) => a.label.localeCompare(b.label))
  }
}

export function suggestionsAsCatalog(categories: HulyTagCategory[]): SkillCatalog {
  const seen = new Set<string>()
  const skills: SkillCatalog['skills'] = []
  const categoryDefinitions: SkillCatalog['categories'] = {}

  for (const category of categories) {
    const label = String(category.label ?? category._id)
    const rawTags = Array.isArray(category.tags) ? category.tags : []
    if (rawTags.length === 0) continue

    categoryDefinitions[label] = { aliases: [label] }

    for (const raw of rawTags) {
      const name = String(raw).trim()
      if (!name) continue
      const key = normalize(name)
      if (seen.has(key)) continue
      seen.add(key)
      skills.push({
        name,
        category: label,
        description: ''
      })
    }
  }

  return {
    version: 1,
    name: 'Huly built-in Recruiting suggestions',
    description: 'Generated from TagCategory.tags in a Huly workspace. Suggestions are recognition/category vocabulary, not materialized skills. Review this file before importing.',
    categories: categoryDefinitions,
    skills
  }
}

export async function exportSuggestionsCatalog(categories: HulyTagCategory[], path: string): Promise<number> {
  const catalog = suggestionsAsCatalog(categories)
  await writeFile(path, stringify(catalog, { lineWidth: 0 }), 'utf8')
  return catalog.skills.length
}
