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
  photo?: string | null  // รูปโปรไฟล์ที่ใส่ในหมุด
  time: string
  method: string
  lat: number | null
  lng: number | null
  source: 'gps' | 'branch' | 'none'
  outsideArea?: boolean
  // เหตุที่ไม่มีพิกัด: admin-branch-no-coord = แอดมินลงให้แต่สาขาของกะนั้นยังไม่ได้ตั้งพิกัด, no-gps = พนักงานไม่ได้ส่ง GPS มา
  reason?: 'admin-branch-no-coord' | 'no-gps'
  shiftBranchName?: string
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

// compact = มินิแมพในหน้า Dashboard: สูง 220px, หมุดเล็กลง, ไม่ซูมด้วยล้อเมาส์ (ไม่แย่งการเลื่อนหน้า), ไม่มีแถบสรุป/รายชื่อไม่มีพิกัด/ตัวสลับพื้นแผนที่
export default function AttendanceMap({ people, branches, compact = false }: { people: MapPerson[]; branches: MapBranch[]; compact?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const layerRef = useRef<any>(null)
  const [ready, setReady] = useState(false)
  const [err, setErr] = useState('')

  useEffect(() => {
    let cancelled = false
    loadLeaflet().then(L => {
      if (cancelled || !boxRef.current || mapRef.current) return
      const map = L.map(boxRef.current, { zoomControl: true, scrollWheelZoom: !compact }).setView([15.0, 102.1], 6)
      // พื้นแผนที่: Google ถนน (ค่าเริ่มต้น ตามที่ขอ) / ดาวเทียม / OpenStreetMap — สลับได้จากปุ่มมุมขวาบน
      const street = L.tileLayer('https://mt{s}.google.com/vt/lyrs=m&hl=th&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20, attribution: '© Google Maps' })
      const hybrid = L.tileLayer('https://mt{s}.google.com/vt/lyrs=y&hl=th&x={x}&y={y}&z={z}', { subdomains: '0123', maxZoom: 20, attribution: '© Google Maps' })
      const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' })
      street.addTo(map)
      if (!compact) L.control.layers({ 'Google ถนน': street, 'Google ดาวเทียม': hybrid, 'OpenStreetMap': osm }, undefined, { position: 'topright' }).addTo(map)
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
    let pinSeq = 0
    for (const p of people) {
      const ll = pos[p.key]
      if (!ll) continue
      const initial = esc((p.nickname || p.name).trim().charAt(0) || '?')
      const dashed = p.source === 'branch'
      const id = `pin${pinSeq++}`
      // หมุดรูปหยดน้ำสีตามสถานะ + รูปโปรไฟล์วงกลมข้างใน (ไม่มีรูป = ตัวอักษรแรกของชื่อเล่น) — ปลายหมุดคือพิกัดจริง
      const face = p.photo
        ? `<circle cx="22" cy="21" r="14.5" fill="#fff"/><clipPath id="${id}"><circle cx="22" cy="21" r="14"/></clipPath><image href="${esc(p.photo)}" x="8" y="7" width="28" height="28" preserveAspectRatio="xMidYMid slice" clip-path="url(#${id})"/>`
        : `<circle cx="22" cy="21" r="14" fill="#fff"/><text x="22" y="26" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="700" fill="${p.color}">${initial}</text>`
      const k = compact ? 0.7 : 1
      const icon = L.divIcon({
        className: '', iconSize: [44 * k, 56 * k], iconAnchor: [22 * k, 55 * k], popupAnchor: [0, -50 * k],
        html: `<svg width="${44 * k}" height="${56 * k}" viewBox="0 0 44 56" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));overflow:visible"><path d="M22 55C22 55 3 34 3 21a19 19 0 1 1 38 0c0 13-19 34-19 34Z" fill="${p.color}" stroke="${dashed ? '#0f172a' : '#fff'}" stroke-width="2.5"${dashed ? ' stroke-dasharray="4 3"' : ''}/>${face}</svg>`,
      })
      const gmaps = p.source === 'gps'
        ? `<br><a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}" target="_blank" rel="noopener noreferrer">เปิดใน Google Maps</a>`
        : ''
      const note = p.source === 'branch'
        ? '<br><i style="color:#64748b">แอดมินลงเวลาแทน — ตำแหน่งตามสาขา</i>'
        : p.outsideArea ? '<br><span style="color:#d97706">เช็คอินนอกรัศมีสาขา</span>' : ''
      const photo = p.photo ? `<img src="${esc(p.photo)}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid ${p.color}">` : ''
      const info =
        `<div style="display:flex;gap:8px;align-items:center;min-width:170px">${photo}<div style="line-height:1.45">` +
        `<b>${esc(p.name)}</b>${p.nickname ? ` (${esc(p.nickname)})` : ''}<br><span style="color:#64748b">${esc(p.code)} · ${esc(p.branchName)}</span><br>` +
        `เข้า <b>${esc(p.time)}</b> · ${esc(p.method)}<br><span style="color:${p.color};font-weight:700">${esc(p.statusLabel)}</span>${note}</div></div>`
      // hover = ข้อมูลของคนนั้น (tooltip) / คลิก = ป๊อปอัปเดิม + ลิงก์เปิด Google Maps
      L.marker(ll, { icon })
        .bindTooltip(info, { direction: 'top', offset: [0, -50 * k], opacity: 1, sticky: false })
        .bindPopup(info + gmaps, { offset: [0, -4] })
        .addTo(layer)
      bounds.push(ll)
    }

    if (bounds.length) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 })
    setTimeout(() => mapRef.current?.invalidateSize(), 50)
  }, [ready, people, branches])

  if (compact) {
    return (
      <div ref={boxRef} style={{ height: 220, width: '100%', background: '#e5e7eb', position: 'relative', zIndex: 0 }} />
    )
  }

  const noCoord = people.filter(p => p.source === 'none')
  const adminNoBranch = noCoord.filter(p => p.reason === 'admin-branch-no-coord')
  const noGps = noCoord.filter(p => p.reason !== 'admin-branch-no-coord')
  const missingBranches = [...new Set(adminNoBranch.map(p => p.shiftBranchName || p.branchName))]
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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><i style={{ width: 10, height: 10, borderRadius: '50% 50% 50% 0', transform: 'rotate(-45deg)', border: '1.5px dashed #0f172a', display: 'inline-block' }} />แอดมินลงให้ (ขอบประ)</span>
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
      {adminNoBranch.length > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fef2f2' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#991b1b', marginBottom: 6 }}>
            แอดมินลงเวลาให้ {adminNoBranch.length} คน แต่ปักหมุดไม่ได้ เพราะสาขา <b>{missingBranches.join(', ')}</b> ยังไม่ได้ตั้งพิกัด —
            ไปตั้งที่ <a href="/branch" style={{ color: '#991b1b', textDecoration: 'underline' }}>หน้าสาขา</a> (แก้ไขสาขา → เลือกตำแหน่งบนแผนที่) แล้วหมุดจะขึ้นเอง
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {adminNoBranch.map(p => (
              <span key={p.key} style={{ fontSize: '0.74rem', padding: '3px 10px', borderRadius: 99, background: '#fff', border: '1px solid #fecaca', color: '#7f1d1d' }}>
                {p.name}{p.nickname ? ` (${p.nickname})` : ''} · {p.shiftBranchName || p.branchName} · {p.time}
              </span>
            ))}
          </div>
        </div>
      )}
      {noGps.length > 0 && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#fffbeb' }}>
          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>เช็คอินแล้วแต่ไม่มีพิกัด ({noGps.length}) — พนักงานไม่ได้ส่ง GPS มา จึงขึ้นแผนที่ไม่ได้</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {noGps.map(p => (
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
