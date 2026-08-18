// employee/src/lib/branding.ts
// ดึงภาพ Loading ของ tenant (ตั้งค่าโดย Admin) มาแสดงบนหน้าจอ boot ก่อน login เสร็จ
// เรียกได้ก่อน liff.init() เพราะ getChannelId() อ่านจาก URL/sessionStorage/env ได้ทันที ไม่ต้องรอ LIFF
import { api } from './axios'
import { getChannelId } from './liff'

const CACHE_KEY = 'tl_loading_img'

/** อ่านค่าที่แคชไว้จาก session ก่อนหน้า — ใช้ render ทันทีไม่ต้องรอ network */
export function getCachedLoadingImage(): string | null {
  try {
    return sessionStorage.getItem(CACHE_KEY)
  } catch {
    return null
  }
}

let inflight: Promise<string | null> | null = null

/** ดึงภาพจาก API ครั้งเดียวต่อ session (memoized) แล้วอัปเดต cache */
export function fetchLoadingImageOnce(): Promise<string | null> {
  if (inflight) return inflight
  const channelId = getChannelId()
  if (!channelId) return Promise.resolve(null)

  inflight = api
    .get('/employee/branding', { params: { line_channel_id: channelId } })
    .then(r => {
      const url = r.data?.data?.loading_image_url ?? null
      try {
        if (url) sessionStorage.setItem(CACHE_KEY, url)
        else sessionStorage.removeItem(CACHE_KEY)
      } catch { /* ignore เช่น private mode */ }
      return url
    })
    .catch(() => null)

  return inflight
}
