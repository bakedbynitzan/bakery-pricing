import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// ===== עדכון אוטומטי =====
// GitHub Pages שומר את index.html במטמון (~10 דק'), כך שהטלפון עלול
// לטעון גרסה ישנה. אנחנו בודקים את version.json (ללא מטמון) ומשווים
// למזהה הבנייה הנוכחי; אם יש גרסה חדשה — טוענים אותה עם ?v חדש
// (מפתח מטמון שונה => index.html טרי מהשרת), עם שמירה מפני לולאה.
async function checkForUpdate() {
  try {
    const res = await fetch(
      `${import.meta.env.BASE_URL}version.json?ts=${Date.now()}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return
    const { build } = await res.json()
    if (!build || build === __BUILD_ID__) return
    // מונע לולאת רענון אם משהו משתבש
    if (sessionStorage.getItem('reloadedForBuild') === build) return
    sessionStorage.setItem('reloadedForBuild', build)
    const url = new URL(window.location.href)
    url.searchParams.set('v', build)
    window.location.replace(url.toString())
  } catch {
    /* אופליין / שגיאת רשת — מתעלמים */
  }
}

checkForUpdate()
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') checkForUpdate()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
