import type { CatalogSkill } from './types.js'

/** Deterministic cosmetic color helper matching Huly's observed 0-23 range. */
export function colorForText(text: string): number {
  let hash = 0
  for (const char of text) {
    hash = ((hash << 5) - hash + char.codePointAt(0)!) | 0
  }
  return Math.abs(hash) % 24
}

export function desiredSkillColor(skill: CatalogSkill): number {
  return skill.color ?? colorForText(skill.name)
}
