// Super Admin — Tenant Detail Page (wired to real API)
import { useState } from 'react'
import { ChevronLeft, Pencil, PauseCircle, PlayCircle, Settings, Copy, EyeOff, Eye, Building2, CheckCircle, CreditCard } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TenantStatus, TenantPlan } from '../../../types'
import { useToast } from '../../../components/ui/Toast'
import { api } from '../../../lib/axios'

const STATUS_CFG: Record<TenantStatus, { label: string; color: string; bg: string }> = {
  ACTIVE:    { label: 'ใช้งาน',   color: 'var(--success-text)', bg: '#dcfce7' },
  SUSPENDED: { label: 'ระงับ',    color: 'var(--error-text)', bg: '#fee2e2' },
  TRIAL:     { label: 'ทดลองใช้', color: 'var(--warning-text)', bg: '#fef3c7' },
}
const PLAN_CFG: Record<TenantPlan, { label: string; color: string; bg: string; price: string }> = {
  STARTER:      { label: 'Starter',      color: 'var(--text-body)', bg: '#f3f4f6', price: '990 ฿/เดือน'  },
  PROFESSIONAL: { label: 'Professional', color: '#2563eb', bg: '#dbeafe', price: '2,490 ฿/เดือน' },
  ENTERPRISE:   { label: 'Enterprise',   color: '#7c3aed', bg: '#ede9fe', price: 'Custom'          },
}
const MONTHS_TH = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
function thDate(s: string | null | undefined) {
  if (!s) return 'ไม่ระบุ'
  const d = new Date(s)
  return `${d.getDate()} ${MONTHS_TH[d.getMonth()]} ${d.getFullYear() + 543}`
}

type Tab = 'info' | 'line' | 'branches' | 'activity'

const MOCK_ACTIVITY = [
  { at: '25/05/2569 10:32', msg: 'ผู้ดูแลระบบล็อกอินเข้าสู่ระบบ', type: 'login' },
  { at: '24/05/2569 14:15', msg: 'เพิ่มพนักงานใหม่ 2 คน', type: 'add' },
  { at: '23/05/2569 09:00', msg: 'แก้ไขข้อมูลสาขาสำนักงานใหญ่', type: 'edit' },
]
const ACT_COLOR: Record<string, string> = {
  login: '#6366f1', add: 'var(--success-text)', edit: 'var(--warning-text)', approve: '#2563eb', plan: '#7c3aed',
}

const inputSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db',
  fontSize: '0.875rem', boxSizing: 'border-box', background: '#fff', fontFamily: 'inherit',
}
const labelSt: React.CSSProperties = { fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 5, display: 'block' }

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ fontSize: '0.7rem', color: '#9ca3af', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-dark)', fontFamily: mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

interface LineForm {
  line_channel_id:           string
  line_channel_secret:       string
  line_channel_access_token: string
  line_liff_id:              string
}

