import { describe, expect, it } from 'vitest'
import { findCatalogConflicts, mergeCatalogs } from '../src/catalog-set.js'
import type { CatalogSource } from '../src/catalog-set.js'

function source(path: string, category: string, description: string): CatalogSource {
  return {
    path,
    catalog: {
      version: 1,
      name: path,
      categories: {
        DevOps: { aliases: ['DevOps'] },
        Management: { aliases: ['Management'] }
      },
      skills: [{ name: 'Shared Skill', category, description }]
    }
  }
}

describe('catalog set', () => {
  it('merges identical shared definitions once', () => {
    const sources = [source('a.yaml', 'DevOps', 'Shared.'), source('b.yaml', 'DevOps', 'Shared.')]
    expect(findCatalogConflicts(sources)).toEqual([])
    const merged = mergeCatalogs(sources)
    expect(merged.skills).toHaveLength(1)
    expect(merged.skills[0]?.category).toBe('DevOps')
  })

  it('rejects conflicting shared definitions', () => {
    const sources = [source('a.yaml', 'DevOps', 'Shared.'), source('b.yaml', 'Management', 'Different.')]
    const conflicts = findCatalogConflicts(sources)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.fields).toContain('category')
    expect(() => mergeCatalogs(sources)).toThrow(/conflicting shared skill definitions/i)
  })
})
