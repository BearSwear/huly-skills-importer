import type { TagCategory, TagElement } from '@hcengineering/tags'

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
  phases?: number[]
  color?: number
}

export interface SkillCatalog {
  version: number
  name: string
  description?: string
  categories: Record<string, CatalogCategory>
  skills: CatalogSkill[]
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
  existing?: TagElement
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
  listCategories(): Promise<TagCategory[]>
  listSkills(): Promise<TagElement[]>
  createSkill(skill: CatalogSkill, categoryId: string): Promise<string>
  updateSkill(existing: TagElement, skill: CatalogSkill, categoryId: string): Promise<void>
  close(): Promise<void>
}
