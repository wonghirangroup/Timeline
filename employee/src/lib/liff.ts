// employee/src/lib/liff.ts
type LiffType = typeof import('@line/liff').default

const LIFF_ID = import.meta.env.VITE_LIFF_ID as string

let _liff: LiffType | null = null
let _initialized = false

async function _get(): Promise<LiffType> {
  if (!_liff) {
    const mod = await import('@line/liff')
    _liff = mod.default
  }
  return _liff
}

export async function initLiff(): Promise<void> {
  if (_initialized) return
  const liff = await _get()
  await liff.init({ liffId: LIFF_ID })
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
    liff.login({ redirectUri: window.location.href })
    // login() navigates away — suspend execution until redirect returns
    await new Promise(() => {})
  }
  const profile = await liff.getProfile()
  const idToken = liff.getIDToken() ?? ''
  return { lineUserId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl, idToken }
}

export function getChannelId(): string {
  // ดึง channel ID จาก LIFF ID อัตโนมัติ (ส่วนแรกก่อน "-")
  // เช่น "2010116873-1vqjroj0" → "2010116873"
  return (import.meta.env.VITE_LIFF_ID as string)?.split('-')[0] ?? ''
}

export async function isInLiff(): Promise<boolean> {
  const liff = await _get()
  return liff.isInClient()
}

// ให้ checkin page ใช้โดยไม่ต้อง import @line/liff โดยตรง
export async function liffScanCodeV2() {
  const liff = await _get()
  return liff.scanCodeV2()
}
