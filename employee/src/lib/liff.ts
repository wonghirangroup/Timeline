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
    // สร้าง redirectUri ที่มี ?lid= เสมอ เพื่อให้ getChannelId() ยังทำงานได้หลัง redirect
    const liffId = getLiffId()
    const base = `${window.location.origin}${window.location.pathname}`
    const redirectUri = liffId ? `${base}?lid=${liffId}` : window.location.href
    liff.login({ redirectUri })
    await new Promise(() => {})
  }
  const profile = await liff.getProfile()
  const idToken = liff.getIDToken() ?? ''
  return { lineUserId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl, idToken }
}

export async function isInLiff(): Promise<boolean> {
  const liff = await _get()
  return liff.isInClient()
}

export async function liffScanCodeV2() {
  const liff = await _get()
  return liff.scanCodeV2()
}
