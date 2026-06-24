// employee/src/pages/checkin/index.tsx
import { useEffect, useState, useCallback, useRef } from 'react'
import { Bell, X, Camera, Image } from 'lucide-react'
import jsQR from 'jsqr'
import { COLOR } from '../../components/ui/tokens'
import { api } from '../../lib/axios'
import { useAuthStore } from '../../stores/authStore'
import liff from '@line/liff'

interface QrPayload {
  v: 1; tid: string; bid: string; sig: string
}

interface CheckInResult {
  record:           { check_in_at: string }
  shift:            { name: string; start_time: string; end_time: string }
  branch:           { name: string }
  late_level:       0 | 1 | 2
  late_minutes:     number
  fine:             number
  is_outside_area:  boolean
  is_outside_shift: boolean
}

interface CheckOutResult {
  record:      { check_in_at: string; check_out_at: string }
  shift:       { name: string; start_time: string; end_time: string }
  branch:      { name: string }
  workMinutes: number
}

interface TodayRecord {
  id:           string
  check_in_at:  string
  check_out_at: string | null
  shift:        { id: string; name: string; start_time: string; end_time: string }
}

interface ShiftPreview {
  payload:    QrPayload
  branchName: string
  action:     'checkin' | 'checkout'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return { th: 'สวัสดีตอนเช้า', en: 'Good Morning' }
  if (h >= 12 && h < 18) return { th: 'สวัสดีตอนบ่าย', en: 'Good Afternoon' }
  return { th: 'สวัสดีตอนเย็น', en: 'Good Evening' }
}
function formatTime(d: Date) {
  return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
function formatThaiDate(d: Date) {
  const days   = ['อา','จ','อ','พ','พฤ','ศ','ส']
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']
  return `วัน${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`
}
function fmtHHMM(iso: string) {
  return new Date(iso).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false })
}
function fmtWorkTime(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m} นาที`
  return `${h} ชม. ${m} นาที`
}

// ─── Check-in Result Sheet ────────────────────────────────────────────────────
function CheckInSheet({ result, onClose }: { result: CheckInResult; onClose: () => void }) {
  const S = [
    { color: COLOR.success, bg: COLOR.successBg, border: COLOR.successBorder, label: 'มาทำงานปกติ', icon: '✅' },
    { color: COLOR.warning, bg: COLOR.warningBg, border: COLOR.warningBorder, label: 'มาสายระดับ 1', icon: '⚠️' },
    { color: COLOR.error,   bg: COLOR.errorBg,   border: COLOR.errorBorder,   label: 'มาสายระดับ 2', icon: '🚨' },
  ][result.late_level]

  const rows = [
    { label: 'เวลาเช็คอิน', value: fmtHHMM(result.record.check_in_at) + ' น.', bold: true },
    { label: 'สาขา',        value: result.branch.name },
    { label: 'กะ',          value: `${result.shift.name} (${result.shift.start_time}–${result.shift.end_time})` },
    ...(result.is_outside_shift ? [{ label: 'สถานะ', value: '🕐 เข้างานนอกช่วงเวลากะ', bold: false }] : []),
    ...(result.is_outside_area  ? [{ label: 'พื้นที่', value: '⚠️ นอกรัศมีสาขา', bold: false }] : []),
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in" onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 40px', boxShadow: '0 -16px 48px rgba(0,0,0,0.12)' }}
        className="animate-slide-up" onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 5, borderRadius: 99, background: '#E5E7EB', margin: '0 auto 24px' }} />

        <div className="animate-success-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: S.bg, border: `1px solid ${S.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: 16 }}>{S.icon}</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: S.color }}>{S.label}</div>
          {result.late_minutes > 0 && <div style={{ fontSize: '0.85rem', color: COLOR.textMuted, marginTop: 4 }}>สาย {result.late_minutes} นาที</div>}
        </div>

        <div style={{ borderRadius: 20, background: '#F8F9FA', padding: '8px 16px', marginBottom: 20 }}>
          {rows.map((r, i) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < rows.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
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

        <button onClick={onClose} style={{ width: '100%', padding: '16px', borderRadius: 20, border: 'none', background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`, color: '#fff', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer' }}>
          รับทราบ
        </button>
      </div>
    </div>
  )
}

// ─── Check-out Result Sheet ───────────────────────────────────────────────────
function CheckOutSheet({ result, onClose }: { result: CheckOutResult; onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in" onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 40px', boxShadow: '0 -16px 48px rgba(0,0,0,0.12)' }}
        className="animate-slide-up" onClick={e => e.stopPropagation()}>
        <div style={{ width: 40, height: 5, borderRadius: 99, background: '#E5E7EB', margin: '0 auto 24px' }} />

        <div className="animate-success-pop" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <div style={{ width: 80, height: 80, borderRadius: 24, background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', marginBottom: 16 }}>🏁</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#1d4ed8' }}>เช็คเอาต์สำเร็จ</div>
          <div style={{ fontSize: '0.85rem', color: COLOR.textMuted, marginTop: 4 }}>ทำงาน {fmtWorkTime(result.workMinutes)}</div>
        </div>

        <div style={{ borderRadius: 20, background: '#F8F9FA', padding: '8px 16px', marginBottom: 20 }}>
          {[
            { label: 'เวลาเข้างาน',  value: fmtHHMM(result.record.check_in_at)  + ' น.', bold: false },
            { label: 'เวลาออกงาน',   value: fmtHHMM(result.record.check_out_at) + ' น.', bold: true  },
            { label: 'สาขา',         value: result.branch.name },
            { label: 'กะ',           value: `${result.shift.name} (${result.shift.start_time}–${result.shift.end_time})` },
            { label: 'รวมชั่วโมง',   value: fmtWorkTime(result.workMinutes), bold: true },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none' }}>
              <span style={{ fontSize: '0.85rem', color: COLOR.textSecondary }}>{r.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: r.bold ? 800 : 600, color: COLOR.textPrimary }}>{r.value}</span>
            </div>
          ))}
        </div>

        <button onClick={onClose} style={{ width: '100%', padding: '16px', borderRadius: 20, border: 'none', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', fontWeight: 700, fontSize: '1.05rem', cursor: 'pointer' }}>
          รับทราบ
        </button>
      </div>
    </div>
  )
}

// ─── Confirm Sheet ────────────────────────────────────────────────────────────
function ConfirmSheet({ preview, onConfirm, onCancel, loading }: {
  preview: ShiftPreview; onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  const isCheckout = preview.action === 'checkout'
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'flex-end' }}
      className="animate-fade-in">
      <div style={{ background: '#fff', borderRadius: '32px 32px 0 0', width: '100%', maxWidth: 430, margin: '0 auto', padding: '24px 24px 40px', boxShadow: '0 -16px 48px rgba(0,0,0,0.12)' }}
        className="animate-slide-up">
        <div style={{ width: 40, height: 5, borderRadius: 99, background: '#E5E7EB', margin: '0 auto 24px' }} />

        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{isCheckout ? '🏁' : '📋'}</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#1a2b3c' }}>
            {isCheckout ? 'ยืนยันการเช็คเอาต์' : 'ยืนยันการเช็คอิน'}
          </div>
          <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>ข้อมูลจาก QR Code</div>
        </div>

        <div style={{ background: '#f8fafc', borderRadius: 16, padding: '8px 16px', marginBottom: 24 }}>
          {[
            { label: 'สาขา',   value: preview.branchName },
            { label: 'วันที่', value: new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' }) },
            { label: 'กะงาน',  value: isCheckout ? '🤖 ตรวจจับจาก record วันนี้อัตโนมัติ' : '🤖 ตรวจจับอัตโนมัติจากเวลา' },
          ].map((r, i, arr) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
              <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{r.label}</span>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1a2b3c' }}>{r.value}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} disabled={loading}
            style={{ flex: 1, padding: '14px', borderRadius: 16, border: '1px solid #e5e7eb', background: '#f9fafb', color: '#374151', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ยกเลิก
          </button>
          <button onClick={onConfirm} disabled={loading}
            style={{ flex: 2, padding: '14px', borderRadius: 16, border: 'none',
              background: loading ? '#d1d5db' : isCheckout ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`,
              color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {loading ? '⏳ กำลังบันทึก…' : isCheckout ? '🏁 ยืนยันเช็คเอาต์' : '✅ ยืนยันเช็คอิน'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Live clock ───────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        fontVariantNumeric: 'tabular-nums', fontSize: '3rem', fontWeight: 800,
        background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})`,
        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        lineHeight: 1, marginBottom: 8, filter: 'drop-shadow(0 4px 12px rgba(255,94,0,0.15))',
      }}>
        {formatTime(now)}
      </div>
      <div style={{ fontSize: '0.85rem', color: COLOR.textSecondary, letterSpacing: '0.5px', fontWeight: 500 }}>
        {formatThaiDate(now)}
      </div>
    </div>
  )
}

// ─── QR Scan Sheet ────────────────────────────────────────────────────────────
function QrScanSheet({ onScan, onClose }: { onScan: (raw: string) => void; onClose: () => void }) {
  const videoRef    = useRef<HTMLVideoElement>(null)
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const streamRef   = useRef<MediaStream | null>(null)
  const rafRef      = useRef<number>(0)
  const fileRef     = useRef<HTMLInputElement>(null)
  const [tab,       setTab]       = useState<'camera' | 'file' | 'text'>('camera')
  const [camErr,    setCamErr]    = useState<string | null>(null)
  const [scanning,  setScanning]  = useState(false)
  const [devText,   setDevText]   = useState('')

  const tick = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, 0, 0)
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })
    if (code?.data) { stopStream(); onScan(code.data); return }
    rafRef.current = requestAnimationFrame(tick)
  }, [onScan])

  useEffect(() => {
    if (tab !== 'camera') return
    setCamErr(null)
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: { ideal: 'environment' } } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => {})
        }
        setScanning(true)
        rafRef.current = requestAnimationFrame(tick)
      })
      .catch(() => setCamErr('ไม่สามารถเปิดกล้องได้ — ตรวจสอบสิทธิ์กล้องแล้วลองใหม่'))
    return stopStream
  }, [tab, tick])

  function stopStream() {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const img = new window.Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width; canvas.height = img.height
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0)
        const data = ctx.getImageData(0, 0, img.width, img.height)
        const code = jsQR(data.data, img.width, img.height)
        if (code?.data) { onScan(code.data) }
        else            { setCamErr('ไม่พบ QR Code ในรูปนี้ — ลองรูปที่ชัดขึ้น') }
      }
      img.src = ev.target?.result as string
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 300,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
  }
  const sheet: React.CSSProperties = {
    width: '100%', maxWidth: 430, background: '#fff', borderRadius: '24px 24px 0 0',
    padding: '20px 20px 36px', boxSizing: 'border-box',
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={sheet} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', margin: 0 }}>สแกน QR Code</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([['camera','📷 กล้อง'],['file','🖼 เลือกรูป'],['text','⌨️ วาง JSON']] as const).map(([t, label]) => (
            <button key={t} onClick={() => { setCamErr(null); setTab(t) }}
              style={{ flex: 1, padding: '7px 4px', borderRadius: 10, border: 'none', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit',
                background: tab === t ? COLOR.primary : '#f3f4f6', color: tab === t ? '#fff' : '#374151' }}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'camera' && (
          <div>
            {camErr ? (
              <div style={{ padding: '20px', background: '#fef2f2', borderRadius: 14, color: '#dc2626', fontSize: '0.85rem', textAlign: 'center', lineHeight: 1.6 }}>
                ⚠️ {camErr}
                <br/><button onClick={() => { setCamErr(null); setTab('camera') }} style={{ marginTop: 10, padding: '6px 16px', borderRadius: 8, border: 'none', background: COLOR.primary, color: '#fff', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>ลองใหม่</button>
              </div>
            ) : (
              <div style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', background: '#000', aspectRatio: '1', width: '100%' }}>
                <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <canvas ref={canvasRef} style={{ display: 'none' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                  <div style={{ width: '60%', aspectRatio: '1', border: '3px solid rgba(255,255,255,0.8)', borderRadius: 12, boxShadow: '0 0 0 2000px rgba(0,0,0,0.35)' }} />
                </div>
                {scanning && (
                  <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
                    🔍 กำลังค้นหา QR Code…
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'file' && (
          <div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
            {camErr && (
              <div style={{ marginBottom: 12, padding: '10px 14px', background: '#fef2f2', borderRadius: 12, color: '#dc2626', fontSize: '0.82rem' }}>⚠️ {camErr}</div>
            )}
            <button onClick={() => fileRef.current?.click()}
              style={{ width: '100%', padding: '28px', borderRadius: 16, border: '2px dashed #d1d5db', background: '#f9fafb', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <Image size={40} color={COLOR.primary} />
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#374151' }}>เลือกรูปภาพ QR</span>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>รองรับ JPG, PNG, WEBP</span>
            </button>
          </div>
        )}

        {tab === 'text' && (
          <div>
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: 8, lineHeight: 1.6 }}>
              Admin panel → สาขา → QR → คัดลอก JSON แล้ววางที่นี่
            </div>
            <textarea
              value={devText}
              onChange={e => setDevText(e.target.value)}
              rows={4}
              placeholder='{"v":1,"tid":"...","bid":"...","sig":"..."}'
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1.5px solid #d1d5db', fontSize: '0.78rem', fontFamily: 'monospace', boxSizing: 'border-box', resize: 'none', outline: 'none' }}
            />
            <button
              onClick={() => { if (devText.trim()) { onScan(devText.trim()); setDevText('') } }}
              style={{ marginTop: 10, width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: COLOR.primary, color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              ยืนยัน
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CheckinPage() {
  const employee = useAuthStore(s => s.employee)
  const [showScanner,    setShowScanner]    = useState(false)
  const [scanAction,     setScanAction]     = useState<'checkin' | 'checkout'>('checkin')
  const [preview,        setPreview]        = useState<ShiftPreview | null>(null)
  const [confirming,     setConfirming]     = useState(false)
  const [checkinResult,  setCheckinResult]  = useState<CheckInResult | null>(null)
  const [checkoutResult, setCheckoutResult] = useState<CheckOutResult | null>(null)
  const [todayRecords,   setTodayRecords]   = useState<TodayRecord[]>([])
  const [error,          setError]          = useState<string | null>(null)
  const { th, en } = getGreeting()

  // ── โหลด today records ─────────────────────────────────────────────────────
  const loadToday = useCallback(async () => {
    if (!employee) return
    try {
      const res = await api.get('/employee/attendance/today', { params: { employeeId: employee.id } })
      setTodayRecords(res.data.data ?? [])
    } catch { /* non-critical */ }
  }, [employee])

  useEffect(() => { loadToday() }, [loadToday])

  // มี record ที่ check-in แล้วยังไม่ check-out
  const hasOpenRecord = todayRecords.some(r => r.check_in_at && !r.check_out_at)
  // เช็คอินแล้วและ check-out ครบทุก record
  const allCheckedOut = todayRecords.length > 0 && todayRecords.every(r => r.check_out_at)

  // ── Parse QR raw ───────────────────────────────────────────────────────────
  const handleQrRaw = useCallback((raw: string, action: 'checkin' | 'checkout') => {
    setError(null)
    try {
      const payload = JSON.parse(raw) as QrPayload
      if (payload.v !== 1 || !payload.bid || !payload.sig) {
        setError('QR Code ไม่ถูกต้อง — กรุณาสแกนใหม่')
        return
      }
      const branchName = employee?.branch.name ?? 'สาขา'
      setPreview({ payload, branchName, action })
    } catch {
      setError('QR Code ไม่ถูกต้อง — กรุณาสแกนใหม่')
    }
  }, [employee])

  // ── Open scanner ───────────────────────────────────────────────────────────
  const openScanner = useCallback(async (action: 'checkin' | 'checkout') => {
    if (!employee || preview) return
    setError(null)
    setScanAction(action)
    if (liff.isInClient()) {
      try {
        const res = await liff.scanCodeV2()
        if (res.value) handleQrRaw(res.value, action)
      } catch (e: any) {
        if (e?.code !== 'CANCEL') setError('ไม่สามารถเปิดกล้องได้ — ลองใหม่อีกครั้ง')
      }
      return
    }
    setShowScanner(true)
  }, [employee, preview, handleQrRaw])

  // ── Submit (check-in or check-out) ────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!preview || !employee) return
    setConfirming(true)
    try {
      if (preview.action === 'checkin') {
        let gps: { gps_lat: number; gps_lng: number } | undefined
        try {
          const pos = await new Promise<GeolocationPosition>((res, rej) =>
            navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
          )
          gps = { gps_lat: pos.coords.latitude, gps_lng: pos.coords.longitude }
        } catch { /* GPS optional */ }

        const res = await api.post('/employee/attendance/check-in-scan', {
          employee_id: employee.id,
          qr_payload:  JSON.stringify(preview.payload),
          ...gps,
        })
        setCheckinResult(res.data.data)
        await loadToday()
      } else {
        const res = await api.post('/employee/attendance/check-out-scan', {
          employee_id: employee.id,
          qr_payload:  JSON.stringify(preview.payload),
        })
        setCheckoutResult(res.data.data)
        await loadToday()
      }
      setPreview(null)
    } catch (err: any) {
      const code = err.response?.data?.error?.code
      const msg  = err.response?.data?.error?.message
      setPreview(null)
      if (code === 'ALREADY_CHECKED_IN')  setError('เช็คอินในกะนี้ไปแล้ว')
      else if (code === 'ALREADY_CHECKED_OUT') setError('เช็คเอาต์ไปแล้ว')
      else if (code === 'NOT_CHECKED_IN') setError('ยังไม่ได้เช็คอินวันนี้')
      else if (code === 'TOO_EARLY')      setError(msg ?? 'ยังเช็คเอาต์ไม่ได้')
      else if (code === 'NOT_IN_BRANCH')   setError('คุณไม่ได้สังกัดสาขานี้ — ไม่สามารถเช็คอินได้')
      else if (code === 'QR_EXPIRED')     setError('QR หมดอายุ — ขอ QR ใหม่จาก Admin')
      else if (code === 'INVALID_QR_SIG') setError('QR ถูกดัดแปลง — ขอ QR ใหม่จาก Admin')
      else if (code === 'OUTSIDE_GEOFENCE') setError('คุณอยู่นอกพื้นที่สาขา — เช็คอินไม่ได้')
      else setError(msg ?? 'เกิดข้อผิดพลาด')
    } finally {
      setConfirming(false)
    }
  }, [preview, employee, loadToday])

  if (!employee) {
    return (
      <div className="page-container" style={{ maxWidth: 430, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', color: COLOR.textMuted }}>
          <div style={{ fontSize: '2rem', marginBottom: 12 }}>⏳</div>
          <div>กำลังโหลด...</div>
        </div>
      </div>
    )
  }

  const busy = showScanner || !!preview

  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* ── Orange Gradient Header ─────────────────────────────────── */}
      <div className="app-header">
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
      </div>

      {/* ── White Panel ───────────────────────────────────────────── */}
      <div className="app-panel" style={{ paddingBottom: 100 }}>

        {/* Employee card */}
        <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 800, color: '#fff', flexShrink: 0 }}>
            {employee.first_name.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: COLOR.textPrimary }}>{employee.first_name} {employee.last_name}</div>
            <div style={{ fontSize: '0.8rem', color: COLOR.info, marginTop: 2, fontWeight: 500 }}>{employee.employee_code} · {employee.branch.name}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700,
            color: allCheckedOut ? '#6b7280' : hasOpenRecord ? '#1d4ed8' : COLOR.success,
            background: allCheckedOut ? '#f3f4f6' : hasOpenRecord ? '#eff6ff' : COLOR.successBg,
            padding: '6px 12px', borderRadius: 99 }}>
            {allCheckedOut ? '✓ เสร็จแล้ว' : hasOpenRecord ? '⏱ กำลังทำงาน' : '✓ พร้อม'}
          </div>
        </div>

        {/* Clock */}
        <LiveClock />

        {/* Error */}
        {error && (
          <div style={{ margin: '20px 0 0', padding: '12px 16px', borderRadius: 16, background: COLOR.errorBg, border: `1px solid ${COLOR.errorBorder}`, fontSize: '0.85rem', color: COLOR.error, fontWeight: 600, textAlign: 'center' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Today status strip */}
        {todayRecords.length > 0 && (
          <div style={{ margin: '20px 0 0', padding: '12px 16px', borderRadius: 16, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>วันนี้</div>
            {todayRecords.map(r => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.82rem' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>{r.shift.name}</span>
                <span style={{ color: '#64748b' }}>
                  เข้า {fmtHHMM(r.check_in_at)}
                  {r.check_out_at ? ` → ออก ${fmtHHMM(r.check_out_at)}` : <span style={{ color: '#2563eb', fontWeight: 700 }}> (ยังไม่ออก)</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, margin: '36px 0 8px' }}>

          {/* Check-in button */}
          <button
            type="button"
            onClick={() => openScanner('checkin')}
            disabled={busy || hasOpenRecord || allCheckedOut}
            style={{
              width: 160, height: 160, borderRadius: '50%', border: 'none',
              cursor: (busy || allCheckedOut) ? 'not-allowed' : 'pointer',
              background: allCheckedOut
                ? '#e5e7eb'
                : hasOpenRecord
                  ? '#f3f4f6'
                  : `linear-gradient(145deg, ${COLOR.primary}, ${COLOR.primaryEnd})`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: (!busy && !allCheckedOut && !hasOpenRecord) ? '0 8px 24px rgba(255,94,0,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
              opacity: hasOpenRecord ? 0.5 : 1,
            }}
          >
            <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>📷</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700,
              color: (!allCheckedOut && !hasOpenRecord) ? 'rgba(255,255,255,0.95)' : '#9ca3af',
              letterSpacing: '0.3px' }}>
              เช็คอิน
            </span>
          </button>

          <div style={{ fontSize: '0.8rem', color: COLOR.textMuted, fontWeight: 600 }}>— หรือ —</div>

          {/* Check-out button */}
          <button
            type="button"
            onClick={() => openScanner('checkout')}
            disabled={busy || !hasOpenRecord}
            style={{
              width: 160, height: 160, borderRadius: '50%', border: 'none',
              cursor: (busy || !hasOpenRecord) ? 'not-allowed' : 'pointer',
              background: hasOpenRecord
                ? 'linear-gradient(145deg, #2563eb, #1d4ed8)'
                : '#f3f4f6',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: hasOpenRecord ? '0 8px 24px rgba(37,99,235,0.3)' : '0 2px 8px rgba(0,0,0,0.08)',
              opacity: hasOpenRecord ? 1 : 0.4,
            }}
          >
            <span style={{ fontSize: '2.6rem', lineHeight: 1 }}>🏁</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 700,
              color: hasOpenRecord ? 'rgba(255,255,255,0.95)' : '#9ca3af',
              letterSpacing: '0.3px' }}>
              เช็คเอาต์
            </span>
          </button>

          {!error && (
            <div style={{ fontSize: '0.8rem', color: COLOR.textMuted, textAlign: 'center', lineHeight: 1.6, marginTop: 4 }}>
              {hasOpenRecord
                ? 'สแกน QR Code เดิมที่หน้าสาขา เพื่อเช็คเอาต์'
                : allCheckedOut
                  ? 'เสร็จงานวันนี้แล้ว!'
                  : 'สแกน QR Code ที่ติดไว้หน้าสาขา\nระบบตรวจจับกะจากเวลาที่สแกนอัตโนมัติ'}
            </div>
          )}
        </div>
      </div>

      {/* Overlays */}
      {showScanner && (
        <QrScanSheet
          onScan={raw => { setShowScanner(false); handleQrRaw(raw, scanAction) }}
          onClose={() => setShowScanner(false)}
        />
      )}
      {preview && (
        <ConfirmSheet
          preview={preview}
          onConfirm={handleConfirm}
          onCancel={() => setPreview(null)}
          loading={confirming}
        />
      )}
      {checkinResult  && <CheckInSheet  result={checkinResult}  onClose={() => { setCheckinResult(null);  setError(null) }} />}
      {checkoutResult && <CheckOutSheet result={checkoutResult} onClose={() => { setCheckoutResult(null); setError(null) }} />}
    </div>
  )
}
