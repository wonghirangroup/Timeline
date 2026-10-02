// ลิงก์ "ดูพิกัด" เปิด Google Maps ที่ตำแหน่งเช็คอิน (แท็บใหม่) — คืน null ถ้าไม่มีพิกัด (เช่น แอดมินลงเวลาแทน/ไม่ได้ส่ง GPS มา)
import { MapPin } from 'lucide-react'

export function mapUrl(lat: number | string | null | undefined, lng: number | string | null | undefined): string | null {
  const la = Number(lat), lo = Number(lng)
  if (lat == null || lng == null || !Number.isFinite(la) || !Number.isFinite(lo) || (la === 0 && lo === 0)) return null
  return `https://www.google.com/maps/search/?api=1&query=${la},${lo}`
}

export default function MapLink({ lat, lng, label = 'ดูพิกัด' }: { lat: number | string | null | undefined; lng: number | string | null | undefined; label?: string }) {
  const url = mapUrl(lat, lng)
  if (!url) return null
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" title="เปิดตำแหน่งที่เช็คอินใน Google Maps"
      onClick={e => e.stopPropagation()}
      style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#dcfce7', color: '#15803d', textDecoration: 'none', whiteSpace: 'nowrap' }}>
      <MapPin size={10} /> {label}
    </a>
  )
}
