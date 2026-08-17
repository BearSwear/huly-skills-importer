import { describe, expect, it } from 'vitest'
import { workspaceCatalog } from '../src/workspace-export.js'
import type { HulySkillAdapter } from '../src/types.js'

function adapter(): HulySkillAdapter {
  return {
    async listCategories() {
      return [{ _id: 'devops', label: 'DevOps', targetClass: 'recruit:mixin:Candidate', default: false, tags: [] }]
    },
    async listSkills() {
      return [{ _id: 'docker', space: 'workspace', title: 'Docker', category: 'devops', description: 'Containers.', color: 7 }]
    },
    async listSkillReferences() { return [] },
    async listPeople() { return [] },
    async createSkill() { return 'unused' },
    async updateSkill() {},
    async close() {}
  }
}

describe('workspace export', () => {
  it('creates an importable catalogue preserving category, description and color', async () => {
    const catalog = await workspaceCatalog(adapter())
    expect(catalog.categories.DevOps?.aliases).toContain('DevOps')
    expect(catalog.skills).toEqual([{ name: 'Docker', category: 'DevOps', description: 'Containers.', color: 7 }])
  })
})
