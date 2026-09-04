import posthog from 'posthog-js'
import { APP_VERSION } from '@renderer/version'

const PROJECT_API_KEY = 'phc_BLwAjoZzHWw5Dokygn6K8hy8imEn2RY5bxFFLwNQEDmW'
const HOST = 'https://eu.i.posthog.com'

let ready = false

/**
 * Runs client-side (not through main via IPC) because session replay is a
 * browser-SDK feature - it records the actual DOM/rrweb stream from this
 * renderer, which a main-process-only client couldn't produce. The
 * distinct id posthog-js generates is random and stored in this renderer's
 * localStorage, never tied to a name/email/IP.
 *
 * Only runs in packaged builds - dev runs would otherwise pollute real
 * usage data. `platform` is a super property so every event (not just this
 * one) carries it without passing it explicitly each time.
 */
export function initAnalytics(platform: string): void {
  if (!import.meta.env.PROD || ready) return
  posthog.init(PROJECT_API_KEY, {
    api_host: HOST,
    person_profiles: 'always',
    capture_pageview: false,
    autocapture: false
  })
  posthog.register({ app_version: APP_VERSION, platform })
  ready = true
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!ready) return
  posthog.capture(event, properties)
}
