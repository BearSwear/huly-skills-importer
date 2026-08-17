import { writeCatalog } from './catalog.js'
import type { HulySkillAdapter, SkillCatalog } from './types.js'

export async function workspaceCatalog(adapter: HulySkillAdapter): Promise<SkillCatalog> {
  const [categories, skills] = await Promise.all([
    adapter.listCategories(),
    adapter.listSkills()
  ])

  const sortedCategories = [...categories].sort((a, b) =>
    String(a.label ?? a._id).localeCompare(String(b.label ?? b._id))
  )
  const categoryById = new Map<string, string>()
  const catalogCategories: SkillCatalog['categories'] = {}

  for (const category of sortedCategories) {
    const label = String(category.label ?? category._id).trim()
    if (!label) throw new Error(`Recruiting category ${category._id} has no usable label`)
    categoryById.set(String(category._id), label)
    catalogCategories[label] = { aliases: [label] }
  }

  const exportedSkills = skills.map((skill) => {
    const category = categoryById.get(String(skill.category ?? ''))
    if (category === undefined) {
      throw new Error(`Skill "${skill.title}" references unknown Recruiting category ${String(skill.category ?? '(unset)')}`)
    }

    return {
      name: String(skill.title),
      category,
      description: String(skill.description ?? ''),
      ...(typeof skill.color === 'number' ? { color: skill.color } : {})
    }
  }).sort((a, b) => {
    const byCategory = a.category.localeCompare(b.category)
    return byCategory !== 0 ? byCategory : a.name.localeCompare(b.name)
  })

  return {
    version: 1,
    name: 'Exported Huly Recruiting workspace skills',
    description: 'Materialized Recruiting skills exported by huly-skills-importer. Review before importing into another workspace.',
    categories: catalogCategories,
    skills: exportedSkills
  }
}

export async function exportWorkspaceCatalog(adapter: HulySkillAdapter, outputPath: string): Promise<number> {
  const catalog = await workspaceCatalog(adapter)
  await writeCatalog(outputPath, catalog)
  return catalog.skills.length
}
