import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, normalize } from './catalog.js'

export interface BundledCatalogueSummary {
  file: string
  name: string
  description: string
  skills: number
  usedCategories: number
  otherSkills: number
}

export interface BundledCatalogueCollection {
  directory: string
  catalogues: BundledCatalogueSummary[]
  totalSkillEntries: number
  uniqueNormalizedSkills: number
}

export function bundledCataloguesDirectory(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url))
  return join(moduleDirectory, '..', 'skills', 'industries')
}

export async function listBundledCatalogues(
  directory = bundledCataloguesDirectory()
): Promise<BundledCatalogueCollection> {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('-skills.yaml'))
    .map((entry) => entry.name)
    .sort()

  const uniqueSkills = new Set<string>()
  const catalogues: BundledCatalogueSummary[] = []

  for (const file of files) {
    const catalog = await loadCatalog(join(directory, file))
    const usedCategories = new Set<string>()
    let otherSkills = 0

    for (const skill of catalog.skills) {
      uniqueSkills.add(normalize(skill.name))
      usedCategories.add(normalize(skill.category))
      if (normalize(skill.category) === 'other') otherSkills += 1
    }

    catalogues.push({
      file,
      name: catalog.name,
      description: catalog.description ?? '',
      skills: catalog.skills.length,
      usedCategories: usedCategories.size,
      otherSkills
    })
  }

  return {
    directory,
    catalogues,
    totalSkillEntries: catalogues.reduce((sum, catalog) => sum + catalog.skills, 0),
    uniqueNormalizedSkills: uniqueSkills.size
  }
}
