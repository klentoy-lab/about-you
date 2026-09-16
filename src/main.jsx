import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'framer-motion'
import App from './App.jsx'
import './lib/sync.js' // starts syncing whenever someone is signed in
import { DUR, SOFT } from './lib/motion.js'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: SOFT }}>
      <App />
    </MotionConfig>
  </StrictMode>,
)
