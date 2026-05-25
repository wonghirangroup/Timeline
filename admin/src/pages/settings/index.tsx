import { useState } from 'react'
import { MOCK_BRANCHES, MOCK_BRANCH_SETTINGS, MOCK_GLOBAL_SETTINGS, MOCK_FINE_RULE, MOCK_TENANTS } from '../../lib/mock'
import type { BranchSettings, GlobalSettings, FineRule, FineTier, FineMode } from '../../types'
import { useToast } from '../../components/ui/Toast'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useIsMobile } from '../../hooks/useIsMobile'
import { useAuthStore } from '../../stores/authStore'
import { usePlanConfigStore } from '../../stores/planConfigStore'

type Tab = 'time' | 'fine' | 'general'

const card: React.CSSProperties = {
  background: '#fff', borderRadius: 12,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', fontSize: '13px',
  borderRadius: 8, border: '1px solid #e5e7eb',
  outline: 'none', boxSizing: 'border-box', color: '#1f2937', fontFamily: 'inherit',
}

// ── Fine calculator utility ────────────────────────────────────────────────────
export function calcFine(minutesLate: number, rule: FineRule): {
  fineAmount: number
  countAsAbsent: boolean
  nextDayFine: number
  description: string
} {
  if (minutesLate <= 0) return { fineAmount: 0, countAsAbsent: false, nextDayFine: 0, description: 'มาตรงเวลา' }

  if (rule.mode === 'per_minute') {
    let fine = minutesLate * rule.per_minute_rate
    if (rule.per_minute_max > 0) fine = Math.min(fine, rule.per_minute_max)
    return { fineAmount: fine, countAsAbsent: false, nextDayFine: 0, description: `${minutesLate} นาที × ${rule.per_minute_rate} ฿ = ${fine} ฿` }
  }

  // tier mode
  const tier = rule.tiers.find(t => minutesLate >= t.from_minute && (t.to_minute === null || minutesLate <= t.to_minute))
  if (!tier) return { fineAmount: 0, countAsAbsent: false, nextDayFine: 0, description: 'ไม่เข้าเงื่อนไขใด' }

  const parts: string[] = []
  if (tier.fine_amount > 0) parts.push(`หักเงิน ${tier.fine_amount} ฿`)
  if (tier.count_as_absent) parts.push('นับเป็นวันหยุด 1 วัน')
  if (tier.next_day_fine > 0) parts.push(`หักวันถัดไปอีก ${tier.next_day_fine} ฿`)

  return {
    fineAmount: tier.fine_amount,
    countAsAbsent: tier.count_as_absent,
    nextDayFine: tier.next_day_fine,
    description: parts.join(' + ') || 'ไม่มีค่าปรับ',
  }
}

