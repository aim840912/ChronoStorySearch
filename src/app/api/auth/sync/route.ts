/**
 * 同步 Supabase Auth 用戶到應用資料庫
 *
 * POST /api/auth/sync
 *
 * 功能：
 * 1. 從 Supabase Auth 取得當前用戶
 * 2. 檢查用戶是否存在於 users 表
 * 3. 如果不存在，建立用戶記錄（users + discord_profiles）
 * 4. 如果存在，更新 last_login_at
 *
 * 使用場景：
 * - AuthContext 初始化時檢測到新登入
 * - OAuth 回調後確保用戶資料同步
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, supabaseAdmin } from '@/lib/supabase/server'
import { success } from '@/lib/api-response'
import { apiLogger, dbLogger } from '@/lib/logger'
import type { User } from '@supabase/supabase-js'

/**
 * 同步用戶到資料庫
 */
async function syncUserToDatabase(user: User) {
  const userId = user.id
  const metadata = user.user_metadata || {}

  // 提取 Discord 資訊
  const discordId = metadata.provider_id || metadata.sub
  const discordUsername = metadata.name || metadata.full_name || 'Unknown'
  // 嘗試多個可能的 avatar 欄位名稱
  const discordAvatar = metadata.avatar_url || metadata.avatar || metadata.picture || null
  const email = user.email || metadata.email

  if (!discordId) {
    throw new Error('Missing Discord ID in user metadata')
  }

  dbLogger.debug('Syncing user to database', {
    user_id: userId,
    discord_id: discordId,
    discord_avatar: discordAvatar,
    email,
    metadata_keys: Object.keys(metadata)
  })

  // 檢查用戶是否已存在（先檢查 user_id）
  const { data: existingUserById } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()

  if (existingUserById) {
    // 用戶已存在，只更新 last_login_at
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      dbLogger.error('Failed to update user last_login_at', {
        user_id: userId,
        error: updateError
      })
    } else {
      dbLogger.info('Updated user last_login_at', { user_id: userId })
    }
    return { isNew: false }
  }

  // 檢查是否存在相同 discord_id 的舊記錄（遷移場景）
  const { data: existingUserByDiscord } = await supabaseAdmin
    .from('users')
    .select('id, discord_id')
    .eq('discord_id', discordId)
    .single()

  if (existingUserByDiscord) {
    // 發現舊記錄：保留舊的 user_id，只更新其他資訊
    dbLogger.info('Found existing user with same discord_id, updating user info', {
      user_id: existingUserByDiscord.id,
      discord_id: discordId
    })

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({
        discord_username: discordUsername,
        discord_avatar: discordAvatar,
        email: email,
        last_login_at: new Date().toISOString()
      })
      .eq('discord_id', discordId)

    if (updateError) {
      dbLogger.error('Failed to update existing user', {
        user_id: existingUserByDiscord.id,
        discord_id: discordId,
        error: updateError
      })
      throw new Error(`Failed to update user: ${updateError.message}`)
    }

    // 檢查是否有 discord_profile，如果沒有則建立
    const { data: existingProfile } = await supabaseAdmin
      .from('discord_profiles')
      .select('user_id')
      .eq('user_id', existingUserByDiscord.id)
      .single()

    if (!existingProfile) {
      dbLogger.info('No discord_profile found for existing user, creating one', {
        user_id: existingUserByDiscord.id,
        discord_id: discordId
      })

      // 從 Discord Snowflake ID 計算帳號建立時間
      const discordEpoch = 1420070400000 // Discord epoch (2015-01-01)
      const snowflakeBigInt = BigInt(discordId)
      const shiftedBigInt = snowflakeBigInt >> BigInt(22)
      const snowflakeTimestamp = Number(shiftedBigInt) + discordEpoch
      const accountCreatedAt = new Date(snowflakeTimestamp).toISOString()

      const { error: profileInsertError } = await supabaseAdmin
        .from('discord_profiles')
        .insert({
          user_id: existingUserByDiscord.id,
          account_created_at: accountCreatedAt,
          server_roles: [],
          verified: false,
          reputation_score: 50, // 預設信譽分數
          profile_privacy: 'public'
        })

      if (profileInsertError) {
        dbLogger.error('Failed to create discord_profile for existing user', {
          user_id: existingUserByDiscord.id,
          discord_id: discordId,
          error: profileInsertError
        })
        // 不拋出錯誤，只記錄
      } else {
        dbLogger.info('Successfully created discord_profile for existing user', {
          user_id: existingUserByDiscord.id,
          discord_id: discordId
        })
      }
    }

    dbLogger.info('Successfully updated existing user', {
      user_id: existingUserByDiscord.id,
      discord_id: discordId
    })

    return { isNew: false }
  }

  // 用戶不存在，建立新記錄
  dbLogger.info('Creating new user record', {
    user_id: userId,
    discord_id: discordId
  })

  // 1. 插入 users 表
  const { error: userInsertError } = await supabaseAdmin
    .from('users')
    .insert({
      id: userId,
      discord_id: discordId,
      discord_username: discordUsername,
      discord_discriminator: '0', // Discord 已移除 discriminator
      discord_avatar: discordAvatar,
      email: email,
      last_login_at: new Date().toISOString()
    })

  if (userInsertError) {
    dbLogger.error('Failed to insert user', {
      user_id: userId,
      error: userInsertError
    })
    throw new Error(`Failed to create user record: ${userInsertError.message}`)
  }

  // 2. 插入 discord_profiles 表
  // 從 Discord Snowflake ID 計算帳號建立時間
  const discordEpoch = 1420070400000 // Discord epoch (2015-01-01)
  const snowflakeBigInt = BigInt(discordId)
  const shiftedBigInt = snowflakeBigInt >> BigInt(22)
  const snowflakeTimestamp = Number(shiftedBigInt) + discordEpoch
  const accountCreatedAt = new Date(snowflakeTimestamp).toISOString()

  const { error: profileInsertError } = await supabaseAdmin
    .from('discord_profiles')
    .insert({
      user_id: userId,
      account_created_at: accountCreatedAt,
      server_roles: [],
      verified: false,
      reputation_score: 50, // 預設信譽分數
      profile_privacy: 'public'
    })

  if (profileInsertError) {
    dbLogger.error('Failed to insert discord profile', {
      user_id: userId,
      error: profileInsertError
    })
    // 不拋出錯誤，因為 users 表已經建立成功
  } else {
    dbLogger.info('Created new user and discord profile', {
      user_id: userId,
      discord_id: discordId
    })
  }

  return { isNew: true }
}

/**
 * POST /api/auth/sync
 *
 * 同步當前登入用戶到資料庫
 */
export async function POST(_request: NextRequest) {
  try {
    // 1. 從 Supabase Auth 取得當前用戶
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: '未登入',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      )
    }

    // 2. 同步用戶到資料庫
    const { isNew } = await syncUserToDatabase(user)

    apiLogger.info('User synced successfully', {
      user_id: user.id,
      is_new_user: isNew
    })

    return success(
      { user_id: user.id, is_new_user: isNew },
      isNew ? '用戶建立成功' : '用戶資料已更新'
    )
  } catch (error) {
    apiLogger.error('Failed to sync user', { error })
    return NextResponse.json(
      {
        success: false,
        error: '同步用戶失敗',
        code: 'SYNC_USER_ERROR'
      },
      { status: 500 }
    )
  }
}
