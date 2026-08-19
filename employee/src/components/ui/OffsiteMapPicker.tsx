// employee/src/components/ui/OffsiteMapPicker.tsx
// Sheet ให้เลือก/ปรับปักหมุดตำแหน่งบนแผนที่ (React Leaflet + OpenStreetMap tiles)
// ก่อนยืนยันเช็คอิน/เช็คเอาต์นอกสถานที่ — เริ่มที่ตำแหน่ง GPS ปัจจุบัน แล้วลาก
// หรือแตะบนแผนที่เพื่อขยับหมุดได้ก่อนกดยืนยันจริง
import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin, Loader2, Navigation2 } from 'lucide-react'
import { BottomSheet } from './BottomSheet'
import { COLOR } from './tokens'

// ไอคอนหมุดแบบ SVG เอง — เลี่ยงปัญหาคลาสสิกของ Leaflet ที่ path รูป marker
// default อ้างอิงไฟล์ไม่เจอเวลา bundle ด้วย Vite
function pinIcon(color: string) {
  return L.divIcon({
    className: '',
    html: `<div style="transform:translate(-50%,-100%);filter:drop-shadow(0 3px 6px rgba(0,0,0,0.3))">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="${color}" stroke="#fff" stroke-width="1.2">
        <path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/>
        <circle cx="12" cy="10" r="3.2" fill="#fff"/>
      </svg>
    </div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
  })
}

interface LatLng { lat: number; lng: number }

function ClickToMove({ onMove }: { onMove: (pos: LatLng) => void }) {
  useMapEvents({ click(e) { onMove({ lat: e.latlng.lat, lng: e.latlng.lng }) } })
  return null
}

interface OffsiteMapPickerProps {
  mode: 'checkin' | 'checkout'
  onConfirm: (pos: LatLng, note?: string) => void
  onCancel: () => void
  loading: boolean
}

export function OffsiteMapPicker({ mode, onConfirm, onCancel, loading }: OffsiteMapPickerProps) {
  const [pos, setPos]         = useState<LatLng | null>(null)
  const [gpsError, setGpsError] = useState(false)
  const [note, setNote]       = useState('')
  const color = mode === 'checkin' ? '#16a34a' : '#2563eb'

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGpsError(true),
      { timeout: 8000, enableHighAccuracy: true },
    )
  }, [])

  function recenter() {
    setGpsError(false)
    navigator.geolocation.getCurrentPosition(
      p => setPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => setGpsError(true),
      { timeout: 8000, enableHighAccuracy: true },
    )
  }

  return (
    <BottomSheet onClose={onCancel}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6 }}>
          <MapPin size={34} color={color} strokeWidth={1.8} />
        </div>
        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a2b3c' }}>
          {mode === 'checkin' ? 'ปักหมุดเช็คอินนอกสถานที่' : 'ปักหมุดเช็คเอาต์นอกสถานที่'}
        </div>
        <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: 4 }}>
          ลากหมุด หรือแตะบนแผนที่เพื่อปรับตำแหน่งให้ตรง
        </div>
      </div>

      {!pos && !gpsError && (
        <div style={{ height: 260, borderRadius: 20, background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
          <Loader2 size={28} color={COLOR.primary} className="animate-spin" />
          <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>กำลังค้นหาตำแหน่งปัจจุบัน…</span>
        </div>
      )}

      {gpsError && (
        <div style={{ height: 260, borderRadius: 20, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16, padding: 20 }}>
          <span style={{ fontSize: '0.82rem', color: '#dc2626', textAlign: 'center' }}>กรุณาเปิดอนุญาต GPS แล้วลองใหม่</span>
          <button onClick={recenter} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid #fca5a5', background: '#fff', color: '#dc2626', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {pos && (
        <div style={{ position: 'relative', height: 260, borderRadius: 20, overflow: 'hidden', marginBottom: 12, border: '1px solid #e5e7eb' }}>
          <MapContainer center={[pos.lat, pos.lng]} zoom={17} style={{ height: '100%', width: '100%' }} attributionControl={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <Marker
              position={[pos.lat, pos.lng]}
              icon={pinIcon(color)}
              draggable
              eventHandlers={{ dragend: e => { const m = e.target.getLatLng(); setPos({ lat: m.lat, lng: m.lng }) } }}
            />
            <ClickToMove onMove={setPos} />
          </MapContainer>
          <button
            onClick={recenter}
            style={{ position: 'absolute', bottom: 10, right: 10, width: 36, height: 36, borderRadius: 10, border: 'none', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            aria-label="กลับไปตำแหน่งปัจจุบัน"
          >
            <Navigation2 size={16} color={color} />
          </button>
        </div>
      )}

      {mode === 'checkin' && (
        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="หมายเหตุ เช่น ประชุมลูกค้า A (ไม่บังคับ)"
          style={{ width: '100%', padding: '11px 14px', borderRadius: 12, border: '1.5px solid #e5e7eb', fontSize: '0.85rem', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', marginBottom: 16 }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: mode === 'checkout' ? 16 : 0 }}>
        <button onClick={onCancel} disabled={loading}
          style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>
          ยกเลิก
        </button>
        <button
          onClick={() => pos && onConfirm(pos, note.trim() || undefined)}
          disabled={loading || !pos}
          style={{
            flex: 2, padding: '14px', borderRadius: 16, border: 'none',
            background: (loading || !pos) ? '#d1d5db' : `linear-gradient(135deg, ${color}, ${color})`,
            color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: (loading || !pos) ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          {loading
            ? <><Loader2 size={16} className="animate-spin" /> กำลังบันทึก…</>
            : <><MapPin size={16} /> ยืนยันตำแหน่ง</>}
        </button>
      </div>
    </BottomSheet>
  )
}
