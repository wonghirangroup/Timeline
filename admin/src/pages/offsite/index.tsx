import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MapPin, Clock, ExternalLink, Navigation, Table2, LayoutGrid, Plus, Pencil, Trash2, X, Download } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Button from '../../components/ui/Button'
import { useIsReadOnly } from '../../stores/authStore'
import { OrgFilterBar, EMPTY_ORG_FILTER, buildEmployeeOrgMap, matchesOrgFilter } from '../../components/shared/OrgFilterBar'
import type { OrgFilterValue } from '../../components/shared/OrgFilterBar'

interface ApiEmployeeOrg {
  id: string; branch?: { id: string; group_id?: string | null } | null; position_id?: string | null
  first_name?: string; last_name?: string; nickname?: string | null; employee_code?: string
}
interface ApiPosition {
  id: string; department?: { id: string; division?: { group_id?: string | null } | null } | null
}
interface ApiOffsiteCheckin {
  id: string
  check_in_at: string
  check_in_lat: string | null
  check_in_lng: string | null
  check_in_address: string | null
  check_out_at: string | null
  check_out_lat: string | null
  check_out_lng: string | null
  check_out_address: string | null
  note: string | null
  employee: {
    id: string; first_name: string; last_name: string; nickname: string; employee_code: string
    branch: { id: string; name: string }
  }
}

const input: React.CSSProperties = {
  width: '100%', padding: '9px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit', background: '#fff',
}
const label: React.CSSProperties = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 4 }

