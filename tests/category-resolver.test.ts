import { describe, expect, it } from 'vitest'
import { resolveCategory } from '../src/category-resolver.js'
import type { SkillCatalog } from '../src/types.js'

const catalog: SkillCatalog = {
  version: 1,
  name: 'test',
  categories: {
    'Backend Development': {
      aliases: ['Backend development']
    }
  },
  skills: []
}

describe('resolveCategory', () => {
  it('matches an alias case-insensitively', () => {
    const category = {
      _id: 'cat-1',
      label: 'Backend development',
      targetClass: 'recruit:mixin:Candidate',
      default: false,
      tags: []
    } as any

    expect(resolveCategory('Backend Development', catalog, [category])).toEqual({
      id: 'cat-1',
      label: 'Backend development'
    })
  })

  it('returns undefined when no category matches', () => {
    expect(resolveCategory('Backend Development', catalog, [])).toBeUndefined()
  })
})
