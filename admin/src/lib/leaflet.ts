// โหลด Leaflet จาก CDN ครั้งเดียวทั้งแอป (หน้าสาขาใช้วิธีเดียวกัน — ไม่ต้องพึ่ง bundle ของแพ็กเกจ leaflet) คืน window.L
let loading: Promise<any> | null = null

export function loadLeaflet(): Promise<any> {
  const w = window as any
  if (w.L) return Promise.resolve(w.L)
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector('link[data-leaflet-css]')) {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      link.setAttribute('data-leaflet-css', '1')
      document.head.appendChild(link)
    }
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
    script.onload = () => resolve(w.L)
    script.onerror = () => { loading = null; reject(new Error('โหลดแผนที่ไม่สำเร็จ')) }
    document.head.appendChild(script)
  })
  return loading
}
