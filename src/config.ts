import 'dotenv/config'
import type { HulyConnectionOptions } from './types.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function hulyConnectionFromEnv(): HulyConnectionOptions {
  const transportValue = (process.env.HULY_TRANSPORT ?? 'websocket').trim().toLowerCase()
  if (transportValue !== 'websocket' && transportValue !== 'rest') {
    throw new Error('HULY_TRANSPORT must be either websocket or rest')
  }

  return {
    url: required('HULY_URL').replace(/\/$/, ''),
    workspace: required('HULY_WORKSPACE'),
    token: process.env.HULY_TOKEN,
    email: process.env.HULY_EMAIL,
    password: process.env.HULY_PASSWORD,
    transport: transportValue
  }
}
