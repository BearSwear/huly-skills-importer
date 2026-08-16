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

/** Minimal Huly TagCategory shape needed by the importer. */
export interface HulyTagCategory {
  _id: string
  label?: string
  targetClass?: string
  default?: boolean
  tags?: string[]
  [key: string]: unknown
}

/** Minimal Huly TagElement shape needed by the importer. */
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

export interface CategoryInfo {
  id: string
  label: string
  targetClass: string
  default: boolean
  tags: string[]
}

export interface ImportPlanItem {
  skill: CatalogSkill
  action: 'create' | 'skip' | 'update'
  categoryId: string
  categoryLabel: string
  existing?: HulyTagElement
  reason?: string
}

export interface ImportSummary {
  requested: number
  existing: number
  created: number
  updated: number
  skipped: number
  errors: number
}

export interface HulySkillAdapter {
  listCategories(): Promise<HulyTagCategory[]>
  listSkills(): Promise<HulyTagElement[]>
  createSkill(skill: CatalogSkill, categoryId: string): Promise<string>
  updateSkill(existing: HulyTagElement, skill: CatalogSkill, categoryId: string): Promise<void>
  close(): Promise<void>
}