// แปลง ISO datetime → ค่าสำหรับ <input type="date"/time"> โดยใช้เวลา local ของ
// เบราว์เซอร์ (สมมติแอดมินอยู่โซนเวลาไทยเหมือนที่หน้านี้ format แสดงผลอยู่แล้ว)
function toDateInput(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function toTimeInput(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
const EMPTY_OFFSITE_FORM = {
  employee_id: '', check_in_date: '', check_in_time: '', check_in_address: '',
  still_active: true, check_out_date: '', check_out_time: '', check_out_address: '', note: '',
}

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 16,
  boxShadow: '0 2px 12px rgba(0,0,0,0.04)', border: '1px solid #f1f5f9',
}

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
function thDateTime(iso: string) {
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543} · ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`
}
// ลิงก์นำทาง (directions) แทนที่จะแค่โชว์หมุด — กดแล้ว Google Maps นำทางจากตำแหน่งปัจจุบันของแอดมินไปจุดนี้ทันที
function directionsUrl(lat: string, lng: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}
function duration(startIso: string, endIso: string | null): string {
  if (!endIso) return '—'
  const mins = Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000)
  if (mins < 60) return `${mins} นาที`
  const h = Math.floor(mins / 60), m = mins % 60
  return m > 0 ? `${h} ชม. ${m} นาที` : `${h} ชม.`
}

export default function OffsitePage() {
  const isMobile = useIsMobile()
  const isReadOnly = useIsReadOnly()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [orgFilter, setOrgFilter] = useState<OrgFilterValue>(EMPTY_ORG_FILTER)
  const [listView, setListView]   = useState<'card' | 'table'>('table')
  const [modal, setModal]         = useState<'add' | 'edit' | null>(null)
  const [editTarget, setEditTarget] = useState<ApiOffsiteCheckin | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ApiOffsiteCheckin | null>(null)
  const [form, setForm]           = useState(EMPTY_OFFSITE_FORM)
  const [saving, setSaving]       = useState(false)

  const { data: rows = [] } = useQuery<ApiOffsiteCheckin[]>({
    queryKey: ['admin', 'offsite-checkins'],
    queryFn: () => api.get('/api/v1/admin/offsite-checkins').then(r => r.data.data),
    refetchInterval: 60_000,
  })
  const { data: employees = [] } = useQuery<ApiEmployeeOrg[]>({
    queryKey: ['admin', 'employees'],
    queryFn: () => api.get('/api/v1/admin/employees').then(r => r.data.data),
  })
  const { data: positions = [] } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const employeeOrgMap = useMemo(() => buildEmployeeOrgMap(employees, positions), [employees, positions])

  const filtered = rows.filter(r => matchesOrgFilter(employeeOrgMap[r.employee.id], orgFilter))

  // Export CSV (feedback 2026-09-24: "ระบบ Export กลุ่ม/สาขา/แผนก/ฝ่าย") — dump
  // `filtered` ตรงๆ (ผ่าน OrgFilterBar บนจอแล้ว)
  function exportOffsite() {
    const header = ['พนักงาน', 'สาขา', 'เข้า', 'ที่อยู่เข้า', 'ออก', 'ที่อยู่ออก', 'ระยะเวลา', 'หมายเหตุ', 'สถานะ']
    const rows2 = filtered.map(r => [
      `${r.employee.first_name} ${r.employee.last_name}`, r.employee.branch.name,
      thDateTime(r.check_in_at), r.check_in_address || '',
      r.check_out_at ? thDateTime(r.check_out_at) : '', r.check_out_address || '',
      duration(r.check_in_at, r.check_out_at), r.note || '',
      r.check_out_at ? 'เสร็จสิ้น' : 'กำลังนอกสถานที่',
    ])
    const csv = '﻿' + [header, ...rows2].map(row => row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `เช็คอินนอกสถานที่_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
  }

  const activeCount = rows.filter(r => !r.check_out_at).length
  const monthCount  = rows.filter(r => {
    const d = new Date(r.check_in_at), now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  function invalidateOffsite() {
    qc.invalidateQueries({ queryKey: ['admin', 'offsite-checkins'] })
  }

  const addMutation = useMutation({
    mutationFn: (body: object) => api.post('/api/v1/admin/offsite-checkins', body).then(r => r.data.data),
    onSuccess: () => { invalidateOffsite(); showToast('success', 'เพิ่มรายการเช็คอินนอกสถานที่สำเร็จ'); setSaving(false); setModal(null) },
    onError: () => { showToast('error', 'เพิ่มรายการไม่สำเร็จ'); setSaving(false) },
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/offsite-checkins/${id}`, body).then(r => r.data.data),
    onSuccess: () => { invalidateOffsite(); showToast('success', 'บันทึกการแก้ไขเรียบร้อย'); setSaving(false); setModal(null) },
    onError: () => { showToast('error', 'บันทึกไม่สำเร็จ'); setSaving(false) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/admin/offsite-checkins/${id}`),
    onSuccess: () => { invalidateOffsite(); showToast('success', 'ลบรายการเรียบร้อย'); setDeleteTarget(null) },
    onError: () => showToast('error', 'ลบรายการไม่สำเร็จ'),
  })

  function openAdd() {
    const now = new Date()
    setForm({ ...EMPTY_OFFSITE_FORM, check_in_date: toDateInput(now.toISOString()), check_in_time: toTimeInput(now.toISOString()) })
    setEditTarget(null)
    setModal('add')
  }
  function openEdit(r: ApiOffsiteCheckin) {
    setForm({
      employee_id: r.employee.id,
      check_in_date: toDateInput(r.check_in_at), check_in_time: toTimeInput(r.check_in_at),
      check_in_address: r.check_in_address ?? '',
      still_active: !r.check_out_at,
      check_out_date: r.check_out_at ? toDateInput(r.check_out_at) : '',
      check_out_time: r.check_out_at ? toTimeInput(r.check_out_at) : '',
      check_out_address: r.check_out_address ?? '',
      note: r.note ?? '',
    })
    setEditTarget(r)
    setModal('edit')
  }
  function handleSave() {
    if (!form.employee_id || !form.check_in_date || !form.check_in_time) {
      showToast('error', 'กรุณาเลือกพนักงานและระบุเวลาเช็คอิน')
      return
    }
    setSaving(true)
    const checkOut = form.still_active
      ? { check_out_date: null, check_out_time: null }
      : (form.check_out_date && form.check_out_time ? { check_out_date: form.check_out_date, check_out_time: form.check_out_time } : {})
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, body: {
        check_in_date: form.check_in_date, check_in_time: form.check_in_time,
        check_in_address: form.check_in_address || undefined,
        ...checkOut,
        check_out_address: form.check_out_address || undefined,
        note: form.note || undefined,
      }})
    } else {
      addMutation.mutate({
        employee_id: form.employee_id,
        check_in_date: form.check_in_date, check_in_time: form.check_in_time,
        check_in_address: form.check_in_address || undefined,
        ...(!form.still_active && form.check_out_date && form.check_out_time
          ? { check_out_date: form.check_out_date, check_out_time: form.check_out_time }
          : {}),
        check_out_address: form.check_out_address || undefined,
        note: form.note || undefined,
      })
    }
  }
  function handleDelete() {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id)
  }

  const sheetOverlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
    display: 'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 200,
  }
  const sheetBox: React.CSSProperties = {
    background: '#fff', borderRadius: isMobile ? '20px 20px 0 0' : 16,
    width: isMobile ? '100%' : 520, maxWidth: '96vw',
    maxHeight: isMobile ? '92vh' : 'min(88vh, 760px)',
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <Button variant="secondary" icon={<Download size={15} />} onClick={exportOffsite} disabled={filtered.length === 0}>Export</Button>
        {!isReadOnly && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={openAdd}>เพิ่มรายการ</Button>
        )}
      </div>
      {/* ── KPI Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: isMobile ? 8 : 10 }}>
        {[
          { label: 'กำลังอยู่นอกสถานที่', icon: <Navigation size={15}/>, value: activeCount, unit: 'คน', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
          { label: 'รวมเดือนนี้',          icon: <Clock size={15}/>,      value: monthCount,  unit: 'ครั้ง', color: 'var(--text-muted)', bg: '#f9fafb', border: '#e5e7eb' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1.5px solid ${s.border}`, borderRadius: 14, padding: '14px 12px', boxShadow: '0 2px 6px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ width: 24, height: 24, borderRadius: 7, background: `linear-gradient(135deg, color-mix(in srgb, ${s.color} 55%, white), ${s.color})`, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{s.icon}</span>
              <span style={{ fontSize: '1.8rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Filter ── */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <OrgFilterBar value={orgFilter} onChange={setOrgFilter} />
        {!isMobile && (
          <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 9, padding: 2, flexShrink: 0, marginLeft: 'auto' }}>
            {([['card', 'การ์ด', LayoutGrid], ['table', 'ตาราง', Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} onClick={() => setListView(v)}
                title={label}
                style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: listView === v ? 700 : 500, background: listView === v ? '#fff' : 'transparent', color: listView === v ? '#ea580c' : 'var(--text-muted)', boxShadow: listView === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div style={{ ...card, overflow: 'hidden' }}>
        {(isMobile || listView === 'card') ? (
          <div>
            {filtered.map((r, i) => (
              <div key={r.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6', background: !r.check_out_at ? '#eff6ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>
                      {r.employee.first_name} {r.employee.last_name}
                      {r.employee.nickname && <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}> ({r.employee.nickname})</span>}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 1 }}>{r.employee.branch.name}</div>
                  </div>
                  {!r.check_out_at && (
                    <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>กำลังนอกสถานที่</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.78rem', color: '#374151', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 46 }}>เข้า</span>
                    <span>{thDateTime(r.check_in_at)}</span>
                    {r.check_in_lat && r.check_in_lng && (
                      <a href={directionsUrl(r.check_in_lat, r.check_in_lng)} target="_blank" rel="noreferrer" title="นำทางด้วย Google Maps" aria-label="นำทางด้วย Google Maps" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 2 }}>
                        <MapPin size={12} /><ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  {r.check_in_address && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 52 }}>{r.check_in_address}</div>
                  )}
                  {r.check_out_at && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ color: 'var(--text-muted)', minWidth: 46 }}>ออก</span>
                      <span>{thDateTime(r.check_out_at)}</span>
                      {r.check_out_lat && r.check_out_lng && (
                        <a href={directionsUrl(r.check_out_lat, r.check_out_lng)} target="_blank" rel="noreferrer" title="นำทางด้วย Google Maps" aria-label="นำทางด้วย Google Maps" style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: 2 }}>
                          <MapPin size={12} /><ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  )}
                  {r.check_out_address && (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: 52 }}>{r.check_out_address}</div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 46 }}>ระยะเวลา</span>
                    <span style={{ fontWeight: 600 }}>{duration(r.check_in_at, r.check_out_at)}</span>
                  </div>
                </div>
                {r.note && <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', background: '#f9fafb', borderRadius: 8, padding: '6px 10px', marginBottom: !isReadOnly ? 8 : 0 }}>{r.note}</div>}
                {!isReadOnly && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', fontSize: '12px', cursor: 'pointer' }}><Pencil size={12}/> แก้ไข</button>
                    <button onClick={() => setDeleteTarget(r)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}><Trash2 size={12}/> ลบ</button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีรายการเช็คอินนอกสถานที่</div>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#eff6ff', borderBottom: '1px solid #f1f5f9' }}>
                  {['พนักงาน','สาขา','เข้า','ออก','ระยะเวลา','หมายเหตุ','สถานะ', ...(isReadOnly ? [] : ['จัดการ'])].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#2563eb', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #f8fafc', background: !r.check_out_at ? '#f0f7ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{r.employee.first_name} {r.employee.last_name}</p>
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>{r.employee.nickname}</p>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{r.employee.branch.name}</td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', maxWidth: 220 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                        {thDateTime(r.check_in_at)}
                        {r.check_in_lat && r.check_in_lng && (
                          <a href={directionsUrl(r.check_in_lat, r.check_in_lng)} target="_blank" rel="noreferrer" title="นำทางด้วย Google Maps" aria-label="นำทางด้วย Google Maps" style={{ color: '#2563eb', display: 'flex' }}><MapPin size={13} /></a>
                        )}
                      </div>
                      {r.check_in_address && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{r.check_in_address}</div>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', maxWidth: 220 }}>
                      {r.check_out_at ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}>
                            {thDateTime(r.check_out_at)}
                            {r.check_out_lat && r.check_out_lng && (
                              <a href={directionsUrl(r.check_out_lat, r.check_out_lng)} target="_blank" rel="noreferrer" title="นำทางด้วย Google Maps" aria-label="นำทางด้วย Google Maps" style={{ color: '#2563eb', display: 'flex' }}><MapPin size={13} /></a>
                            )}
                          </div>
                          {r.check_out_address && <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>{r.check_out_address}</div>}
                        </>
                      ) : <span style={{ color: '#d1d5db' }}>—</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151', fontSize: '12px', whiteSpace: 'nowrap' }}>{duration(r.check_in_at, r.check_out_at)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: '12px', maxWidth: 200 }}>{r.note || '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      {!r.check_out_at ? (
                        <span style={{ background: '#dbeafe', color: '#2563eb', borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>กำลังนอกสถานที่</span>
                      ) : (
                        <span style={{ background: '#f0fdf4', color: '#15803d', borderRadius: 99, padding: '3px 10px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>เสร็จสิ้น</span>
                      )}
                    </td>
                    {!isReadOnly && (
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => openEdit(r)} title="แก้ไข" aria-label="แก้ไข" style={{ padding: 6, borderRadius: 7, border: '1px solid #e5e7eb', background: '#fff', color: '#374151', cursor: 'pointer', display: 'flex' }}><Pencil size={13}/></button>
                          <button onClick={() => setDeleteTarget(r)} title="ลบ" aria-label="ลบ" style={{ padding: 6, borderRadius: 7, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex' }}><Trash2 size={13}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={isReadOnly ? 7 : 8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>ยังไม่มีรายการเช็คอินนอกสถานที่</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {modal && (
        <div style={sheetOverlay} onClick={() => setModal(null)}>
          <div style={sheetBox} onClick={ev => ev.stopPropagation()}>
            <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '16px', color: '#111827', margin: 0 }}>
                {modal === 'add' ? 'เพิ่มรายการเช็คอินนอกสถานที่' : `แก้ไข: ${editTarget?.employee.first_name} ${editTarget?.employee.last_name}`}
              </p>
              <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }} aria-label="ปิด"><X size={18}/></button>
            </div>
            <div style={{ padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto', flex: 1 }}>
              {modal === 'add' ? (
                <div>
                  <label style={label}>พนักงาน</label>
                  <select value={form.employee_id} onChange={e => setForm(f => ({ ...f, employee_id: e.target.value }))} style={input}>
                    <option value="">เลือกพนักงาน</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}{e.nickname ? ` (${e.nickname})` : ''} — {e.employee_code}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: '#f8fafc', border: '1px dashed #cbd5e1', borderRadius: 8, padding: '9px 14px', fontSize: '13px', color: '#1e293b' }}>
                  พนักงาน: <strong>{editTarget?.employee.first_name} {editTarget?.employee.last_name}</strong> ({editTarget?.employee.employee_code})
                </div>
              )}

              <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: '4px 0 0' }}>เช็คอิน</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label style={label}>วันที่</label><input type="date" value={form.check_in_date} onChange={e => setForm(f => ({ ...f, check_in_date: e.target.value }))} style={input} /></div>
                <div><label style={label}>เวลา</label><input type="time" value={form.check_in_time} onChange={e => setForm(f => ({ ...f, check_in_time: e.target.value }))} style={input} /></div>
              </div>
              <div>
                <label style={label}>ที่อยู่ (พิมพ์เอง — ไม่ใช่ GPS)</label>
                <input value={form.check_in_address} onChange={e => setForm(f => ({ ...f, check_in_address: e.target.value }))} placeholder="เช่น บริษัท ABC จำกัด, ถ.สุขุมวิท" style={input} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#374151', margin: 0 }}>เช็คเอาต์</p>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.still_active} onChange={e => setForm(f => ({ ...f, still_active: e.target.checked }))} />
                  ยังไม่เช็คเอาต์ (กำลังนอกสถานที่)
                </label>
              </div>
              {!form.still_active && (<>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div><label style={label}>วันที่</label><input type="date" value={form.check_out_date} onChange={e => setForm(f => ({ ...f, check_out_date: e.target.value }))} style={input} /></div>
                  <div><label style={label}>เวลา</label><input type="time" value={form.check_out_time} onChange={e => setForm(f => ({ ...f, check_out_time: e.target.value }))} style={input} /></div>
                </div>
                <div>
                  <label style={label}>ที่อยู่ (พิมพ์เอง — ไม่ใช่ GPS)</label>
                  <input value={form.check_out_address} onChange={e => setForm(f => ({ ...f, check_out_address: e.target.value }))} placeholder="เช่น บริษัท ABC จำกัด, ถ.สุขุมวิท" style={input} />
                </div>
              </>)}

              <div>
                <label style={label}>หมายเหตุ</label>
                <textarea value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} rows={3} placeholder="ระบุหมายเหตุเพิ่มเติม" style={{ ...input, resize: 'vertical' }} />
              </div>
            </div>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0 }}>
              <button onClick={() => setModal(null)} style={{ padding: '10px 22px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>ยกเลิก</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '10px 28px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="ลบรายการเช็คอินนอกสถานที่?"
          message={`รายการของ "${deleteTarget.employee.first_name} ${deleteTarget.employee.last_name}" (${thDateTime(deleteTarget.check_in_at)}) จะถูกลบออกจากระบบ`}
          confirmLabel="ลบรายการ"
          variant="danger"
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
