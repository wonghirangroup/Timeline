// employee/src/lib/liff.ts
type LiffType = typeof import('@line/liff').default

let _liff: LiffType | null = null
let _initialized = false

async function _get(): Promise<LiffType> {
  if (!_liff) {
    const mod = await import('@line/liff')
    _liff = mod.default
  }
  return _liff
}

const SESSION_KEY = 'tl_liff_id'

/** อ่าน LIFF ID จาก ?lid= → sessionStorage → env var (ตามลำดับ) */
export function getLiffId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('lid')
  if (fromUrl) {
    // บันทึกก่อน LINE OAuth redirect จะกิน URL ทิ้ง
    sessionStorage.setItem(SESSION_KEY, fromUrl)
    return fromUrl
  }
  // หลัง redirect กลับมา lid หายจาก URL แต่ยังอยู่ใน sessionStorage
  return sessionStorage.getItem(SESSION_KEY) ?? (import.meta.env.VITE_LIFF_ID as string) ?? ''
}

/** ดึง Channel ID จาก LIFF ID (ส่วนแรกก่อน "-") */
export function getChannelId(): string {
  return getLiffId().split('-')[0] ?? ''
}

export async function initLiff(): Promise<void> {
  if (_initialized) return
  const liff = await _get()
  await liff.init({ liffId: getLiffId() })
  _initialized = true
}

export async function getLiffProfile(): Promise<{
  lineUserId: string
  displayName: string
  pictureUrl?: string
  idToken: string
}> {
  const liff = await _get()
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: liffRedirectUri() })
    await new Promise(() => {})
  }
  const profile = await liff.getProfile()
  const idToken = liff.getIDToken() ?? ''
  return { lineUserId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl, idToken }
}

// redirectUri ที่มี ?lid= เสมอ เพื่อให้ getChannelId() ยังทำงานได้หลัง redirect
function liffRedirectUri(): string {
  const liffId = getLiffId()
  const base = `${window.location.origin}${window.location.pathname}`
  return liffId ? `${base}?lid=${liffId}` : window.location.href
}

// บังคับล็อกอินใหม่ทั้งหมด — ใช้ตอนเซิร์ฟเวอร์ตอบ INVALID_TOKEN (ID token หมดอายุ)
// เพราะ liff.isLoggedIn() ยังคง true อยู่แม้ ID token ที่ SDK แคชไว้จะหมดอายุไปแล้ว
// (login state กับอายุของ ID token เป็นคนละเรื่องกัน) ทำให้แค่เรียก getLiffProfile()
// ซ้ำจะได้ token เดิมที่หมดอายุแล้วกลับมาทุกครั้ง กด "ลองใหม่" ก็วนลูปเดิมไม่รู้จบ —
// ต้อง logout() ก่อนเพื่อเคลียร์ session แล้ว login() ใหม่ให้ได้ ID token ที่สดจริง
export async function forceRelogin(): Promise<never> {
  const liff = await _get()
  liff.logout()
  liff.login({ redirectUri: liffRedirectUri() })
  return new Promise<never>(() => {})
}

export async function isInLiff(): Promise<boolean> {
  const liff = await _get()
  return liff.isInClient()
}

export async function liffScanCodeV2() {
  const liff = await _get()
  return liff.scanCodeV2()
}
