import { reactive } from 'vue'

const STORAGE_KEY = 'carwash-theme'
const DEFAULT_THEME = 'dark'

function applyTheme(mode) {
  const html = document.documentElement
  html.setAttribute('data-theme', mode)
  // Enable Element Plus built-in dark mode
  if (mode === 'dark') {
    html.classList.add('dark')
  } else {
    html.classList.remove('dark')
  }
}

export const themeStore = reactive({
  mode: localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME,

  get isDark() {
    return this.mode === 'dark'
  },

  toggle() {
    this.mode = this.mode === 'light' ? 'dark' : 'light'
    localStorage.setItem(STORAGE_KEY, this.mode)
    applyTheme(this.mode)
  },

  init() {
    if (!localStorage.getItem(STORAGE_KEY)) {
      localStorage.setItem(STORAGE_KEY, this.mode)
    }
    applyTheme(this.mode)
  }
})
