// admin/src/pages/superadmin/announcement/index.tsx
import { useState, useRef, useEffect } from 'react'
import { MOCK_TENANTS } from '../../../lib/mock'
import type { TenantPlan } from '../../../types'
import { api } from '../../../lib/axios'

// ── Types ─────────────────────────────────────────────────────────────────────
type AnnType   = 'MAINTENANCE' | 'FEATURE' | 'BILLING' | 'GENERAL' | 'URGENT'
type TargetType = 'ALL' | 'PLAN' | 'CUSTOM'
type AnnStatus = 'SENT' | 'DRAFT' | 'SCHEDULED'

interface SystemAnn {
  id: string
  type: AnnType
  title: string
  body: string
  target_type: TargetType
  target_plan: TenantPlan | null
  target_tenant_ids: string[]
  status: AnnStatus
  sent_at: string | null
  scheduled_at: string | null
  sent_count: number
  created_by: string
}

// ── Mock History ──────────────────────────────────────────────────────────────
const INIT_HISTORY: SystemAnn[] = [
  {
    id: 'sa-01', type: 'MAINTENANCE', status: 'SENT',
    title: 'แจ้งปิดปรับปรุงระบบ — 1 มิ.ย. 2566 เวลา 02:00–04:00',
    body: 'เรียนแจ้งผู้ใช้งานทุกท่าน\n\nระบบ TimeLine จะปิดให้บริการชั่วคราวเพื่อปรับปรุงระบบในวันที่ 1 มิถุนายน 2566 เวลา 02:00–04:00 น. (2 ชั่วโมง)\n\nขออภัยในความไม่สะดวก และขอบคุณที่ใช้บริการ',
    target_type: 'ALL', target_plan: null, target_tenant_ids: [],
    sent_at: '2026-05-20T09:00:00', scheduled_at: null,
    sent_count: 8, created_by: 'Super Admin',
  },
  {
    id: 'sa-02', type: 'FEATURE', status: 'SENT',
    title: 'ฟีเจอร์ใหม่: ระบบ OT อัตโนมัติพร้อมใช้งานแล้ว',
    body: 'สวัสดีครับ/ค่ะ\n\nTimeLine ได้เพิ่มฟีเจอร์ใหม่ "OT Management" สำหรับ Plan Professional ขึ้นไป\n\nฟีเจอร์นี้ช่วยให้ Admin สามารถอนุมัติ OT และคำนวณค่าล่วงเวลาได้อัตโนมัติ\n\nศึกษาข้อมูลเพิ่มเติมได้ที่ Settings > OT',
    target_type: 'PLAN', target_plan: 'PROFESSIONAL', target_tenant_ids: [],
    sent_at: '2026-05-15T10:30:00', scheduled_at: null,
    sent_count: 4, created_by: 'Super Admin',
  },
  {
    id: 'sa-03', type: 'BILLING', status: 'SENT',
    title: 'แจ้งเตือนใบแจ้งหนี้เดือน พ.ค. 2569',
    body: 'เรียนแจ้งผู้ดูแลระบบ\n\nใบแจ้งหนี้ประจำเดือนพฤษภาคม 2569 ได้ถูกออกแล้ว กรุณาชำระภายในวันที่ 15 พ.ค. 2569 เพื่อหลีกเลี่ยงการระงับการใช้งาน\n\nติดต่อสอบถาม: support@timeline.app',
    target_type: 'ALL', target_plan: null, target_tenant_ids: [],
    sent_at: '2026-05-01T08:00:00', scheduled_at: null,
    sent_count: 8, created_by: 'Super Admin',
  },
  {
    id: 'sa-04', type: 'URGENT', status: 'SENT',
    title: 'ด่วน: พบปัญหา Line Webhook — กรุณาตรวจสอบ',
    body: 'เรียนแจ้งผู้ดูแลระบบ\n\nพบปัญหาการส่ง notification ผ่าน Line OA ชั่วคราว ทีมงานกำลังแก้ไขอยู่และคาดว่าจะกลับมาปกติภายใน 30 นาที\n\nขออภัยในความไม่สะดวก',
    target_type: 'PLAN', target_plan: 'ENTERPRISE', target_tenant_ids: [],
    sent_at: '2026-04-28T14:00:00', scheduled_at: null,
    sent_count: 2, created_by: 'Super Admin',
  },
  {
    id: 'sa-05', type: 'GENERAL', status: 'DRAFT',
    title: 'แจ้งนโยบาย Privacy Policy ฉบับใหม่',
    body: 'เรียนแจ้งผู้ใช้งานทุกท่าน\n\nTimeLine ได้ปรับปรุง Privacy Policy เพื่อให้สอดคล้องกับพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)\n\nสามารถอ่านฉบับเต็มได้ที่ timeline.app/privacy',
    target_type: 'ALL', target_plan: null, target_tenant_ids: [],
    sent_at: null, scheduled_at: null,
    sent_count: 0, created_by: 'Super Admin',
  },
  {
    id: 'sa-06', type: 'MAINTENANCE', status: 'SCHEDULED',
    title: 'แจ้งปรับปรุงระบบ Database — 10 มิ.ย. 2569',
    body: 'เรียนแจ้งผู้ใช้งานทุกท่าน\n\nจะมีการปรับปรุง Database ในวันที่ 10 มิถุนายน 2569 เวลา 01:00–03:00 น. ระบบจะช้าลงในช่วงดังกล่าว',
    target_type: 'ALL', target_plan: null, target_tenant_ids: [],
    sent_at: null, scheduled_at: '2026-06-08T09:00:00',
    sent_count: 0, created_by: 'Super Admin',
  },
]

