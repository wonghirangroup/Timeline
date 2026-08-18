// Super Admin — Billing & Payment Management
import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Invoice, PaymentStatus, TenantPlan } from '../../../types'
import { useToast } from '../../../components/ui/Toast'
import { api } from '../../../lib/axios'

interface BillingTenant {
  id: string
  name: string
  plan: string
  expires_at: string | null
}

const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string) {
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}
function daysUntil(s: string) {
  return Math.ceil((new Date(s).getTime() - Date.now()) / 86400000)
}

const STATUS_CFG: Record<PaymentStatus, { label: string; color: string; bg: string; border: string }> = {
  PAID:      { label: 'ชำระแล้ว',  color: 'var(--success-text)', bg: '#f0fdf4', border: 'var(--success-border)' },
  PENDING:   { label: 'รอชำระ',    color: 'var(--warning-text)', bg: '#fffbeb', border: 'var(--warning-border)' },
  OVERDUE:   { label: 'ค้างชำระ',  color: 'var(--error-text)', bg: '#fef2f2', border: 'var(--error-border)' },
  CANCELLED: { label: 'ยกเลิก',   color: 'var(--text-gray)', bg: '#f9fafb', border: '#d1d5db' },
}
const PLAN_CFG: Record<TenantPlan, { label: string; color: string; bg: string }> = {
  STARTER:      { label: 'Starter',      color: 'var(--text-body)', bg: '#f3f4f6' },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe' },
}

const EMPTY_INVOICE: Omit<Invoice, 'id'> = {
  tenant_id: '', tenant_name: '', plan: 'STARTER', amount: 990,
  due_date: '', paid_date: null, status: 'PENDING',
  period_start: '', period_end: '', note: '',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff',
}
const labelSt: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 4, display: 'block' }

