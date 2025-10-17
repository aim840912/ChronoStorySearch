import { useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastState {
  isVisible: boolean
  message: string
  type: ToastType
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    isVisible: false,
    message: '',
    type: 'success',
  })

  const showToast = useCallback((message: string, type: ToastType = 'success') => {
    setToast({
      isVisible: true,
      message,
      type,
    })
  }, [])

  const hideToast = useCallback(() => {
    setToast((prev) => ({
      ...prev,
      isVisible: false,
    }))
  }, [])

  return {
    ...toast,
    showToast,
    hideToast,
  }
}
