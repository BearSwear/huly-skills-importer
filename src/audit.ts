import { normalize } from './catalog.js'
import { buildImportPlan } from './importer.js'
import type { HulySkillAdapter, ImportPlanItem, SkillCatalog, SkillUpdateChange } from './types.js'

export interface AuditSkillRow {
  skill: string
  category: string
  references: number
}

export interface AuditDivergentRow {
  skill: string
  desiredCategory: string
  changes: SkillUpdateChange[]
}

export interface AuditResult {
  summary: {
    catalogSkills: number
    materializedSkills: number
    presentMatching: number
    missing: number
    divergent: number
    workspaceOnly: number
    duplicateWorkspaceNames: number
    candidateReferences: number
    candidateReferencesToCatalog: number
    candidateReferencesToWorkspaceOnly: number
  }
  missing: Array<{ skill: string; category: string }>
  divergent: AuditDivergentRow[]
  workspaceOnly: AuditSkillRow[]
  duplicateWorkspaceNames: Array<{ normalizedName: string; skills: string[] }>
}

function categoryLabelById(categories: Awaited<ReturnType<HulySkillAdapter['listCategories']>>): Map<string, string> {
  return new Map(categories.map((category) => [String(category._id), String(category.label ?? category._id)]))
}

function divergentRow(item: ImportPlanItem): AuditDivergentRow {
  return {
    skill: item.skill.name,
    desiredCategory: item.categoryLabel,
    changes: item.changes ?? []
  }
}

export async function auditWorkspace(adapter: HulySkillAdapter, catalog: SkillCatalog): Promise<AuditResult> {
  const [plan, skills, references, categories] = await Promise.all([
    buildImportPlan(adapter, catalog, { updateExisting: true }),
    adapter.listSkills(),
    adapter.listSkillReferences(),
    adapter.listCategories()
  ])

  const catalogNames = new Set(catalog.skills.map((skill) => normalize(skill.name)))
  const categoryLabels = categoryLabelById(categories)
  const refsByTag = new Map<string, number>()
  for (const reference of references) {
    const id = String(reference.tag)
    refsByTag.set(id, (refsByTag.get(id) ?? 0) + 1)
  }

  const workspaceOnly = skills
    .filter((skill) => !catalogNames.has(normalize(String(skill.title))))
    .map((skill) => ({
      skill: String(skill.title),
      category: categoryLabels.get(String(skill.category ?? '')) ?? String(skill.category ?? ''),
      references: refsByTag.get(String(skill._id)) ?? 0
    }))
    .sort((a, b) => a.skill.localeCompare(b.skill))

  const workspaceByNormalized = new Map<string, string[]>()
  for (const skill of skills) {
    const key = normalize(String(skill.title))
    const titles = workspaceByNormalized.get(key) ?? []
    titles.push(String(skill.title))
    workspaceByNormalized.set(key, titles)
  }
  const duplicateWorkspaceNames = Array.from(workspaceByNormalized.entries())
    .filter(([, titles]) => titles.length > 1)
    .map(([normalizedName, titles]) => ({ normalizedName, skills: titles.sort() }))
    .sort((a, b) => a.normalizedName.localeCompare(b.normalizedName))

  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]))
  let candidateReferencesToCatalog = 0
  let candidateReferencesToWorkspaceOnly = 0
  for (const reference of references) {
    const skill = skillById.get(String(reference.tag))
    if (skill !== undefined && catalogNames.has(normalize(String(skill.title)))) candidateReferencesToCatalog += 1
    else candidateReferencesToWorkspaceOnly += 1
  }

  const missing = plan
    .filter((item) => item.action === 'create')
    .map((item) => ({ skill: item.skill.name, category: item.categoryLabel }))
  const divergent = plan
    .filter((item) => item.action === 'update')
    .map(divergentRow)
  const presentMatching = plan.filter((item) => item.action === 'skip').length

  return {
    summary: {
      catalogSkills: catalog.skills.length,
      materializedSkills: skills.length,
      presentMatching,
      missing: missing.length,
      divergent: divergent.length,
      workspaceOnly: workspaceOnly.length,
      duplicateWorkspaceNames: duplicateWorkspaceNames.length,
      candidateReferences: references.length,
      candidateReferencesToCatalog,
      candidateReferencesToWorkspaceOnly
    },
    missing,
    divergent,
    workspaceOnly,
    duplicateWorkspaceNames
  }
}
