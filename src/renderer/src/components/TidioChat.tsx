import { useEffect } from 'react'
import { track } from '@renderer/services/analytics'

const TIDIO_SCRIPT_ID = 'tidio-chat-script'
const TIDIO_SRC = 'https://code.tidio.co/l9iuimoiyier6lulmpnpp81jdaakpqyn.js'
const TIDIO_STYLE_ID = 'tidio-chat-position-override'

declare global {
  interface Window {
    tidioChatApi?: {
      show: () => void
      hide: () => void
      open: () => void
      close: () => void
    }
  }
}

/**
 * Lazy-loaded only when the user is actually on the troubleshooting step.
 * The script itself is only ever injected once (Tidio doesn't handle being
 * reloaded cleanly - it leaves duplicate widget instances behind), but the
 * WIDGET is explicitly shown on mount and hidden on unmount via Tidio's own
 * `tidioChatApi`, since it renders its bubble/iframe directly onto
 * `document.body`, entirely outside React's tree - unmounting this
 * component alone does nothing to it.
 */
export function TidioChat(): null {
  useEffect(() => {
    let cancelled = false
    const showWidget = (): void => {
      if (!cancelled) window.tidioChatApi?.show()
    }
    // Tidio's own lifecycle event, fired each time the visitor opens the
    // chat window - this is the "did they actually use it" signal, not
    // just "was the bubble visible."
    const trackOpen = (): void => track('tidio_chat_opened')
    document.addEventListener('tidioChat-open', trackOpen)

    if (!document.getElementById(TIDIO_STYLE_ID)) {
      // Best-effort nudge so the bubble clears our own footer buttons.
      // If Tidio's actual container id/class differs from these guesses,
      // the reliable fix is the vertical offset setting in the Tidio
      // dashboard (Live Chat Widget -> Appearance) instead.
      const style = document.createElement('style')
      style.id = TIDIO_STYLE_ID
      style.textContent = `
        #tidio-chat-iframe, #tidio-chat, iframe[title*="tidio" i], iframe[id*="tidio" i] {
          bottom: 90px !important;
        }
      `
      document.head.appendChild(style)
    }

    if (!document.getElementById(TIDIO_SCRIPT_ID)) {
      const script = document.createElement('script')
      script.id = TIDIO_SCRIPT_ID
      script.src = TIDIO_SRC
      script.async = true
      document.body.appendChild(script)
      document.addEventListener('tidioChat-ready', showWidget)
    } else {
      showWidget()
    }

    return () => {
      cancelled = true
      document.removeEventListener('tidioChat-ready', showWidget)
      document.removeEventListener('tidioChat-open', trackOpen)
      window.tidioChatApi?.hide()
    }
  }, [])

  return null
}