// ── Config ────────────────────────────────────────────────────────────────────
const ANN_TYPE_CONFIG: Record<AnnType, { label: string; icon: string; color: string; bg: string; border: string }> = {
  MAINTENANCE: { label: 'Maintenance',    icon: '🔧', color: '#d97706', bg: '#fef3c7', border: '#fde68a' },
  FEATURE:     { label: 'Feature Update', icon: '✨', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe' },
  BILLING:     { label: 'Billing Notice', icon: '💳', color: 'var(--success-text)', bg: '#d1fae5', border: '#a7f3d0' },
  GENERAL:     { label: 'General',        icon: '📢', color: 'var(--text-gray)', bg: '#f3f4f6', border: '#e5e7eb' },
  URGENT:      { label: 'ด่วน / Urgent',  icon: '🚨', color: 'var(--error-text)', bg: '#fee2e2', border: '#fecaca' },
}

const STATUS_CONFIG: Record<AnnStatus, { label: string; color: string; bg: string }> = {
  SENT:      { label: 'ส่งแล้ว',      color: 'var(--success-text)', bg: '#d1fae5' },
  DRAFT:     { label: 'Draft',        color: 'var(--text-gray)', bg: '#f3f4f6' },
  SCHEDULED: { label: 'กำหนดส่ง',    color: '#2563eb', bg: '#dbeafe' },
}

const PLAN_LABEL: Record<TenantPlan, string> = {
  STARTER: 'Starter', PROFESSIONAL: 'Professional', ENTERPRISE: 'Enterprise',
}

const PLAN_COLOR: Record<TenantPlan, string> = {
  STARTER: 'var(--success-text)', PROFESSIONAL: '#2563eb', ENTERPRISE: '#7c3aed',
}
const PLAN_BG: Record<TenantPlan, string> = {
  STARTER: '#d1fae5', PROFESSIONAL: '#dbeafe', ENTERPRISE: '#ede9fe',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function thDateTime(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear() + 543} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function targetLabel(ann: SystemAnn): string {
  if (ann.target_type === 'ALL')    return `ทุก Tenant (${MOCK_TENANTS.length})`
  if (ann.target_type === 'PLAN')   return `Plan ${PLAN_LABEL[ann.target_plan!]} (${MOCK_TENANTS.filter(t => t.plan === ann.target_plan).length})`
  const names = ann.target_tenant_ids.map(id => MOCK_TENANTS.find(t => t.id === id)?.name ?? id)
  return names.length <= 2 ? names.join(', ') : `${names.slice(0, 2).join(', ')} +${names.length - 2}`
}

function resolveCount(target_type: TargetType, target_plan: TenantPlan | null, target_ids: string[]): number {
  if (target_type === 'ALL')    return MOCK_TENANTS.length
  if (target_type === 'PLAN')   return MOCK_TENANTS.filter(t => t.plan === target_plan).length
  return target_ids.length
}

let nextId = 100

// ── Compose Modal ─────────────────────────────────────────────────────────────
interface ComposeProps {
  onClose: () => void
  onSend: (ann: SystemAnn, replacingId?: string) => void
  initialData?: SystemAnn
}

const TEMPLATES: Record<AnnType, { title: string; body: string }> = {
  MAINTENANCE: {
    title: 'แจ้งปิดปรับปรุงระบบ — [วันที่] เวลา [เวลา]',
    body:  'เรียนแจ้งผู้ใช้งานทุกท่าน\n\nระบบ TimeLine จะปิดให้บริการชั่วคราวเพื่อปรับปรุงระบบในวันที่ [วันที่] เวลา [เวลา]\n\nขออภัยในความไม่สะดวก และขอบคุณที่ใช้บริการ\n\n— ทีม TimeLine',
  },
  FEATURE: {
    title: 'ฟีเจอร์ใหม่: [ชื่อฟีเจอร์] พร้อมใช้งานแล้ว',
    body:  'สวัสดีครับ/ค่ะ\n\nTimeLine ได้เพิ่มฟีเจอร์ใหม่ "[ชื่อฟีเจอร์]"\n\n[รายละเอียดฟีเจอร์]\n\nสามารถเข้าใช้งานได้ที่เมนู [เมนู]\n\n— ทีม TimeLine',
  },
  BILLING: {
    title: 'แจ้งเตือนใบแจ้งหนี้เดือน [เดือน/ปี]',
    body:  'เรียนแจ้งผู้ดูแลระบบ\n\nใบแจ้งหนี้ประจำเดือน [เดือน/ปี] ได้ถูกออกแล้ว กรุณาชำระภายในวันที่ [วันครบกำหนด]\n\nติดต่อสอบถาม: support@timeline.app\n\n— ทีม TimeLine',
  },
  URGENT: {
    title: 'ด่วน: [หัวข้อปัญหา]',
    body:  'เรียนแจ้งผู้ดูแลระบบ\n\nพบปัญหา [รายละเอียด] ทีมงานกำลังแก้ไขอยู่\n\nคาดว่าจะกลับมาปกติภายใน [เวลา]\n\nขออภัยในความไม่สะดวก\n\n— ทีม TimeLine',
  },
  GENERAL: {
    title: '',
    body:  '',
  },
}

function ComposeModal({ onClose, onSend, initialData }: ComposeProps) {
  const [step, setStep] = useState<'compose' | 'preview'>('compose')
  const [annType, setAnnType] = useState<AnnType>(initialData?.type ?? 'GENERAL')
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [body, setBody] = useState(initialData?.body ?? '')
  const [targetType, setTargetType] = useState<TargetType>(initialData?.target_type ?? 'ALL')
  const [targetPlan, setTargetPlan] = useState<TenantPlan>(initialData?.target_plan ?? 'PROFESSIONAL')
  const [targetIds, setTargetIds] = useState<string[]>(initialData?.target_tenant_ids ?? [])
  const [scheduleMode, setScheduleMode] = useState<'now' | 'schedule'>('now')
  const [scheduleAt, setScheduleAt] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (overlayRef.current === e.target) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  function applyTemplate(t: AnnType) {
    setAnnType(t)
    if (TEMPLATES[t].title) setTitle(TEMPLATES[t].title)
    if (TEMPLATES[t].body)  setBody(TEMPLATES[t].body)
  }

  async function handleSend() {
    setSending(true)
    setSendError(null)
    try {
      const payload = {
        type: annType, title, body,
        target_type: targetType,
        target_plan: targetType === 'PLAN' ? targetPlan : null,
        target_tenant_ids: targetType === 'CUSTOM' ? targetIds : [],
        schedule_mode: scheduleMode,
        scheduled_at: scheduleMode === 'schedule' ? scheduleAt : null,
      }
      const method = initialData ? api.put : api.post
      const url = initialData
        ? `/api/v1/super-admin/announcements/${initialData.id}`
        : '/api/v1/super-admin/announcements'
      const res = await method(url, payload)
      const ann: SystemAnn = res.data?.data ?? {
        id: initialData?.id ?? `sa-${++nextId}`,
        type: annType, title, body,
        target_type: targetType,
        target_plan: targetType === 'PLAN' ? targetPlan : null,
        target_tenant_ids: targetType === 'CUSTOM' ? targetIds : [],
        status: scheduleMode === 'schedule' ? 'SCHEDULED' : 'SENT',
        sent_at: scheduleMode === 'now' ? new Date().toISOString() : null,
        scheduled_at: scheduleMode === 'schedule' ? scheduleAt : null,
        sent_count: scheduleMode === 'now' ? resolveCount(targetType, targetPlan, targetIds) : 0,
        created_by: 'Super Admin',
      }
      onSend(ann, initialData?.id)
    } catch {
      setSendError('ส่งไม่สำเร็จ — กรุณาตรวจสอบการเชื่อมต่อแล้วลองใหม่')
    } finally {
      setSending(false)
    }
  }

  async function handleSaveDraft() {
    if (!title.trim()) return
    try {
      const payload = {
        type: annType, title, body,
        target_type: targetType,
        target_plan: targetType === 'PLAN' ? targetPlan : null,
        target_tenant_ids: targetType === 'CUSTOM' ? targetIds : [],
        status: 'DRAFT',
      }
      const method = initialData ? api.put : api.post
      const url = initialData
        ? `/api/v1/super-admin/announcements/${initialData.id}`
        : '/api/v1/super-admin/announcements'
      const res = await method(url, payload)
      const draft: SystemAnn = res.data?.data ?? {
        id: initialData?.id ?? `sa-${++nextId}`, type: annType, title, body,
        target_type: targetType,
        target_plan: targetType === 'PLAN' ? targetPlan : null,
        target_tenant_ids: targetType === 'CUSTOM' ? targetIds : [],
        status: 'DRAFT', sent_at: null, scheduled_at: null,
        sent_count: 0, created_by: 'Super Admin',
      }
      onSend(draft, initialData?.id)
    } catch {
      // draft save failure is non-critical; parent toast will not fire
    }
  }

  const recipientCount = resolveCount(targetType, targetPlan, targetIds)
  const canSend = title.trim().length > 0 && body.trim().length > 0 && recipientCount > 0 &&
    (scheduleMode === 'now' || scheduleAt.length > 0)

  const tc = ANN_TYPE_CONFIG[annType]

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="compose-modal-title" style={{
        background: '#fff', borderRadius: 20, width: '92vw', maxWidth: 820,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 60px rgba(0,0,0,0.2)',
      }}>
        {/* Modal Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 id="compose-modal-title" style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {step === 'compose' ? '📣 สร้างประกาศระบบใหม่' : '👀 ตรวจสอบก่อนส่ง'}
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-faint)' }}>
              {step === 'compose' ? 'ข้อความจะถูกส่งไปยัง Admin ของ Tenant ที่เลือก' : 'ตรวจสอบเนื้อหาและผู้รับก่อนยืนยันการส่ง'}
            </p>
          </div>
          <button onClick={onClose} aria-label="ปิดหน้าต่าง" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1.3rem', lineHeight: 1 }}>✕</button>
        </div>

        {step === 'compose' ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', gap: 20 }}>
            {/* Left: Form */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Type selector */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 8 }}>
                  ประเภทประกาศ
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {(Object.keys(ANN_TYPE_CONFIG) as AnnType[]).map(t => {
                    const cfg = ANN_TYPE_CONFIG[t]
                    const active = annType === t
                    return (
                      <button
                        key={t}
                        onClick={() => applyTemplate(t)}
                        style={{
                          padding: '7px 14px', borderRadius: 99, fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer', border: `2px solid ${active ? cfg.color : cfg.border}`,
                          background: active ? cfg.bg : '#fff', color: active ? cfg.color : 'var(--text-gray)',
                          transition: 'all 0.12s',
                        }}
                      >{cfg.icon} {cfg.label}</button>
                    )
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>
                  หัวข้อประกาศ <span style={{ color: 'var(--error-text)' }}>*</span>
                </label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value.slice(0, 120))}
                  placeholder="กรอกหัวข้อประกาศ..."
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: '0.9rem', fontFamily: 'inherit',
                    boxSizing: 'border-box', outline: 'none',
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 3 }}>{title.length}/120</div>
              </div>

              {/* Body */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 6 }}>
                  เนื้อหา <span style={{ color: 'var(--error-text)' }}>*</span>
                </label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value.slice(0, 1000))}
                  placeholder="กรอกเนื้อหาประกาศ..."
                  rows={8}
                  style={{
                    width: '100%', padding: '10px 12px', borderRadius: 10,
                    border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit',
                    boxSizing: 'border-box', resize: 'vertical', outline: 'none', lineHeight: 1.7,
                  }}
                />
                <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 3 }}>{body.length}/1000</div>
              </div>

              {/* Target */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 8 }}>
                  กลุ่มผู้รับ
                </label>
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  {([
                    { key: 'ALL',    label: '🌐 ทุก Tenant' },
                    { key: 'PLAN',   label: '📦 ตาม Plan' },
                    { key: 'CUSTOM', label: '🎯 เลือกเอง' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setTargetType(opt.key)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer',
                        border: `2px solid ${targetType === opt.key ? 'var(--sa-accent)' : '#e2e8f0'}`,
                        background: targetType === opt.key ? 'var(--sa-accent-light)' : '#fff',
                        color: targetType === opt.key ? 'var(--sa-accent)' : '#64748b',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>

                {targetType === 'PLAN' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as TenantPlan[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setTargetPlan(p)}
                        style={{
                          padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                          cursor: 'pointer',
                          border: `2px solid ${targetPlan === p ? PLAN_COLOR[p] : '#e2e8f0'}`,
                          background: targetPlan === p ? PLAN_BG[p] : '#fff',
                          color: targetPlan === p ? PLAN_COLOR[p] : '#64748b',
                        }}
                      >{PLAN_LABEL[p]} ({MOCK_TENANTS.filter(t => t.plan === p).length})</button>
                    ))}
                  </div>
                )}

                {targetType === 'CUSTOM' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 180, overflowY: 'auto', padding: '2px 0' }}>
                    {MOCK_TENANTS.map(t => {
                      const checked = targetIds.includes(t.id)
                      return (
                        <label key={t.id} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          borderRadius: 8, cursor: 'pointer',
                          background: checked ? 'var(--sa-accent-light)' : '#f8fafc',
                          border: `1px solid ${checked ? 'var(--sa-accent-border)' : '#e2e8f0'}`,
                        }}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setTargetIds(ids =>
                              checked ? ids.filter(x => x !== t.id) : [...ids, t.id]
                            )}
                            style={{ accentColor: 'var(--sa-accent)', width: 16, height: 16 }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)' }}>{t.name}</div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)' }}>{t.owner_email}</div>
                          </div>
                          <span style={{
                            fontSize: '0.68rem', padding: '2px 7px', borderRadius: 99, fontWeight: 700,
                            color: PLAN_COLOR[t.plan], background: PLAN_BG[t.plan],
                          }}>{t.plan}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                <div style={{
                  marginTop: 10, padding: '8px 12px', borderRadius: 8,
                  background: recipientCount > 0 ? 'var(--sa-accent-light)' : '#fef2f2',
                  border: `1px solid ${recipientCount > 0 ? 'var(--sa-accent-border)' : '#fecaca'}`,
                  fontSize: '0.8rem', fontWeight: 600,
                  color: recipientCount > 0 ? 'var(--sa-accent)' : 'var(--error-text)',
                }}>
                  {recipientCount > 0
                    ? `📨 จะส่งถึง ${recipientCount} Tenant`
                    : '⚠️ กรุณาเลือกผู้รับอย่างน้อย 1 Tenant'}
                </div>
              </div>

              {/* Schedule */}
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', display: 'block', marginBottom: 8 }}>
                  เวลาส่ง
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {([
                    { key: 'now',      label: '⚡ ส่งทันที' },
                    { key: 'schedule', label: '📅 กำหนดเวลา' },
                  ] as const).map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setScheduleMode(opt.key)}
                      style={{
                        padding: '7px 14px', borderRadius: 8, fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer',
                        border: `2px solid ${scheduleMode === opt.key ? 'var(--sa-accent)' : '#e2e8f0'}`,
                        background: scheduleMode === opt.key ? 'var(--sa-accent-light)' : '#fff',
                        color: scheduleMode === opt.key ? 'var(--sa-accent)' : '#64748b',
                      }}
                    >{opt.label}</button>
                  ))}
                </div>
                {scheduleMode === 'schedule' && (
                  <input
                    type="datetime-local"
                    value={scheduleAt}
                    onChange={e => setScheduleAt(e.target.value)}
                    style={{
                      marginTop: 10, padding: '9px 12px', borderRadius: 8,
                      border: '1.5px solid #e2e8f0', fontSize: '0.875rem',
                      fontFamily: 'inherit', outline: 'none',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Right: Live Preview */}
            <div style={{ width: 260, flexShrink: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-body)', marginBottom: 8 }}>ตัวอย่างข้อความ</div>
              <div style={{
                border: '1px solid #e2e8f0', borderRadius: 14, overflow: 'hidden',
                boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              }}>
                {/* Phone mockup top bar */}
                <div style={{ background: '#1e1b4b', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sa-accent)' }} />
                  <span style={{ fontSize: '0.7rem', color: '#a5b4fc', fontWeight: 600 }}>TimeLine System</span>
                </div>
                {/* Message bubble */}
                <div style={{ padding: '12px', background: '#f8fafc', minHeight: 160 }}>
                  <div style={{
                    background: '#fff', borderRadius: 12, padding: '10px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    border: `2px solid ${tc.border}`,
                  }}>
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 99, marginBottom: 6,
                      background: tc.bg, color: tc.color, fontSize: '0.68rem', fontWeight: 700,
                    }}>
                      {tc.icon} {tc.label}
                    </div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: 6, lineHeight: 1.4 }}>
                      {title || 'หัวข้อประกาศ...'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-body)', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden' }}>
                      {body || 'เนื้อหาประกาศ...'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 8, textAlign: 'right' }}>
                      {new Date().toLocaleDateString('th-TH')} — TimeLine
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 6, textAlign: 'center' }}>
                ตัวอย่างที่ Admin จะเห็น
              </div>
            </div>
          </div>
        ) : (
          /* Preview step */
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
            <div style={{
              background: tc.bg, border: `2px solid ${tc.border}`, borderRadius: 16,
              padding: '16px 20px', marginBottom: 20,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: '1.1rem' }}>{tc.icon}</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: tc.color }}>{tc.label}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#64748b' }}>
                  ส่งถึง: <strong>{targetType === 'ALL' ? 'ทุก Tenant' : targetType === 'PLAN' ? `Plan ${PLAN_LABEL[targetPlan]}` : `${targetIds.length} Tenant`}</strong> ({recipientCount} บริษัท)
                </span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 10 }}>{title}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.8, whiteSpace: 'pre-wrap', background: 'rgba(255,255,255,0.6)', borderRadius: 10, padding: '12px 16px' }}>
                {body}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'ประเภท',      value: `${tc.icon} ${tc.label}` },
                { label: 'ผู้รับ',       value: `${recipientCount} Tenant` },
                { label: 'เวลาส่ง',     value: scheduleMode === 'now' ? 'ส่งทันที' : `${scheduleAt.replace('T', ' ')}` },
              ].map(r => (
                <div key={r.label} style={{ flex: 1, background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-main)', marginTop: 2 }}>{r.value}</div>
                </div>
              ))}
            </div>

            {scheduleMode === 'now' && (
              <div style={{ marginTop: 16, padding: '12px 16px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 10, fontSize: '0.82rem', color: '#d97706' }}>
                ⚠️ เมื่อกด "ยืนยันส่ง" ข้อความจะถูกส่งไปยัง Admin ของทุก Tenant ที่เลือกทันที — ไม่สามารถยกเลิกได้
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => step === 'compose' ? onClose() : setStep('compose')}
            style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer', color: 'var(--text-body)' }}
          >{step === 'compose' ? 'ยกเลิก' : '← แก้ไข'}</button>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            {sendError && (
              <span style={{ fontSize: '0.8rem', color: 'var(--error-text)', fontWeight: 600 }}>{sendError}</span>
            )}
            {step === 'compose' && (
              <button
                onClick={handleSaveDraft}
                disabled={!title.trim()}
                style={{
                  padding: '9px 20px', borderRadius: 9, fontSize: '0.875rem', cursor: title.trim() ? 'pointer' : 'not-allowed',
                  border: '1px solid #e2e8f0', background: '#fff', color: title.trim() ? 'var(--text-body)' : 'var(--text-faint)',
                }}
              >💾 บันทึก Draft</button>
            )}

            {step === 'compose' ? (
              <button
                onClick={() => setStep('preview')}
                disabled={!canSend}
                style={{
                  padding: '9px 22px', borderRadius: 9, fontSize: '0.875rem', fontWeight: 700,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  border: 'none',
                  background: canSend ? 'var(--sa-accent)' : '#e2e8f0',
                  color: canSend ? '#fff' : 'var(--text-faint)',
                }}
              >ตรวจสอบก่อนส่ง →</button>
            ) : (
              <button
                onClick={handleSend}
                disabled={sending}
                style={{
                  padding: '9px 24px', borderRadius: 9, fontSize: '0.875rem', fontWeight: 700,
                  border: 'none', cursor: sending ? 'not-allowed' : 'pointer',
                  background: scheduleMode === 'now' ? 'var(--error-text)' : 'var(--sa-accent)',
                  color: '#fff', display: 'flex', alignItems: 'center', gap: 8,
                }}
              >
                {sending
                  ? <><span style={{ animation: 'spin 1s linear infinite' }}>⟳</span> กำลังส่ง...</>
                  : scheduleMode === 'now' ? '📤 ยืนยันส่งทันที' : '📅 กำหนดตารางส่ง'
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Detail Modal ──────────────────────────────────────────────────────────────
function DetailModal({ ann, onClose, onDelete }: { ann: SystemAnn; onClose: () => void; onDelete: () => void }) {
  const tc = ANN_TYPE_CONFIG[ann.type]
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function h(e: MouseEvent) { if (overlayRef.current === e.target) onClose() }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [onClose])
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div ref={overlayRef} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500,
    }}>
      <div role="dialog" aria-modal="true" aria-labelledby="ann-detail-title" style={{
        background: '#fff', borderRadius: 20, width: '90vw', maxWidth: 640,
        maxHeight: '88vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: tc.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
          }}>{tc.icon}</div>
          <div style={{ flex: 1 }}>
            <div id="ann-detail-title" style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>{ann.title}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', marginTop: 2 }}>
              {ann.sent_at ? `ส่งเมื่อ ${thDateTime(ann.sent_at)}` : ann.scheduled_at ? `กำหนดส่ง ${thDateTime(ann.scheduled_at)}` : 'Draft'}
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิดหน้าต่าง" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-faint)', fontSize: '1.2rem' }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { l: 'ประเภท',  v: `${tc.icon} ${tc.label}`,                             color: tc.color, bg: tc.bg },
              { l: 'สถานะ',   v: STATUS_CONFIG[ann.status].label,                      color: STATUS_CONFIG[ann.status].color, bg: STATUS_CONFIG[ann.status].bg },
              { l: 'ผู้รับ',   v: targetLabel(ann),                                     color: 'var(--sa-accent)', bg: 'var(--sa-accent-light)' },
              { l: 'ส่งถึง',  v: ann.status === 'SENT' ? `${ann.sent_count} Tenant` : '—', color: 'var(--text-main)', bg: '#f8fafc' },
            ].map(r => (
              <div key={r.l} style={{ background: r.bg, borderRadius: 8, padding: '8px 12px', minWidth: 100 }}>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-faint)', fontWeight: 600 }}>{r.l}</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: r.color, marginTop: 2 }}>{r.v}</div>
              </div>
            ))}
          </div>

          <div style={{
            background: '#f8fafc', border: `2px solid ${tc.border}`, borderRadius: 12,
            padding: '16px', fontSize: '0.875rem', color: 'var(--text-body)', lineHeight: 1.8, whiteSpace: 'pre-wrap',
          }}>
            {ann.body}
          </div>

          <div style={{ marginTop: 12, fontSize: '0.75rem', color: 'var(--text-faint)' }}>
            สร้างโดย: {ann.created_by}
          </div>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between' }}>
          {ann.status !== 'SENT' ? (
            <button
              onClick={onDelete}
              style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid #fecaca', background: '#fff', color: 'var(--error-text)', fontSize: '0.875rem', cursor: 'pointer', fontWeight: 600 }}
            >🗑 ลบ</button>
          ) : <div />}
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.875rem', cursor: 'pointer' }}>ปิด</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type HistoryFilter = 'ALL' | AnnStatus | AnnType

export default function SAAnnouncementPage() {
  const [history, setHistory] = useState<SystemAnn[]>(INIT_HISTORY)
  const [showCompose, setShowCompose] = useState(false)
  const [editDraft, setEditDraft] = useState<SystemAnn | null>(null)
  const [viewAnn, setViewAnn] = useState<SystemAnn | null>(null)
  const [filterStatus, setFilterStatus] = useState<AnnStatus | 'ALL'>('ALL')
  const [filterType, setFilterType] = useState<AnnType | 'ALL'>('ALL')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    api.get('/api/v1/super-admin/announcements')
      .then(res => { if (Array.isArray(res.data?.data)) setHistory(res.data.data) })
      .catch(() => { /* fall back to INIT_HISTORY already in state */ })
  }, [])

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  function handleSend(ann: SystemAnn, replacingId?: string) {
    setHistory(h => {
      const without = replacingId ? h.filter(a => a.id !== replacingId) : h
      return [ann, ...without]
    })
    setShowCompose(false)
    setEditDraft(null)
    showToast(
      ann.status === 'SENT' ? `ส่งประกาศถึง ${ann.sent_count} Tenant เรียบร้อย` :
      ann.status === 'SCHEDULED' ? 'บันทึกตารางส่งเรียบร้อย' :
      'บันทึก Draft เรียบร้อย'
    )
  }

  async function handleDelete(id: string) {
    try {
      await api.delete(`/api/v1/super-admin/announcements/${id}`)
      setHistory(h => h.filter(a => a.id !== id))
      setViewAnn(null)
      showToast('ลบประกาศเรียบร้อย')
    } catch {
      showToast('ลบไม่สำเร็จ — กรุณาลองใหม่', false)
    }
  }

  const filtered = history.filter(a => {
    if (filterStatus !== 'ALL' && a.status !== filterStatus) return false
    if (filterType !== 'ALL' && a.type !== filterType) return false
    if (search && !a.title.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const counts = {
    SENT:      history.filter(a => a.status === 'SENT').length,
    DRAFT:     history.filter(a => a.status === 'DRAFT').length,
    SCHEDULED: history.filter(a => a.status === 'SCHEDULED').length,
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '28px 32px' }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: '0.875rem',
          background: toast.ok ? '#d1fae5' : '#fee2e2',
          color: toast.ok ? 'var(--success-text)' : 'var(--error-text)',
          border: `1px solid ${toast.ok ? '#a7f3d0' : '#fecaca'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        }}>{toast.ok ? '✅' : '❌'} {toast.msg}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>
            System Announcement
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b' }}>
            ส่งประกาศถึง Admin ของ Tenant — แจ้ง Maintenance, Feature Update, Billing ฯลฯ
          </p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          style={{
            padding: '10px 22px', borderRadius: 10, border: 'none',
            background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
          }}
        >
          <span style={{ fontSize: '1.1rem' }}>📣</span> สร้างประกาศใหม่
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid-stats" style={{ marginBottom: 24 }}>
        {[
          { label: 'ทั้งหมด',        value: history.length,    icon: '📋', color: 'var(--sa-accent)', bg: 'var(--sa-accent-light)' },
          { label: 'ส่งแล้ว',        value: counts.SENT,       icon: '✅', color: 'var(--success-text)', bg: '#d1fae5' },
          { label: 'กำหนดส่ง',      value: counts.SCHEDULED,  icon: '📅', color: '#2563eb', bg: '#dbeafe' },
          { label: 'Draft',          value: counts.DRAFT,      icon: '📝', color: 'var(--text-gray)', bg: '#f3f4f6' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14,
            padding: '16px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
              {s.icon}
            </div>
            <div>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-faint)', marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#fff', borderRadius: 12, padding: '14px 18px',
        border: '1px solid #e2e8f0', marginBottom: 16,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-faint)' }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ค้นหาหัวข้อ..."
            style={{
              width: '100%', padding: '8px 10px 8px 34px', borderRadius: 8,
              border: '1px solid #e2e8f0', fontSize: '0.875rem', fontFamily: 'inherit',
              boxSizing: 'border-box', outline: 'none',
            }}
          />
        </div>

        {/* Status filter */}
        <div style={{ display: 'flex', gap: 6 }}>
          {([
            { k: 'ALL',       l: 'ทั้งหมด' },
            { k: 'SENT',      l: 'ส่งแล้ว' },
            { k: 'SCHEDULED', l: 'กำหนดส่ง' },
            { k: 'DRAFT',     l: 'Draft' },
          ] as const).map(f => (
            <button
              key={f.k}
              onClick={() => setFilterStatus(f.k)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 500,
                cursor: 'pointer', border: 'none',
                background: filterStatus === f.k ? 'var(--sa-accent)' : '#f1f5f9',
                color: filterStatus === f.k ? '#fff' : '#64748b',
              }}
            >{f.l}</button>
          ))}
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value as AnnType | 'ALL')}
          style={{
            padding: '7px 12px', borderRadius: 8, border: '1px solid #e2e8f0',
            fontSize: '0.82rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer',
          }}
        >
          <option value="ALL">ทุกประเภท</option>
          {(Object.keys(ANN_TYPE_CONFIG) as AnnType[]).map(t => (
            <option key={t} value={t}>{ANN_TYPE_CONFIG[t].icon} {ANN_TYPE_CONFIG[t].label}</option>
          ))}
        </select>
      </div>

      {/* History Table */}
      <div style={{
        background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '28px 2fr 100px 130px 90px 90px',
          gap: 12, padding: '10px 18px',
          background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
          fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px',
        }}>
          <div />
          <div>หัวข้อ</div>
          <div>ประเภท</div>
          <div>กลุ่มผู้รับ</div>
          <div>สถานะ</div>
          <div style={{ textAlign: 'right' }}>วันที่</div>
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-faint)', fontSize: '0.9rem' }}>
            ไม่พบประกาศที่ตรงกับเงื่อนไข
          </div>
        )}

        {filtered.map((ann, idx) => {
          const tc = ANN_TYPE_CONFIG[ann.type]
          const sc = STATUS_CONFIG[ann.status]
          const dateStr = ann.sent_at
            ? thDateTime(ann.sent_at)
            : ann.scheduled_at
            ? thDateTime(ann.scheduled_at)
            : '—'

          return (
            <div
              key={ann.id}
              onClick={() => ann.status !== 'DRAFT' && setViewAnn(ann)}
              style={{
                display: 'grid', gridTemplateColumns: '28px 2fr 100px 130px 90px 90px',
                gap: 12, padding: '14px 18px', cursor: ann.status !== 'DRAFT' ? 'pointer' : 'default',
                borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = '#fafbff')}
              onMouseLeave={e => (e.currentTarget.style.background = '')}
            >
              <div style={{ display: 'flex', alignItems: 'center', fontSize: '0.95rem' }}>{tc.icon}</div>

              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {ann.title}
                </div>
                {ann.status === 'SENT' && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    ส่งถึง {ann.sent_count} Tenant
                  </div>
                )}
                {ann.status === 'DRAFT' && (
                  <button
                    onClick={e => { e.stopPropagation(); setEditDraft(ann) }}
                    style={{
                      marginTop: 4, padding: '3px 10px', borderRadius: 6, border: '1px solid var(--sa-accent-border)',
                      background: 'var(--sa-accent-light)', color: 'var(--sa-accent)', fontSize: '0.7rem', fontWeight: 700,
                      cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content',
                    }}
                  >✏️ แก้ไข Draft</button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  background: tc.bg, color: tc.color, whiteSpace: 'nowrap',
                }}>{tc.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {targetLabel(ann)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 99,
                  background: sc.bg, color: sc.color,
                }}>{sc.label}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'right' }}>{dateStr}</span>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', marginTop: 10, fontSize: '0.78rem', color: 'var(--text-faint)' }}>
          แสดง {filtered.length} จาก {history.length} รายการ
        </div>
      )}

      {/* Modals */}
      {showCompose && <ComposeModal onClose={() => setShowCompose(false)} onSend={handleSend} />}
      {editDraft && <ComposeModal onClose={() => setEditDraft(null)} onSend={handleSend} initialData={editDraft} />}
      {viewAnn && (
        <DetailModal
          ann={viewAnn}
          onClose={() => setViewAnn(null)}
          onDelete={() => handleDelete(viewAnn.id)}
        />
      )}
    </div>
  )
}
