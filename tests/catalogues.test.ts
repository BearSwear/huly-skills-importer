import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { listBundledCatalogues } from '../src/catalogues.js'

const template = (name: string, skills: string) => `version: 1
name: ${name}
description: Example catalogue.
categories:
  DevOps:
    aliases:
      - DevOps
  Other:
    aliases:
      - Other
skills:
${skills}
`

describe('catalogues', () => {
  it('summarizes industry catalogues and reports cross-catalogue definition conflicts', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'huly-catalogues-'))

    await writeFile(join(dir, 'alpha-skills.yaml'), template('Alpha', `  - name: Docker
    category: DevOps
    description: Containers.
  - name: Shared Skill
    category: DevOps
    description: Shared.
`))

    await writeFile(join(dir, 'beta-skills.yaml'), template('Beta', `  - name: shared skill
    category: DevOps
    description: Shared duplicate.
  - name: Custom
    category: Other
    description: Other category.
`))

    const result = await listBundledCatalogues(dir)

    expect(result.catalogues).toHaveLength(2)
    expect(result.totalSkillEntries).toBe(4)
    expect(result.uniqueNormalizedSkills).toBe(3)
    expect(result.catalogues[1]?.otherSkills).toBe(1)
    expect(result.definitionConflicts).toBeGreaterThanOrEqual(1)
  })
})
