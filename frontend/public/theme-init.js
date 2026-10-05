// Apply the saved palette before the first paint; never persist user/session data here.
let theme = 'turquoise'
try {
  const current = localStorage.getItem('northside-theme')
  const legacy = current === null ? localStorage.getItem('forma-theme') : null
  theme = (current ?? legacy) === 'orange' ? 'orange' : 'turquoise'
  if (current === null && (legacy === 'orange' || legacy === 'turquoise')) {
    try {
      localStorage.setItem('northside-theme', legacy)
      localStorage.removeItem('forma-theme')
    } catch { /* Keep the readable preference even if migration cannot be saved. */ }
  }
} catch { /* Use the default palette if browser storage is unavailable. */ }
document.documentElement.dataset.theme = theme
document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'orange' ? '#24201E' : '#1F2833')
