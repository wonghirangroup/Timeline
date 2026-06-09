// employee/src/pages/checkin/index.tsx  [MOCK MODE — FinWise layout]
import { useEffect, useState, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { COLOR } from '../../components/ui/tokens'

interface EmployeeInfo {
  id: string; first_name: string; last_name: string
  employee_code: string; branch: { id: string; name: string }
}
interface CheckInResult {
  record:          { check_in_at: string }
  shift:           { name: string; start_time: string }
  branch:          { name: string }
  late_level:      0 | 1 | 2
  late_minutes:    number
  fine:            number
  is_outside_area: boolean
}

const MOCK_EMPLOYEE: EmployeeInfo = {
  id: 'emp-001', first_name: 'สมชาย', last_name: 'ใจดี',
  employee_code: 'EMP001', branch: { id: 'b-001', name: 'สาขาสุขุมวิท' },
}

function mockCheckIn(): CheckInResult {
  const now = new Date()
  const h = now.getHours(), m = now.getMinutes()
  const late_minutes = h > 8 ? (h - 8) * 60 + m : h === 8 && m > 5 ? m - 5 : 0
  const late_level: 0|1|2 = late_minutes === 0 ? 0 : late_minutes <= 15 ? 1 : 2
  return {
    record: { check_in_at: now.toISOString() },
    shift: { name: 'กะเช้า', start_time: '08:00' },
    branch: { name: MOCK_EMPLOYEE.branch.name },
    late_level, late_minutes,
    fine: late_level === 1 ? 50 : late_level === 2 ? 200 : 0,
    is_outside_area: false,
  }
}

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { th: 'สวัสดีตอนเช้า', en: 'Good Morning' }
  if (h >= 12 && h < 18) return { th: 'สวัสดีตอนบ่าย', en: 'Good Afternoon' }
  return { th: 'สวัสดีตอนเย็น', en: 'Good Evening' }
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function fmtHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function formatThaiDate(d: Date) {
  const days  = ['อา','จ','อ','พ','พฤ','ศ','ส']
  const months= ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `วัน${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}

// ─── Bottom Sheet ─────────────────────────────────────────────────────────────
function CheckInSheet({ result, onClose }: { result: CheckInResult; onClose: () => void }) {
  const S = [
    { color: COLOR.success, bg: COLOR.successBg, border: COLOR.successBorder, label: 'มาทำงานปกติ', icon: '✅' },
    { color: COLOR.warning, bg: COLOR.warningBg, border: COLOR.warningBorder, label: 'มาสายระดับ 1', icon: '⚠️' },
    { color: COLOR.error,   bg: COLOR.errorBg,   border: COLOR.errorBorder,   label: 'มาสายระดับ 2', icon: '🚨' },
  ][result.late_level]

  const rows = [
    { label: 'เวลาเช็คอิน', value: fmtHHMM(result.record.check_in_at) + ' น.', bold: true },
    { label: 'สาขา',        value: result.branch.name },
    { label: 'กะ',          value: `${result.shift.name} (เริ่ม ${result.shift.start_time})` },
    ...(result.is_outside_area ? [{ label: 'พื้นที่', value: 'นอกรัศมีสาขา', bold: false }] : []),
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in"
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 40px', boxShadow: '0 -16px 48px rgba(0,0,0,0.12)' }}
        className="animate-slide-up"
        onClick={e => e.stopPropagation()}>
        {/* Pull handle */}
        <div style={{ width: 40, height: 5, borderRadius: 99, background: '#E5E7EB', margin: '0 auto 24px' }} />

        {/* Status */}
        <div className="animate-success-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: S.bg, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: 16, boxShadow: `0 8px 24px ${S.bg}` }}>{S.icon}</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: S.color }}>{S.label}</div>
          {result.late_minutes > 0 && <div style={{ fontSize: '0.85rem', color: COLOR.textMuted, marginTop: 4 }}>สาย {result.late_minutes} นาที</div>}
        </div>

        {/* Info rows */}
        <div style={{ borderRadius: 20, background: '#F8F9FA', border: '1px solid rgba(0,0,0,0.03)', padding: '8px 16px', marginBottom: 20 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === rows.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)' }}>
              <span style={{ fontSize: '0.85rem', color: COLOR.textSecondary }}>{r.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: r.bold ? 800 : 600, color: COLOR.textPrimary }}>{r.value}</span>
            </div>
          ))}
        </div>

        {result.fine > 0 && (
          <div style={{ background: COLOR.errorBg, border: `1px solid ${COLOR.errorBorder}`, borderRadius: 16, padding: '16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: COLOR.error, fontWeight: 700 }}>💸 ค่าปรับ</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: COLOR.error }}>{result.fine.toLocaleString('th-TH')} บาท</span>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '16px', borderRadius: 20, border: 'none', background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`, color: '#fff', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer', boxShadow: '0 8px 24px rgba(255, 94, 0, 0.25)', transition: 'transform 0.15s' }}>
          รับทราบ
        </button>
      </div>
    </div>
  )
}

