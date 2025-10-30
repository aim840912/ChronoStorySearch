import { LISTING_CONSTRAINTS } from '@/lib/config/system-config'
import { ValidationError } from '@/lib/errors'

/**
 * 驗證文字長度
 */
export function validateTextLength(
  text: string,
  fieldName: string,
  maxLength: number
): void {
  if (text.length > maxLength) {
    throw new ValidationError(
      `${fieldName}長度不得超過 ${maxLength} 字（當前：${text.length} 字）`
    )
  }
}

/**
 * 驗證留言
 */
export function validateMessage(
  message: string | null | undefined
): string | null {
  if (!message) {
    return null
  }

  const trimmed = message.trim()

  if (trimmed === '') {
    return null
  }

  // 長度檢查
  validateTextLength(trimmed, '留言', LISTING_CONSTRAINTS.MAX_MESSAGE_LENGTH)

  // 移除控制字元
  const cleaned = trimmed.replace(
    LISTING_CONSTRAINTS.TEXT_VALIDATION.FORBIDDEN_CHARS_REGEX,
    ''
  )

  return cleaned
}

/**
 * 驗證聯絡方式
 */
export function validateContactInfo(contactInfo: string): string {
  if (!contactInfo) {
    throw new ValidationError('聯絡方式不可為空')
  }

  const trimmed = contactInfo.trim()

  if (trimmed === '') {
    throw new ValidationError('聯絡方式不可為空')
  }

  // 長度檢查
  validateTextLength(
    trimmed,
    '聯絡方式',
    LISTING_CONSTRAINTS.MAX_CONTACT_INFO_LENGTH
  )

  // 移除控制字元
  const cleaned = trimmed.replace(
    LISTING_CONSTRAINTS.TEXT_VALIDATION.FORBIDDEN_CHARS_REGEX,
    ''
  )

  if (cleaned === '') {
    throw new ValidationError('聯絡方式包含無效字元')
  }

  return cleaned
}

/**
 * 驗證遊戲內角色名
 */
export function validateInGameName(
  name: string | null | undefined
): string | null {
  if (!name) {
    return null
  }

  const trimmed = name.trim()

  if (trimmed === '') {
    return null
  }

  // 長度檢查
  validateTextLength(
    trimmed,
    '遊戲內角色名',
    LISTING_CONSTRAINTS.MAX_IN_GAME_NAME_LENGTH
  )

  // 格式檢查（只允許字母、數字、中文、底線）
  const validNameRegex = /^[a-zA-Z0-9\u4e00-\u9fa5_]+$/
  if (!validNameRegex.test(trimmed)) {
    throw new ValidationError('遊戲內角色名只能包含字母、數字、中文和底線')
  }

  return trimmed
}
