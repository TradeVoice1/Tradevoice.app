import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Note: React StrictMode disabled in dev because its double-invoke of effects
// orphans the supabase-js gotrue auth lock (a localStorage mutex), which makes
// sign-in hang for 5+ seconds on every refresh. Re-enable for a final QA pass
// before launch to surface any double-effect bugs.
createRoot(document.getElementById('root')).render(<App />)
