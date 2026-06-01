// employee/src/pages/checkin/index.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, liffLogin } from '../../lib/axios'
import { initLiff } from '../../lib/liff'
import liff from '@line/liff'

type ButtonState = 'idle' | 'loading' | 'success' | 'error'
type GpsStatus   = 'requesting' | 'ok' | 'denied'

interface EmployeeInfo {
  id: string; first_name: string; last_name: string
  employee_code: string; branch: { id: string; name: string }
}
interface ShiftInfo {
  id: string; name: string; start_time: string; end_time: string
  late_threshold_1: string | null; late_threshold_2: string | null
}

function getGreeting(): { text: string; emoji: string } {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { text: 'สวัสดีตอนเช้า', emoji: '🌅' }
  if (h >= 12 && h < 18) return { text: 'สวัสดีตอนบ่าย', emoji: '☀️' }
  return { text: 'สวัสดีตอนเย็น', emoji: '🌙' }
}
function formatThaiDate(d: Date): string {
  const days   = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
  const months = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
  return `วัน${days[d.getDay()]}ที่ ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

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

function CheckInButton({ state, disabled, onClick }: { state: ButtonState; disabled: boolean; onClick: () => void }) {
  const getInner = () => {
    if (state === 'loading') return <span className="animate-spin" style={{ fontSize: '2rem', display: 'block' }}>⏳</span>
    if (state === 'success') return <span className="animate-success-pop" style={{ fontSize: '2.4rem', display: 'block' }}>✅</span>
    if (state === 'error')   return <span style={{ fontSize: '2.4rem', display: 'block' }}>❌</span>
    return <span style={{ fontSize: '2.6rem', display: 'block' }}>⏰</span>
  }
  const getLabel = () => ({ loading: 'กำลังบันทึก…', success: 'บันทึกแล้ว!', error: 'ลองอีกครั้ง', idle: 'แตะเพื่อเช็คอิน' }[state])
  const isReady = state === 'idle' && !disabled

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '16px 0 8px' }}>
      <div style={{ position: 'relative', width: 164, height: 164, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {isReady && (
          <>
            <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
            <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
          </>
        )}
        <button type="button" disabled={disabled || state === 'loading'} onClick={onClick}
          style={{ width: 156, height: 156, borderRadius: '50%', border: 'none', cursor: disabled || state === 'loading' ? 'not-allowed' : 'pointer', background: disabled ? 'rgba(0,0,0,0.08)' : 'linear-gradient(145deg, var(--accent-start), var(--accent-mid), var(--accent-end))', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: isReady ? '0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)' : '0 4px 16px rgba(0,0,0,0.1)', transition: 'transform 0.15s', position: 'relative', zIndex: 1 }}
          onMouseDown={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
          onTouchStart={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
          onTouchEnd={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}>
          {getInner()}
        </button>
      </div>
      <div style={{ fontSize: '1rem', fontWeight: 700, color: disabled ? 'var(--text-muted)' : 'var(--accent-start)', letterSpacing: '0.2px' }}>
        {getLabel()}
      </div>
    </div>
  )
}

// ── หน้า "กรุณาอนุญาต Location" ─────────────────────────────────────────────
function LocationGate({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>📍</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
        ต้องการอนุญาต Location
      </div>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
        ระบบต้องใช้ตำแหน่งของคุณเพื่อยืนยันว่าคุณอยู่ในพื้นที่ก่อนเช็คอิน
        <br /><br />
        กรุณากดปุ่มด้านล่างและ <strong>อนุญาต</strong> การเข้าถึง Location
      </div>
      <button onClick={onRetry}
        style={{ padding: '14px 32px', borderRadius: 99, border: 'none', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
        อนุญาต Location
      </button>
      <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
        หากไม่อนุญาต จะไม่สามารถเช็คอินได้
      </div>
    </div>
  )
}

async function requestGPS(): Promise<{ lat: number; lng: number } | null> {
  return new Promise(resolve => {
    if (!navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      ()  => resolve(null),
      { enableHighAccuracy: true, timeout: 10000 },
    )
  })
}

// parse URL params รองรับทั้ง ?mode=qr&branchId=xxx และ liff.state
function parseQrParams(): { mode: string | null; branchId: string | null; shiftId: string | null } {
  const params = new URLSearchParams(window.location.search)
  // LIFF อาจ encode query string ไว้ใน liff.state
  let search = window.location.search
  const liffState = params.get('liff.state')
  if (liffState) {
    try { search = decodeURIComponent(liffState) } catch { /* ignore */ }
  }
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return {
    mode:     p.get('mode'),
    branchId: p.get('branchId') ?? p.get('branch_id'),
    shiftId:  p.get('shiftId')  ?? p.get('shift_id'),
  }
}

export default function CheckinPage() {
  const navigate = useNavigate()
  const [employee,      setEmployee]      = useState<EmployeeInfo | null>(null)
  const [shifts,        setShifts]        = useState<ShiftInfo[]>([])
  const [selectedShift, setSelected]      = useState<ShiftInfo | null>(null)
  const [btnState,      setBtnState]      = useState<ButtonState>('idle')
  const [initError,     setInitError]     = useState<string | null>(null)
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)
  const [checkedInAt,   setCheckedInAt]   = useState<string | null>(null)
  const [booting,       setBooting]       = useState(true)
  const [gpsStatus,     setGpsStatus]     = useState<GpsStatus>('requesting')
  const [gpsCoords,     setGpsCoords]     = useState<{ lat: number; lng: number } | null>(null)
  const [isOutsideArea, setIsOutsideArea] = useState(false)
  const [qrScanning,    setQrScanning]    = useState(false)
  const [qrMode,        setQrMode]        = useState(false)      // เปิดมาจาก QR scan URL
  const autoCheckedIn = useRef(false)

  // ── ขอ GPS ─────────────────────────────────────────────────────────────────
  const askGPS = useCallback(async () => {
    setGpsStatus('requesting')
    const coords = await requestGPS()
    if (coords) {
      setGpsCoords(coords)
      setGpsStatus('ok')
    } else {
      setGpsStatus('denied')
    }
  }, [])

  // ── Boot: LIFF init → login → load employee ────────────────────────────────
  useEffect(() => {
    ;(async () => {
      // ตรวจ QR mode ก่อน
      const { mode, branchId, shiftId } = parseQrParams()
      if (mode === 'qr' && branchId && shiftId) setQrMode(true)

      try {
        await initLiff()
      } catch (e: any) {
        setInitError(`LIFF init ล้มเหลว: ${e?.message ?? e}`)
        setBooting(false)
        return
      }

      try {
        await liffLogin()
      } catch (e: any) {
        const code = e?.response?.data?.error?.code ?? e?.message
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        else if (code === 'INVALID_CHANNEL') setInitError('ไม่พบการตั้งค่า Line สำหรับ tenant นี้')
        else if (code === 'NOT_LOGGED_IN')   setInitError('กรุณาเปิดผ่าน LINE app เท่านั้น')
        else setInitError(`ยืนยันตัวตนไม่สำเร็จ: ${e?.response?.data?.error?.message ?? e?.message}`)
        setBooting(false)
        return
      }

      try {
        const meRes = await api.get('/employee/me')
        const { employee: emp, shifts: sh } = meRes.data.data
        setEmployee(emp)
        setShifts(sh)
        if (sh.length === 1) setSelected(sh[0])
      } catch (e: any) {
        const code = e?.response?.data?.error?.code
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(`โหลดข้อมูลไม่สำเร็จ: ${e?.response?.data?.error?.message ?? e?.message}`)
      } finally { setBooting(false) }
    })()
  }, [])

  // ── ขอ GPS หลัง boot ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!booting) askGPS()
  }, [booting])

  // ── Auto check-in เมื่อเปิดจาก QR URL ────────────────────────────────────
  useEffect(() => {
    if (autoCheckedIn.current) return
    if (booting || gpsStatus !== 'ok' || !gpsCoords || !employee) return

    const { mode, branchId, shiftId } = parseQrParams()
    if (mode !== 'qr' || !branchId || !shiftId) return

    autoCheckedIn.current = true
    doQrCheckIn(branchId, shiftId, gpsCoords)
  }, [booting, gpsStatus, gpsCoords, employee])

  // ── Normal check-in ────────────────────────────────────────────────────────
  const handleCheckIn = useCallback(async () => {
    if (!employee || !selectedShift || btnState === 'loading') return
    if (gpsStatus !== 'ok') { setErrorMsg('กรุณาอนุญาต Location ก่อนเช็คอิน'); return }

    setBtnState('loading')
    setSuccessMsg(null)
    setErrorMsg(null)
    setIsOutsideArea(false)

    try {
      const res = await api.post('/employee/attendance/check-in', {
        employee_id: employee.id,
        shift_id:    selectedShift.id,
        branch_id:   employee.branch.id,
        gps_lat:     gpsCoords?.lat,
        gps_lng:     gpsCoords?.lng,
      })
      const record = res.data?.data
      const time   = record?.check_in_at ?? new Date().toISOString()
      setCheckedInAt(time)
      setBtnState('success')
      if (record?.is_outside_area) setIsOutsideArea(true)
      const t = new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
      setSuccessMsg(`เช็คอินเรียบร้อย 🎉  เวลา ${t} น.${record?.is_outside_area ? '\n⚠️ บันทึกไว้ว่าอยู่นอกพื้นที่' : ''}`)
      setTimeout(() => setBtnState('idle'), 4000)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'ALREADY_CHECKED_IN') {
        setErrorMsg('เช็คอินในกะนี้แล้ว')
        setBtnState('success')
      } else if (code === 'OUTSIDE_GEOFENCE') {
        setErrorMsg('คุณอยู่นอกพื้นที่ — สาขานี้บล็อคการเช็คอินนอกพื้นที่\nกรุณาสแกน QR ที่สาขาแทน')
        setBtnState('error')
      } else {
        setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
        setBtnState('error')
      }
      setTimeout(() => setBtnState('idle'), 4000)
    }
  }, [employee, selectedShift, btnState, gpsStatus, gpsCoords])

  // ── QR check-in (ใช้ร่วมกัน ทั้ง scan button และ auto mode) ───────────────
  const doQrCheckIn = useCallback(async (branchId: string, shiftId: string, coords: { lat: number; lng: number }) => {
    if (!employee) return
    setBtnState('loading')
    setSuccessMsg(null)
    setErrorMsg(null)

    try {
      const res = await api.post('/employee/attendance/check-in-qr', {
        employee_id: employee.id,
        shift_id:    shiftId,
        branch_id:   branchId,
        gps_lat:     coords.lat,
        gps_lng:     coords.lng,
      })
      const time = res.data?.data?.check_in_at ?? new Date().toISOString()
      setCheckedInAt(time)
      setBtnState('success')
      const t = new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
      setSuccessMsg(`เช็คอิน (QR) สำเร็จ 🎉  เวลา ${t} น.`)
      setTimeout(() => setBtnState('idle'), 4000)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'OUTSIDE_GEOFENCE')   setErrorMsg('คุณอยู่นอกพื้นที่ — QR นี้ใช้ได้เฉพาะในสาขาเท่านั้น')
      else if (code === 'ALREADY_CHECKED_IN') { setErrorMsg('เช็คอินในกะนี้แล้ว'); setBtnState('success'); return }
      else setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
      setBtnState('error')
      setTimeout(() => setBtnState('idle'), 4000)
    }
  }, [employee])

  // ── สแกน QR ด้วย liff.scanCodeV2() ─────────────────────────────────────────
  const handleScanQR = useCallback(async () => {
    if (!employee) return
    if (gpsStatus !== 'ok' || !gpsCoords) {
      setErrorMsg('กรุณาอนุญาต Location ก่อนสแกน QR')
      return
    }

    setQrScanning(true)
    setErrorMsg(null)

    try {
      const result = await liff.scanCodeV2()
      const raw = result?.value ?? ''

      // parse URL จาก QR: https://liff.line.me/xxx?mode=qr&branchId=xxx&shiftId=xxx
      let branchId: string | null = null
      let shiftId:  string | null = null
      try {
        const url    = new URL(raw)
        branchId = url.searchParams.get('branchId') ?? url.searchParams.get('branch_id')
        shiftId  = url.searchParams.get('shiftId')  ?? url.searchParams.get('shift_id')
      } catch {
        // fallback: raw อาจเป็น JSON หรือ query string เปล่า
        const p = new URLSearchParams(raw)
        branchId = p.get('branchId')
        shiftId  = p.get('shiftId')
      }

      if (!branchId || !shiftId) {
        setErrorMsg('QR นี้ไม่ใช่ QR เช็คอิน — กรุณาสแกนใหม่')
        return
      }

      await doQrCheckIn(branchId, shiftId, gpsCoords)
    } catch (e: any) {
      if (e?.code !== 'FORBIDDEN') {
        setErrorMsg('ยกเลิกการสแกน')
      }
    } finally {
      setQrScanning(false)
    }
  }, [employee, gpsStatus, gpsCoords, doQrCheckIn])

  // ── Render: loading ────────────────────────────────────────────────────────
  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  // ── Render: Location gate ─────────────────────────────────────────────────
  if (gpsStatus === 'denied') {
    return <LocationGate onRetry={askGPS} />
  }

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <ClockDisplay />

      {/* GPS status bar */}
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

      {/* Shift selector — แสดงถ้าไม่ใช่ QR mode และมีหลายกะ */}
      {!qrMode && shifts.length > 1 && (
        <div style={{ margin: '12px 16px 0' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>เลือกกะ</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shifts.map(s => (
              <button key={s.id} onClick={() => setSelected(s)}
                style={{ padding: '12px 14px', borderRadius: 12, border: `2px solid ${selectedShift?.id === s.id ? 'var(--accent-start)' : 'rgba(0,0,0,0.08)'}`, background: selectedShift?.id === s.id ? 'rgba(255,107,53,0.08)' : '#fff', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{s.name}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{s.start_time} – {s.end_time}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* กะเดียว */}
      {!qrMode && shifts.length === 1 && selectedShift && (
        <div style={{ margin: '12px 16px 0' }}>
          <div className="glass-card" style={{ padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{selectedShift.name}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{selectedShift.start_time} – {selectedShift.end_time}</div>
          </div>
        </div>
      )}

      {/* QR mode — auto check-in กำลังทำงาน */}
      {qrMode && (
        <div style={{ margin: '24px 16px 0', padding: '20px', borderRadius: 16, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📱</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>เช็คอินด้วย QR</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {gpsStatus === 'requesting' ? 'กำลังตรวจสอบตำแหน่ง…' : 'กำลังบันทึก…'}
          </div>
        </div>
      )}

      {/* Check-in button — ซ่อนถ้าเป็น QR auto mode */}
      {!qrMode && (
        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <CheckInButton
            state={btnState}
            disabled={!employee || !selectedShift || gpsStatus !== 'ok'}
            onClick={handleCheckIn}
          />
        </div>
      )}

      {/* ปุ่มสแกน QR */}
      {!qrMode && (
        <div style={{ padding: '0 16px', marginBottom: 12 }}>
          <button
            onClick={handleScanQR}
            disabled={qrScanning || !employee || gpsStatus !== 'ok'}
            style={{
              width: '100%', padding: '13px', borderRadius: 14,
              border: '2px solid rgba(255,107,53,0.3)',
              background: qrScanning ? 'rgba(255,107,53,0.05)' : '#fff',
              cursor: (qrScanning || !employee || gpsStatus !== 'ok') ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              color: 'var(--accent-start)', fontWeight: 700, fontSize: '0.95rem',
              transition: 'background 0.15s',
            }}>
            {qrScanning
              ? <><span className="animate-spin">⏳</span> กำลังสแกน…</>
              : <><span>📷</span> สแกน QR เช็คอิน</>
            }
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, padding: '0 16px', marginBottom: 16 }}>
        {[
          { icon: '🕐', label: 'เช็คอินล่าสุด', value: checkedInAt ? new Date(checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—' },
          { icon: '📋', label: 'กะวันนี้', value: qrMode ? 'QR' : (selectedShift?.name ?? '—') },
          { icon: isOutsideArea ? '⚠️' : '✅', label: 'สถานะ', value: checkedInAt ? (isOutsideArea ? 'นอกพื้นที่' : 'บันทึกแล้ว') : '—' },
        ].map(s => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.35rem' }}>{s.icon}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 4, color: isOutsideArea && s.label === 'สถานะ' ? 'var(--warning, #f59e0b)' : 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {successMsg && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16, background: 'var(--success-bg)', border: '1px solid var(--success-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>✅</span>
          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'pre-line' }}>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div style={{ margin: '0 16px 12px', padding: '14px 16px', borderRadius: 16, background: 'var(--error-bg)', border: '1px solid var(--error-border)', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span>⚠️</span>
          <span style={{ color: 'var(--error)', fontWeight: 600, fontSize: '0.88rem', whiteSpace: 'pre-line' }}>{errorMsg}</span>
        </div>
      )}
    </div>
  )
}
