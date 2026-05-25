// Super Admin — Tenant Detail Page
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MOCK_TENANTS, MOCK_LINE_CONFIGS, MOCK_BRANCHES, MOCK_EMPLOYEES } from '../../../lib/mock'
import type { TenantStatus, TenantPlan, TenantLineConfig } from '../../../types'
import { useToast } from '../../../components/ui/Toast'

const STATUS_CFG: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'ใช้งาน',   color: '#16a34a', bg: '#dcfce7' },
  SUSPENDED: { label: 'ระงับ',    color: '#dc2626', bg: '#fee2e2' },
  TRIAL:     { label: 'ทดลองใช้', color: '#d97706', bg: '#fef3c7' },
}
const PLAN_CFG: Record<TenantPlan, { label: string; color: string; bg: string; price: string }> = {
  STARTER:      { label: 'Starter',      color: '#374151', bg: '#f3f4f6', price: '990 ฿/เดือน'  },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe', price: '2,490 ฿/เดือน' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe', price: 'Custom'          },
}
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string | null) {
  if (!s) return 'ไม่หมดอายุ'
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

type Tab = 'info' | 'line' | 'branches' | 'activity'

const MOCK_ACTIVITY = [
  { at: '25/05/2569 10:32', msg: 'ผู้ดูแลระบบล็อกอินเข้าสู่ระบบ', type: 'login' },
  { at: '24/05/2569 14:15', msg: 'เพิ่มพนักงานใหม่ 2 คน', type: 'add' },
  { at: '23/05/2569 09:00', msg: 'แก้ไขข้อมูลสาขาสำนักงานใหญ่', type: 'edit' },
  { at: '22/05/2569 16:47', msg: 'อนุมัติใบลาพักร้อน 3 รายการ', type: 'approve' },
  { at: '20/05/2569 11:30', msg: 'ต่ออายุ Plan — Enterprise', type: 'plan' },
]
const ACT_COLOR: Record<string, string> = {
  login: '#6366f1', add: '#16a34a', edit: '#d97706', approve: '#2563eb', plan: '#7c3aed',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const labelSt: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 5, display: 'block' }

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', fontFamily: mono ? 'monospace' : 'inherit' }}>{value}</div>
    </div>
  )
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('info')

  const tenant = MOCK_TENANTS.find(t => t.id === id)
  if (!tenant) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
      <p style={{ color: '#6b7280' }}>ไม่พบ Tenant ID: {id}</p>
      <button onClick={() => navigate('/superadmin/tenants')} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        กลับรายการ
      </button>
    </div>
  )

  const sc = STATUS_CFG[tenant.status]
  const pc = PLAN_CFG[tenant.plan]
  const lineConfig = MOCK_LINE_CONFIGS.find(c => c.tenant_id === id)

  // Line OA state
  const [lineForm, setLineForm] = useState<Omit<TenantLineConfig, 'tenant_id' | 'webhook_url' | 'verified'>>({
    line_channel_id:     lineConfig?.line_channel_id     ?? '',
    line_channel_secret: lineConfig?.line_channel_secret ?? '',
    liff_id:             lineConfig?.liff_id             ?? '',
  })
  const [showSecret, setShowSecret] = useState(false)
  const [testResult, setTestResult] = useState<'idle' | 'ok' | 'fail'>('idle')
  const [saving, setSaving] = useState(false)

  const webhookUrl = `https://api.timeline.app/api/v1/line/webhook/${id}`

  function testConnection() {
    setTestResult('idle')
    setTimeout(() => setTestResult(lineForm.line_channel_id && lineForm.line_channel_secret ? 'ok' : 'fail'), 1000)
  }
  function saveLineConfig() {
    setSaving(true)
    setTimeout(() => { setSaving(false); showToast('success', 'บันทึก Line OA Config เรียบร้อยแล้ว') }, 900)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info',     label: 'ข้อมูล Tenant' },
    { key: 'line',     label: 'Line OA' },
    { key: 'branches', label: 'สาขา & พนักงาน' },
    { key: 'activity', label: 'ประวัติกิจกรรม' },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Back + Header */}
      <button
        onClick={() => navigate('/superadmin/tenants')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginBottom: 16, padding: 0 }}
      >
        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        กลับรายการ Tenant
      </button>

      {/* Hero card */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏗</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{tenant.name}</h2>
              <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{sc.label}</span>
              <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{pc.label}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>{tenant.owner_name} · {tenant.owner_email}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#4f46e5' }}>{tenant.branch_count}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>สาขา</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#4f46e5' }}>{tenant.employee_count}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>พนักงาน</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: tenant.line_configured ? '#f0fdf4' : '#fff7ed', border: `1px solid ${tenant.line_configured ? '#86efac' : '#fed7aa'}` }}>
            <div style={{ fontSize: '1.1rem' }}>{tenant.line_configured ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Line OA</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 18, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', padding: 4, width: 'fit-content' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              fontSize: '0.82rem', fontWeight: tab === t.key ? 700 : 400,
              background: tab === t.key ? '#4f46e5' : 'transparent',
              color: tab === t.key ? '#fff' : '#6b7280',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── TAB: ข้อมูล Tenant ── */}
      {tab === 'info' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>ข้อมูลทั่วไป</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              <InfoRow label="Tenant ID" value={tenant.id} mono />
              <InfoRow label="ชื่อบริษัท" value={tenant.name} />
              <InfoRow label="ผู้ดูแลระบบ" value={tenant.owner_name} />
              <InfoRow label="อีเมล" value={tenant.owner_email} />
              <InfoRow label="Plan" value={`${pc.label} — ${pc.price}`} />
              <InfoRow label="สถานะ" value={sc.label} />
              <InfoRow label="สร้างเมื่อ" value={thDate(tenant.created_at)} />
              <InfoRow label="หมดอายุ" value={thDate(tenant.expires_at)} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>การจัดการ</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => { showToast('info', 'ฟีเจอร์แก้ไข Tenant อยู่ในหน้า Tenant List') }}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                แก้ไขข้อมูล
              </button>
              {tenant.status !== 'SUSPENDED' ? (
                <button
                  onClick={() => showToast('info', `ระงับ ${tenant.name} — ยืนยันในหน้า Tenant List`)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #fbbf24', background: '#fffbeb', color: '#d97706', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  ระงับ Tenant
                </button>
              ) : (
                <button
                  onClick={() => showToast('success', `เปิดใช้งาน ${tenant.name} แล้ว`)}
                  style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #86efac', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  เปิดใช้งาน
                </button>
              )}
              <button
                onClick={() => { setTab('line') }}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                ตั้งค่า Line OA
              </button>
            </div>
          </div>

          {/* Plan upgrade */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>เปลี่ยน Plan</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as TenantPlan[]).map(p => {
                const cfg = PLAN_CFG[p]
                const active = tenant.plan === p
                return (
                  <button
                    key={p}
                    onClick={() => !active && showToast('success', `อัปเกรด ${tenant.name} เป็น ${cfg.label} แล้ว`)}
                    style={{
                      flex: '1 1 140px', padding: '14px', borderRadius: 10, cursor: active ? 'default' : 'pointer',
                      border: `2px solid ${active ? cfg.color : '#e5e7eb'}`,
                      background: active ? cfg.bg : '#fff',
                      textAlign: 'center',
                    }}
                  >
                    <div style={{ fontWeight: 700, color: cfg.color, fontSize: '0.9rem' }}>{cfg.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 3 }}>{cfg.price}</div>
                    {active && <div style={{ fontSize: '0.7rem', color: cfg.color, fontWeight: 600, marginTop: 5 }}>✓ Plan ปัจจุบัน</div>}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Line OA ── */}
      {tab === 'line' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>💚</div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>ตั้งค่า Line Official Account</h3>
          </div>
          <p style={{ margin: '0 0 20px', fontSize: '0.82rem', color: '#6b7280' }}>{tenant.name}</p>

          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.8rem', color: '#15803d', lineHeight: 1.9 }}>
            <strong>ขั้นตอน Onboard:</strong><br />
            1. สร้าง Line Official Account ให้ลูกค้า<br />
            2. ไปที่ Line Developer Console → Messaging API → Webhook URL → วาง URL ด้านล่าง<br />
            3. เปิด "Use webhook" และกด Verify<br />
            4. กรอก Channel ID + Channel Secret + LIFF ID ด้านล่าง แล้วกด Test Connection<br />
            5. กด "บันทึก" เพื่อเปิดใช้งาน
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Webhook URL */}
            <div>
              <label style={labelSt}>Webhook URL — คัดลอกไปวางใน Line Developer Console</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={webhookUrl} style={{ ...inputSt, flex: 1, background: '#f9fafb', color: '#374151', fontSize: '0.8rem', fontFamily: 'monospace' }} />
                <button
                  onClick={() => { navigator.clipboard?.writeText(webhookUrl); showToast('info', 'คัดลอก Webhook URL แล้ว') }}
                  style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  คัดลอก
                </button>
              </div>
            </div>

            {/* Channel ID */}
            <div>
              <label style={labelSt}>Line Channel ID</label>
              <input
                value={lineForm.line_channel_id}
                onChange={e => setLineForm(f => ({ ...f, line_channel_id: e.target.value }))}
                placeholder="เช่น 2006123456"
                style={inputSt}
              />
            </div>

            {/* Channel Secret */}
            <div>
              <label style={labelSt}>Line Channel Secret</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showSecret ? 'text' : 'password'}
                  value={lineForm.line_channel_secret}
                  onChange={e => setLineForm(f => ({ ...f, line_channel_secret: e.target.value }))}
                  placeholder="••••••••••••••••••••••••••••••••"
                  style={{ ...inputSt, paddingRight: 44 }}
                />
                <button
                  onClick={() => setShowSecret(s => !s)}
                  type="button"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}
                >
                  {showSecret
                    ? <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    : <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  }
                </button>
              </div>
            </div>

            {/* LIFF ID */}
            <div>
              <label style={labelSt}>LIFF ID</label>
              <input
                value={lineForm.liff_id}
                onChange={e => setLineForm(f => ({ ...f, liff_id: e.target.value }))}
                placeholder="เช่น 2006123456-AbCdEfGh"
                style={inputSt}
              />
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                พบได้ที่ Line Developer Console → LIFF → LIFF ID
              </p>
            </div>

            {/* Test result */}
            {testResult !== 'idle' && (
              <div style={{
                background: testResult === 'ok' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testResult === 'ok' ? '#86efac' : '#fca5a5'}`,
                borderRadius: 8, padding: '10px 14px',
                fontSize: '0.82rem', color: testResult === 'ok' ? '#15803d' : '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {testResult === 'ok' ? '✓ เชื่อมต่อสำเร็จ — Channel ID และ Secret ถูกต้อง' : '✕ เชื่อมต่อไม่ได้ — ตรวจสอบ Channel ID และ Secret อีกครั้ง'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
            <button
              onClick={testConnection}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid #4f46e5', cursor: 'pointer', background: '#fff', color: '#4f46e5', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Test Connection
            </button>
            <button
              onClick={saveLineConfig}
              disabled={saving || !lineForm.line_channel_id}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: '0.875rem', opacity: saving ? 0.7 : 1 }}
            >
              {saving ? 'กำลังบันทึก…' : '💾 บันทึก Line Config'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: สาขา & พนักงาน ── */}
      {tab === 'branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6b7280' }}>สาขาทั้งหมดของ <strong>{tenant.name}</strong></p>
            <span style={{ fontSize: '0.82rem', color: '#9ca3af' }}>* ข้อมูลจำลอง (mock)</span>
          </div>
          {MOCK_BRANCHES.slice(0, tenant.branch_count || 3).map((br, i) => {
            const empCount = MOCK_EMPLOYEES.filter(e => e.branches.includes(br.id)).length || Math.floor(Math.random() * 8) + 2
            return (
              <div key={br.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="16" height="16" fill="none" stroke="#0ea5e9" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#111827', fontSize: '0.9rem' }}>สาขา {i + 1} — {br.name}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{br.address}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#4f46e5', fontSize: '1rem' }}>{empCount}</div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>พนักงาน</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: '#374151', fontSize: '1rem' }}>{br.radius_m}ม.</div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>รัศมี</div>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#9ca3af' }}>{br.lat.toFixed(4)}, {br.lng.toFixed(4)}</span>
                </div>
              </div>
            )
          })}
          {tenant.employee_count > 0 && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              พนักงานทั้งหมด {tenant.employee_count} คน — ดูรายละเอียดได้ในระบบ Admin ของ Tenant
            </div>
          )}
        </div>
      )}

      {/* ── TAB: ประวัติกิจกรรม ── */}
      {tab === 'activity' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>ประวัติกิจกรรมล่าสุด</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {MOCK_ACTIVITY.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < MOCK_ACTIVITY.length - 1 ? '1px solid #f3f4f6' : 'none', alignItems: 'flex-start' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACT_COLOR[a.type] ?? '#9ca3af', marginTop: 6, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.875rem', color: '#111827' }}>{a.msg}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>{a.at}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => showToast('info', 'ดูประวัติทั้งหมด — ฟีเจอร์นี้จะเชื่อมต่อกับ Backend logs')}
              style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              ดูประวัติทั้งหมด
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
