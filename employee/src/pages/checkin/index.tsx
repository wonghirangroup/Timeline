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

function LocationGate({ onRetry }: { onRetry: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#fff', zIndex: 100, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
      <div style={{ fontSize: '4rem', marginBottom: 16 }}>📍</div>
      <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>ต้องการอนุญาต Location</div>
      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
        ระบบต้องใช้ตำแหน่งของคุณเพื่อยืนยันว่าอยู่ในพื้นที่ก่อนเช็คอิน
        <br /><br />
        กรุณากดปุ่มด้านล่างและ <strong>อนุญาต</strong> การเข้าถึง Location
      </div>
      <button onClick={onRetry} style={{ padding: '14px 32px', borderRadius: 99, border: 'none', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))', color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer' }}>
        อนุญาต Location
      </button>
      <div style={{ marginTop: 16, fontSize: '0.78rem', color: 'var(--text-muted)' }}>หากไม่อนุญาต จะไม่สามารถเช็คอินได้</div>
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

function parseQrParams(): { mode: string | null; branchId: string | null; shiftId: string | null } {
  const params = new URLSearchParams(window.location.search)
  let search = window.location.search
  const liffState = params.get('liff.state')
  if (liffState) { try { search = decodeURIComponent(liffState) } catch { /* ignore */ } }
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
  const [initError,     setInitError]     = useState<string | null>(null)
  const [successMsg,    setSuccessMsg]    = useState<string | null>(null)
  const [errorMsg,      setErrorMsg]      = useState<string | null>(null)
  const [checkedInAt,   setCheckedInAt]   = useState<string | null>(null)
  const [booting,       setBooting]       = useState(true)
  const [gpsStatus,     setGpsStatus]     = useState<GpsStatus>('requesting')
  const [gpsCoords,     setGpsCoords]     = useState<{ lat: number; lng: number } | null>(null)
  const [qrScanning,    setQrScanning]    = useState(false)
  const [qrMode,        setQrMode]        = useState(false)
  const autoCheckedIn = useRef(false)

  const askGPS = useCallback(async () => {
    setGpsStatus('requesting')
    const coords = await requestGPS()
    if (coords) { setGpsCoords(coords); setGpsStatus('ok') }
    else setGpsStatus('denied')
  }, [])

  useEffect(() => {
    const { mode, branchId, shiftId } = parseQrParams()
    if (mode === 'qr' && branchId && shiftId) setQrMode(true)

    ;(async () => {
      try { await initLiff() } catch (e: any) {
        setInitError(`LIFF init ล้มเหลว: ${e?.message ?? e}`)
        setBooting(false); return
      }
      try { await liffLogin() } catch (e: any) {
        const code = e?.response?.data?.error?.code ?? e?.message
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        else if (code === 'INVALID_CHANNEL') setInitError('ไม่พบการตั้งค่า Line สำหรับ tenant นี้')
        else if (code === 'NOT_LOGGED_IN')   setInitError('กรุณาเปิดผ่าน LINE app เท่านั้น')
        else setInitError(`ยืนยันตัวตนไม่สำเร็จ: ${e?.response?.data?.error?.message ?? e?.message}`)
        setBooting(false); return
      }
      try {
        const meRes = await api.get('/employee/me')
        const { employee: emp } = meRes.data.data
        setEmployee(emp)
      } catch (e: any) {
        const code = e?.response?.data?.error?.code
        if (code === 'EMPLOYEE_NOT_FOUND') { navigate('/verify'); return }
        setInitError(`โหลดข้อมูลไม่สำเร็จ: ${e?.response?.data?.error?.message ?? e?.message}`)
      } finally { setBooting(false) }
    })()
  }, [])

  useEffect(() => { if (!booting) askGPS() }, [booting])

  // Auto check-in เมื่อเปิดจาก QR URL
  useEffect(() => {
    if (autoCheckedIn.current) return
    if (booting || gpsStatus !== 'ok' || !gpsCoords || !employee) return
    const { mode, branchId, shiftId } = parseQrParams()
    if (mode !== 'qr' || !branchId || !shiftId) return
    autoCheckedIn.current = true
    doQrCheckIn(branchId, shiftId, gpsCoords)
  }, [booting, gpsStatus, gpsCoords, employee])

  const doQrCheckIn = useCallback(async (branchId: string, shiftId: string, coords: { lat: number; lng: number }) => {
    if (!employee) return
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
      const t = new Date(time).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
      setSuccessMsg(`เช็คอินสำเร็จ 🎉  เวลา ${t} น.`)
    } catch (err: any) {
      const code = err?.response?.data?.error?.code
      if (code === 'OUTSIDE_GEOFENCE')    setErrorMsg('คุณอยู่นอกพื้นที่ — กรุณาเข้ามาในบริเวณสาขาแล้วสแกนใหม่')
      else if (code === 'ALREADY_CHECKED_IN') { setSuccessMsg('เช็คอินในกะนี้แล้ว ✅'); return }
      else setErrorMsg(err?.response?.data?.error?.message ?? 'เกิดข้อผิดพลาด')
    }
  }, [employee])

  const handleScanQR = useCallback(async () => {
    if (!employee) return
    if (gpsStatus !== 'ok' || !gpsCoords) { setErrorMsg('กรุณาอนุญาต Location ก่อนสแกน QR'); return }

    setQrScanning(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const result = await liff.scanCodeV2()
      const raw = result?.value ?? ''

      let branchId: string | null = null
      let shiftId:  string | null = null
      try {
        const url = new URL(raw)
        branchId = url.searchParams.get('branchId') ?? url.searchParams.get('branch_id')
        shiftId  = url.searchParams.get('shiftId')  ?? url.searchParams.get('shift_id')
      } catch {
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
      if (e?.code !== 'FORBIDDEN') setErrorMsg('ยกเลิกการสแกน')
    } finally {
      setQrScanning(false)
    }
  }, [employee, gpsStatus, gpsCoords, doQrCheckIn])

  // ── Render: loading ───────────────────────────────────────────────────────
  if (booting) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
        <div className="animate-spin" style={{ fontSize: '2rem' }}>⏳</div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>กำลังโหลด…</div>
      </div>
    )
  }

  if (gpsStatus === 'denied') return <LocationGate onRetry={askGPS} />

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>
      <ClockDisplay />

      {/* GPS status */}
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

      {/* QR auto mode */}
      {qrMode && (
        <div style={{ margin: '24px 16px 0', padding: '20px', borderRadius: 16, background: 'rgba(255,107,53,0.06)', border: '1px solid rgba(255,107,53,0.2)', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: 8 }}>📱</div>
          <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>กำลังเช็คอินด้วย QR…</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 4 }}>
            {gpsStatus === 'requesting' ? 'กำลังตรวจสอบตำแหน่ง…' : 'กำลังบันทึก…'}
          </div>
        </div>
      )}

      {/* ── ปุ่มหลัก: สแกน QR ────────────────────────────────────────────── */}
      {!qrMode && (
        <div style={{ margin: '32px 16px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {/* ปุ่มกลม scan */}
          <div style={{ position: 'relative', width: 164, height: 164, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {!qrScanning && gpsStatus === 'ok' && !checkedInAt && (
              <>
                <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
                <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-start), var(--accent-end))' }} />
              </>
            )}
            <button
              type="button"
              onClick={handleScanQR}
              disabled={qrScanning || !employee || gpsStatus !== 'ok'}
              style={{
                width: 156, height: 156, borderRadius: '50%', border: 'none',
                cursor: (qrScanning || !employee || gpsStatus !== 'ok') ? 'not-allowed' : 'pointer',
                background: checkedInAt
                  ? 'linear-gradient(145deg, #16a34a, #15803d)'
                  : (qrScanning || !employee || gpsStatus !== 'ok')
                    ? 'rgba(0,0,0,0.08)'
                    : 'linear-gradient(145deg, var(--accent-start), var(--accent-mid), var(--accent-end))',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                boxShadow: gpsStatus === 'ok' && !qrScanning && !checkedInAt
                  ? '0 0 0 6px rgba(255,107,53,0.12), 0 8px 28px rgba(255,107,53,0.35)'
                  : '0 4px 16px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s, background 0.2s',
                position: 'relative', zIndex: 1,
              }}
              onMouseDown={e => { if (!qrScanning) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
              onMouseUp={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
              onTouchStart={e => { if (!qrScanning) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.95)' }}
              onTouchEnd={e   => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
            >
              {qrScanning ? (
                <span className="animate-spin" style={{ fontSize: '2.4rem' }}>⏳</span>
              ) : checkedInAt ? (
                <span className="animate-success-pop" style={{ fontSize: '2.4rem' }}>✅</span>
              ) : (
                <span style={{ fontSize: '2.6rem' }}>📷</span>
              )}
            </button>
          </div>

          <div style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.2px',
            color: checkedInAt ? 'var(--success)' : (gpsStatus !== 'ok' || !employee) ? 'var(--text-muted)' : 'var(--accent-start)' }}>
            {qrScanning ? 'กำลังสแกน…' : checkedInAt ? 'บันทึกแล้ว!' : 'กดเพื่อสแกน QR เช็คอิน'}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, padding: '0 16px', marginBottom: 16 }}>
        {[
          { icon: '🕐', label: 'เช็คอินล่าสุด', value: checkedInAt ? new Date(checkedInAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—' },
          { icon: '✅', label: 'สถานะ',         value: checkedInAt ? 'บันทึกแล้ว' : '—' },
        ].map(s => (
          <div key={s.label} className="glass-card animate-slide-up" style={{ padding: '14px 10px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.35rem' }}>{s.icon}</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', marginTop: 6, fontWeight: 500 }}>{s.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, marginTop: 4, color: 'var(--text-primary)' }}>{s.value}</div>
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
