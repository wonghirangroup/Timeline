// admin/src/pages/leave/VacationPolicyTab.tsx
// รวมนโยบายพักร้อนตามอายุงาน (feedback 2026-09-15 ทั้ง 9 ข้อที่เกี่ยวกับพักร้อน) มา
// ไว้ที่เดียว — เดิมกระจายอยู่ 3 ที่ (ผังองค์กร→ตำแหน่ง, วันหยุดนักขัตฤกษ์, โควต้า)
// จนผู้ใช้บอกว่างง — หน้านี้เป็น "จุดเริ่มต้น" ที่มีสรุป+เครื่องมือครบ ส่วนการแก้ไข
// เต็มรูปแบบ (เช่น ตั้งค่าตำแหน่งอื่นๆ, วันหยุดครบทุก field) ยังอยู่ที่หน้าเดิม —
// ฟอร์มย่อยในนี้เขียนไปที่ endpoint เดียวกัน ไม่ได้สร้างข้อมูลซ้ำ
// feedback 2026-10-01: ย้าย "นโยบายการลา" (ยื่นลาย้อนหลัง/ลาออกเอง/นับวันทำงาน
// วันหยุดเป็นไม่ได้พักจริง) มาจาก ตั้งค่า → นโยบายการลา มารวมไว้ที่นี่ทั้งหมดด้วย
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sliders, Gift, RefreshCw, Users, Info, ExternalLink, CalendarClock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/axios'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import InfoTooltip from '../../components/ui/InfoTooltip'
import Toggle from '../../components/ui/Toggle'
import Button from '../../components/ui/Button'
import { useIsReadOnly } from '../../stores/authStore'

// ── Types ────────────────────────────────────────────────────────────────────
interface ApiPosition {
  id: string; name: string
  department?: { id: string; name: string; division?: { id: string; name: string } | null } | null
  vacation_base_days?: number | null
  vacation_increment_days?: number | null
  vacation_increment_years?: number | null
}
interface ApiHoliday {
  id: string; name: string; date: string
  compensate_days?: number
  compensate_leave_type?: 'SICK' | 'PERSONAL' | 'VACATION' | 'MATERNITY' | 'COMPENSATE' | 'OTHER'
}
interface RemainingRow {
  employee_id: string; full_name: string; nickname: string | null; employee_code: string
  branch_name: string | null; position_name: string | null
  total_days: number; used_days: number; remaining: number; sellable: number
}
interface TenantSettings {
  leave_backdate_days: number | null
  self_resignation_enabled: boolean
  vacation_count_worked_off_days: boolean
  monthly_total_cap: number
  vacation_bonus_auto?: boolean
  leave_conflict_fee_enabled: boolean
  leave_conflict_fee_weekday: number
  leave_conflict_fee_weekend: number
}

const th: React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#92400e', background: '#fef3c7' }
const td: React.CSSProperties = { padding: '7px 10px', fontSize: '0.82rem', borderBottom: '1px solid #f3f4f6' }
const numInput: React.CSSProperties = { width: 52, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', fontSize: '0.8rem', fontFamily: 'inherit', textAlign: 'center', boxSizing: 'border-box' }

function previewText(base: number | null | undefined, incDays: number | null | undefined, incYears: number | null | undefined) {
  if (base == null) return null
  const d = incDays ?? 1, y = incYears && incYears > 0 ? incYears : 0
  return [1, 3, 5].map(years => {
    const steps = y > 0 ? Math.floor((years - 1) / y) : 0
    return `${years}ปี=${base + d * steps}วัน`
  }).join(' · ')
}

const cardBox: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }
const inputStyle: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box' }

