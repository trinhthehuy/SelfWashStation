import { ElMessageBox } from 'element-plus'

const DEFAULT_CONFIRM_OPTIONS = {
  type: 'warning',
  confirmButtonText: 'Đồng ý',
  cancelButtonText: 'Hủy',
  distinguishCancelAndClose: true,
  closeOnClickModal: false,
  customClass: 'app-confirm-dialog'
}

const mergeCustomClass = (baseClass, customClass) => {
  if (!customClass) return baseClass
  return `${baseClass} ${customClass}`
}

export const confirmPopup = async (message, title = 'Xác nhận', options = {}) => {
  try {
    await ElMessageBox.confirm(message, title, {
      ...DEFAULT_CONFIRM_OPTIONS,
      ...options,
      customClass: mergeCustomClass(DEFAULT_CONFIRM_OPTIONS.customClass, options.customClass)
    })
    return true
  } catch {
    return false
  }
}
