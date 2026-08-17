import { readdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, normalize } from './catalog.js'
import { countSharedNormalizedSkills, findCatalogConflicts, loadCatalogSet } from './catalog-set.js'

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
  allBundledSkillEntries: number
  allBundledUniqueNormalizedSkills: number
  sharedNormalizedSkills: number
  definitionConflicts: number
}

function skillsDirectory(): string {
  const moduleDirectory = dirname(fileURLToPath(import.meta.url))
  return join(moduleDirectory, '..', 'skills')
}

export function bundledCataloguesDirectory(): string {
  return join(skillsDirectory(), 'industries')
}

export function broadCataloguePath(): string {
  return join(skillsDirectory(), 'import-skills.yaml')
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

  const sourcePaths = [broadCataloguePath(), ...files.map((file) => join(directory, file))]
  const allSources = await loadCatalogSet(sourcePaths)
  const allNames = new Set<string>()
  let allBundledSkillEntries = 0
  for (const source of allSources) {
    allBundledSkillEntries += source.catalog.skills.length
    for (const skill of source.catalog.skills) allNames.add(normalize(skill.name))
  }

  return {
    directory,
    catalogues,
    totalSkillEntries: catalogues.reduce((sum, catalog) => sum + catalog.skills, 0),
    uniqueNormalizedSkills: uniqueSkills.size,
    allBundledSkillEntries,
    allBundledUniqueNormalizedSkills: allNames.size,
    sharedNormalizedSkills: countSharedNormalizedSkills(allSources),
    definitionConflicts: findCatalogConflicts(allSources).length
  }
}
