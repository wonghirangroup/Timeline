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

// ติดป้ายว่า error เกิดขั้นไหน — "Failed to fetch" ล้วนๆ บอกไม่ได้ว่าพังที่ SDK ของ LINE
// หรือ backend เรา (ตรวจ log 2026-10-02: ทุกเคสพังก่อนถึง backend เราเลย) แนบไปกับรายงานปัญหา
export type BootStage = 'liff.load' | 'liff.init' | 'liff.profile' | 'backend'
export function tagStage<T>(stage: BootStage, p: Promise<T>): Promise<T> {
  return p.catch((err: any) => {
    if (err && typeof err === 'object' && !err.stage) err.stage = stage
    throw err
  })
}

export async function initLiff(): Promise<void> {
  if (_initialized) return
  const liff = await tagStage('liff.load', _get())
  await tagStage('liff.init', liff.init({ liffId: getLiffId() }))
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
  const idToken = liff.getIDToken() ?? ''
  // อ่านตัวตนจาก ID token ที่ liff.init() ได้มาแล้ว (ไม่ต้องยิงเน็ตเพิ่ม) แทน liff.getProfile()
  // ที่ต้องเรียก api.line.me อีกรอบทุกครั้งที่เปิดแอป — ตัดจุดที่เจอ "Failed to fetch" ได้ไปหนึ่งจุด
  // backend ตรวจ ID token เองอยู่แล้ว ข้อมูลชุดนี้ใช้แค่แสดงผล/แนบรายงานปัญหา
  const decoded = liff.getDecodedIDToken()
  if (decoded?.sub) {
    return { lineUserId: decoded.sub, displayName: decoded.name ?? '', pictureUrl: decoded.picture, idToken }
  }
  const profile = await tagStage('liff.profile', liff.getProfile())
  return { lineUserId: profile.userId, displayName: profile.displayName, pictureUrl: profile.pictureUrl, idToken }
}

// รีเซ็ต session ของ LIFF แบบไม่พึ่ง liff.login()/logout() — 2 ตัวนั้นใช้ไม่ได้ถ้า liff.init()
// เป็นตัวที่พังเอง (login() โยน "You need to define liffId" ทำให้ระบบกู้คืนอัตโนมัติเดิมพังซ้ำ)
// ล้าง token ที่ SDK เก็บไว้ (ในแอป LINE อยู่ใน sessionStorage) แล้วเปิด LIFF ใหม่ผ่าน
// liff.line.me ให้แอป LINE ออก token ชุดใหม่มาให้ — ใกล้เคียงกับ "ปิดแอป LINE แล้วเปิดใหม่"
// ที่ยืนยันแล้วว่าแก้อาการนี้ได้ (2026-09-30)
export function hardResetLiff(): Promise<never> {
  const liffId = getLiffId()
  for (const store of [sessionStorage, localStorage]) {
    try {
      Object.keys(store).filter(k => k.startsWith('LIFF_STORE:')).forEach(k => store.removeItem(k))
    } catch { /* storage ถูกปิดไว้ — ข้ามไป */ }
  }
  _initialized = false
  window.location.replace(liffId ? `https://liff.line.me/${liffId}` : liffRedirectUri())
  return new Promise<never>(() => {})
}

// เช็คว่าตอนนี้เครื่องต่อถึงแต่ละปลายทางได้ไหม — แนบไปกับรายงานปัญหาเพื่อแยกให้ออกว่าพังที่
// LINE (api.line.me / CDN ของ LIFF) หรือที่ server เรา ไม่ต้องเดาอีก
export async function probeConnectivity(apiBase: string): Promise<string> {
  const targets: [string, string][] = [
    ['ours', `${new URL(apiBase).origin}/health`],
    ['line-api', 'https://api.line.me/oauth2/v2.1/certs'],
    ['liff-cdn', 'https://liffsdk.line-scdn.net/xlt/manifest.json'],
  ]
  const results = await Promise.all(targets.map(async ([name, url]) => {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 6000)
    const started = Date.now()
    try {
      const r = await fetch(url, { cache: 'no-store', signal: ctrl.signal })
      return `${name}:${r.status}/${Date.now() - started}ms`
    } catch (e: any) {
      return `${name}:FAIL(${e?.name === 'AbortError' ? 'timeout' : e?.message ?? 'err'})`
    } finally {
      clearTimeout(t)
    }
  }))
  return results.join(' ')
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