export default function TenantDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('info')
  const [showSecret, setShowSecret]       = useState(false)
  const [showToken,  setShowToken]        = useState(false)
  const [testResult, setTestResult]       = useState<'idle' | 'ok' | 'fail'>('idle')
  const [lineForm, setLineForm]           = useState<LineForm>({
    line_channel_id:           '',
    line_channel_secret:       '',
    line_channel_access_token: '',
    line_liff_id:              '',
  })
  const [lineFormInit, setLineFormInit]   = useState(false)

  // ── fetch tenant ────────────────────────────────────────────────────
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['sa', 'tenant', id],
    queryFn:  () => api.get(`/api/v1/super-admin/tenants/${id}`).then((r: any) => r.data.data),
    enabled:  !!id,
    select: (data: any) => {
      // pre-fill line form once
      if (!lineFormInit && data?.line_config) {
        setLineForm({
          line_channel_id:           data.line_config.line_channel_id           ?? '',
          line_channel_secret:       '',                                            // never return secret
          line_channel_access_token: data.line_config.line_channel_access_token ?? '',
          line_liff_id:              data.line_config.line_liff_id              ?? '',
        })
        setLineFormInit(true)
      }
      return data
    },
  })

  // ── save line config ─────────────────────────────────────────────────
  const saveLineMutation = useMutation({
    mutationFn: (form: LineForm) =>
      api.put(`/api/v1/super-admin/tenants/${id}/line-config`, {
        line_channel_id:           form.line_channel_id,
        line_channel_secret:       form.line_channel_secret || undefined,
        line_channel_access_token: form.line_channel_access_token || undefined,
        line_liff_id:              form.line_liff_id,
      }).then((r: any) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa', 'tenant', id] })
      setLineFormInit(false)
      showToast('success', 'บันทึก Line OA Config เรียบร้อยแล้ว')
    },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: '80px 20px', color: '#9ca3af' }}>กำลังโหลด…</div>
  )
  if (!tenant) return (
    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
      <div style={{ fontSize: '3rem', marginBottom: 12 }}>🔍</div>
      <p style={{ color: '#6b7280' }}>ไม่พบ Tenant ID: {id}</p>
      <button onClick={() => navigate('/superadmin/tenants')} style={{ marginTop: 12, padding: '9px 20px', borderRadius: 8, border: 'none', background: 'var(--sa-accent)', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
        กลับรายการ
      </button>
    </div>
  )

  const sc = STATUS_CFG[tenant.status as TenantStatus] ?? STATUS_CFG.ACTIVE
  const pc = PLAN_CFG[tenant.plan as TenantPlan]       ?? PLAN_CFG.STARTER
  const adminUser = tenant.users?.find((u: any) => u.role === 'ADMIN')
  const branchCount   = tenant.branches?.length  ?? 0
  const employeeCount = tenant._count?.employees ?? 0
  const lineConfigured = !!tenant.line_config?.line_channel_id

  const webhookUrl = `https://api.timeline.app/api/v1/line/webhook/${id}`

  function testConnection() {
    setTestResult('idle')
    setTimeout(() => setTestResult(lineForm.line_channel_id && lineForm.line_channel_secret ? 'ok' : 'fail'), 800)
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info',     label: 'ข้อมูล Tenant' },
    { key: 'line',     label: 'Line OA' },
    { key: 'branches', label: 'สาขา & พนักงาน' },
    { key: 'activity', label: 'ประวัติกิจกรรม' },
  ]

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>

      {/* Back */}
      <button
        onClick={() => navigate('/superadmin/tenants')}
        style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '0.85rem', marginBottom: 16, padding: 0 }}
      >
        <ChevronLeft size={14} />
        กลับรายการ Tenant
      </button>

      {/* Hero card */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e5e7eb', padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>🏗</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-dark)' }}>{tenant.name}</h2>
              <span style={{ background: sc.bg, color: sc.color, borderRadius: 99, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{sc.label}</span>
              <span style={{ background: pc.bg, color: pc.color, borderRadius: 99, padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>{pc.label}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>
              {adminUser ? `${adminUser.first_name} ${adminUser.last_name} · ${adminUser.email}` : 'ยังไม่มี Admin'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--sa-accent)' }}>{branchCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>สาขา</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--sa-accent)' }}>{employeeCount}</div>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>พนักงาน</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 18px', borderRadius: 10, background: lineConfigured ? '#f0fdf4' : '#fff7ed', border: `1px solid ${lineConfigured ? '#86efac' : '#fed7aa'}` }}>
            <div style={{ fontSize: '1.1rem' }}>{lineConfigured ? '✅' : '⚠️'}</div>
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
              background: tab === t.key ? 'var(--sa-accent)' : 'transparent',
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
              <InfoRow label="Tenant ID"   value={tenant.id} mono />
              <InfoRow label="ชื่อบริษัท" value={tenant.name} />
              <InfoRow label="ผู้ดูแลระบบ" value={adminUser ? `${adminUser.first_name} ${adminUser.last_name}` : '-'} />
              <InfoRow label="อีเมล Admin" value={adminUser?.email ?? '-'} />
              <InfoRow label="Plan"        value={`${pc.label} — ${pc.price}`} />
              <InfoRow label="สถานะ"       value={sc.label} />
              <InfoRow label="พนักงานสูงสุด" value={`${employeeCount} / ${tenant.max_employees ?? '∞'} คน`} />
              <InfoRow label="สาขาสูงสุด"   value={`${branchCount} / ${tenant.max_branches ?? '∞'} สาขา`} />
            </div>
          </div>

          {/* Actions */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>การจัดการ</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => showToast('info', 'แก้ไขได้ในหน้า Tenant List')}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', color: 'var(--text-body)', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Pencil size={14} />
                แก้ไขข้อมูล
              </button>
              <button
                onClick={() => { setTab('line') }}
                style={{ padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--sa-accent)', color: '#fff', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Settings size={14} />
                ตั้งค่า Line OA
              </button>
              <button
                onClick={() => navigate(`/superadmin/billing?tenant=${tenant.id}`)}
                style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #c4b5fd', background: '#ede9fe', color: '#7c3aed', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <CreditCard size={14} />
                ดู Invoice
              </button>
            </div>
          </div>

          {/* Plan */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '20px 24px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: '0.95rem', fontWeight: 700 }}>เปลี่ยน Plan</h3>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(['STARTER', 'PROFESSIONAL', 'ENTERPRISE'] as TenantPlan[]).map(p => {
                const cfg = PLAN_CFG[p]
                const active = tenant.plan === p
                return (
                  <button
                    key={p}
                    onClick={() => !active && showToast('info', `ฟีเจอร์เปลี่ยน Plan จะพัฒนาในเวอร์ชันถัดไป`)}
                    style={{
                      flex: '1 1 140px', padding: '14px', borderRadius: 10, cursor: active ? 'default' : 'pointer',
                      border: `2px solid ${active ? cfg.color : '#e5e7eb'}`,
                      background: active ? cfg.bg : '#fff', textAlign: 'center',
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
            1. สร้าง Line Official Account + เปิด Messaging API<br />
            2. Line Developer Console → Messaging API → Webhook URL → วาง URL ด้านล่าง → เปิด "Use webhook"<br />
            3. กรอก Channel ID, Channel Secret, <strong>Channel Access Token</strong> และ LIFF ID<br />
            4. กด "บันทึก" — ระบบจะใช้ Access Token ส่งข้อความหาพนักงาน
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Webhook URL */}
            <div>
              <label style={labelSt}>Webhook URL — คัดลอกไปวางใน Line Developer Console</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input readOnly value={webhookUrl} style={{ ...inputSt, flex: 1, background: '#f9fafb', color: 'var(--text-body)', fontSize: '0.8rem', fontFamily: 'monospace' }} />
                <button
                  onClick={() => { navigator.clipboard?.writeText(webhookUrl); showToast('info', 'คัดลอก Webhook URL แล้ว') }}
                  style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #d1d5db', cursor: 'pointer', background: '#fff', fontSize: '0.82rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5 }}
                >
                  <Copy size={13} />
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
                  placeholder={tenant.line_config?.line_channel_id ? '(ไม่เปลี่ยนแปลงถ้าเว้นว่าง)' : '••••••••••••••••••••••••••••••••'}
                  style={{ ...inputSt, paddingRight: 44 }}
                />
                <button onClick={() => setShowSecret(s => !s)} type="button"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>ใช้ verify Webhook — พบที่ Line Developer Console → Basic settings</p>
            </div>

            {/* Channel Access Token */}
            <div>
              <label style={labelSt}>
                Line Channel Access Token
                <span style={{ marginLeft: 8, background: '#fef3c7', color: '#92400e', borderRadius: 6, padding: '1px 7px', fontSize: '0.7rem', fontWeight: 700 }}>ใช้ส่งข้อความ</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={lineForm.line_channel_access_token}
                  onChange={e => setLineForm(f => ({ ...f, line_channel_access_token: e.target.value }))}
                  placeholder={tenant.line_config?.line_channel_access_token ? '(มีอยู่แล้ว — กรอกใหม่เพื่อเปลี่ยน)' : 'วาง Long-lived access token ที่นี่'}
                  style={{ ...inputSt, paddingRight: 44 }}
                />
                <button onClick={() => setShowToken(s => !s)} type="button"
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}>
                  {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                Line Developer Console → Messaging API → Channel access token → Issue
              </p>
            </div>

            {/* LIFF ID */}
            <div>
              <label style={labelSt}>LIFF ID</label>
              <input
                value={lineForm.line_liff_id}
                onChange={e => setLineForm(f => ({ ...f, line_liff_id: e.target.value }))}
                placeholder="เช่น 2006123456-AbCdEfGh"
                style={inputSt}
              />
              <p style={{ margin: '5px 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                Line Developer Console → LIFF → LIFF ID
              </p>
            </div>

            {/* Test result */}
            {testResult !== 'idle' && (
              <div style={{
                background: testResult === 'ok' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${testResult === 'ok' ? '#86efac' : '#fca5a5'}`,
                borderRadius: 8, padding: '10px 14px',
                fontSize: '0.82rem', color: testResult === 'ok' ? '#15803d' : 'var(--error-text)',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {testResult === 'ok'
                  ? '✓ Channel ID และ Secret ดูถูกต้อง'
                  : '✕ กรุณากรอก Channel ID และ Channel Secret ก่อน'}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24, gap: 10 }}>
            <button
              onClick={testConnection}
              style={{ padding: '10px 18px', borderRadius: 8, border: '1px solid var(--sa-accent)', cursor: 'pointer', background: '#fff', color: 'var(--sa-accent)', fontWeight: 600, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle size={14} />
              Test Connection
            </button>
            <button
              onClick={() => saveLineMutation.mutate(lineForm)}
              disabled={saveLineMutation.isPending || !lineForm.line_channel_id || !lineForm.line_liff_id}
              style={{ padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', opacity: saveLineMutation.isPending ? 0.7 : 1 }}
            >
              {saveLineMutation.isPending ? 'กำลังบันทึก…' : '💾 บันทึก Line Config'}
            </button>
          </div>
        </div>
      )}

      {/* ── TAB: สาขา & พนักงาน ── */}
      {tab === 'branches' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: '#6b7280' }}>
            สาขาทั้งหมดของ <strong>{tenant.name}</strong>
          </p>
          {(tenant.branches as any[])?.length === 0 && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
              ยังไม่มีสาขา — Admin ของ tenant สามารถเพิ่มสาขาได้
            </div>
          )}
          {(tenant.branches as any[])?.map((br: any, i: number) => (
            <div key={br.id} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#0ea5e9" />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-dark)', fontSize: '0.9rem' }}>สาขา {i + 1} — {br.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{br.address ?? 'ไม่ระบุที่อยู่'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                {br.radius_m != null && (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-body)', fontSize: '1rem' }}>{br.radius_m}ม.</div>
                    <div style={{ fontSize: '0.68rem', color: '#9ca3af' }}>รัศมี</div>
                  </div>
                )}
                <span style={{ fontSize: '0.72rem', fontFamily: 'monospace', color: '#9ca3af' }}>{br.id}</span>
              </div>
            </div>
          ))}
          {employeeCount > 0 && (
            <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem' }}>
              พนักงานทั้งหมด {employeeCount} คน — ดูรายละเอียดได้ในระบบ Admin ของ Tenant
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
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-dark)' }}>{a.msg}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>{a.at}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <button
              onClick={() => showToast('info', 'Activity log จะเชื่อมต่อ Backend ในเวอร์ชันถัดไป')}
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
