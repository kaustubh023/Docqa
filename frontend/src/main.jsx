import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AuthProvider } from './context/AuthContext.jsx' // <-- Import our Provider

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Wrap the App component so Auth is available everywhere */}
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)