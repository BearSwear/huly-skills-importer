import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parse } from 'yaml'
import { z } from 'zod'
import type { SkillCatalog } from './types.js'

const catalogSchema = z.object({
  version: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().optional(),
  categories: z.record(
    z.string(),
    z.object({
      aliases: z.array(z.string()).default([])
    })
  ),
  skills: z.array(
    z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      description: z.string().default(''),
      color: z.number().int().optional()
    })
  ).min(1)
})

export function normalize(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-US')
}

export async function loadCatalog(path: string): Promise<SkillCatalog> {
  const fullPath = resolve(path)
  const raw = await readFile(fullPath, 'utf8')
  const parsed = catalogSchema.parse(parse(raw)) as SkillCatalog

  const categoryNames = new Set(Object.keys(parsed.categories).map(normalize))
  const seenSkills = new Map<string, string>()

  for (const skill of parsed.skills) {
    if (!categoryNames.has(normalize(skill.category))) {
      throw new Error(`Skill "${skill.name}" references unknown catalogue category "${skill.category}"`)
    }

    const key = normalize(skill.name)
    const previous = seenSkills.get(key)
    if (previous !== undefined) {
      throw new Error(`Duplicate skill names after normalization: "${previous}" and "${skill.name}"`)
    }
    seenSkills.set(key, skill.name)
  }

  return parsed
}

export function summarizeCatalog(catalog: SkillCatalog): Record<string, number> {
  const result: Record<string, number> = {}
  for (const skill of catalog.skills) {
    result[skill.category] = (result[skill.category] ?? 0) + 1
  }
  return result
}
