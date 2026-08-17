import { describe, expect, it } from 'vitest'
import { auditWorkspace } from '../src/audit.js'
import { desiredSkillColor } from '../src/skill-values.js'
import type { HulySkillAdapter, SkillCatalog } from '../src/types.js'

const catalog: SkillCatalog = {
  version: 1,
  name: 'Audit',
  categories: { DevOps: { aliases: ['DevOps'] } },
  skills: [
    { name: 'Docker', category: 'DevOps', description: 'Containers.' },
    { name: 'Terraform', category: 'DevOps', description: 'IaC.' },
    { name: 'Ansible', category: 'DevOps', description: 'Automation.' }
  ]
}

function adapter(): HulySkillAdapter {
  return {
    async listCategories() {
      return [{ _id: 'devops', label: 'DevOps', targetClass: 'recruit:mixin:Candidate', default: false, tags: [] }]
    },
    async listSkills() {
      return [
        { _id: 'docker', space: 'workspace', title: 'Docker', category: 'devops', description: 'Containers.', color: desiredSkillColor(catalog.skills[0]!) },
        { _id: 'terraform', space: 'workspace', title: 'terraform', category: 'devops', description: '', color: 23 },
        { _id: 'custom', space: 'workspace', title: 'Custom', category: 'devops', description: '', color: 1 }
      ]
    },
    async listSkillReferences() {
      return [
        { _id: 'r1', tag: 'docker', attachedTo: 'p1', attachedToClass: 'recruit:mixin:Candidate', collection: 'skills' },
        { _id: 'r2', tag: 'custom', attachedTo: 'p1', attachedToClass: 'recruit:mixin:Candidate', collection: 'skills' }
      ]
    },
    async listPeople() { return [] },
    async createSkill() { return 'unused' },
    async updateSkill() {},
    async close() {}
  }
}

describe('audit', () => {
  it('reports matching, missing, divergent and workspace-only skills', async () => {
    const result = await auditWorkspace(adapter(), catalog)
    expect(result.summary.presentMatching).toBe(1)
    expect(result.summary.missing).toBe(1)
    expect(result.summary.divergent).toBe(1)
    expect(result.summary.workspaceOnly).toBe(1)
    expect(result.summary.candidateReferencesToCatalog).toBe(1)
    expect(result.summary.candidateReferencesToWorkspaceOnly).toBe(1)
    expect(result.missing[0]?.skill).toBe('Ansible')
    expect(result.divergent[0]?.skill).toBe('Terraform')
    expect(result.workspaceOnly[0]?.skill).toBe('Custom')
  })
})
