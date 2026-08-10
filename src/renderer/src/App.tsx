import { useEffect } from 'react'
import { AppStateProvider } from '@renderer/state/AppState'
import { StepEngine } from '@renderer/flow/StepEngine'
import './App.css'

function App(): React.JSX.Element {
  useEffect(() => {
    window.api.getPlatform().then((platform) => {
      document.documentElement.dataset.platform = platform
    })
  }, [])

  return (
    <AppStateProvider>
      <div className="app-titlebar" />
      <StepEngine />
    </AppStateProvider>
  )
}

export default App