// ─── Live clock display ───────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      <div style={{
        fontVariantNumeric: 'tabular-nums',
        fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.5px',
        background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        lineHeight: 1, marginBottom: 8,
        filter: 'drop-shadow(0 4px 12px rgba(255, 94, 0, 0.15))'
      }}>
        {formatTime(now)}
      </div>
      <div style={{ fontSize: '0.85rem', color: COLOR.textSecondary, letterSpacing: '0.5px', fontWeight: 500 }}>
        {formatThaiDate(now)}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const [scanning, setScanning] = useState(false)
  const [popup,    setPopup]    = useState<CheckInResult | null>(null)
  const employee = MOCK_EMPLOYEE
  const { th, en } = getGreeting()
  const ready = !scanning && !popup

  const handleScan = useCallback(async () => {
    setScanning(true)
    await new Promise(r => setTimeout(r, 900))
    setPopup(mockCheckIn())
    setScanning(false)
  }, [])

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ──────────────────────────────── */}
      <div className="app-header">
        {/* Top bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.65)', fontWeight: 500, marginBottom: 1 }}>TimeLine HR</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#fff' }}>{th}</div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>{en}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={18} color="#fff" strokeWidth={1.8} />
          </div>
        </div>

        {/* Stat row — กะ | สาขา */}
        <div className="header-stat-row">
          <div className="header-stat-col">
            <div className="header-stat-label">📋 กะงานวันนี้</div>
            <div className="header-stat-value">กะเช้า</div>
          </div>
          <div className="header-stat-col">
            <div className="header-stat-label">🏢 สาขา</div>
            <div className="header-stat-value">{employee.branch.name}</div>
          </div>
        </div>

        {/* Progress: เวลาเข้างาน → ออกงาน */}
        <div className="header-progress-wrap" style={{ marginTop: 16 }}>
          <div className="header-progress-fill" style={{ width: '45%' }}>
            <span className="header-progress-label">08:00</span>
          </div>
          <span className="header-progress-right">17:00 น.</span>
        </div>
        <div style={{ marginTop: 6, fontSize: '11px', color: 'rgba(255,255,255,0.65)', display: 'flex', alignItems: 'center', gap: 5 }}>
          ☑ เวลาเข้างาน 08:00 — ออกงาน 17:00 น.
        </div>
      </div>

      {/* ── White Content Panel ─────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* Mock badge */}
        <div style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', fontSize: '0.72rem', color: '#6366f1', fontWeight: 600, textAlign: 'center', marginBottom: 24 }}>
          🧪 MOCK MODE — ข้อมูลจำลอง ยังไม่ต่อ API จริง
        </div>

        {/* Employee info row */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff', flexShrink: 0, boxShadow: '0 4px 12px rgba(255, 94, 0, 0.2)' }}>
            {employee.first_name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary }}>{employee.first_name} {employee.last_name}</div>
            <div style={{ fontSize: '0.8rem', color: COLOR.info, marginTop: 2, fontWeight: 500 }}>{employee.employee_code} · {employee.branch.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: COLOR.success, background: COLOR.successBg, padding: '6px 12px', borderRadius: 99 }}>
            <span className="animate-dot-blink" style={{ width: 8, height: 8, borderRadius: '50%', background: COLOR.success, display: 'inline-block' }} />
            พร้อม
          </div>
        </div>

        {/* Clock */}
        <LiveClock />

        {/* Scan button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '40px 0 32px' }}>
          <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {ready && (
              <>
                <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})`, zIndex: 0 }} />
                <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${COLOR.primaryMid}, ${COLOR.primaryEnd})`, zIndex: 0 }} />
              </>
            )}
            <button
              type="button"
              onClick={handleScan}
              disabled={!ready}
              className={ready ? 'animate-float' : ''}
              style={{
                width: 172, height: 172, borderRadius: '50%', border: 'none',
                cursor: ready ? 'pointer' : 'not-allowed',
                background: popup
                  ? `linear-gradient(145deg, ${COLOR.success}, #059669)`
                  : `linear-gradient(145deg, ${COLOR.primary}, ${COLOR.primaryMid}, ${COLOR.primaryEnd})`,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: ready
                  ? `0 0 0 8px rgba(255, 94, 0, 0.1), inset 0 2px 4px rgba(255,255,255,0.4), 0 16px 32px rgba(255, 94, 0, 0.35)`
                  : '0 4px 16px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s, box-shadow 0.15s',
                position: 'relative', zIndex: 1,
              }}
            >
              <span style={{ fontSize: '3rem', lineHeight: 1, filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}>
                {scanning ? '⏳' : popup ? '✅' : '📷'}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '0.5px' }}>
                {scanning ? 'สแกนอยู่...' : popup ? 'สำเร็จ!' : 'สแกน QR'}
              </span>
            </button>
          </div>

          <div style={{ fontWeight: 800, fontSize: '1rem', color: popup ? COLOR.success : COLOR.primary, marginTop: 8 }}>
            {scanning ? 'กำลังประมวลผล…' : popup ? 'เช็คอินสำเร็จแล้ว!' : 'กดปุ่มเพื่อเช็คอิน'}
          </div>

          {!popup && !scanning && (
            <div style={{ fontSize: '0.8rem', color: COLOR.textMuted, textAlign: 'center', lineHeight: 1.6 }}>
              ระบบจะสแกน QR Code สาขาของคุณ<br />และบันทึกเวลาเข้างานอัตโนมัติ
            </div>
          )}
        </div>
      </div>

      {popup && <CheckInSheet result={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
