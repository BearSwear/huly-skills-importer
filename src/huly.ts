import { connect, connectRest } from '@hcengineering/api-client'
import core from '@hcengineering/core'
import recruit from '@hcengineering/recruit'
import tags, { type TagCategory, type TagElement } from '@hcengineering/tags'
import { getColorNumberByText } from '@hcengineering/ui'
import type { CatalogSkill, HulyConnectionOptions, HulySkillAdapter } from './types.js'

type MinimalClient = {
  findAll<T>(clazz: unknown, query: Record<string, unknown>): Promise<T[]>
  createDoc<T>(clazz: unknown, space: unknown, attributes: Record<string, unknown>): Promise<unknown>
  updateDoc<T>(clazz: unknown, space: unknown, objectId: unknown, operations: Record<string, unknown>): Promise<unknown>
  close?: () => Promise<void>
}

function authOptions(options: HulyConnectionOptions): Record<string, string> {
  if (options.token?.trim()) {
    return {
      token: options.token.trim(),
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
  const auth = authOptions(options) as any
  const rawClient = options.transport === 'rest'
    ? await connectRest(options.url, auth)
    : await connect(options.url, auth)

  const client = rawClient as unknown as MinimalClient

  return {
    async listCategories(): Promise<TagCategory[]> {
      // Recruiting skill categories normally target the Candidate mixin.
      // Fall back to all categories to support version/workspace differences
      // and let the caller show useful diagnostics.
      const candidateCategories = await client.findAll<TagCategory>(
        tags.class.TagCategory,
        { targetClass: recruit.mixin.Candidate }
      )

      if (candidateCategories.length > 0) return candidateCategories
      return await client.findAll<TagCategory>(tags.class.TagCategory, {})
    },

    async listSkills(): Promise<TagElement[]> {
      return await client.findAll<TagElement>(
        tags.class.TagElement,
        { targetClass: recruit.mixin.Candidate }
      )
    },

    async createSkill(skill: CatalogSkill, categoryId: string): Promise<string> {
      const color = skill.color ?? getColorNumberByText(skill.name)
      const id = await client.createDoc<TagElement>(
        tags.class.TagElement,
        core.space.Workspace,
        {
          title: skill.name,
          description: skill.description,
          targetClass: recruit.mixin.Candidate,
          color,
          category: categoryId
        }
      )
      return String(id)
    },

    async updateSkill(existing: TagElement, skill: CatalogSkill, categoryId: string): Promise<void> {
      const color = skill.color ?? getColorNumberByText(skill.name)
      await client.updateDoc<TagElement>(
        tags.class.TagElement,
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
