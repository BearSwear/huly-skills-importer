export interface HulyConnectionOptions {
  url: string
  workspace: string
  token?: string
  email?: string
  password?: string
  transport: 'websocket' | 'rest'
}

export interface CatalogCategory {
  aliases: string[]
}

export interface CatalogSkill {
  name: string
  category: string
  description: string
  color?: number
}

export interface SkillCatalog {
  version: number
  name: string
  description?: string
  categories: Record<string, CatalogCategory>
  skills: CatalogSkill[]
}

/** Minimal Huly TagCategory shape needed by this project. */
export interface HulyTagCategory {
  _id: string
  label?: string
  targetClass?: string
  default?: boolean
  tags?: string[]
  [key: string]: unknown
}

/** Minimal Huly TagElement shape needed by this project. */
export interface HulyTagElement {
  _id: string
  space: string
  title: string
  description?: string
  targetClass?: string
  color?: number
  category?: string
  [key: string]: unknown
}

/** Minimal Huly TagReference shape used for candidate skill assignments. */
export interface HulyTagReference {
  _id: string
  tag: string
  title?: string
  attachedTo: string
  attachedToClass?: string
  collection?: string
  weight?: number
  [key: string]: unknown
}

/** Minimal Person shape used to resolve candidate display names. */
export interface HulyPerson {
  _id: string
  name?: string
  [key: string]: unknown
}

export interface CategoryInfo {
  id: string
  label: string
  targetClass: string
  default: boolean
  tags: string[]
}

export type SkillUpdateField = 'title' | 'description' | 'category' | 'color'

export interface SkillUpdateChange {
  field: SkillUpdateField
  from: string | number
  to: string | number
}

export interface ImportPlanItem {
  skill: CatalogSkill
  action: 'create' | 'skip' | 'update'
  categoryId: string
  categoryLabel: string
  existing?: HulyTagElement
  reason?: string
  changes?: SkillUpdateChange[]
}

export interface ImportSummary {
  requested: number
  existing: number
  created: number
  updated: number
  skipped: number
  errors: number
}

export type SkillLevel = 'Unset' | 'Initial' | 'Meaningful' | 'Expert' | 'Unknown'

export interface HulySkillAdapter {
  listCategories(): Promise<HulyTagCategory[]>
  listSkills(): Promise<HulyTagElement[]>
  listSkillReferences(): Promise<HulyTagReference[]>
  listPeople(ids: string[]): Promise<HulyPerson[]>
  createSkill(skill: CatalogSkill, categoryId: string): Promise<string>
  updateSkill(existing: HulyTagElement, skill: CatalogSkill, categoryId: string): Promise<void>
  close(): Promise<void>
}
