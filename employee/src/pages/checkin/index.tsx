// employee/src/pages/checkin/index.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, liffLogin } from '../../lib/axios'
import { initLiff } from '../../lib/liff'
import liff from '@line/liff'

type GpsStatus = 'requesting' | 'ok' | 'denied'

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

// ── helpers ──────────────────────────────────────────────────────────────────

function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { text: 'สวัสดีตอนเช้า', emoji: '🌅' }
  if (h >= 12 && h < 18) return { text: 'สวัสดีตอนบ่าย', emoji: '☀️' }
  return { text: 'สวัสดีตอนเย็น', emoji: '🌙' }
}
function formatThaiDate(d: Date) {
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function fmtHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}

async function requestGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

function parseQrParams() {
  const params = new URLSearchParams(window.location.search)
  let search = window.location.search
  const s = params.get('liff.state')
  if (s) { try { search = decodeURIComponent(s) } catch { /* ignore */ } }
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return {
    mode:     p.get('mode'),
    branchId: p.get('branchId') ?? p.get('branch_id'),
  }
}

// ── LocationGate ──────────────────────────────────────────────────────────────
function LocationGate({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>📍</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>ต้องการอนุญาต Location</div>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
        ระบบต้องใช้ตำแหน่งเพื่อยืนยันว่าอยู่ในพื้นที่<br />กรุณากด <strong>อนุญาต</strong> Location
      </div>
      <button onClick={onRetry} style={{ padding: '14px 32px', borderRadius: 99, border: 'none', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
        อนุญาต Location
      </button>
    </div>
  )
}

// ── Popup ผลเช็คอิน ────────────────────────────────────────────────────────────
function CheckInPopup({ result, onClose }: { result: CheckInResult; onClose: () => void }) {
  const statusCfg = [
    { color: '#16a34a', bg: '#dcfce7', border: '#86efac', icon: '✅', label: 'มาทำงานปกติ' },
    { color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: '⚠️', label: 'มาสายระดับ 1' },
    { color: '#dc2626', bg: '#fee2e2', border: '#fca5a5', icon: '🚨', label: 'มาสายระดับ 2' },
  ][result.late_level]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: '0 0 0 0' }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 430, padding: '28px 24px 40px', boxShadow: '0 -8px 40px rgba(0,0,0,0.2)' }}
        onClick={e => e.stopPropagation()}>

        {/* Status badge */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: statusCfg.bg, border: `2px solid ${statusCfg.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: 10 }}>
            {statusCfg.icon}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.15rem', color: statusCfg.color }}>{statusCfg.label}</div>
          {result.late_minutes > 0 && (
            <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>สาย {result.late_minutes} นาที</div>
          )}
        </div>

        {/* Info rows */}
        <div style={{ background: '#f9fafb', borderRadius: 14, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <InfoRow icon="🕐" label="เวลาเช็คอิน" value={fmtHHMM(result.record.check_in_at) + ' น.'} bold />
          <InfoRow icon="🏢" label="สาขา"        value={result.branch.name} />
          <InfoRow icon="📋" label="กะ"           value={`${result.shift.name} (เริ่ม ${result.shift.start_time})`} />
          {result.is_outside_area && (
            <InfoRow icon="📍" label="พื้นที่" value="นอกรัศมีสาขา" valueColor="#d97706" />
          )}
        </div>

        {/* ค่าปรับ */}
        {result.fine > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: '0.88rem', color: '#dc2626', fontWeight: 600 }}>💸 ค่าปรับ</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
              {result.fine.toLocaleString('th-TH')} บาท
            </div>
          </div>
        )}

        <button onClick={onClose} style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
          รับทราบ
        </button>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value, bold, valueColor }: { icon: string; label: string; value: string; bold?: boolean; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ fontSize: '0.82rem', color: '#6b7280' }}>{icon} {label}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: bold ? 800 : 600, color: valueColor ?? '#111827' }}>{value}</span>
    </div>
  )
}

// ── Clock ────────────────────────────────────────────────────────────────────
function ClockDisplay() {
  const [now, setNow] = useState(new Date())
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const { text, emoji } = getGreeting()
  return (
    <div className="header-strip animate-fade-in" style={{ textAlign: 'center', padding: '32px 20px 20px' }}>
      <div style={{ width: 40, height: 4, borderRadius: 99, background: 'linear-gradient(90deg, var(--accent-start), var(--accent-end))', margin: '0 auto 14px' }} />
      <div style={{ fontSize: '1.7rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.4px' }}>{text} {emoji}</div>
      <div style={{ marginTop: 6, color: 'var(--text-secondary)', fontSize: '0.82rem', fontWeight: 500 }}>{formatThaiDate(now)}</div>
      <div style={{ marginTop: 6, fontVariantNumeric: 'tabular-nums', fontSize: '2rem', fontWeight: 700, letterSpacing: '2px', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
        {formatTime(now)}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const navigate    = useNavigate()
  const [employee,   setEmployee]   = useState<EmployeeInfo | null>(null)
  const [initError,  setInitError]  = useState<string | null>(null)
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null)
  const [booting,    setBooting]    = useState(true)
  const [gpsStatus,  setGpsStatus]  = useState<GpsStatus>('requesting')
  const [gpsCoords,  setGpsCoords]  = useState<{ lat: number; lng: number } | null>(null)
  const [scanning,   setScanning]   = useState(false)
  const [qrMode,     setQrMode]     = useState(false)
  const [popup,      setPopup]      = useState<CheckInResult | null>(null)
  const autoRef = useRef(false)

  const askGPS = useCallback(async () => {
    setGpsStatus('requesting')
    const c = await requestGPS()
    if (c) { setGpsCoords(c); setGpsStatus('ok') }
    else setGpsStatus('denied')
  }, [])

  // ── Boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const { mode, branchId } = parseQrParams()
    if (mode === 'qr' && branchId) setQrMode(true)

    ;(async () => {
      try { await initLiff() } catch (e: any) {
        setInitError(`LIFF init ล้มเหลว: ${e?.message ?? e}`)
        setBooting(false); return
      }
      try { await liffLogin() } catch (e: any) {
        const code = e?.response?.data?.error?.code ?? e?.message
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(e?.response?.data?.error?.message ?? e?.message)
        setBooting(false); return
      }
      try {
        const res = await api.get('/employee/me')
        setEmployee(res.data.data.employee)
      } catch (e: any) {
        if (e?.response?.data?.error?.code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(e?.response?.data?.error?.message ?? e?.message)
      } finally { setBooting(false) }
    })()
  }, [])

  useEffect(() => { if (!booting) askGPS() }, [booting])

  // ── Auto check-in จาก QR URL ──────────────────────────────────────────────
  useEffect(() => {
    if (autoRef.current || booting || gpsStatus !== 'ok' || !gpsCoords || !employee) return
    const { mode, branchId } = parseQrParams()
    if (mode !== 'qr' || !branchId) return
    autoRef.current = true
    doCheckIn(branchId, gpsCoords)
  }, [booting, gpsStatus, gpsCoords, employee])

  // ── Core check-in ─────────────────────────────────────────────────────────
  const doCheckIn = useCallback(async (branchId: string, coords: { lat: number; lng: number }) => {
    if (!employee) return
    setErrorMsg(null)
    try {
      const res = await api.post('/employee/attendance/check-in-auto', {
        employee_id: employee.id,
        branch_id:   branchId,
        gps_lat:     coords.lat,
        gps_lng:     coords.lng,
      })
      setPopup(res.data.data as CheckInResult)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      const msgMap: Record<string, string> = {
        NO_SHIFT_AVAILABLE: 'ไม่มีกะที่เปิดรับในเวลานี้\nอาจเลยเวลาที่กำหนดแล้ว',
        OUTSIDE_GEOFENCE:   'คุณอยู่นอกพื้นที่สาขา\nกรุณาเข้ามาในบริเวณสาขาก่อน',
        BRANCH_NOT_FOUND:   'ไม่พบสาขานี้ในระบบ',
        ALREADY_CHECKED_IN: 'เช็คอินกะนี้ไปแล้ว',
      }
      setErrorMsg(msgMap[code] ?? err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
    }
  }, [employee])

  // ── Scan QR button ────────────────────────────────────────────────────────
  const handleScan = useCallback(async () => {
    if (!employee || gpsStatus !== 'ok' || !gpsCoords) {
      setErrorMsg('กรุณาอนุญาต Location ก่อนสแกน')
      return
    }
    setScanning(true)
    setErrorMsg(null)
    try {
      const result = await liff.scanCodeV2()
      const raw = result?.value ?? ''

      let branchId: string | null = null
      try {
        const url = new URL(raw)
        branchId = url.searchParams.get('branchId') ?? url.searchParams.get('branch_id')
      } catch {
        branchId = new URLSearchParams(raw).get('branchId')
      }

      if (!branchId) { setErrorMsg('QR นี้ไม่ใช่ QR เช็คอิน'); return }
      await doCheckIn(branchId, gpsCoords)
    } catch (e: any) {
      if (e?.code !== 'FORBIDDEN') setErrorMsg('ยกเลิกการสแกน')
    } finally { setScanning(false) }
  }, [employee, gpsStatus, gpsCoords, doCheckIn])

  // ── Renders ───────────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  if (gpsStatus === 'denied') return <LocationGate onRetry={askGPS} />

  const btnReady = !scanning && !!employee && gpsStatus === 'ok'

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <ClockDisplay />

      {/* GPS bar */}
      {gpsStatus === 'requesting' && (
        <div style={{ margin: '8px 16px 0', padding: '10px 14px', borderRadius: 12, background: 'rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="animate-spin" style={{ fontSize: '0.9rem' }}>⏳</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>กำลังดึงตำแหน่ง…</span>
        </div>
      )}

      {/* Employee card */}
      <div style={{ margin: '16px 16px 0' }}>
        {employee ? (
          <div className="glass-card animate-slide-up" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                {employee.first_name.charAt(0)}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>{employee.first_name} {employee.last_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{employee.employee_code} · {employee.branch.name}</div>
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="animate-dot-blink" style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success)', display: 'inline-block' }} />พร้อม
              </span>
            </div>
          </div>
        ) : (
          <div className="glass-card" style={{ padding: 16 }}>
            <div style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.88rem' }}>⚠️ {initError ?? 'ไม่พบข้อมูลพนักงาน'}</div>
          </div>
        )}
      </div>

      {/* QR auto mode indicator */}
      {qrMode && !popup && (
        <div style={{ margin: '24px 16px 0', padding: '20px', borderRadius: 16, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📱</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>กำลังเช็คอินด้วย QR…</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {gpsStatus === 'requesting' ? 'กำลังตรวจสอบตำแหน่ง…' : 'กำลังบันทึก…'}
          </div>
        </div>
      )}

      {/* Scan button */}
      {!qrMode && (
        <div style={{ margin: '32px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 164, height: 164, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {btnReady && !popup && (
              <>
                <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
                <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
              </>
            )}
            <button type="button" onClick={handleScan} disabled={!btnReady}
              style={{
                width: 156, height: 156, borderRadius: '50%', border: 'none',
                cursor: btnReady ? 'pointer' : 'not-allowed',
                background: popup
                  ? 'linear-gradient(145deg, #16a34a, #15803d)'
                  : (!btnReady ? 'rgba(0,0,0,0.08)' : 'linear-gradient(145deg, var(--accent-start), var(--accent-mid), var(--accent-end))'),
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                boxShadow: btnReady && !popup ? '0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)' : '0 4px 16px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s', position: 'relative', zIndex: 1,
              }}
              onTouchStart={e => { if (btnReady) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
              onTouchEnd={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
              {scanning ? <span className="animate-spin" style={{ fontSize: '2.4rem' }}>⏳</span>
                : popup ? <span style={{ fontSize: '2.4rem' }}>✅</span>
                : <span style={{ fontSize: '2.6rem' }}>📷</span>}
            </button>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: popup ? 'var(--success)' : (!btnReady ? 'var(--text-muted)' : 'var(--accent-start)') }}>
            {scanning ? 'กำลังสแกน…' : popup ? 'บันทึกแล้ว!' : 'กดเพื่อสแกน QR เช็คอิน'}
          </div>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16, background: 'var(--error-bg)', border: '1px solid var(--error-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>⚠️</span>
          <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'pre-line' }}>{errorMsg}</span>
        </div>
      )}

      {/* Popup ผลเช็คอิน */}
      {popup && <CheckInPopup result={popup} onClose={() => setPopup(null)} />}
    </div>
  )
}
