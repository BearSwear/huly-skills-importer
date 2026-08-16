import { describe, expect, it } from 'vitest'
import { suggestionsAsCatalog, summarizeSuggestions } from '../src/suggestions.js'

const categories = [
  {
    _id: 'backend',
    label: 'Backend development',
    targetClass: 'recruit:mixin:Candidate',
    default: false,
    tags: ['Docker', 'REST']
  },
  {
    _id: 'devops',
    label: 'DevOps',
    targetClass: 'recruit:mixin:Candidate',
    default: false,
    tags: ['docker', 'Terraform']
  }
]

describe('suggestions', () => {
  it('reports raw and unique suggestion counts', () => {
    const summary = summarizeSuggestions(categories)
    expect(summary.suggestions).toBe(4)
    expect(summary.uniqueSuggestions).toBe(3)
    expect(summary.duplicateOccurrences).toBe(1)
  })

  it('exports duplicate suggestion names only once', () => {
    const catalog = suggestionsAsCatalog(categories)
    expect(catalog.skills.map((skill) => skill.name)).toEqual(['Docker', 'REST', 'Terraform'])
  })
})
