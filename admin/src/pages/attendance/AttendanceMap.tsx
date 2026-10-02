// แผนที่เช็คอินวันนี้ (feedback 2026-10-02 "เพิ่มคำว่าแผนที่ ... ขึ้นแผนที่ของคนที่เช็คอินวันนี้ว่าเช็คจากที่ไหนบ้าง
// และถ้าแอดมินเช็คให้พิกัดก็จะอยู่ตรงสาขาที่ทำการลงบันทึกให้เลย")
// - มี GPS จริง → ปักที่จุดเช็คอินจริง
// - แอดมินลงเวลาแทน (ไม่มี GPS) → ปักที่พิกัดสาขาของกะที่ลงให้ (วงขอบประ)
// - เช็คอินแล้วแต่ไม่มีพิกัดเลย → แสดงในรายการ "ไม่มีพิกัด" ใต้แผนที่
import { useEffect, useRef, useState } from 'react'
import { loadLeaflet } from '../../lib/leaflet'

export interface MapPerson {
  key: string
  name: string
  nickname?: string | null
  code: string
  branchName: string
  statusLabel: string
  color: string          // สีตามสถานะ (มาปกติ/สาย/ขาด)
  time: string
  method: string
  lat: number | null
  lng: number | null
  source: 'gps' | 'branch' | 'none'
  outsideArea?: boolean
}
export interface MapBranch { id: string; name: string; lat: number; lng: number; radius: number }

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const esc = (s: string) => s.replace(/[&<>"']/g, c => ESC[c])

// คนที่พิกัดซ้ำ/ใกล้กันมาก (เช่น แอดมินลงให้หลายคนที่สาขาเดียวกัน) กระจายเป็นวงเล็กๆ รอบจุด ไม่งั้นหมุดทับกันจนเหลือตัวเดียว
function spread(people: MapPerson[]): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {}
  const groups = new Map<string, MapPerson[]>()
  for (const p of people) {
    if (p.lat == null || p.lng == null) continue
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`
    groups.set(k, [...(groups.get(k) ?? []), p])
  }
  groups.forEach(g => {
    g.forEach((p, i) => {
      if (g.length === 1) { out[p.key] = [p.lat!, p.lng!]; return }
      const ring = Math.floor(i / 8) + 1
      const inRing = Math.min(8, g.length - (ring - 1) * 8)
      const ang = (2 * Math.PI * (i % 8)) / inRing + ring
      const r = 0.00022 * ring
      out[p.key] = [p.lat! + r * Math.sin(ang), p.lng! + r * Math.cos(ang) * 1.05]
    })
  })
  return out
}

export default function AttendanceMap({ people, branches }: { people: MapPerson[]; branches: MapBranch[] }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then(L => {
      if (cancelled || !boxRef.current || mapRef.current) return
      const map = L.map(boxRef.current, { zoomControl: true }).setView([15.0, 102.1], 6)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map)
      layerRef.current = L.layerGroup().addTo(map)
      mapRef.current = map
      setReady(true)
    }).catch(e => setErr(e.message))
    return () => {
      cancelled = true
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; layerRef.current = null }
    }
  }, [])

  useEffect(() => {
    const L = (window as any).L
    if (!ready || !L || !mapRef.current || !layerRef.current) return
    const layer = layerRef.current
    layer.clearLayers()
    const bounds: [number, number][] = []

    for (const b of branches) {
      L.circle([b.lat, b.lng], { radius: b.radius, color: '#244B83', weight: 1, fillColor: '#244B83', fillOpacity: 0.07, dashArray: '4 4' }).addTo(layer)
      L.marker([b.lat, b.lng], {
        icon: L.divIcon({
          className: '', iconSize: [0, 0],
          html: `<div style="transform:translate(-50%,-50%);background:#244B83;color:#fff;font:700 10px/1 sans-serif;padding:4px 7px;border-radius:6px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,.35)">${esc(b.name)}</div>`,
        }),
        zIndexOffset: -500,
      }).addTo(layer)
      bounds.push([b.lat, b.lng])
    }

    const pos = spread(people)
    for (const p of people) {
      const ll = pos[p.key]
      if (!ll) continue
      const initial = esc((p.nickname || p.name).trim().charAt(0) || '?')
      const dashed = p.source === 'branch'
      const icon = L.divIcon({
        className: '', iconSize: [28, 28], iconAnchor: [14, 14],
        html: `<div style="width:28px;height:28px;border-radius:50%;background:${p.color};color:#fff;display:flex;align-items:center;justify-content:center;font:700 12px sans-serif;border:2.5px ${dashed ? 'dashed' : 'solid'} #fff;box-shadow:0 0 0 ${dashed ? 1.5 : 0}px ${p.color},0 1px 5px rgba(0,0,0,.4)">${initial}</div>`,
      })
      const gmaps = p.source === 'gps'
        ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}" target="_blank" rel="noopener noreferrer">เปิดใน Google Maps</a>`
        : ''
      const note = p.source === 'branch'
        ? '<br><i style="color:#64748b">แอดมินลงเวลาแทน — ตำแหน่งตามสาขา</i>'
        : p.outsideArea ? '<br><span style="color:#d97706">เช็คอินนอกรัศมีสาขา</span>' : ''
      L.marker(ll, { icon }).bindPopup(
        `<b>${esc(p.name)}</b>${p.nickname ? ` (${esc(p.nickname)})` : ''}<br><span style="color:#64748b">${esc(p.code)} · ${esc(p.branchName)}</span><br>` +
        `เข้า <b>${esc(p.time)}</b> · ${esc(p.method)}<br><span style="color:${p.color};font-weight:700">${esc(p.statusLabel)}</span>${note}${gmaps}`,
      ).addTo(layer)
      bounds.push(ll)
    }

    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
    setTimeout(() => mapRef.current?.invalidateSize(), 50)
  }, [ready, people, branches])

  const noCoord = people.filter(p => p.source === 'none')
  const onMap = people.length - noCoord.length
  const adminCount = people.filter(p => p.source === 'branch').length

  return (
    <div>
      <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.78rem', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
        <b style={{ color: '#0f172a' }}>เช็คอิน {people.length} คน</b>
        <span>บนแผนที่ {onMap}</span>
        {adminCount > 0 && <span>แอดมินลงให้ {adminCount} (ปักที่สาขา)</span>}
        {noCoord.length > 0 && <span style={{ color: '#d97706' }}>ไม่มีพิกัด {noCoord.length}</span>}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, fontSize: '0.72rem' }}>
          {([['#16a34a', 'มาปกติ'], ['#d97706', 'สายระดับ 1'], ['#dc2626', 'สายระดับ 2/ขาด']] as const).map(([c, l]) => (
            <span key={l} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />{l}</span>
          ))}
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: '50%', border: '1.5px dashed #64748b', display: 'inline-block' }} />แอดมินลงให้</span>
        </span>
      </div>
      {err ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#dc2626', fontSize: '0.85rem' }}>{err} — ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่</div>
      ) : (
        <div ref={boxRef} style={{ height: 'min(62vh, 560px)', minHeight: 360, width: '100%', background: '#e5e7eb', position: 'relative', zIndex: 0 }} />
      )}
      {people.length === 0 && !err && (
        <p style={{ padding: '14px 16px', margin: 0, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีใครเช็คอินในวันนี้ (ตามตัวกรองที่เลือก)</p>
      )}
      {noCoord.length > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fffbeb' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>เช็คอินแล้วแต่ไม่มีพิกัด ({noCoord.length}) — ไม่ได้ส่ง GPS มา จึงขึ้นแผนที่ไม่ได้</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {noCoord.map(p => (
              <span key={p.key} style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: 99, background: '#fff', border: '1px solid #fde68a', color: '#78350f' }}>
                {p.name}{p.nickname ? ` (${p.nickname})` : ''} · {p.branchName} · {p.time}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
