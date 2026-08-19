// server/src/common/utils/geocode.ts
// แปลงพิกัด GPS เป็นชื่อสถานที่/ที่อยู่ ผ่าน Nominatim (OpenStreetMap) — ฟรี ไม่ต้องใช้ API key
// ต้องมี User-Agent ระบุตัวตนแอปตาม usage policy ของ Nominatim, จำกัด timeout ไว้กันค้าง
// ล้มเหลว/timeout แล้ว return null เสมอ — ห้ามให้ third-party ล่มมาบล็อกการเช็คอินจริง
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=th`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'TimeLine-HR-SaaS/1.0 (+https://wonghiran.com)' },
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return null
    const data: any = await res.json()
    return typeof data?.display_name === 'string' ? data.display_name : null
  } catch {
    return null
  }
}