export default function SettingsPage() {
  const { showToast } = useToast()
  const isMobile = useIsMobile()
  const tenantId = useAuthStore(s => s.tenantId)
  const tenant = MOCK_TENANTS.find(t => t.id === tenantId) ?? MOCK_TENANTS[0]
  const features = usePlanConfigStore(s => s.getFeatures(tenant.plan))
  const canUseFine = features.fine_system
  const [tab, setTab] = useState<Tab>('time')
  const [selectedBranch, setSelectedBranch] = useState('br-01')
  const [branchSettings, setBranchSettings] = useState<BranchSettings>(MOCK_BRANCH_SETTINGS)
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(MOCK_GLOBAL_SETTINGS)
  const [fineRule, setFineRule] = useState<FineRule>(MOCK_FINE_RULE)
  const [activeShift, setActiveShift] = useState(0)
  const [deleteTierId, setDeleteTierId] = useState<string | null>(null)

  // Simulator state
  const [simTime, setSimTime] = useState('08:10')
  const [simShiftStart, setSimShiftStart] = useState('08:00')

  const shift = branchSettings.shifts[activeShift]

  function updateShift(key: string, value: string) {
    setBranchSettings(prev => ({
      ...prev,
      shifts: prev.shifts.map((s, i) => i === activeShift ? { ...s, [key]: value } : s),
    }))
  }

  function handleSaveTime() {
    showToast('success', 'บันทึกการตั้งค่าเวลาเรียบร้อยแล้ว')
  }

  function handleSaveFine() {
    showToast('success', 'บันทึกกฎค่าปรับเรียบร้อยแล้ว')
  }

  function handleSaveGeneral() {
    showToast('success', 'บันทึกการตั้งค่าทั่วไปเรียบร้อยแล้ว')
  }

  // ── Fine Rule helpers ──
  function setMode(mode: FineMode) {
    setFineRule(r => ({ ...r, mode }))
  }

  function addTier() {
    const lastTier = fineRule.tiers[fineRule.tiers.length - 1]
    const newFrom = lastTier ? (lastTier.to_minute !== null ? lastTier.to_minute + 1 : lastTier.from_minute + 15) : 1
    const newTier: FineTier = {
      id: `ft-${Date.now()}`,
      from_minute: newFrom,
      to_minute: newFrom + 14,
      fine_amount: 50,
      count_as_absent: false,
      next_day_fine: 0,
    }
    setFineRule(r => ({ ...r, tiers: [...r.tiers, newTier] }))
  }

  function updateTier(id: string, key: keyof FineTier, value: unknown) {
    setFineRule(r => ({ ...r, tiers: r.tiers.map(t => t.id === id ? { ...t, [key]: value } : t) }))
  }

  function deleteTier(id: string) {
    setFineRule(r => ({ ...r, tiers: r.tiers.filter(t => t.id !== id) }))
    showToast('success', 'ลบช่วงค่าปรับเรียบร้อยแล้ว')
    setDeleteTierId(null)
  }

  // Simulator calc
  const simMinutesLate = (() => {
    const [sh, sm] = simShiftStart.split(':').map(Number)
    const [ch, cm] = simTime.split(':').map(Number)
    return Math.max(0, (ch * 60 + cm) - (sh * 60 + sm))
  })()
  const simResult = calcFine(simMinutesLate, fineRule)

  const tabBtn = (t: Tab, label: string) => (
    <button
      onClick={() => setTab(t)}
      style={{
        padding: isMobile ? '8px 14px' : '8px 18px',
        borderRadius: 0, border: 'none', cursor: 'pointer',
        fontSize: isMobile ? '12px' : '13px', fontWeight: 500,
        background: tab === t ? '#fff7ed' : 'transparent',
        color: tab === t ? '#ea580c' : '#4b5563',
        borderBottom: tab === t ? '2px solid #f97316' : '2px solid transparent',
        whiteSpace: 'nowrap', flexShrink: 0,
      }}
    >{label}</button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Tab bar — scrollable on mobile */}
      <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', gap: 0, background: '#fff', borderRadius: '12px 12px 0 0', padding: '0 4px', overflowX: 'auto' }}>
        {tabBtn('time', 'เวลาทำงาน')}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {tabBtn('fine', 'กฎค่าปรับ')}
          {!canUseFine && (
            <span style={{ fontSize: '10px', background: '#fef3c7', color: '#d97706', borderRadius: 99, padding: '1px 5px', fontWeight: 700, marginLeft: -4, marginBottom: 12, flexShrink: 0 }}>🔒</span>
          )}
        </div>
        {tabBtn('general', 'ทั่วไป')}
      </div>

      {/* ══ TAB: เวลาทำงาน ══ */}
      {tab === 'time' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>สาขา:</label>
            <select
              value={selectedBranch}
              onChange={e => setSelectedBranch(e.target.value)}
              style={{ ...inputStyle, width: 'auto', padding: '7px 12px', flex: isMobile ? 1 : 'none' }}
            >
              {MOCK_BRANCHES.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: isMobile ? 0 : 'auto', cursor: 'pointer' }}>
              <span style={{ fontSize: '12px', color: '#6b7280' }}>ใช้งานกะที่ 2</span>
              <div
                onClick={() => setBranchSettings(prev => ({ ...prev, use_shift_2: !prev.use_shift_2 }))}
                style={{ width: 40, height: 22, borderRadius: 99, cursor: 'pointer', background: branchSettings.use_shift_2 ? '#f97316' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute', top: 2, left: branchSettings.use_shift_2 ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
              </div>
            </label>
          </div>

          {/* Shift tabs */}
          <div style={{ display: 'flex', gap: 8 }}>
            {branchSettings.shifts.filter((_, i) => i === 0 || branchSettings.use_shift_2).map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveShift(i)}
                style={{
                  padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: activeShift === i ? '#fff7ed' : '#f8fafc',
                  color: activeShift === i ? '#ea580c' : '#6b7280',
                  outline: activeShift === i ? '1.5px solid #f97316' : '1px solid #e5e7eb',
                }}
              >กะที่ {i + 1} {i === 0 ? '(หลัก)' : ''}</button>
            ))}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: '#3b82f6', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เวลาเข้า–ออกงาน (กะ {activeShift + 1})</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <Field label="เวลาเริ่มงาน">
                <input type="time" value={shift.start_time} onChange={e => updateShift('start_time', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="เวลาเลิกงาน">
                <input type="time" value={shift.end_time} onChange={e => updateShift('end_time', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="เช็คเอาท์ขั้นต่ำ">
                <input type="time" value={shift.min_checkout} onChange={e => updateShift('min_checkout', e.target.value)} style={inputStyle} />
              </Field>
            </div>

            <p style={{ fontSize: '12px', fontWeight: 700, color: '#ef4444', margin: '0 0 14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>เกณฑ์การสาย</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label="สายระดับ 1 (นับหลังจาก)">
                <input type="time" value={shift.late_threshold_1} onChange={e => updateShift('late_threshold_1', e.target.value)} style={inputStyle} />
              </Field>
              <Field label="สายระดับ 2 / นับว่าขาด">
                <input type="time" value={shift.late_threshold_2} onChange={e => updateShift('late_threshold_2', e.target.value)} style={inputStyle} />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn onClick={handleSaveTime} label="บันทึกเวลา" />
          </div>
        </div>
      )}

      {/* ══ TAB: กฎค่าปรับ ══ */}
      {tab === 'fine' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Feature gate banner */}
          {!canUseFine && (
            <div style={{ padding: '12px 16px', borderRadius: 10, background: '#fef3c7', border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.2rem' }}>🔒</span>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#92400e' }}>ฟีเจอร์นี้ไม่พร้อมใช้งานในแพ็กเกจ {tenant.plan}</div>
                <div style={{ fontSize: '11px', color: '#b45309', marginTop: 2 }}>ระบบค่าปรับ (Fine System) ต้องการแพ็กเกจ Professional ขึ้นไป — ติดต่อ Super Admin เพื่ออัปเกรด</div>
              </div>
            </div>
          )}

          {/* Absent fine — แยกจาก late fine เสมอ */}
          <div style={{ ...card, padding: 18, opacity: canUseFine ? 1 : 0.5, pointerEvents: canUseFine ? 'auto' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>ค่าปรับขาดงาน (Absent Penalty)</p>
                <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>หักเงินพนักงานที่ไม่มาทำงานโดยไม่มีใบลา — แยกต่างหากจากค่าปรับสาย</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={0} step={10}
                  value={globalSettings.fine_absent}
                  onChange={e => setGlobalSettings(g => ({ ...g, fine_absent: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: 90, textAlign: 'center', fontWeight: 700, fontSize: '15px', color: '#dc2626' }}
                />
                <span style={{ fontSize: '13px', color: '#6b7280', whiteSpace: 'nowrap' }}>฿ / วัน</span>
              </div>
            </div>
            <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: '#fff5f5', border: '1px solid #fecaca', fontSize: '12px', color: '#dc2626' }}>
              ตัวอย่าง: พนักงานขาดงาน 3 วัน → หัก <strong>{globalSettings.fine_absent * 3} ฿</strong>
            </div>
          </div>

          {/* Mode selector + tier/per-minute config — gated */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: canUseFine ? 1 : 0.45, pointerEvents: canUseFine ? 'auto' : 'none' }}>
          {/* Mode selector */}
          <div style={{ ...card, padding: 18 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 12px' }}>รูปแบบการคำนวณค่าปรับ</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
              <ModeCard
                active={fineRule.mode === 'tier'}
                onClick={() => setMode('tier')}
                title="ปรับตามช่วงเวลา"
                desc="กำหนดค่าปรับแต่ละช่วงนาทีที่สาย เช่น สาย 1-15 นาที = 20 ฿, 16-30 นาที = 50 ฿"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                  </svg>
                }
              />
              <ModeCard
                active={fineRule.mode === 'per_minute'}
                onClick={() => setMode('per_minute')}
                title="ปรับตามนาทีที่สาย"
                desc="นาทีที่สาย × อัตราค่าปรับต่อนาที เช่น สาย 10 นาที × 2 ฿ = 20 ฿"
                icon={
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Tier config */}
          {fineRule.mode === 'tier' && (
            <div style={{ ...card, overflow: 'hidden' }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>ช่วงเวลาสายและค่าปรับ</p>
                  <p style={{ fontSize: '11px', color: '#9ca3af', margin: '2px 0 0' }}>นับจากเวลาเริ่มงานในกะ เช่น กะเช้า 08:00 → สาย 1 นาที = 08:01</p>
                </div>
                <button
                  onClick={addTier}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#f97316', color: '#fff', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  เพิ่มช่วง
                </button>
              </div>

              {isMobile ? (
                /* Mobile: tier cards */
                <div>
                  {fineRule.tiers.map((tier, idx) => (
                    <div key={tier.id} style={{ padding: '14px 16px', borderBottom: '1px solid #f8fafc' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151' }}>ช่วงที่ {idx + 1}</span>
                        <button
                          onClick={() => setDeleteTierId(tier.id)}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                        >ลบ</button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                        <Field label="จากนาที">
                          <input type="number" min={1} value={tier.from_minute}
                            onChange={e => updateTier(tier.id, 'from_minute', Number(e.target.value))}
                            style={{ ...inputStyle, padding: '6px 8px' }} />
                        </Field>
                        <Field label={tier.to_minute !== null ? 'ถึงนาที' : 'ถึง'}>
                          {tier.to_minute !== null ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input type="number" min={tier.from_minute} value={tier.to_minute}
                                onChange={e => updateTier(tier.id, 'to_minute', Number(e.target.value))}
                                style={{ ...inputStyle, padding: '6px 8px', flex: 1 }} />
                              <button onClick={() => updateTier(tier.id, 'to_minute', null)}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>ขึ้นไป</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', padding: '6px 10px', background: '#f1f5f9', borderRadius: 6 }}>ขึ้นไป</span>
                              <button onClick={() => updateTier(tier.id, 'to_minute', tier.from_minute + 14)}
                                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: '10px', cursor: 'pointer' }}>กำหนด</button>
                            </div>
                          )}
                        </Field>
                        <Field label="ค่าปรับ (฿)">
                          <input type="number" min={0} value={tier.fine_amount}
                            onChange={e => updateTier(tier.id, 'fine_amount', Number(e.target.value))}
                            style={{ ...inputStyle, padding: '6px 8px' }} />
                        </Field>
                        <Field label="ค่าปรับวันถัดไป (฿)">
                          <input type="number" min={0} value={tier.next_day_fine}
                            onChange={e => updateTier(tier.id, 'next_day_fine', Number(e.target.value))}
                            style={{ ...inputStyle, padding: '6px 8px' }} />
                        </Field>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div
                          onClick={() => updateTier(tier.id, 'count_as_absent', !tier.count_as_absent)}
                          style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: tier.count_as_absent ? '#f97316' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                        >
                          <div style={{ position: 'absolute', top: 2, left: tier.count_as_absent ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                        </div>
                        <span style={{ fontSize: '12px', color: tier.count_as_absent ? '#dc2626' : '#6b7280', fontWeight: tier.count_as_absent ? 600 : 400 }}>
                          {tier.count_as_absent ? 'นับเป็นวันขาดงาน' : 'ไม่นับวันขาด'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {fineRule.tiers.length === 0 && (
                    <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                      ยังไม่มีช่วงค่าปรับ — กดเพิ่มช่วงเพื่อเริ่มต้น
                    </div>
                  )}
                </div>
              ) : (
                /* Desktop: table */
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead>
                      <tr style={{ background: '#fafafa', borderBottom: '1px solid #f1f5f9' }}>
                        {['ช่วงนาทีที่สาย', 'ค่าปรับ (฿)', 'นับเป็นวันหยุด', 'ค่าปรับวันถัดไป (฿)', ''].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: '11px', whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {fineRule.tiers.map((tier) => (
                        <tr key={tier.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number" min={1} value={tier.from_minute}
                                onChange={e => updateTier(tier.id, 'from_minute', Number(e.target.value))}
                                style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '6px 8px' }}
                              />
                              <span style={{ color: '#9ca3af', fontSize: '11px' }}>นาที</span>
                              <span style={{ color: '#9ca3af' }}>–</span>
                              {tier.to_minute !== null ? (
                                <>
                                  <input
                                    type="number" min={tier.from_minute} value={tier.to_minute}
                                    onChange={e => updateTier(tier.id, 'to_minute', Number(e.target.value))}
                                    style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '6px 8px' }}
                                  />
                                  <span style={{ color: '#9ca3af', fontSize: '11px' }}>นาที</span>
                                  <button
                                    onClick={() => updateTier(tier.id, 'to_minute', null)}
                                    style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer' }}
                                  >ขึ้นไป</button>
                                </>
                              ) : (
                                <>
                                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#374151', padding: '4px 10px', background: '#f1f5f9', borderRadius: 6 }}>ขึ้นไป</span>
                                  <button
                                    onClick={() => updateTier(tier.id, 'to_minute', tier.from_minute + 14)}
                                    style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer' }}
                                  >กำหนด</button>
                                </>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number" min={0} value={tier.fine_amount}
                                onChange={e => updateTier(tier.id, 'fine_amount', Number(e.target.value))}
                                style={{ ...inputStyle, width: 80, padding: '6px 8px' }}
                              />
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>฿</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div
                                onClick={() => updateTier(tier.id, 'count_as_absent', !tier.count_as_absent)}
                                style={{ width: 36, height: 20, borderRadius: 99, cursor: 'pointer', background: tier.count_as_absent ? '#f97316' : '#d1d5db', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}
                              >
                                <div style={{ position: 'absolute', top: 2, left: tier.count_as_absent ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
                              </div>
                              {tier.count_as_absent && (
                                <span style={{ fontSize: '11px', color: '#dc2626', fontWeight: 600 }}>หักวันลา 1 วัน</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input
                                type="number" min={0} value={tier.next_day_fine}
                                onChange={e => updateTier(tier.id, 'next_day_fine', Number(e.target.value))}
                                style={{ ...inputStyle, width: 80, padding: '6px 8px' }}
                              />
                              <span style={{ fontSize: '11px', color: '#9ca3af' }}>฿</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <button
                              onClick={() => setDeleteTierId(tier.id)}
                              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #fecaca', background: '#fef2f2', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}
                            >ลบ</button>
                          </td>
                        </tr>
                      ))}
                      {fineRule.tiers.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                            ยังไม่มีช่วงค่าปรับ — กดเพิ่มช่วงเพื่อเริ่มต้น
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Visual summary */}
              {fineRule.tiers.length > 0 && (
                <div style={{ padding: '14px 18px', background: '#fafafa', borderTop: '1px solid #f1f5f9' }}>
                  <p style={{ fontSize: '11px', fontWeight: 600, color: '#6b7280', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>สรุปกฎค่าปรับ</p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: '#dcfce7', border: '1px solid #86efac' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#15803d' }} />
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#15803d' }}>ตรงเวลา → ไม่หัก</span>
                    </div>
                    {fineRule.tiers.map(t => {
                      const rangeLabel = t.to_minute ? `${t.from_minute}–${t.to_minute} นาที` : `${t.from_minute}+ นาที`
                      const parts: string[] = []
                      if (t.fine_amount > 0) parts.push(`${t.fine_amount} ฿`)
                      if (t.count_as_absent) parts.push('หักวันลา')
                      if (t.next_day_fine > 0) parts.push(`+${t.next_day_fine} ฿ พรุ่งนี้`)
                      const color = t.count_as_absent ? '#dc2626' : t.fine_amount >= 50 ? '#d97706' : '#2563eb'
                      const bg = t.count_as_absent ? '#fef2f2' : t.fine_amount >= 50 ? '#fef3c7' : '#dbeafe'
                      const border = t.count_as_absent ? '#fca5a5' : t.fine_amount >= 50 ? '#fcd34d' : '#93c5fd'
                      return (
                        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 99, background: bg, border: `1px solid ${border}` }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                          <span style={{ fontSize: '11px', fontWeight: 600, color }}>สาย {rangeLabel} → {parts.join(' + ') || 'ไม่หัก'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Per-minute config */}
          {fineRule.mode === 'per_minute' && (
            <div style={{ ...card, padding: 20 }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>ตั้งค่าอัตราค่าปรับต่อนาที</p>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <Field label="อัตราค่าปรับ (ต่อนาที)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" min={0.5} step={0.5}
                      value={fineRule.per_minute_rate}
                      onChange={e => setFineRule(r => ({ ...r, per_minute_rate: Number(e.target.value) }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>฿ / นาที</span>
                  </div>
                </Field>
                <Field label="ค่าปรับสูงสุด (0 = ไม่จำกัด)">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="number" min={0}
                      value={fineRule.per_minute_max}
                      onChange={e => setFineRule(r => ({ ...r, per_minute_max: Number(e.target.value) }))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>฿</span>
                  </div>
                </Field>
              </div>
              <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <p style={{ fontSize: '12px', color: '#1e40af', margin: 0 }}>
                  ตัวอย่าง: สาย 10 นาที × {fineRule.per_minute_rate} ฿ = <strong>{10 * fineRule.per_minute_rate} ฿</strong>
                  {fineRule.per_minute_max > 0 && ` (สูงสุด ${fineRule.per_minute_max} ฿)`}
                </p>
              </div>
            </div>
          )}

          {/* Simulator */}
          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 4px' }}>ทดสอบการคำนวณค่าปรับ</p>
            <p style={{ fontSize: '11px', color: '#9ca3af', margin: '0 0 16px' }}>ลองใส่เวลาเช็คอินเพื่อดูว่าจะโดนหักเท่าไหร่</p>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap' }}>
              <Field label="เวลาเริ่มงาน (กะ)">
                <input type="time" value={simShiftStart} onChange={e => setSimShiftStart(e.target.value)} style={{ ...inputStyle, width: 130 }} />
              </Field>
              <Field label="เวลาเช็คอินจริง">
                <input type="time" value={simTime} onChange={e => setSimTime(e.target.value)} style={{ ...inputStyle, width: 130 }} />
              </Field>
              <div style={{ padding: '8px 0', fontSize: '12px', color: '#6b7280' }}>
                สาย <strong style={{ color: simMinutesLate > 0 ? '#dc2626' : '#15803d' }}>{simMinutesLate} นาที</strong>
              </div>
            </div>

            <div style={{ marginTop: 14, padding: '14px 18px', borderRadius: 10, background: simMinutesLate === 0 ? '#f0fdf4' : simResult.countAsAbsent ? '#fef2f2' : simResult.fineAmount >= 50 ? '#fffbeb' : '#fef9f0', border: `1px solid ${simMinutesLate === 0 ? '#86efac' : simResult.countAsAbsent ? '#fca5a5' : '#fde68a'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: simMinutesLate === 0 ? '#dcfce7' : simResult.countAsAbsent ? '#fee2e2' : '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {simMinutesLate === 0 ? (
                    <svg width="18" height="18" fill="none" stroke="#15803d" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg width="18" height="18" fill="none" stroke={simResult.countAsAbsent ? '#dc2626' : '#d97706'} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z" /></svg>
                  )}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: 0 }}>{simResult.description}</p>
                  {simResult.fineAmount > 0 && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '3px 0 0' }}>ค่าปรับวันนี้: <strong style={{ color: '#dc2626' }}>{simResult.fineAmount} ฿</strong></p>
                  )}
                  {simResult.nextDayFine > 0 && (
                    <p style={{ fontSize: '12px', color: '#6b7280', margin: '2px 0 0' }}>ค่าปรับวันถัดไป: <strong style={{ color: '#d97706' }}>{simResult.nextDayFine} ฿</strong></p>
                  )}
                  {simResult.countAsAbsent && (
                    <p style={{ fontSize: '12px', color: '#dc2626', fontWeight: 600, margin: '2px 0 0' }}>• หักวันลา 1 วัน (บันทึกเป็นขาดงาน)</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          </div>{/* end gated wrapper */}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn onClick={handleSaveFine} label="บันทึกกฎค่าปรับ" />
          </div>
        </div>
      )}

      {/* ══ TAB: ทั่วไป ══ */}
      {tab === 'general' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ ...card, padding: 20 }}>
            <p style={{ fontSize: '13px', fontWeight: 700, color: '#111827', margin: '0 0 16px' }}>รัศมีเช็คอิน GPS</p>
            <Field label="รัศมีอนุญาต (เมตร) — ใช้กับทุกสาขา">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[50, 100, 150, 200, 300].map(r => (
                  <button
                    key={r}
                    onClick={() => setGlobalSettings(g => ({ ...g, radius_m: r }))}
                    style={{
                      padding: '7px 14px', borderRadius: 8, fontSize: '12px', cursor: 'pointer', fontWeight: 500,
                      border: `1.5px solid ${globalSettings.radius_m === r ? '#f97316' : '#e5e7eb'}`,
                      background: globalSettings.radius_m === r ? '#fff7ed' : '#fff',
                      color: globalSettings.radius_m === r ? '#ea580c' : '#4b5563',
                    }}
                  >{r}ม.</button>
                ))}
                <input
                  type="number"
                  value={globalSettings.radius_m}
                  onChange={e => setGlobalSettings(g => ({ ...g, radius_m: Number(e.target.value) }))}
                  style={{ ...inputStyle, width: 90 }}
                  placeholder="กำหนดเอง"
                />
              </div>
            </Field>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveBtn onClick={handleSaveGeneral} label="บันทึกการตั้งค่า" />
          </div>
        </div>
      )}

      {/* Confirm delete tier */}
      {deleteTierId && (
        <ConfirmDialog
          title="ลบช่วงค่าปรับ?"
          message="ช่วงนี้จะถูกลบออกจากกฎค่าปรับ พนักงานที่สายในช่วงนี้จะไม่ถูกคำนวณค่าปรับอีกต่อไป"
          confirmLabel="ลบช่วง"
          variant="danger"
          onConfirm={() => deleteTier(deleteTierId)}
          onCancel={() => setDeleteTierId(null)}
        />
      )}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: 5 }}>{label}</label>
      {children}
    </div>
  )
}

function SaveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '9px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
        background: 'linear-gradient(135deg, #f97316, #ea580c)',
        color: '#fff', fontWeight: 600, fontSize: '13px',
        boxShadow: '0 2px 8px rgba(249,115,22,0.3)',
      }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {label}
    </button>
  )
}

function ModeCard({ active, onClick, title, desc, icon }: {
  active: boolean; onClick: () => void; title: string; desc: string; icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{
        textAlign: 'left', padding: '16px', borderRadius: 10, cursor: 'pointer',
        border: `2px solid ${active ? '#f97316' : '#e5e7eb'}`,
        background: active ? '#fff7ed' : '#fff',
        transition: 'all 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: active ? '#fdba74' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#c2410c' : '#9ca3af' }}>
          {icon}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <p style={{ fontWeight: 700, fontSize: '13px', color: active ? '#c2410c' : '#374151', margin: 0 }}>{title}</p>
          {active && (
            <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: 99, background: '#f97316', color: '#fff', fontWeight: 600 }}>ใช้งาน</span>
          )}
        </div>
      </div>
      <p style={{ fontSize: '12px', color: '#6b7280', margin: 0, lineHeight: 1.5 }}>{desc}</p>
    </button>
  )
}
