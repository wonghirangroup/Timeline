import { useState, useEffect } from 'react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'

interface ApiBranch {
  id: string
  name: string
  location: string | null
  lat: string | null
  lng: string | null
  is_active: boolean
  created_at: string
  _count: { employees: number; shifts: number }
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  outline: 'none', boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}

const QR_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160"><rect width="160" height="160" fill="%23fff"/><rect x="10" y="10" width="50" height="50" rx="4" fill="%23111"/><rect x="18" y="18" width="34" height="34" rx="2" fill="%23fff"/><rect x="24" y="24" width="22" height="22" rx="1" fill="%23111"/><rect x="100" y="10" width="50" height="50" rx="4" fill="%23111"/><rect x="108" y="18" width="34" height="34" rx="2" fill="%23fff"/><rect x="114" y="24" width="22" height="22" rx="1" fill="%23111"/><rect x="10" y="100" width="50" height="50" rx="4" fill="%23111"/><rect x="18" y="108" width="34" height="34" rx="2" fill="%23fff"/><rect x="24" y="114" width="22" height="22" rx="1" fill="%23111"/><rect x="72" y="10" width="8" height="8" fill="%23111"/><rect x="72" y="24" width="8" height="8" fill="%23111"/><rect x="72" y="38" width="8" height="8" fill="%23111"/><rect x="72" y="52" width="8" height="8" fill="%23111"/><rect x="86" y="10" width="8" height="8" fill="%23111"/><rect x="86" y="38" width="8" height="8" fill="%23111"/><rect x="72" y="72" width="8" height="8" fill="%23111"/><rect x="86" y="72" width="8" height="8" fill="%23111"/><rect x="100" y="72" width="8" height="8" fill="%23111"/><rect x="114" y="72" width="8" height="8" fill="%23111"/><rect x="128" y="72" width="8" height="8" fill="%23111"/><rect x="142" y="72" width="8" height="8" fill="%23111"/><rect x="72" y="86" width="8" height="8" fill="%23111"/><rect x="100" y="86" width="8" height="8" fill="%23111"/><rect x="128" y="86" width="8" height="8" fill="%23111"/><rect x="72" y="100" width="8" height="8" fill="%23111"/><rect x="86" y="100" width="8" height="8" fill="%23111"/><rect x="100" y="100" width="8" height="8" fill="%23111"/><rect x="128" y="100" width="8" height="8" fill="%23111"/><rect x="142" y="100" width="8" height="8" fill="%23111"/><rect x="72" y="114" width="8" height="8" fill="%23111"/><rect x="114" y="114" width="8" height="8" fill="%23111"/><rect x="72" y="128" width="8" height="8" fill="%23111"/><rect x="86" y="128" width="8" height="8" fill="%23111"/><rect x="100" y="128" width="8" height="8" fill="%23111"/><rect x="128" y="128" width="8" height="8" fill="%23111"/><rect x="142" y="142" width="8" height="8" fill="%23111"/></svg>`

type ModalMode = 'add' | 'edit' | 'qr' | null