// ── นโยบายการลา (ย้ายมาจาก ตั้งค่า → นโยบายการลา ให้รวมอยู่หน้าเดียวกับพักร้อน) ──
function LeavePolicyCard() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const { data } = useQuery<TenantSettings>({ queryKey: ['tenant-settings'], queryFn: () => api.get('/api/v1/admin/tenant-settings').then(r => r.data.data) })
  const [unlimited, setUnlimited] = useState(true)
  const [days, setDays] = useState(3)
  const [selfResign, setSelfResign] = useState(true)
  const [countWorkedOffDays, setCountWorkedOffDays] = useState(true)
  const [cap, setCap] = useState(10)
  const [feeOn, setFeeOn] = useState(false)
  const [feeWeekday, setFeeWeekday] = useState(50)
  const [feeWeekend, setFeeWeekend] = useState(100)
  useEffect(() => {
    if (!data) return
    setUnlimited(data.leave_backdate_days == null)
    setDays(data.leave_backdate_days ?? 3)
    setSelfResign(data.self_resignation_enabled !== false)
    setCountWorkedOffDays(data.vacation_count_worked_off_days !== false)
    setCap(data.monthly_total_cap ?? 10)
    setFeeOn(data.leave_conflict_fee_enabled === true)
    setFeeWeekday(data.leave_conflict_fee_weekday ?? 50)
    setFeeWeekend(data.leave_conflict_fee_weekend ?? 100)
  }, [data])

  const mut = useMutation({
    mutationFn: () => api.patch('/api/v1/admin/tenant-settings', {
      leave_backdate_days: unlimited ? null : Math.max(0, days),
      self_resignation_enabled: selfResign,
      vacation_count_worked_off_days: countWorkedOffDays,
      monthly_total_cap: Math.min(62, Math.max(1, cap)),
      leave_conflict_fee_enabled: feeOn,
      leave_conflict_fee_weekday: Math.max(0, feeWeekday),
      leave_conflict_fee_weekend: Math.max(0, feeWeekend),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tenant-settings'] }); showToast('success', 'บันทึกนโยบายการลาแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  return (
    <div style={cardBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0e7490' }}><CalendarClock size={15} /></div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>นโยบายการลา</div>
      </div>
      <div style={{ marginLeft: 42, marginBottom: 12 }}>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
          จำกัดว่าพนักงานยื่นลาผ่าน LINE ย้อนหลังได้ไม่เกินกี่วัน — <strong>แอดมินลงวันลาแทนพนักงานได้ไม่จำกัด</strong> (ลาป่วย/ลาคลอดก็ไม่ติดข้อจำกัดนี้ทางฝั่งพนักงานถ้าตั้งไว้)
        </p>
      </div>
      <div style={{ marginLeft: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: '13px', color: '#374151' }}>ไม่จำกัด (ยื่นย้อนหลังได้เท่าไหร่ก็ได้)</span>
        <Toggle checked={unlimited} disabled={readOnly} onChange={setUnlimited} aria-label="ไม่จำกัดการยื่นลาย้อนหลัง" />
      </div>
      {!unlimited && (
        <div style={{ marginLeft: 42, display: 'flex', alignItems: 'center', gap: 8, fontSize: '13px', color: '#374151' }}>
          ย้อนหลังได้ไม่เกิน
          <input type="number" min={0} max={90} value={days} disabled={readOnly} onChange={e => setDays(Math.max(0, parseInt(e.target.value) || 0))}
            style={{ ...inputStyle, width: 72, textAlign: 'center' }} />
          วัน <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(0 = ยื่นได้เฉพาะวันนี้เป็นต้นไป)</span>
        </div>
      )}
      <div style={{ borderTop: '1px solid #E6ECF4', margin: '16px 0 0', paddingTop: 16, marginLeft: 42, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <span>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>ให้พนักงานยื่นลาออกเองผ่าน LINE ได้</span>
          <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: 2 }}>ปิด = ซ่อนเมนู "ยื่นลาออก" ในแอปพนักงาน (คำขอที่ยื่นไว้แล้วยังจัดการได้ที่หน้าคำขอลาออก)</span>
        </span>
        <Toggle checked={selfResign} disabled={readOnly} onChange={setSelfResign} aria-label="ให้พนักงานยื่นลาออกเองผ่าน LINE ได้" />
      </div>
      <div style={{ borderTop: '1px solid #E6ECF4', margin: '16px 0 0', paddingTop: 16, marginLeft: 42 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>นับวันที่จองหยุดไว้แต่มาทำงานจริง เป็น "ไม่ได้พักจริง" ในโบนัสพักร้อนรายเดือน</span>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: 2 }}>
              โบนัสพักร้อนตามส่วนต่างจริงตอนหยุดไม่ครบโควต้า/เดือน (ดูด้านล่าง) — เปิดไว้จะนับวันที่จองหยุดแล้วแต่ดันเช็คอินมาทำงานจริง ว่าเป็นวันที่ไม่ได้พักด้วย ไม่ใช่แค่จำนวนที่จองอนุมัติเฉยๆ (ยกเว้นวันที่ HR ให้วันชดเชยแยกไปแล้ว) ปิด = นับแค่จำนวนวันที่จองอนุมัติเหมือนเดิม — ไม่ใช่ทุกบริษัทมีเคสนี้ เลือกได้ตามจริง
            </span>
          </span>
          <Toggle checked={countWorkedOffDays} disabled={readOnly} onChange={setCountWorkedOffDays} aria-label="นับวันที่จองหยุดไว้แต่มาทำงานจริง เป็นไม่ได้พักจริง" />
        </div>
      </div>
      <div style={{ borderTop: '1px solid #E6ECF4', margin: '16px 0 0', paddingTop: 16, marginLeft: 42 }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>เพดานรวม "วันหยุดจอง + ลาพักร้อน" ต่อคนต่อเดือน</span>
        <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: 2 }}>
          พนักงานจองหรือลาเกินเพดานนี้ไม่ได้ (แอดมินกด "ยืนยันลงให้อยู่ดี" ข้ามได้) — สถานะที่ได้โควต้าวันหยุดเยอะ เช่น "เท่ากับเสาร์-อาทิตย์ของเดือน" (เดือนละ 8–10 วัน) ควรตั้งให้สูงกว่าโควต้าวันหยุด + พักร้อนที่ใช้จริง
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, fontSize: '13px', color: '#374151' }}>
          ไม่เกิน
          <input type="number" min={1} max={62} value={cap} disabled={readOnly} onChange={e => setCap(Math.min(62, Math.max(1, parseInt(e.target.value) || 1)))} style={{ ...inputStyle, width: 84, textAlign: 'center' }} />
          วัน/เดือน <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>(ค่าเริ่มต้น 10)</span>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #E6ECF4', margin: '16px 0 0', paddingTop: 16, marginLeft: 42 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
          <span>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>หักเงินเมื่อลาทับวันหยุด/วันลาของคนตำแหน่งเดียวกัน</span>
            <span style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginTop: 2 }}>
              ถ้าพนักงานยื่นลาในวันที่คนตำแหน่งเดียวกันหยุดประจำ (อนุมัติแล้ว) หรือลาอยู่แล้ว คนที่ยื่นทีหลังจะถูกหักตามอัตราด้านล่าง (ทุกประเภทการลา) — แอปพนักงานจะแจ้งยอดหักก่อนกดยื่น และแอดมินเห็นยอดในรายการคำขอลา
            </span>
          </span>
          <Toggle checked={feeOn} disabled={readOnly} onChange={setFeeOn} aria-label="หักเงินเมื่อลาทับวันหยุดคนตำแหน่งเดียวกัน" />
        </div>
        {feeOn && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: '13px', color: '#374151' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>จันทร์–ศุกร์
              <input type="number" min={0} value={feeWeekday} disabled={readOnly} onChange={e => setFeeWeekday(Math.max(0, parseInt(e.target.value) || 0))} style={{ ...inputStyle, width: 84, textAlign: 'center' }} /> บาท/วัน
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>เสาร์–อาทิตย์
              <input type="number" min={0} value={feeWeekend} disabled={readOnly} onChange={e => setFeeWeekend(Math.max(0, parseInt(e.target.value) || 0))} style={{ ...inputStyle, width: 84, textAlign: 'center' }} /> บาท/วัน
            </label>
          </div>
        )}
      </div>
      {!readOnly && (
        <div style={{ marginLeft: 42 }}>
          <Button variant="primary" loading={mut.isPending} onClick={() => mut.mutate()} style={{ marginTop: 16 }}>บันทึก</Button>
        </div>
      )}
    </div>
  )
}

