import { createRequire } from 'node:module'
import { desiredSkillColor } from './skill-values.js'
import type {
  CatalogSkill,
  HulyConnectionOptions,
  HulyPerson,
  HulySkillAdapter,
  HulyTagCategory,
  HulyTagElement,
  HulyTagReference
} from './types.js'

// Keep Huly-specific resource IDs isolated here. These IDs were verified
// against a self-hosted Huly v0.7.426 workspace during live compatibility tests.
const TAG_CATEGORY_CLASS = 'tags:class:TagCategory'
const TAG_ELEMENT_CLASS = 'tags:class:TagElement'
const TAG_REFERENCE_CLASS = 'tags:class:TagReference'
const RECRUIT_CANDIDATE_MIXIN = 'recruit:mixin:Candidate'
const PERSON_CLASS = 'contact:class:Person'
const WORKSPACE_SPACE = 'core:space:Workspace'
const SKILLS_COLLECTION = 'skills'

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

// @hcengineering/api-client@0.7.423 is published without usable TypeScript
// declarations. Runtime loading keeps this integration small while avoiding
// direct dependencies on Huly's platform-internal plugin packages.
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

export async function connectHuly(options: HulyConnectionOptions): Promise<HulySkillAdapter> {
  const auth = authOptions(options)
  const rawClient = options.transport === 'rest'
    ? await apiClient.connectRest(options.url, auth)
    : await apiClient.connect(options.url, auth)

  const client = rawClient as MinimalClient

  return {
    async listCategories(): Promise<HulyTagCategory[]> {
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

    async listSkillReferences(): Promise<HulyTagReference[]> {
      return await client.findAll<HulyTagReference>(
        TAG_REFERENCE_CLASS,
        {
          attachedToClass: RECRUIT_CANDIDATE_MIXIN,
          collection: SKILLS_COLLECTION
        }
      )
    },

    async listPeople(ids: string[]): Promise<HulyPerson[]> {
      if (ids.length === 0) return []

      // Keep query payloads modest for workspaces with many candidates.
      const result: HulyPerson[] = []
      const chunkSize = 200
      for (let offset = 0; offset < ids.length; offset += chunkSize) {
        const chunk = ids.slice(offset, offset + chunkSize)
        result.push(...await client.findAll<HulyPerson>(
          PERSON_CLASS,
          { _id: { $in: chunk } }
        ))
      }
      return result
    },

    async createSkill(skill: CatalogSkill, categoryId: string): Promise<string> {
      const color = desiredSkillColor(skill)
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
      const color = desiredSkillColor(skill)
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