export default function BillingPage() {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [tenants,  setTenants]  = useState<BillingTenant[]>([])

  // Filters — tenantIdFilter pre-fills from ?tenant= query param (Tenant Detail "ดู Invoice" link)
  const [statusFilter,   setStatusFilter]   = useState<PaymentStatus | ''>('')
  const [planFilter,     setPlanFilter]     = useState<TenantPlan | ''>('')
  const [search,         setSearch]         = useState('')
  const [tenantIdFilter, setTenantIdFilter] = useState(() => searchParams.get('tenant') ?? '')

  // Undo for mark-paid
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [undoPending, setUndoPending] = useState<{ inv: Invoice; prevStatus: PaymentStatus } | null>(null)

  // Modals
  const [createModal, setCreateModal]     = useState(false)
  const [detailInv,   setDetailInv]       = useState<Invoice | null>(null)
  const [extendInv,   setExtendInv]       = useState<Invoice | null>(null)
  const [extendDays,  setExtendDays]      = useState(30)
  const [form,        setForm]            = useState<Omit<Invoice, 'id'>>(EMPTY_INVOICE)

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setCreateModal(false); setDetailInv(null); setExtendInv(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  useEffect(() => {
    api.get('/api/v1/super-admin/invoices')
      .then(res => { if (Array.isArray(res.data?.data)) setInvoices(res.data.data) })
      .catch(() => {})
    api.get('/api/v1/super-admin/tenants')
      .then(res => {
        if (Array.isArray(res.data?.data)) {
          setTenants(res.data.data.map((t: { id: string; name: string; plan: string; expires_at?: string }) => ({
            id: t.id, name: t.name,
            plan: t.plan === 'PRO' ? 'PROFESSIONAL' : t.plan,
            expires_at: t.expires_at ?? null,
          })))
        }
      })
      .catch(() => {})
  }, [])

  // Computed
  const today = new Date().toISOString().slice(0, 10)

  const expiringSoon = tenants.filter(t =>
    t.expires_at && daysUntil(t.expires_at) >= 0 && daysUntil(t.expires_at) <= 30
  )

  const stats = useMemo(() => {
    const paid    = invoices.filter(i => i.status === 'PAID')
    const pending = invoices.filter(i => i.status === 'PENDING')
    const overdue = invoices.filter(i => i.status === 'OVERDUE')
    const mrr     = invoices.filter(i => i.status === 'PAID' && i.period_end >= today)
                           .reduce((s, i) => s + i.amount, 0)
    return {
      mrr,
      paidCount:    paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      overdueAmt:   overdue.reduce((s, i) => s + i.amount, 0),
      pendingAmt:   pending.reduce((s, i) => s + i.amount, 0),
    }
  }, [invoices, today])

  const filtered = useMemo(() => invoices.filter(i =>
    (!statusFilter   || i.status    === statusFilter) &&
    (!planFilter     || i.plan      === planFilter) &&
    (!search         || i.tenant_name.includes(search)) &&
    (!tenantIdFilter || i.tenant_id === tenantIdFilter)
  ).sort((a, b) => a.due_date < b.due_date ? 1 : -1), [invoices, statusFilter, planFilter, search, tenantIdFilter])

  const filteredTenantName = tenantIdFilter
    ? (tenants.find(t => t.id === tenantIdFilter)?.name ?? tenantIdFilter)
    : null

  const duplicateWarning = useMemo(() => {
    if (!form.tenant_id || !form.period_start || !form.period_end) return null
    return invoices.find(i =>
      i.tenant_id === form.tenant_id &&
      i.status !== 'CANCELLED' &&
      i.period_start <= form.period_end &&
      i.period_end >= form.period_start
    ) ?? null
  }, [invoices, form.tenant_id, form.period_start, form.period_end])

  // Actions
  async function markPaid(inv: Invoice) {
    const prevStatus = inv.status
    try {
      await api.patch(`/api/v1/super-admin/invoices/${inv.id}`, { status: 'PAID', paid_date: today })
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'PAID', paid_date: today } : i))
      setDetailInv(null)
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      setUndoPending({ inv, prevStatus })
      undoTimerRef.current = setTimeout(() => setUndoPending(null), 5000)
    } catch {
      showToast('error', 'บันทึกไม่สำเร็จ — กรุณาลองใหม่')
    }
  }

  async function handleUndoMarkPaid() {
    if (!undoPending) return
    const pending = undoPending
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    setUndoPending(null)
    try {
      await api.patch(`/api/v1/super-admin/invoices/${pending.inv.id}`, { status: pending.prevStatus, paid_date: null })
      setInvoices(prev => prev.map(i => i.id === pending.inv.id ? { ...i, status: pending.prevStatus, paid_date: null } : i))
      showToast('info', `ยกเลิกการชำระเงิน ${pending.inv.tenant_name} แล้ว`)
    } catch {
      showToast('error', 'ยกเลิกไม่สำเร็จ')
    }
  }

  async function handleExtend() {
    if (!extendInv) return
    const d = new Date(extendInv.period_end)
    d.setDate(d.getDate() + extendDays)
    const newEnd = d.toISOString().slice(0, 10)
    try {
      await api.patch(`/api/v1/super-admin/invoices/${extendInv.id}`, { period_end: newEnd })
      setInvoices(prev => prev.map(i => i.id === extendInv.id ? { ...i, period_end: newEnd } : i))
      showToast('success', `ต่ออายุ ${extendInv.tenant_name} ไปถึง ${thDate(newEnd)} แล้ว`)
      setExtendInv(null)
    } catch {
      showToast('error', 'ต่ออายุไม่สำเร็จ — กรุณาลองใหม่')
    }
  }

  async function createInvoice() {
    if (!form.tenant_id || !form.due_date || !form.period_start || !form.period_end) return
    try {
      const res = await api.post('/api/v1/super-admin/invoices', form)
      const inv: Invoice = res.data?.data ?? { ...form, id: `inv-${Date.now()}` }
      setInvoices(prev => [inv, ...prev])
      showToast('success', `สร้าง Invoice ให้ ${inv.tenant_name} เรียบร้อยแล้ว`)
      setCreateModal(false)
      setForm(EMPTY_INVOICE)
    } catch {
      showToast('error', 'สร้าง Invoice ไม่สำเร็จ — กรุณาลองใหม่')
    }
  }

  async function cancelInvoice(inv: Invoice) {
    try {
      await api.patch(`/api/v1/super-admin/invoices/${inv.id}`, { status: 'CANCELLED' })
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: 'CANCELLED' } : i))
      showToast('info', `ยกเลิก Invoice ${inv.id} แล้ว`)
      setDetailInv(null)
    } catch {
      showToast('error', 'ยกเลิกไม่สำเร็จ — กรุณาลองใหม่')
    }
  }

  async function sendReminder(inv: Invoice) {
    try {
      await api.post(`/api/v1/super-admin/invoices/${inv.id}/reminder`)
      showToast('success', `ส่ง reminder ให้ ${inv.tenant_name} ทาง email แล้ว`)
    } catch {
      showToast('error', 'ส่ง reminder ไม่สำเร็จ')
    }
  }

  return (
    <div>
      {/* Undo banner — mark paid */}
      {undoPending && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-dark)', color: '#fff', borderRadius: 10, padding: '12px 20px',
          display: 'flex', alignItems: 'center', gap: 14, zIndex: 999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.35)', fontSize: '0.875rem', whiteSpace: 'nowrap',
        }}>
          <span>✓ บันทึกชำระเงิน <strong>{undoPending.inv.tenant_name}</strong> แล้ว</span>
          <button
            onClick={handleUndoMarkPaid}
            style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.35)', background: 'transparent', color: '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
          >Undo</button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.1rem', fontWeight: 700 }}>💳 Billing & Payment</h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-gray)' }}>จัดการ Invoice, ติดตามการชำระเงิน และต่ออายุ Tenant</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_INVOICE); setCreateModal(true) }}
          style={{ padding: '9px 18px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <Plus size={14} />
          สร้าง Invoice ใหม่
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-stats" style={{ marginBottom: 20 }}>
        {[
          { label: 'MRR (เดือนนี้)',     value: `฿${stats.mrr.toLocaleString()}`,            color: 'var(--sa-accent)', bg: '#ede9fe', icon: '📈', sub: 'จาก invoice ที่ active' },
          { label: 'รอชำระ',             value: `${stats.pendingCount} Invoice`,              color: 'var(--warning-text)', bg: '#fffbeb', icon: '⏳', sub: `฿${stats.pendingAmt.toLocaleString()}` },
          { label: 'ค้างชำระ',           value: `${stats.overdueCount} Invoice`,              color: 'var(--error-text)', bg: '#fef2f2', icon: '🚨', sub: `฿${stats.overdueAmt.toLocaleString()}` },
          { label: 'หมดอายุใน 30 วัน',  value: `${expiringSoon.length} Tenant`,              color: '#f97316', bg: '#fff7ed', icon: '⚠️', sub: expiringSoon.map(t => t.name).join(', ') || 'ไม่มี' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, borderRadius: 12, padding: '16px 18px', border: '1px solid rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-gray)', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Tenant filter banner — shown when navigated from Tenant Detail */}
      {filteredTenantName && (
        <div style={{ background: 'var(--sa-accent-light)', border: '1px solid var(--sa-accent-border)', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--sa-accent)', fontWeight: 600 }}>
            🔍 แสดง Invoice ของ: <strong>{filteredTenantName}</strong>
          </span>
          <button
            onClick={() => setTenantIdFilter('')}
            style={{ marginLeft: 'auto', padding: '4px 10px', borderRadius: 6, border: '1px solid var(--sa-accent-border)', background: '#fff', color: 'var(--text-gray)', fontSize: '0.78rem', cursor: 'pointer' }}
          >ล้างตัวกรอง ✕</button>
        </div>
      )}

      {/* Expiry alerts */}
      {expiringSoon.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#c2410c', marginBottom: 8 }}>⚠️ Tenant ใกล้หมดอายุ — กด "ต่ออายุ" เพื่อสร้าง Invoice ทันที</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {expiringSoon.map(t => {
              const days = daysUntil(t.expires_at!)
              const newStart = today
              const newEnd   = (() => { const d = new Date(t.expires_at!); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) })()
              const dueDate  = (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 10) })()
              return (
                <div
                  key={t.id}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px 5px 12px', borderRadius: 8, background: days <= 7 ? '#fef2f2' : '#fff', border: `1px solid ${days <= 7 ? 'var(--error-border)' : '#fed7aa'}`, fontSize: '0.8rem' }}
                >
                  <span
                    style={{ fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}
                    onClick={() => navigate(`/superadmin/tenants/${t.id}`)}
                  >{t.name}</span>
                  <span style={{ color: days <= 7 ? 'var(--error-text)' : 'var(--warning-text)', fontWeight: 700 }}>
                    {days === 0 ? 'วันนี้!' : `${days} วัน`}
                  </span>
                  <button
                    onClick={() => {
                      setForm({
                        tenant_id: t.id, tenant_name: t.name,
                        plan: (t.plan as any) ?? 'STARTER',
                        amount: t.plan === 'PROFESSIONAL' ? 2490 : t.plan === 'ENTERPRISE' ? 0 : 990,
                        due_date: dueDate, paid_date: null, status: 'PENDING',
                        period_start: newStart, period_end: newEnd, note: 'ต่ออายุ 30 วัน',
                      })
                      setCreateModal(true)
                    }}
                    style={{ padding: '3px 8px', borderRadius: 5, border: '1px solid #fed7aa', background: '#fff7ed', color: '#c2410c', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >+ ต่ออายุ</button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="🔍 ค้นหาชื่อบริษัท..."
          style={{ ...inputSt, width: 220 }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)} style={{ ...inputSt, width: 'auto' }}>
          <option value="">ทุกสถานะ</option>
          <option value="PAID">ชำระแล้ว</option>
          <option value="PENDING">รอชำระ</option>
          <option value="OVERDUE">ค้างชำระ</option>
          <option value="CANCELLED">ยกเลิก</option>
        </select>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value as any)} style={{ ...inputSt, width: 'auto' }}>
          <option value="">ทุก Plan</option>
          <option value="STARTER">Starter</option>
          <option value="PROFESSIONAL">Professional</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-subtle)', marginLeft: 'auto' }}>{filtered.length} Invoice</span>
      </div>

      {/* Invoice Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Invoice', 'บริษัท', 'Plan', 'ระยะเวลา', 'จำนวน', 'ครบกำหนด', 'ชำระเมื่อ', 'สถานะ', 'จัดการ'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: 'var(--text-body)', whiteSpace: 'nowrap', fontSize: '0.78rem', borderBottom: '1px solid #f1f5f9' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => {
                const sc  = STATUS_CFG[inv.status]
                const pc  = PLAN_CFG[inv.plan]
                const overdueDays = inv.status === 'OVERDUE' ? Math.abs(daysUntil(inv.due_date)) : 0
                return (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <span
                        style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--sa-accent)', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setDetailInv(inv)}
                      >{inv.id}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span
                        style={{ fontWeight: 600, color: 'var(--text-dark)', cursor: 'pointer' }}
                        onClick={() => navigate(`/superadmin/tenants/${inv.tenant_id}`)}
                      >{inv.tenant_name}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '2px 9px', fontSize: '0.72rem', fontWeight: 700 }}>{pc.label}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.78rem', color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
                      {thDate(inv.period_start)} – {thDate(inv.period_end)}
                    </td>
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: inv.amount === 0 ? 'var(--text-subtle)' : 'var(--text-dark)', whiteSpace: 'nowrap' }}>
                      {inv.amount === 0 ? 'Custom' : `฿${inv.amount.toLocaleString()}`}
                    </td>
                    <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ fontSize: '0.82rem', color: inv.status === 'OVERDUE' ? 'var(--error-text)' : 'var(--text-body)', fontWeight: inv.status === 'OVERDUE' ? 700 : 400 }}>
                        {thDate(inv.due_date)}
                      </div>
                      {inv.status === 'OVERDUE' && (
                        <div style={{ fontSize: '0.7rem', color: 'var(--error-text)' }}>เกินกำหนด {overdueDays} วัน</div>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '0.82rem', color: 'var(--text-gray)', whiteSpace: 'nowrap' }}>
                      {inv.paid_date ? thDate(inv.paid_date) : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, borderRadius: 99, padding: '3px 10px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {sc.label}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 5 }}>
                        {inv.status === 'PENDING' || inv.status === 'OVERDUE' ? (
                          <>
                            <button onClick={() => markPaid(inv)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--success-border)', background: '#f0fdf4', color: 'var(--success-text)', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>✓ ชำระแล้ว</button>
                            <button onClick={() => sendReminder(inv)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', color: 'var(--text-gray)', fontSize: '0.72rem', cursor: 'pointer' }}>📧</button>
                          </>
                        ) : null}
                        {inv.status === 'PAID' && (
                          <button onClick={() => { setExtendInv(inv); setExtendDays(30) }} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #c4b5fd', background: '#ede9fe', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>↪ ต่ออายุ</button>
                        )}
                        <button onClick={() => setDetailInv(inv)} style={{ padding: '4px 9px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-gray)', fontSize: '0.72rem', cursor: 'pointer' }}>ดู</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-subtle)' }}>ไม่พบ Invoice</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Create Invoice Modal ── */}
      {createModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) setCreateModal(false) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="create-invoice-title" style={{ background: '#fff', borderRadius: 16, width: 520, maxWidth: '92vw', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span id="create-invoice-title" style={{ fontWeight: 700, fontSize: '1rem' }}>สร้าง Invoice ใหม่</span>
              <button onClick={() => setCreateModal(false)} aria-label="ปิดหน้าต่าง" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelSt}>บริษัท / Tenant *</label>
                <select
                  value={form.tenant_id}
                  onChange={e => {
                    const t = tenants.find(x => x.id === e.target.value)
                    const plan = (t?.plan ?? 'STARTER') as TenantPlan
                    setForm(f => ({ ...f, tenant_id: e.target.value, tenant_name: t?.name ?? '', plan, amount: plan === 'PROFESSIONAL' ? 2490 : plan === 'ENTERPRISE' ? 0 : 990 }))
                  }}
                  style={inputSt}
                >
                  <option value="">-- เลือก Tenant --</option>
                  {tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>Plan</label>
                  <select value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value as TenantPlan }))} style={inputSt}>
                    <option value="STARTER">Starter</option>
                    <option value="PROFESSIONAL">Professional</option>
                    <option value="ENTERPRISE">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label style={labelSt}>จำนวนเงิน (฿)</label>
                  <input type="number" min={0} value={form.amount} onChange={e => setForm(f => ({ ...f, amount: parseInt(e.target.value) || 0 }))} style={inputSt} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelSt}>ระยะเวลาเริ่มต้น *</label>
                  <input type="date" value={form.period_start} onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>ระยะเวลาสิ้นสุด *</label>
                  <input type="date" value={form.period_end} onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} style={inputSt} />
                </div>
              </div>
              <div>
                <label style={labelSt}>ครบกำหนดชำระ *</label>
                <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} style={inputSt} />
              </div>
              {duplicateWarning && (
                <div style={{ background: '#fffbeb', border: '1px solid var(--warning-border)', borderRadius: 8, padding: '10px 14px', fontSize: '0.8rem', color: '#92400e', lineHeight: 1.5 }}>
                  ⚠️ มี Invoice <strong>{duplicateWarning.id}</strong> ({STATUS_CFG[duplicateWarning.status].label}) ของ Tenant นี้อยู่แล้วในช่วงวันเดียวกัน — ตรวจสอบให้แน่ใจก่อนสร้างซ้ำ
                </div>
              )}
              <div>
                <label style={labelSt}>หมายเหตุ</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} placeholder="เช่น ชำระรายปี, ส่วนลด..." style={inputSt} />
              </div>
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setCreateModal(false)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>ยกเลิก</button>
              <button
                onClick={createInvoice}
                disabled={!form.tenant_id || !form.due_date || !form.period_start || !form.period_end}
                style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', opacity: (!form.tenant_id || !form.due_date) ? 0.5 : 1 }}
              >สร้าง Invoice</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Detail Modal ── */}
      {detailInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) setDetailInv(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="invoice-detail-title" style={{ background: '#fff', borderRadius: 16, width: 460, maxWidth: '92vw' }}>
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span id="invoice-detail-title" style={{ fontWeight: 700, fontSize: '1rem', fontFamily: 'monospace' }}>{detailInv.id}</span>
              <button onClick={() => setDetailInv(null)} aria-label="ปิดหน้าต่าง" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)' }}>
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Status banner */}
              <div style={{ background: STATUS_CFG[detailInv.status].bg, border: `1px solid ${STATUS_CFG[detailInv.status].border}`, borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 700, color: STATUS_CFG[detailInv.status].color }}>{STATUS_CFG[detailInv.status].label}</span>
                {detailInv.amount > 0 && <span style={{ fontSize: '1.2rem', fontWeight: 800, color: STATUS_CFG[detailInv.status].color }}>฿{detailInv.amount.toLocaleString()}</span>}
              </div>
              {/* Info grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'บริษัท',       value: detailInv.tenant_name },
                  { label: 'Plan',          value: PLAN_CFG[detailInv.plan].label },
                  { label: 'ครบกำหนด',     value: thDate(detailInv.due_date) },
                  { label: 'ชำระเมื่อ',    value: detailInv.paid_date ? thDate(detailInv.paid_date) : '—' },
                  { label: 'ระยะเวลาเริ่ม', value: thDate(detailInv.period_start) },
                  { label: 'ระยะเวลาสิ้นสุด', value: thDate(detailInv.period_end) },
                ].map(r => (
                  <div key={r.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-subtle)', marginBottom: 2 }}>{r.label}</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-dark)' }}>{r.value}</div>
                  </div>
                ))}
              </div>
              {detailInv.note && (
                <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 12px', fontSize: '0.82rem', color: 'var(--text-body)' }}>
                  📝 {detailInv.note}
                </div>
              )}
            </div>
            <div style={{ padding: '14px 22px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {(detailInv.status === 'PENDING' || detailInv.status === 'OVERDUE') && (
                <>
                  <button onClick={() => markPaid(detailInv)} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#f97316', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>✓ บันทึกชำระแล้ว</button>
                  <button onClick={() => sendReminder(detailInv)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: 'var(--text-body)', fontSize: '0.85rem', cursor: 'pointer' }}>📧 ส่ง Reminder</button>
                  <button onClick={() => cancelInvoice(detailInv)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid var(--error-border)', background: '#fff', color: 'var(--error-text)', fontSize: '0.85rem', cursor: 'pointer' }}>ยกเลิก</button>
                </>
              )}
              {detailInv.status === 'PAID' && (
                <button onClick={() => { setExtendInv(detailInv); setExtendDays(30); setDetailInv(null) }} style={{ padding: '9px 16px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>↪ ต่ออายุ</button>
              )}
              <button onClick={() => setDetailInv(null)} style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: 'var(--text-body)', fontSize: '0.85rem', cursor: 'pointer', marginLeft: 'auto' }}>ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extend Modal ── */}
      {extendInv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }} onClick={e => { if (e.target === e.currentTarget) setExtendInv(null) }}>
          <div role="dialog" aria-modal="true" aria-labelledby="extend-modal-title" style={{ background: '#fff', borderRadius: 14, width: 380, maxWidth: '90vw', padding: '24px' }}>
            <h3 id="extend-modal-title" style={{ margin: '0 0 6px', fontWeight: 700 }}>↪ ต่ออายุการใช้งาน</h3>
            <p style={{ margin: '0 0 18px', fontSize: '0.85rem', color: 'var(--text-gray)' }}>{extendInv.tenant_name}</p>
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', color: 'var(--text-body)' }}>
              ปัจจุบันหมดอายุ: <strong>{thDate(extendInv.period_end)}</strong>
            </div>
            <label style={labelSt}>ต่ออายุเพิ่ม (วัน)</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {[7, 30, 90, 365].map(d => (
                <button
                  key={d}
                  onClick={() => setExtendDays(d)}
                  style={{ padding: '7px 14px', borderRadius: 8, cursor: 'pointer', border: `1.5px solid ${extendDays === d ? '#7c3aed' : '#e5e7eb'}`, background: extendDays === d ? '#ede9fe' : '#fff', color: extendDays === d ? '#7c3aed' : 'var(--text-body)', fontWeight: extendDays === d ? 700 : 400, fontSize: '0.82rem' }}
                >{d === 365 ? '1 ปี' : `${d} วัน`}</button>
              ))}
              <input type="number" min={1} value={extendDays} onChange={e => setExtendDays(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inputSt, width: 72 }} />
            </div>
            <div style={{ background: '#ede9fe', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: '0.82rem', color: '#7c3aed', fontWeight: 600 }}>
              หมดอายุใหม่: {(() => {
                const d = new Date(extendInv.period_end)
                d.setDate(d.getDate() + extendDays)
                return thDate(d.toISOString().slice(0, 10))
              })()}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setExtendInv(null)} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', cursor: 'pointer', fontSize: '0.875rem' }}>ยกเลิก</button>
              <button onClick={handleExtend} style={{ padding: '9px 20px', borderRadius: 8, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer' }}>ยืนยันต่ออายุ</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
