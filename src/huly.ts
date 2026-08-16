import { createRequire } from 'node:module'
import type {
  CatalogSkill,
  HulyConnectionOptions,
  HulySkillAdapter,
  HulyTagCategory,
  HulyTagElement
} from './types.js'

// Keep Huly-specific resource IDs isolated here. These IDs were verified
// against a self-hosted Huly v0.7.426 workspace during read-only discovery.
const TAG_CATEGORY_CLASS = 'tags:class:TagCategory'
const TAG_ELEMENT_CLASS = 'tags:class:TagElement'
const RECRUIT_CANDIDATE_MIXIN = 'recruit:mixin:Candidate'
const WORKSPACE_SPACE = 'core:space:Workspace'

interface ApiClientModule {
  connect: (url: string, options: Record<string, string>) => Promise<unknown>
  connectRest: (url: string, options: Record<string, string>) => Promise<unknown>
}

type MinimalClient = {
  findAll<T>(clazz: string, query: Record<string, unknown>): Promise<T[]>
  createDoc<T>(clazz: string, space: string, attributes: Record<string, unknown>): Promise<unknown>
  updateDoc<T>(clazz: string, space: string, objectId: string, operations: Record<string, unknown>): Promise<unknown>
  close?: () => Promise<void>
}

// @hcengineering/api-client@0.7.423 is currently published without usable
// TypeScript declarations. Loading it at runtime keeps this integration small
// while avoiding direct dependencies on Huly's internal plugin packages.
const require = createRequire(import.meta.url)
const apiClient = require('@hcengineering/api-client') as ApiClientModule

function cleanToken(token: string | undefined): string | undefined {
  if (token === undefined) return undefined
  // Huly API tokens contain no whitespace. Removing accidental line wrapping
  // avoids invalid HTTP Authorization header values when copying tokens.
  const cleaned = token.replace(/\s+/g, '')
  return cleaned.length > 0 ? cleaned : undefined
}

function authOptions(options: HulyConnectionOptions): Record<string, string> {
  const token = cleanToken(options.token)
  if (token !== undefined) {
    return {
      token,
      workspace: options.workspace
    }
  }

  if (options.email?.trim() && options.password) {
    return {
      email: options.email.trim(),
      password: options.password,
      workspace: options.workspace
    }
  }

  throw new Error('Set HULY_TOKEN, or set both HULY_EMAIL and HULY_PASSWORD')
}

/**
 * Small deterministic color helper so the importer does not need
 * @hcengineering/ui. The exact color is cosmetic; Huly stores an integer.
 */
function colorForText(text: string): number {
  let hash = 0
  for (const char of text) {
    hash = ((hash << 5) - hash + char.codePointAt(0)!) | 0
  }
  return Math.abs(hash) % 10
}

export async function connectHuly(options: HulyConnectionOptions): Promise<HulySkillAdapter> {
  const auth = authOptions(options)
  const rawClient = options.transport === 'rest'
    ? await apiClient.connectRest(options.url, auth)
    : await apiClient.connect(options.url, auth)

  const client = rawClient as MinimalClient

  return {
    async listCategories(): Promise<HulyTagCategory[]> {
      // Query only Recruiting skill categories. This avoids unrelated Board,
      // Document, Task, Time and Tracker tag categories in discovery output.
      return await client.findAll<HulyTagCategory>(
        TAG_CATEGORY_CLASS,
        { targetClass: RECRUIT_CANDIDATE_MIXIN }
      )
    },

    async listSkills(): Promise<HulyTagElement[]> {
      return await client.findAll<HulyTagElement>(
        TAG_ELEMENT_CLASS,
        { targetClass: RECRUIT_CANDIDATE_MIXIN }
      )
    },

    async createSkill(skill: CatalogSkill, categoryId: string): Promise<string> {
      const color = skill.color ?? colorForText(skill.name)
      const id = await client.createDoc<HulyTagElement>(
        TAG_ELEMENT_CLASS,
        WORKSPACE_SPACE,
        {
          title: skill.name,
          description: skill.description,
          targetClass: RECRUIT_CANDIDATE_MIXIN,
          color,
          category: categoryId
        }
      )
      return String(id)
    },

    async updateSkill(existing: HulyTagElement, skill: CatalogSkill, categoryId: string): Promise<void> {
      const color = skill.color ?? colorForText(skill.name)
      await client.updateDoc<HulyTagElement>(
        TAG_ELEMENT_CLASS,
        existing.space,
        existing._id,
        {
          title: skill.name,
          description: skill.description,
          category: categoryId,
          color
        }
      )
    },

    async close(): Promise<void> {
      if (typeof client.close === 'function') await client.close()
    }
  }
}
