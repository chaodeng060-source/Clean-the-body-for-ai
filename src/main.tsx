import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BodyCleanPanel } from './BodyCleanPanel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BodyCleanPanel active />
  </StrictMode>,
)
