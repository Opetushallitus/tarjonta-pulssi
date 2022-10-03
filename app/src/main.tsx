import { render } from 'preact'
import { QueryClient, QueryClientProvider } from 'react-query'
import { App } from './app'
import './index.css'

const queryClient = new QueryClient()

const AppWrapper = () => {
  return <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
}

render(<AppWrapper />, document.getElementById('app') as HTMLElement)
