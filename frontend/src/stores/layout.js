import { reactive } from 'vue'

export const layoutStore = reactive({
  mobileMenuOpen: false,
  toggle() { this.mobileMenuOpen = !this.mobileMenuOpen },
  close()  { this.mobileMenuOpen = false }
})