export default function BranchPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()

  const [branches, setBranches]   = useState<ApiBranch[]>([])
  const [loading, setLoading]     = useState(true)
  const [modal, setModal]         = useState<ModalMode>(null)
  const [qrTarget, setQrTarget]   = useState<ApiBranch | null>(null)
  const [editTarget, setEditTarget] = useState<ApiBranch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiBranch | null>(null)
  const [form, setForm]           = useState({ name: '', location: '', lat: '', lng: '' })
  const [saving, setSaving]       = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)

  async function load() {
    try {
      setLoading(true)
      const res = await api.get('/api/v1/admin/branches')
      setBranches(res.data.data ?? [])
    } catch {
      showToast('error', 'โหลดข้อมูลสาขาไม่สำเร็จ')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ name: '', location: '', lat: '', lng: '' })
    setEditTarget(null)
    setModal('add')
  }

  const openEdit = (b: ApiBranch) => {
    setForm({ name: b.name, location: b.location ?? '', lat: b.lat ?? '', lng: b.lng ?? '' })
    setEditTarget(b)
    setModal('edit')
  }

  const getGPS = () => {
    if (!navigator.geolocation) { showToast('error', 'เบราว์เซอร์นี้ไม่รองรับ GPS'); return }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, lat: pos.coords.latitude.toFixed(7), lng: pos.coords.longitude.toFixed(7) }))
        setGpsLoading(false)
        showToast('success', 'ดึงตำแหน่งสำเร็จ')
      },
      () => { showToast('error', 'ไม่สามารถดึงตำแหน่งได้ — กรุณาอนุญาต GPS'); setGpsLoading(false) },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  const handleSave = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    const latNum = parseFloat(form.lat)
    const lngNum = parseFloat(form.lng)
    const geoPayload = {
      lat: !isNaN(latNum) && form.lat ? latNum : undefined,
      lng: !isNaN(lngNum) && form.lng ? lngNum : undefined,
    }
    try {
      if (modal === 'add') {
        await api.post('/api/v1/admin/branches', { name: form.name, location: form.location || undefined, ...geoPayload })
        showToast('success', `เพิ่มสาขา "${form.name}" เรียบร้อยแล้ว`)
      } else if (editTarget) {
        await api.patch(`/api/v1/admin/branches/${editTarget.id}`, { name: form.name, location: form.location || undefined, ...geoPayload })
        showToast('success', `บันทึกสาขา "${form.name}" เรียบร้อยแล้ว`)
      }
      setModal(null)
      await load()
    } catch {
      showToast('error', 'บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await api.delete(`/api/v1/admin/branches/${deleteTarget.id}`)
      showToast('success', `ลบสาขา "${deleteTarget.name}" เรียบร้อยแล้ว`)
      setDeleteTarget(null)
      await load()
    } catch {
      showToast('error', 'ลบไม่สำเร็จ')
    }
  }

  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox = (w = 480): React.CSSProperties => ({
    background: '#fff',
    borderRadius: isMobile ? '16px 16px 0 0' : 16,
    width: isMobile ? '100%' : w,
    maxWidth: isMobile ? '100%' : '92vw',
    paddingBottom: isMobile ? 'max(0px, env(safe-area-inset-bottom))' : 0,
    maxHeight: isMobile ? '92vh' : 'none',
    overflowY: 'auto',
    boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>
          สาขาทั้งหมด <strong style={{ color: '#111827' }}>{branches.length} สาขา</strong>
        </p>
        <button onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: '#fff', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 8px rgba(249,115,22,0.3)' }}>
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          เพิ่มสาขา
        </button>
      </div>

      {/* Loading */}
      {loading && <p style={{ color: '#9ca3af', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>กำลังโหลด...</p>}

      {/* Branch cards */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {branches.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px 0', color: '#9ca3af' }}>
              <p style={{ fontSize: '14px', marginBottom: 12 }}>ยังไม่มีสาขา</p>
              <button onClick={openAdd} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>+ เพิ่มสาขาแรก</button>
            </div>
          )}
          {branches.map(b => (
            <div key={b.id} style={{ ...card, padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" fill="none" stroke="#f97316" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: '#111827', margin: 0, fontSize: '13px' }}>{b.name}</p>
                    <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>
                      {b._count.employees} คน · {b._count.shifts} กะ
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: b.is_active ? '#fff7ed' : '#f9fafb', color: b.is_active ? '#c2410c' : '#9ca3af' }}>
                  {b.is_active ? 'เปิด' : 'ปิด'}
                </span>
              </div>

              {b.location && (
                <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 6px', lineHeight: 1.5 }}>
                  📍 {b.location}
                </p>
              )}
              {b.lat && b.lng && (
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 12px', fontFamily: 'monospace' }}>
                  🌐 {parseFloat(b.lat).toFixed(6)}, {parseFloat(b.lng).toFixed(6)}
                </p>
              )}

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setQrTarget(b); setModal('qr') }}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  QR
                </button>
                <button onClick={() => openEdit(b)}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  แก้ไข
                </button>
                <button onClick={() => setDeleteTarget(b)}
                  style={{ padding: '7px 12px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {(modal === 'add' || modal === 'edit') && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox(480)} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '18px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: 0 }}>
                {modal === 'add' ? 'เพิ่มสาขาใหม่' : `แก้ไข: ${editTarget?.name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5 }}>ชื่อสาขา *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="เช่น สาขาสำนักงานใหญ่" style={inputStyle} autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5 }}>ที่อยู่ / สถานที่ตั้ง</label>
                <textarea value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="เลขที่ ถนน ตำบล อำเภอ จังหวัด" rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>

              {/* GPS Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#374151' }}>พิกัด GPS (ละติจูด / ลองจิจูด)</label>
                  <button type="button" onClick={getGPS} disabled={gpsLoading}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, border: '1px solid #4f46e5', background: '#ede9fe', color: '#4f46e5', fontSize: '12px', fontWeight: 600, cursor: gpsLoading ? 'not-allowed' : 'pointer', opacity: gpsLoading ? 0.7 : 1 }}>
                    {gpsLoading ? (
                      <>⏳ กำลังดึง...</>
                    ) : (
                      <>
                        <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        📡 ดึงตำแหน่งปัจจุบัน
                      </>
                    )}
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>Latitude (ละติจูด)</label>
                    <input value={form.lat} onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                      placeholder="เช่น 13.7563" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>Longitude (ลองจิจูด)</label>
                    <input value={form.lng} onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                      placeholder="เช่น 100.5018" style={inputStyle} />
                  </div>
                </div>

                <div style={{ marginTop: 8 }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: 4 }}>วาง lat, lng พร้อมกัน (paste)</label>
                  <input placeholder="เช่น 13.7563, 100.5018"
                    style={{ ...inputStyle, color: '#9ca3af' }}
                    onPaste={e => {
                      const text = e.clipboardData.getData('text')
                      const parts = text.split(/[,\s]+/).map(s => s.trim()).filter(Boolean)
                      if (parts.length >= 2 && !isNaN(parseFloat(parts[0])) && !isNaN(parseFloat(parts[1]))) {
                        e.preventDefault()
                        setForm(f => ({ ...f, lat: parts[0], lng: parts[1] }))
                        showToast('success', `วางพิกัด ${parts[0]}, ${parts[1]} สำเร็จ`)
                      }
                    }}
                  />
                </div>

                {form.lat && form.lng && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', borderRadius: 8, fontSize: '12px', color: '#15803d', display: 'flex', alignItems: 'center', gap: 6 }}>
                    ✓ พิกัด {parseFloat(form.lat).toFixed(6)}, {parseFloat(form.lng).toFixed(6)}
                    <button type="button" onClick={() => setForm(f => ({ ...f, lat: '', lng: '' }))}
                      style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '13px' }}>✕</button>
                  </div>
                )}
              </div>
            </div>
            <div style={{ padding: '16px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={!form.name.trim() || saving}
                style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: form.name.trim() ? 'linear-gradient(135deg,#f97316,#ea580c)' : '#f3f4f6', color: form.name.trim() ? '#fff' : '#9ca3af', fontSize: '13px', fontWeight: 600, cursor: form.name.trim() ? 'pointer' : 'not-allowed' }}>
                {saving ? 'กำลังบันทึก...' : modal === 'add' ? 'เพิ่มสาขา' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {modal === 'qr' && qrTarget && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={{ ...sheetBox(300), padding: '28px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <p style={{ fontWeight: 700, fontSize: '15px', color: '#111827', margin: '0 0 4px' }}>QR Code เช็คอิน</p>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: '0 0 18px' }}>{qrTarget.name}</p>
            <img src={QR_SVG} alt="QR" style={{ width: 160, height: 160, margin: '0 auto 14px', display: 'block', borderRadius: 8 }} />
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 20px' }}>พนักงานสแกน QR นี้เพื่อเช็คอิน</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '13px', cursor: 'pointer' }}>ปิด</button>
              <button onClick={() => { showToast('info', 'ฟีเจอร์ดาวน์โหลด QR จะพร้อมเร็วๆ นี้'); setModal(null) }}
                style={{ flex: 1, padding: '9px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>ดาวน์โหลด</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="ลบสาขา?"
          message={`"${deleteTarget.name}" จะถูกลบออกจากระบบ`}
          confirmLabel="ลบสาขา"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
