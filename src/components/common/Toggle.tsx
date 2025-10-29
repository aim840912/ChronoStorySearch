/**
 * Toggle Switch 元件
 *
 * 標準的開關切換元件，用於布林值設定
 *
 * 使用範例：
 * ```tsx
 * <Toggle
 *   enabled={isEnabled}
 *   onChange={setIsEnabled}
 *   disabled={isLoading}
 *   label="啟用功能"
 * />
 * ```
 */

'use client'

interface ToggleProps {
  /** 開關狀態 */
  enabled: boolean
  /** 狀態變更回調 */
  onChange: (enabled: boolean) => void
  /** 是否禁用 */
  disabled?: boolean
  /** 標籤文字（可選） */
  label?: string
  /** ARIA 標籤 */
  ariaLabel?: string
}

export function Toggle({ enabled, onChange, disabled = false, label, ariaLabel }: ToggleProps) {
  const handleClick = () => {
    if (!disabled) {
      onChange(!enabled)
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={ariaLabel || label}
      onClick={handleClick}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors duration-200 ease-in-out
        ${enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full
          bg-white shadow-sm transition-transform duration-200 ease-in-out
          ${enabled ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
