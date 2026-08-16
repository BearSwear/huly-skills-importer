import { normalize } from './catalog.js'
import type {
  HulyPerson,
  HulySkillAdapter,
  HulyTagCategory,
  HulyTagElement,
  HulyTagReference,
  SkillLevel
} from './types.js'

export interface SkillInspectionRow {
  id: string
  skill: string
  category: string
  references: number
  expert: number
  meaningful: number
  initial: number
  unset: number
  otherCategory: boolean
  optimizerRisk: boolean
}

export interface CandidateSkillRow {
  skill: string
  category: string
  weight: number | null
  level: SkillLevel
  tagId: string
  referenceId: string
}

export interface CandidateInspection {
  id: string
  name: string
  skills: CandidateSkillRow[]
}

export interface InspectionResult {
  summary: {
    categories: number
    builtInSuggestions: number
    materializedSkills: number
    skillReferences: number
    candidatesWithSkills: number
  }
  levels: Record<SkillLevel, number>
  optimizer: {
    otherSkills: number
    lowReferenceOtherSkills: number
    unreferencedSkills: number
    expertTitles: number
    expertTitlesEnabledByDefault: number
  }
  skills: SkillInspectionRow[]
  candidates: CandidateInspection[]
}

export function skillLevel(weight: number | undefined | null): SkillLevel {
  if (weight === undefined || weight === null) return 'Unset'
  if (!Number.isFinite(weight)) return 'Unknown'
  if (weight <= 2) return 'Initial'
  if (weight <= 5) return 'Meaningful'
  return 'Expert'
}

function categoryLabel(category: HulyTagCategory | undefined, fallback = ''): string {
  return String(category?.label ?? fallback)
}

function isOtherCategory(category: HulyTagCategory | undefined): boolean {
  if (category === undefined) return false
  return category._id === 'recruit:category:Other' ||
    (Boolean(category.default) && normalize(String(category.label ?? '')) === 'other')
}

function personName(person: HulyPerson | undefined, id: string): string {
  const name = String(person?.name ?? '').trim()
  return name || `[unknown person: ${id}]`
}

export async function inspectWorkspace(adapter: HulySkillAdapter): Promise<InspectionResult> {
  const [categories, skills, references] = await Promise.all([
    adapter.listCategories(),
    adapter.listSkills(),
    adapter.listSkillReferences()
  ])

  const categoryById = new Map(categories.map((category) => [String(category._id), category]))
  const skillById = new Map(skills.map((skill) => [String(skill._id), skill]))
  const candidateIds = Array.from(new Set(references.map((reference) => String(reference.attachedTo)).filter(Boolean)))
  const people = await adapter.listPeople(candidateIds)
  const personById = new Map(people.map((person) => [String(person._id), person]))

  const refsBySkill = new Map<string, HulyTagReference[]>()
  const refsByCandidate = new Map<string, HulyTagReference[]>()

  for (const reference of references) {
    const tagId = String(reference.tag)
    const candidateId = String(reference.attachedTo)

    const skillRefs = refsBySkill.get(tagId) ?? []
    skillRefs.push(reference)
    refsBySkill.set(tagId, skillRefs)

    const candidateRefs = refsByCandidate.get(candidateId) ?? []
    candidateRefs.push(reference)
    refsByCandidate.set(candidateId, candidateRefs)
  }

  const levels: Record<SkillLevel, number> = {
    Unset: 0,
    Initial: 0,
    Meaningful: 0,
    Expert: 0,
    Unknown: 0
  }

  for (const reference of references) {
    levels[skillLevel(reference.weight)] += 1
  }

  const skillRows: SkillInspectionRow[] = skills.map((skill) => {
    const skillRefs = refsBySkill.get(String(skill._id)) ?? []
    const category = categoryById.get(String(skill.category ?? ''))
    const otherCategory = isOtherCategory(category)

    return {
      id: String(skill._id),
      skill: String(skill.title),
      category: categoryLabel(category, String(skill.category ?? '')),
      references: skillRefs.length,
      expert: skillRefs.filter((ref) => skillLevel(ref.weight) === 'Expert').length,
      meaningful: skillRefs.filter((ref) => skillLevel(ref.weight) === 'Meaningful').length,
      initial: skillRefs.filter((ref) => skillLevel(ref.weight) === 'Initial').length,
      unset: skillRefs.filter((ref) => skillLevel(ref.weight) === 'Unset').length,
      otherCategory,
      // Huly v0.7.426's Skills Optimizer treats low-reference skills in the
      // default Other category differently from skills in named categories.
      optimizerRisk: otherCategory && skillRefs.length < 2
    }
  }).sort((a, b) => {
    if (b.references !== a.references) return b.references - a.references
    return a.skill.localeCompare(b.skill)
  })

  const candidates: CandidateInspection[] = Array.from(refsByCandidate.entries()).map(([candidateId, candidateRefs]) => {
    const rows: CandidateSkillRow[] = candidateRefs.map((reference) => {
      const skill = skillById.get(String(reference.tag))
      const category = skill === undefined
        ? undefined
        : categoryById.get(String(skill.category ?? ''))

      return {
        skill: String(skill?.title ?? reference.title ?? reference.tag),
        category: categoryLabel(category, String(skill?.category ?? '')),
        weight: reference.weight === undefined || reference.weight === null ? null : Number(reference.weight),
        level: skillLevel(reference.weight),
        tagId: String(reference.tag),
        referenceId: String(reference._id)
      }
    }).sort((a, b) => a.skill.localeCompare(b.skill))

    return {
      id: candidateId,
      name: personName(personById.get(candidateId), candidateId),
      skills: rows
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // The Skills Optimizer groups expert-level references by normalized title
  // and enables a title by default only when it has at least five references.
  const expertTitleCounts = new Map<string, number>()
  for (const reference of references) {
    if (skillLevel(reference.weight) !== 'Expert') continue
    const skill = skillById.get(String(reference.tag))
    const title = String(skill?.title ?? reference.title ?? '').trim()
    if (!title) continue
    const key = normalize(title)
    expertTitleCounts.set(key, (expertTitleCounts.get(key) ?? 0) + 1)
  }

  return {
    summary: {
      categories: categories.length,
      builtInSuggestions: categories.reduce(
        (total, category) => total + (Array.isArray(category.tags) ? category.tags.length : 0),
        0
      ),
      materializedSkills: skills.length,
      skillReferences: references.length,
      candidatesWithSkills: refsByCandidate.size
    },
    levels,
    optimizer: {
      otherSkills: skillRows.filter((row) => row.otherCategory).length,
      lowReferenceOtherSkills: skillRows.filter((row) => row.optimizerRisk).length,
      unreferencedSkills: skillRows.filter((row) => row.references === 0).length,
      expertTitles: expertTitleCounts.size,
      expertTitlesEnabledByDefault: Array.from(expertTitleCounts.values()).filter((count) => count >= 5).length
    },
    skills: skillRows,
    candidates
  }
}
