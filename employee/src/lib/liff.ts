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

/** อ่าน LIFF ID จาก ?lid= ใน URL ก่อน fallback ไป env var */
export function getLiffId(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('lid')
  return fromUrl ?? (import.meta.env.VITE_LIFF_ID as string) ?? ''
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
    liff.login({ redirectUri: window.location.href })
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
