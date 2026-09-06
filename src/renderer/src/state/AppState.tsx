import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { getStep, steps } from '@renderer/flow/steps'
import type { FlowStateValues, LogEntry } from '@renderer/flow/types'

interface AppStateShape {
  currentStepId: string
  history: string[]
  values: FlowStateValues
  log: LogEntry[]
  direction: 'forward' | 'back'
  goto: (stepId: string, setState?: Partial<FlowStateValues>) => void
  back: (setState?: Partial<FlowStateValues>) => void
  reset: () => void
  canGoBack: boolean
  pushLog: (text: string, tone?: LogEntry['tone']) => void
}

const initialValues: FlowStateValues = {
  firmwareReady: null,
  selectedDrive: null,
  selectedBuildId: 'filmatura',
  offlineMode: false,
  mlVersion: null,
  mlBuildName: null,
  bootLogoBmpBase64: null,
  bootLogoPreviewDataUrl: null
}

const AppStateContext = createContext<AppStateShape | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [currentStepId, setCurrentStepId] = useState(steps[0].id)
  const [history, setHistory] = useState<string[]>([])
  const [values, setValues] = useState<FlowStateValues>(initialValues)
  const [log, setLog] = useState<LogEntry[]>([])
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')

  const pushLog = useCallback((text: string, tone: LogEntry['tone'] = 'default') => {
    setLog((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, time: new Date().toLocaleTimeString(), text, tone }
    ])
  }, [])

  const goto = useCallback(
    (stepId: string, setState?: Partial<FlowStateValues>) => {
      getStep(stepId) // throws on unknown id - fail loud during development
      setDirection('forward')
      setHistory((prev) => [...prev, currentStepId])
      if (setState) setValues((prev) => ({ ...prev, ...setState }))
      setCurrentStepId(stepId)
    },
    [currentStepId]
  )

  const back = useCallback((setState?: Partial<FlowStateValues>) => {
    setDirection('back')
    if (setState) setValues((prev) => ({ ...prev, ...setState }))
    setHistory((prev) => {
      if (prev.length === 0) return prev
      const next = [...prev]
      const last = next.pop() as string
      setCurrentStepId(last)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setDirection('forward')
    setHistory([])
    setValues(initialValues)
    setLog([])
    setCurrentStepId(steps[0].id)
  }, [])

  const value = useMemo<AppStateShape>(
    () => ({
      currentStepId,
      history,
      values,
      log,
      direction,
      goto,
      back,
      reset,
      canGoBack: history.length > 0,
      pushLog
    }),
    [currentStepId, history, values, log, direction, goto, back, reset, pushLog]
  )

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState(): AppStateShape {
  const ctx = useContext(AppStateContext)
  if (!ctx) throw new Error('useAppState must be used within AppStateProvider')
  return ctx
}
