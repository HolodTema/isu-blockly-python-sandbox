import { CodeRunnerPage } from '../pages/CodeRunnerPage'
import { ToastProvider } from '../shared/ui/ToastProvider'
import '../index.css'

export function App() {

  return (
    <ToastProvider>
      <CodeRunnerPage />
    </ToastProvider>
  )

}
