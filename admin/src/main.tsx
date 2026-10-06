import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App'
import './index.css'
import 'leaflet/dist/leaflet.css'
import { ToastProvider } from './components/ui/Toast'
import ResultHost from './components/ui/ResultDialog'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
        <ResultHost />
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)
