import { describe, expect, it, vi } from 'vitest'
import { buildImportPlan, executeImportPlan } from '../src/importer.js'
import { desiredSkillColor } from '../src/skill-values.js'
import type { HulySkillAdapter, HulyTagElement, SkillCatalog } from '../src/types.js'

function adapter(
  existingSkills: Array<string | Partial<HulyTagElement>> = []
): HulySkillAdapter & { created: string[]; updated: string[] } {
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
      }, {
        _id: 'backend',
        label: 'Backend development',
        targetClass: 'recruit:mixin:Candidate',
        default: false,
        tags: []
      }]
    },
    async listSkills() {
      return existingSkills.map((value, index) => {
        const overrides = typeof value === 'string' ? { title: value } : value
        return {
          _id: `skill-${index}`,
          space: 'workspace',
          title: `Skill ${index}`,
          description: '',
          targetClass: 'recruit:mixin:Candidate',
          color: 0,
          category: 'devops',
          ...overrides
        }
      })
    },
    async listSkillReferences() { return [] },
    async listPeople() { return [] },
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
  categories: {
    DevOps: { aliases: [] },
    'Backend Development': { aliases: ['Backend development'] }
  },
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

  it('skips an existing skill that already matches the catalogue during synchronization', async () => {
    const docker = catalog.skills[0]
    const fake = adapter([{
      title: docker.name,
      description: docker.description,
      category: 'devops',
      color: desiredSkillColor(docker)
    }])

    const plan = await buildImportPlan(fake, catalog, { updateExisting: true })
    expect(plan[0].action).toBe('skip')
    expect(plan[0].reason).toBe('existing skill already matches catalogue')
    expect(plan[0].changes).toEqual([])
  })

  it('plans only fields that differ and uses readable category labels', async () => {
    const fake = adapter([{
      title: 'docker',
      description: '',
      category: 'backend',
      color: 23
    }])

    const plan = await buildImportPlan(fake, catalog, { updateExisting: true })
    expect(plan[0].action).toBe('update')
    expect(plan[0].changes).toEqual([
      { field: 'title', from: 'docker', to: 'Docker' },
      { field: 'description', from: '', to: 'Containers.' },
      { field: 'category', from: 'Backend development', to: 'DevOps' },
      { field: 'color', from: 23, to: desiredSkillColor(catalog.skills[0]) }
    ])
  })

  it('prints field-level differences for updates', async () => {
    const fake = adapter([{
      title: 'docker',
      description: '',
      category: 'backend',
      color: 23
    }])
    const plan = await buildImportPlan(fake, catalog, { updateExisting: true })
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    await executeImportPlan(fake, plan, true)

    const output = log.mock.calls.map((call) => call.join(' ')).join('\n')
    expect(output).toContain('[dry-run] UPDATE Docker (DevOps)')
    expect(output).toContain('title: "docker" -> "Docker"')
    expect(output).toContain('category: "Backend development" -> "DevOps"')
    log.mockRestore()
  })
})
