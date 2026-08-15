import { describe, expect, it } from 'vitest'
import { buildImportPlan, executeImportPlan } from '../src/importer.js'
import type { HulySkillAdapter, SkillCatalog } from '../src/types.js'

function adapter(existingTitles: string[] = []): HulySkillAdapter & { created: string[]; updated: string[] } {
  const created: string[] = []
  const updated: string[] = []
  return {
    created,
    updated,
    async listCategories() {
      return [{
        _id: 'devops',
        label: 'DevOps',
        targetClass: 'recruit:mixin:Candidate',
        default: false,
        tags: []
      } as any]
    },
    async listSkills() {
      return existingTitles.map((title, index) => ({
        _id: `skill-${index}`,
        space: 'workspace',
        title,
        description: '',
        targetClass: 'recruit:mixin:Candidate',
        color: 0,
        category: 'devops'
      } as any))
    },
    async createSkill(skill) {
      created.push(skill.name)
      return `new-${created.length}`
    },
    async updateSkill(_existing, skill) {
      updated.push(skill.name)
    },
    async close() {}
  }
}

const catalog: SkillCatalog = {
  version: 1,
  name: 'test',
  categories: { DevOps: { aliases: [] } },
  skills: [
    { name: 'Docker', category: 'DevOps', description: 'Containers.' },
    { name: 'Ansible', category: 'DevOps', description: 'Automation.' }
  ]
}

describe('importer', () => {
  it('is idempotent by normalized skill name', async () => {
    const fake = adapter(['docker'])
    const plan = await buildImportPlan(fake, catalog, { updateExisting: false })
    expect(plan.map((item) => item.action)).toEqual(['skip', 'create'])
  })

  it('does not write in dry-run mode', async () => {
    const fake = adapter()
    const plan = await buildImportPlan(fake, catalog, { updateExisting: false })
    const summary = await executeImportPlan(fake, plan, true)
    expect(fake.created).toEqual([])
    expect(summary.created).toBe(2)
  })

  it('updates existing skills only when requested', async () => {
    const fake = adapter(['Docker'])
    const plan = await buildImportPlan(fake, catalog, { updateExisting: true })
    await executeImportPlan(fake, plan, false)
    expect(fake.updated).toEqual(['Docker'])
    expect(fake.created).toEqual(['Ansible'])
  })
})
