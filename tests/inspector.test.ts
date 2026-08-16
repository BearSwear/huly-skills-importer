import { describe, expect, it } from 'vitest'
import { inspectWorkspace, skillLevel } from '../src/inspector.js'
import type { HulySkillAdapter } from '../src/types.js'

function adapter(): HulySkillAdapter {
  return {
    async listCategories() {
      return [
        {
          _id: 'recruit:category:Category.skills:devops',
          label: 'DevOps',
          targetClass: 'recruit:mixin:Candidate',
          default: false,
          tags: ['Docker', 'Kubernetes']
        },
        {
          _id: 'recruit:category:Other',
          label: 'Other',
          targetClass: 'recruit:mixin:Candidate',
          default: true,
          tags: []
        }
      ]
    },
    async listSkills() {
      return [
        { _id: 'docker', space: 'workspace', title: 'Docker', category: 'recruit:category:Category.skills:devops' },
        { _id: 'custom', space: 'workspace', title: 'Custom Skill', category: 'recruit:category:Other' }
      ]
    },
    async listSkillReferences() {
      return [
        { _id: 'r1', tag: 'docker', attachedTo: 'p1', attachedToClass: 'recruit:mixin:Candidate', collection: 'skills', weight: 6 },
        { _id: 'r2', tag: 'custom', attachedTo: 'p1', attachedToClass: 'recruit:mixin:Candidate', collection: 'skills' }
      ]
    },
    async listPeople() {
      return [{ _id: 'p1', name: 'Example,Candidate' }]
    },
    async createSkill() { return 'unused' },
    async updateSkill() {},
    async close() {}
  }
}

describe('inspector', () => {
  it('maps Huly proficiency weights', () => {
    expect(skillLevel(undefined)).toBe('Unset')
    expect(skillLevel(2)).toBe('Initial')
    expect(skillLevel(5)).toBe('Meaningful')
    expect(skillLevel(6)).toBe('Expert')
  })

  it('reports optimizer risk for a low-reference Other skill', async () => {
    const result = await inspectWorkspace(adapter())
    expect(result.summary.builtInSuggestions).toBe(2)
    expect(result.summary.materializedSkills).toBe(2)
    expect(result.levels.Expert).toBe(1)
    expect(result.levels.Unset).toBe(1)
    expect(result.optimizer.otherSkills).toBe(1)
    expect(result.optimizer.lowReferenceOtherSkills).toBe(1)
    expect(result.candidates[0]?.skills).toHaveLength(2)
  })
})