// ── ตรวจโบนัสพักร้อนสิ้นเดือน ("หยุดไม่ครบโควต้า") — ดูรายชื่อ + เลือกรายคนก่อนให้จริง ──────────────────────
interface BonusRow {
  employee_id: string; employee_code: string; full_name: string; nickname: string | null; branch_name: string | null
  quota: number; booked: number; effective_off: number; shortfall: number; granted_days: number | null
}
function prevMonthYm(): string {
  const d = new Date(Date.now() + 7 * 3600_000); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 7)
}
const INELIGIBLE_TH: Record<string, string> = {
  POSITION_NOT_CONFIGURED: 'ตำแหน่งยังไม่ตั้งวันพักร้อนพื้นฐาน',
  NOT_MONTHLY_BATCH: 'ไม่ได้ตั้งจองวันหยุดแบบรายเดือน',
  UNDER_1_YEAR: 'อายุงานไม่ถึง 1 ปี',
  IN_PROBATION: 'ยังไม่ผ่านโปร',
  NO_HIRED_AT: 'ไม่มีวันเริ่มงาน',
  NOT_ACTIVE: 'ไม่ได้ใช้งานอยู่',
}
function currentYm(): string { return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7) }
function BonusReviewCard() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const [ym, setYm] = useState(prevMonthYm())
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)

  const { data, isLoading, isError } = useQuery<{ ym: string; month_ended: boolean; skip_ids: string[]; ineligible_reasons?: Record<string, number>; rows: BonusRow[]; skipped: number; ineligible: number; auto: boolean }>({
    queryKey: ['vacation-bonus-review', ym],
    queryFn: () => api.get('/api/v1/admin/vacation-policy/bonus-review', { params: { ym } }).then(r => r.data.data),
    enabled: /^\d{4}-\d{2}$/.test(ym),
  })
  const rows = data?.rows ?? []
  // ค่าเริ่มต้น: ติ๊กทุกคนที่ยังไม่ได้รับของเดือนนี้ (เอาออกเองได้ทีละคน)
  const skipIds = new Set(data?.skip_ids ?? [])
  const preview = data ? !data.month_ended : false   // เดือนที่ยังไม่จบ = ดูประมาณการอย่างเดียว (ให้จริงไม่ได้ แต่ตั้ง "ไม่ให้" ล่วงหน้าได้)
  // ค่าเริ่มต้น: ติ๊กทุกคนที่ยังไม่ได้รับของเดือนนี้ ยกเว้นคนที่ตั้ง "ไม่ให้" ไว้ (เอาออกเองได้ทีละคน)
  useEffect(() => { setPicked(new Set(rows.filter(r => r.granted_days == null && !skipIds.has(r.employee_id)).map(r => r.employee_id))) }, [data])
  const skipMut = useMutation({
    mutationFn: (v: { employee_id: string; skip: boolean }) => api.put('/api/v1/admin/vacation-policy/bonus-review/skip', { ym, ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }),
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const grantMut = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/bonus-review/grant', { ym, employee_ids: [...picked] }).then(r => r.data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }); qc.invalidateQueries({ queryKey: ['admin', 'vacation-remaining'] })
      showToast('success', res?.message ?? 'ให้โบนัสพักร้อนแล้ว'); setConfirm(false)
    },
    onError: (e: any) => { showToast('error', e?.response?.data?.error?.message ?? 'ให้โบนัสไม่สำเร็จ'); setConfirm(false) },
  })
  const autoMut = useMutation({
    mutationFn: (v: boolean) => api.patch('/api/v1/admin/tenant-settings', { vacation_bonus_auto: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }); qc.invalidateQueries({ queryKey: ['tenant-settings'] }); showToast('success', 'บันทึกแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const pending = rows.filter(r => r.granted_days == null)
  const selectedRows = rows.filter(r => picked.has(r.employee_id) && r.granted_days == null)
  const selectedDays = selectedRows.reduce((n, r) => n + r.shortfall, 0)
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const cell: React.CSSProperties = { padding: '8px 10px', fontSize: '0.82rem', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }

  return (
    <div style={cardBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}><Gift size={15} /></div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>ตรวจโบนัสพักร้อนสิ้นเดือน (หยุดไม่ครบโควต้า)</div>
        <InfoTooltip size="md" title="โบนัสพักร้อนสิ้นเดือน" width={320} content={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>คนที่ <b>หยุดจริงไม่ครบโควต้า</b> ของเดือนจะได้พักร้อนเพิ่มเท่ากับส่วนที่ขาด (โควต้า − วันที่หยุดได้จริง)</li>
            <li>วันที่จองไว้แต่ <b>มาเช็คอินทำงานจริง</b> นับว่าไม่ได้หยุด (ตั้งเปิด/ปิดได้ที่การ์ด "นโยบายการลา")</li>
            <li>ติ๊กเลือกรายคนก่อนกด "ให้โบนัส" · เดือนเดียวกันให้ซ้ำคนเดิมไม่ได้</li>
          </ul>
        } />
        <input type="month" value={ym} onChange={e => setYm(e.target.value)} max={currentYm()}
          style={{ marginLeft: 'auto', padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit' }} />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 42px' }}>
        เลือกเดือนที่จบแล้ว ระบบคำนวณให้ว่าใครควรได้กี่วัน คุณติ๊กเฉพาะคนที่จะให้ ส่วนคนที่ไม่ติ๊กจะไม่ได้ (กลับมาให้ทีหลังได้) · เลือกเดือนปัจจุบันเพื่อดูประมาณการล่วงหน้า และกด "ไม่ให้" ไว้ก่อนได้
      </p>
      {preview && (
        <div style={{ marginLeft: 42, marginBottom: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px', fontSize: '12.5px', color: '#92400e' }}>
          <b>ประมาณการ</b> — เดือนนี้ยังไม่จบ ระบบนับวันที่จองไว้เป็นวันหยุดตามปกติ ตัวเลขอาจเปลี่ยนถ้ามีการจอง/เช็คอินเพิ่ม · ให้โบนัสจริงได้หลังสิ้นเดือน · กด <b>"ไม่ให้เดือนนี้"</b> ข้างชื่อ เพื่อกันไว้ล่วงหน้า (ระบบอัตโนมัติจะข้ามคนนี้ด้วย)
        </div>
      )}

      <div style={{ marginLeft: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', marginBottom: 12 }}>
        <span style={{ fontSize: '12.5px', color: '#374151' }}>
          <b>ให้ระบบเพิ่มโบนัสอัตโนมัติ</b> ทุกวันที่ 1 {data?.auto ? '(เปิดอยู่ — ไม่ผ่านการตรวจ)' : '(ปิดอยู่ — รอให้คุณตรวจและกดให้เอง)'}
        </span>
        <Toggle checked={!!data?.auto} disabled={readOnly || autoMut.isPending} onChange={v => autoMut.mutate(v)} aria-label="ให้ระบบเพิ่มโบนัสพักร้อนอัตโนมัติ" />
      </div>

      <div style={{ marginLeft: 42 }}>
        {isLoading ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>กำลังคำนวณ...</div>
          : isError ? <div style={{ fontSize: '13px', color: '#dc2626' }}>โหลดไม่สำเร็จ</div>
          : rows.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '14px 0' }}>เดือนนี้ไม่มีใครหยุดไม่ครบโควต้า (ข้าม {data?.skipped ?? 0} คนที่หยุดครบแล้ว · {data?.ineligible ?? 0} คนไม่อยู่ในโปรแกรมพักร้อน)
              {data && data.ineligible > 0 && data.ineligible_reasons && (
                <div style={{ marginTop: 6, fontSize: '12px' }}>
                  สาเหตุที่ไม่อยู่ในโปรแกรม: {Object.entries(data.ineligible_reasons).map(([k, n]) => `${INELIGIBLE_TH[k] ?? k} ${n} คน`).join(' · ')}
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: 10 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      <th style={{ ...cell, width: 36 }}>
                        <input type="checkbox" aria-label="เลือกทั้งหมด" disabled={readOnly || preview || pending.length === 0}
                          checked={pending.length > 0 && selectedRows.length === pending.length}
                          onChange={e => setPicked(e.target.checked ? new Set(pending.map(r => r.employee_id)) : new Set())} />
                      </th>
                      <th style={{ ...cell, textAlign: 'left' }}>พนักงาน</th>
                      <th style={cell}>โควต้า</th>
                      <th style={cell}>จองอนุมัติ</th>
                      <th style={cell}>หยุดได้จริง</th>
                      <th style={cell}>จะได้</th>
                      <th style={cell}>สถานะ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => {
                      const done = r.granted_days != null
                      return (
                        <tr key={r.employee_id} style={{ background: done ? '#f0fdf4' : skipIds.has(r.employee_id) ? '#fef2f2' : (preview || picked.has(r.employee_id)) ? '#fff' : '#fafafa', opacity: !done && !preview && !picked.has(r.employee_id) ? 0.7 : 1 }}>
                          <td style={cell}><input type="checkbox" disabled={readOnly || done || preview} checked={!done && !preview && picked.has(r.employee_id)} onChange={() => toggle(r.employee_id)} aria-label={`เลือก ${r.full_name}`} /></td>
                          <td style={{ ...cell, textAlign: 'left' }}>
                            <div style={{ fontWeight: 600 }}>{r.full_name}{r.nickname ? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({r.nickname})</span> : null}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{r.employee_code}{r.branch_name ? ` · ${r.branch_name}` : ''}</div>
                          </td>
                          <td style={cell}>{r.quota}</td>
                          <td style={cell}>{r.booked}</td>
                          <td style={{ ...cell, color: r.effective_off < r.booked ? '#c2410c' : undefined, fontWeight: r.effective_off < r.booked ? 700 : 400 }} title={r.effective_off < r.booked ? `จองไว้ ${r.booked} แต่มาทำงานในวันหยุด ${r.booked - r.effective_off} วัน` : undefined}>{r.effective_off}</td>
                          <td style={{ ...cell, fontWeight: 800, color: '#15803d' }}>+{r.shortfall} วัน</td>
                          <td style={cell}>{done ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 99, padding: '2px 9px' }}>ให้แล้ว +{r.granted_days}</span> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                            {skipIds.has(r.employee_id)
                              ? <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 99, padding: '2px 9px' }}>ตั้งไว้ไม่ให้</span>
                              : <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 99, padding: '2px 9px' }}>{preview ? 'ประมาณการ' : 'รอตรวจ'}</span>}
                            {!readOnly && <button disabled={skipMut.isPending} onClick={() => skipMut.mutate({ employee_id: r.employee_id, skip: !skipIds.has(r.employee_id) })}
                              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#2563eb', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>
                              {skipIds.has(r.employee_id) ? 'ยกเลิก (ให้ตามปกติ)' : 'ไม่ให้เดือนนี้'}
                            </button>}
                          </div>}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ fontSize: '12.5px', color: '#374151' }}>เลือก <b>{selectedRows.length}</b> จาก {pending.length} คนที่รอ · รวม <b>{selectedDays}</b> วัน{data && data.skipped > 0 ? ` · (ข้าม ${data.skipped} คนที่หยุดครบแล้ว)` : ''}</span>
                {!readOnly && !preview && <Button variant="primary" disabled={selectedRows.length === 0} onClick={() => setConfirm(true)}>ให้โบนัส {selectedRows.length} คน</Button>}
              </div>
            </>
          )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="ให้โบนัสพักร้อน?"
          message={`ให้โบนัสพักร้อนของเดือน ${ym} แก่ ${selectedRows.length} คน รวม ${selectedDays} วัน — เพิ่มเข้าโควต้าพักร้อนของแต่ละคนทันที และให้เดือนเดียวกันซ้ำไม่ได้`}
          confirmLabel="ให้โบนัส"
          onConfirm={() => grantMut.mutate()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  )
}

export default function VacationPolicyTab() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const qc = useQueryClient()
  const currentYear = new Date().getFullYear()
  const [confirmReset, setConfirmReset] = useState(false)

  const { data: positions = [], isLoading: loadingPos } = useQuery<ApiPosition[]>({
    queryKey: ['positions'],
    queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data),
  })
  const { data: holidays = [], isLoading: loadingHol } = useQuery<ApiHoliday[]>({
    queryKey: ['admin', 'super-admin-holidays', currentYear],
    queryFn: () => api.get('/api/v1/super-admin/holidays', { params: { year: currentYear } }).then(r => r.data.data),
  })
  const { data: remainingReport = [], isLoading: loadingRemaining, refetch: refetchRemaining } = useQuery<RemainingRow[]>({
    queryKey: ['admin', 'vacation-policy', 'remaining-report', currentYear - 1],
    queryFn: () => api.get('/api/v1/admin/vacation-policy/remaining-report', { params: { year: currentYear - 1 } }).then(r => r.data.data),
  })

  // แก้ไขสูตรพักร้อนของตำแหน่ง — เขียนไป endpoint เดียวกับที่ผังองค์กร→ตำแหน่งใช้
  const [posEdits, setPosEdits] = useState<Record<string, { base: string; incDays: string; incYears: string }>>({})
  const editOf = (p: ApiPosition) => posEdits[p.id] ?? {
    base: p.vacation_base_days == null ? '' : String(p.vacation_base_days),
    incDays: p.vacation_increment_days == null ? '' : String(p.vacation_increment_days),
    incYears: p.vacation_increment_years == null ? '' : String(p.vacation_increment_years),
  }
  const setEdit = (id: string, patch: Partial<{ base: string; incDays: string; incYears: string }>) =>
    setPosEdits(e => ({ ...e, [id]: { ...editOf(positions.find(p => p.id === id)!), ...e[id], ...patch } }))

  const savePositionMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) => api.patch(`/api/v1/admin/positions/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['positions'] }); qc.invalidateQueries({ queryKey: ['org-tree'] }); showToast('success', 'บันทึกสูตรพักร้อนแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  function savePosition(p: ApiPosition) {
    const e = editOf(p)
    savePositionMutation.mutate({
      id: p.id,
      body: {
        vacation_base_days: e.base.trim() === '' ? null : (parseInt(e.base) || 0),
        vacation_increment_days: e.incDays.trim() === '' ? null : (parseInt(e.incDays) || 0),
        vacation_increment_years: e.incYears.trim() === '' ? null : (parseInt(e.incYears) || 0),
      },
    })
  }

  // แก้ไขประเภทที่ได้ตอนมาทำงานวันหยุด — เขียนไป endpoint เดียวกับหน้า "วันหยุดนักขัตฤกษ์"
  const saveHolidayTypeMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: string }) => api.patch(`/api/v1/super-admin/holidays/${id}`, { compensate_leave_type: type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'super-admin-holidays'] }); showToast('success', 'บันทึกแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const runBonusMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/run-bonus').then(r => r.data),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['admin', 'leave-balances'] }); showToast('success', res?.message ?? 'รันโบนัสเสร็จแล้ว') },
    onError: () => showToast('error', 'รันไม่สำเร็จ'),
  })
  const runResetMutation = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/run-reset').then(r => r.data),
    onSuccess: (res: any) => { qc.invalidateQueries({ queryKey: ['admin', 'leave-balances'] }); refetchRemaining(); showToast('success', res?.message ?? 'รัน reset เสร็จแล้ว') },
    onError: () => showToast('error', 'รันไม่สำเร็จ'),
  })

  const configuredCount = positions.filter(p => p.vacation_base_days != null).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Info size={16} color="#2563eb" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: '0.8rem', color: '#1e40af', lineHeight: 1.6 }}>
          รวมนโยบายพักร้อนตามอายุงานทุกส่วนไว้ที่นี่ — พนักงานที่มีสิทธิ์ (ประจำ + ผ่านโปร + ตำแหน่งตั้งค่าไว้) จะได้พักร้อนเพิ่มอัตโนมัติทุก 1 ม.ค., ได้โบนัสพักร้อน<strong>ตามส่วนต่างจริง</strong>ถ้า "หยุดได้จริง" ไม่ครบโควต้า/เดือน (เช่น โควต้า 5 หยุดได้จริงแค่ 2 = ได้ +3)
          (นับทั้งจองไม่ครบโควต้า และจองครบแต่ดันมาเช็คอินทำงานในวันที่จองหยุดไว้ — ยกเว้นวันที่ HR resolve alert ให้วันชดเชยแยกไปแล้ว จะไม่หักซ้ำ — เปิด/ปิดนับกรณีหลังได้ที่การ์ด <strong>"นโยบายการลา"</strong> ด้านล่าง),
          และรวมวันหยุดที่จอง+วันพักร้อนที่ใช้ต้องไม่เกิน <strong>10 วัน/เดือน</strong> ต่อคน (บล็อกอัตโนมัติ แอดมิน force ข้ามได้)
        </div>
      </div>

      <LeavePolicyCard />

      <BonusReviewCard />

      {/* ── สูตรพักร้อนตามอายุงาน ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Sliders size={15} /></div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>สูตรพักร้อนตามอายุงาน (ต่อตำแหน่ง)</div>
          <InfoTooltip size="md" title="นโยบายพักร้อนตามอายุงาน" width={320} content={
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              <li>ตั้งสูตรพักร้อนที่เพิ่มอัตโนมัติตามอายุงานของแต่ละตำแหน่ง เลือกว่าวันหยุดบริษัทที่มาทำงานจะให้เป็นวันชดเชยหรือพักร้อน และรันโบนัส/reset ประจำปีด้วยมือได้ครบในหน้านี้</li>
              <li>ตำแหน่งที่ไม่ตั้งค่า (เว้นว่างช่อง "ครบ 1 ปี") จะไม่มีสิทธิ์พักร้อนตามอายุงาน</li>
            </ul>
          } />
        </div>
        <div style={{ fontSize: '0.76rem', color: '#94a3b8', marginBottom: 12, marginLeft: 42 }}>
          {configuredCount}/{positions.length} ตำแหน่งตั้งค่าแล้ว — ตำแหน่งที่ไม่ตั้งค่า (เว้นว่าง) จะไม่มีสิทธิ์พักร้อนตามอายุงาน
        </div>
        {loadingPos ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 560, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>ตำแหน่ง</th>
                  <th style={th}>แผนก</th>
                  <th style={th}>ครบ 1 ปี (วัน)</th>
                  <th style={th}>เพิ่มครั้งละ (วัน)</th>
                  <th style={th}>ทุกๆ (ปี)</th>
                  <th style={th}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ตัวอย่าง
                      <InfoTooltip width={260} content="คำนวณวันพักร้อนสะสม ณ ปีที่ 1 / 3 / 5 จากสูตรที่ตั้งไว้ ให้ดูตัวอย่างก่อนกดบันทึกจริง" />
                    </span>
                  </th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {positions.map(p => {
                  const e = editOf(p)
                  const preview = previewText(e.base.trim() === '' ? null : parseInt(e.base), e.incDays.trim() === '' ? null : parseInt(e.incDays), e.incYears.trim() === '' ? null : parseInt(e.incYears))
                  return (
                    <tr key={p.id}>
                      <td style={{ ...td, fontWeight: 700, color: '#111827' }}>{p.name}</td>
                      <td style={{ ...td, color: '#64748b' }}>{p.department?.name ?? '—'}</td>
                      <td style={td}><input type="number" min={0} placeholder="—" style={numInput} value={e.base} onChange={ev => setEdit(p.id, { base: ev.target.value })} /></td>
                      <td style={td}><input type="number" min={0} placeholder="1" style={numInput} value={e.incDays} onChange={ev => setEdit(p.id, { incDays: ev.target.value })} /></td>
                      <td style={td}><input type="number" min={1} placeholder="2" style={numInput} value={e.incYears} onChange={ev => setEdit(p.id, { incYears: ev.target.value })} /></td>
                      <td style={{ ...td, color: '#0369a1', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>{preview ?? <span style={{ color: '#cbd5e1' }}>ไม่มีสิทธิ์</span>}</td>
                      <td style={td}>
                        <button onClick={() => savePosition(p)} disabled={savePositionMutation.isPending}
                          style={{ padding: '4px 10px', borderRadius: 6, border: 'none', background: '#244B83', color: '#fff', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                          บันทึก
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── วันหยุดที่ให้พักร้อน/ชดเชย ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Gift size={15} /></div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>มาทำงานวันหยุดบริษัท — ให้อะไร</div>
          </div>
          <button onClick={() => navigate('/leave?tab=holiday')}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', fontSize: '0.76rem', color: '#374151', cursor: 'pointer' }}>
            จัดการวันหยุดเต็มรูปแบบ <ExternalLink size={11} />
          </button>
        </div>
        {loadingHol ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : holidays.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีวันหยุดปีนี้</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 420, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={th}>วันหยุด</th>
                  <th style={th}>วัน</th>
                  <th style={th}>ให้เป็น</th>
                </tr>
              </thead>
              <tbody>
                {[...holidays].sort((a, b) => a.date.localeCompare(b.date)).map(h => (
                  <tr key={h.id}>
                    <td style={{ ...td, fontWeight: 600, color: '#111827' }}>{h.name}</td>
                    <td style={{ ...td, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(h.date).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} · {h.compensate_days ?? 1} วัน</td>
                    <td style={td}>
                      <select value={h.compensate_leave_type ?? 'COMPENSATE'} onChange={e => saveHolidayTypeMutation.mutate({ id: h.id, type: e.target.value })}
                        style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: '0.78rem', fontFamily: 'inherit', background: '#fff', cursor: 'pointer' }}>
                        <option value="COMPENSATE">ชดเชย</option>
                        <option value="VACATION">พักร้อน</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── โบนัส/reset + รายงานคงเหลือ ── */}
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}><Users size={15} /></div>
          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>โบนัสรายเดือน & Reset ประจำปี</div>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>
          ระบบรันให้อัตโนมัติทุกเดือน/ทุกปีอยู่แล้ว (cron) — ปุ่มนี้ไว้รันด้วยมือเผื่อพลาดรอบ หรืออยากดูผลทันที
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
          <button onClick={() => runBonusMutation.mutate()} disabled={runBonusMutation.isPending}
            style={{ padding: '9px 16px', borderRadius: 9, border: '1.5px solid #fcd34d', background: '#fef3c7', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#d97706', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {runBonusMutation.isPending ? 'กำลังรัน...' : 'รันโบนัส "หยุดไม่ครบโควต้า" เดือนที่แล้ว'}
          </button>
          <button onClick={() => setConfirmReset(true)} disabled={runResetMutation.isPending}
            style={{ padding: '9px 16px', borderRadius: 9, border: 'none', background: '#d97706', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RefreshCw size={14} /> {runResetMutation.isPending ? 'กำลังรัน...' : `รัน reset พักร้อนประจำปี ${currentYear + 543}`}
          </button>
        </div>

        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
          พักร้อนคงเหลือปี {currentYear - 1 + 543} (ขายคืนบริษัทได้สูงสุด 10 วัน — HR คิดจ่ายนอกระบบ)
        </div>
        {loadingRemaining ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>กำลังโหลด...</div>
        ) : remainingReport.length === 0 ? (
          <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>ยังไม่มีข้อมูลพักร้อนปี {currentYear - 1 + 543}</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 480, borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  <th style={th}>พนักงาน</th>
                  <th style={th}>ตำแหน่ง</th>
                  <th style={{ ...th, textAlign: 'right' }}>โควต้า</th>
                  <th style={{ ...th, textAlign: 'right' }}>ใช้ไป</th>
                  <th style={{ ...th, textAlign: 'right' }}>คงเหลือ</th>
                  <th style={{ ...th, textAlign: 'right' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
                      ขายคืนได้
                      <InfoTooltip width={260} content="พักร้อนคงเหลือของปีก่อนที่ขายคืนบริษัทเป็นเงินได้ สูงสุด 10 วัน/คน — HR เป็นคนคิดจ่ายนอกระบบ" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {remainingReport.map(row => (
                  <tr key={row.employee_id}>
                    <td style={td}>{row.full_name}{row.nickname ? ` (${row.nickname})` : ''}</td>
                    <td style={{ ...td, color: '#64748b' }}>{row.position_name ?? '—'}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.total_days}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{row.used_days}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>{row.remaining}</td>
                    <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: row.sellable > 0 ? '#d97706' : '#94a3b8', fontWeight: 700 }}>{row.sellable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {confirmReset && (
          <ConfirmDialog
            variant="warning"
            title={`รัน reset พักร้อนประจำปี ${currentYear + 543}?`}
            message="ระบบจะตั้งวันพักร้อนของพนักงานทุกคนที่มีสิทธิ์ใหม่ตามสูตรอายุงาน (ไม่ยกยอดจากปีก่อน) — คนที่ตำแหน่งยังไม่ได้ตั้งค่าโปรแกรมพักร้อนจะไม่ถูกแตะ"
            confirmLabel="ยืนยันรัน"
            onConfirm={() => { setConfirmReset(false); runResetMutation.mutate() }}
            onCancel={() => setConfirmReset(false)}
          />
        )}
      </div>
    </div>
  )
}
