// admin/src/pages/weekly-off/LiffPreview.tsx
import { useState } from 'react'
import { X, CalendarOff, CheckCircle2, Clock, XCircle, ChevronLeft } from 'lucide-react'

const MONTHS_TH = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']
const DAYS_FULL  = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์']
const DAYS_TH    = ['อา','จ','อ','พ','พฤ','ศ','ส']

function pad(n: number) { return String(n).padStart(2, '0') }
function parseDate(s: string): Date { return new Date(s + 'T00:00:00') }
function fmtThai(s: string) {
  const d = parseDate(s)
  return `${DAYS_FULL[d.getDay()]}ที่ ${d.getDate()} ${MONTHS_TH[d.getMonth()]}`
}

function fmtMonthTH(ym: string) {
  const [y, m] = ym.split('-').map(Number)
  return `${MONTHS_TH[m - 1]} ${y + 543}`
}

interface MyBooking {
  date: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

interface Props {
  roundStatus: 'OPEN' | 'CLOSED'
  month: string
  slots: string[]
  myBookings: MyBooking[]
  onBook: (date: string) => void
  onCancelBooking: (date: string) => void
  onClose: () => void
}

const STATUS_CFG = {
  PENDING:  { label: 'รอการอนุมัติ', color: '#d97706', bg: '#fffbeb', icon: <Clock size={12}/> },
  APPROVED: { label: 'อนุมัติแล้ว',  color: '#16a34a', bg: '#f0fdf4', icon: <CheckCircle2 size={12}/> },
  REJECTED: { label: 'ไม่อนุมัติ',   color: '#dc2626', bg: '#fef2f2', icon: <XCircle size={12}/> },
}

export default function LiffPreview({ roundStatus, month, slots, myBookings, onBook, onCancelBooking, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [screen, setScreen] = useState<'home' | 'confirm' | 'success'>('home')

  const bookedDates = new Set(myBookings.map(b => b.date))
  const myBookingMap = Object.fromEntries(myBookings.map(b => [b.date, b]))

  function handleBook() {
    if (!selected) return
    onBook(selected)
    setScreen('success')
  }

  function resetAndClose() {
    setSelected(null)
    setScreen('home')
    onClose()
  }

  // Group slots by week label
  const [y, m] = month.split('-').map(Number)
  function weekLabel(dateStr: string) {
    const weekNum = Math.ceil(parseDate(dateStr).getDate() / 7)
    return `สัปดาห์ที่ ${weekNum}`
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={resetAndClose}>
      {/* Phone frame */}
      <div onClick={e => e.stopPropagation()} style={{
        width: 375, maxHeight: '90vh',
        background: '#f1f5f9', borderRadius: 40,
        boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 8px #1e293b, 0 0 0 10px #334155',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative',
      }}>
        {/* Status bar */}
        <div style={{ background: '#0f172a', padding: '12px 20px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>9:41</span>
          <div style={{ width: 80, height: 20, background: '#1e293b', borderRadius: 99 }} />
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ fontSize: '9px', color: '#fff' }}>●●●</span>
            <span style={{ fontSize: '9px', color: '#fff' }}>WiFi</span>
            <span style={{ fontSize: '9px', color: '#fff' }}>100%</span>
          </div>
        </div>

        {/* Line LIFF header */}
        <div style={{ background: '#06C755', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {screen !== 'home' && (
            <button onClick={() => setScreen('home')} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '0 4px 0 0', display: 'flex' }}>
              <ChevronLeft size={18}/>
            </button>
          )}
          <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff', flex: 1 }}>
            {screen === 'confirm' ? 'ยืนยันการจอง' : screen === 'success' ? 'จองสำเร็จ' : 'จองวันหยุดประจำเดือน'}
          </span>
          <button onClick={resetAndClose} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8, display: 'flex' }}><X size={16}/></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

          {/* ── CLOSED state ── */}
          {roundStatus === 'CLOSED' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 14 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CalendarOff size={36} stroke="#94a3b8" strokeWidth={1.5}/>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 700, fontSize: '16px', color: '#1e293b', margin: '0 0 6px' }}>ยังไม่เปิดให้จอง</p>
                <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                  แอดมินยังไม่ได้เปิดรอบการจอง<br/>
                  วันหยุดสำหรับ{' '}
                  <span style={{ color: '#f97316', fontWeight: 600 }}>{fmtMonthTH(month)}</span>
                </p>
              </div>
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: '12px 16px', width: '100%' }}>
                <p style={{ fontSize: '12px', color: '#9a3412', margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                  💬 เมื่อแอดมินเปิดการจอง<br/>
                  ระบบจะส่งแจ้งเตือนทาง Line
                </p>
              </div>
            </div>
          )}

          {/* ── OPEN state — Home ── */}
          {roundStatus === 'OPEN' && screen === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {/* Month header */}
              <div style={{ background: 'linear-gradient(135deg, #06C755 0%, #05a847 100%)', padding: '16px 20px 20px' }}>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', margin: '0 0 2px', fontWeight: 600 }}>รอบการจอง</p>
                <p style={{ fontSize: '20px', fontWeight: 800, color: '#fff', margin: 0 }}>{fmtMonthTH(month)}</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.85)', margin: '4px 0 0' }}>จองได้ 1 วัน / สัปดาห์</p>
              </div>

              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Summary of my bookings */}
                {myBookings.length > 0 && (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '14px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>การจองของฉัน</p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {myBookings.map(b => {
                        const cfg = STATUS_CFG[b.status]
                        return (
                          <div key={b.date} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{fmtThai(b.date)}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11px', fontWeight: 600, color: cfg.color, background: cfg.bg, borderRadius: 99, padding: '2px 8px' }}>
                              {cfg.icon}{cfg.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Available slots */}
                {slots.length > 0 ? (
                  <div style={{ background: '#fff', borderRadius: 14, padding: '14px', border: '1px solid #e2e8f0' }}>
                    <p style={{ fontSize: '12px', fontWeight: 700, color: '#374151', margin: '0 0 10px' }}>
                      เลือกวันที่ต้องการหยุด
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {slots.map(s => {
                        const booking = myBookingMap[s]
                        const isBooked = !!booking
                        const isSelected = selected === s
                        const d = parseDate(s)
                        return (
                          <button
                            key={s}
                            onClick={() => {
                              if (isBooked) return
                              setSelected(isSelected ? null : s)
                            }}
                            disabled={isBooked}
                            style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '12px 14px', borderRadius: 10, border: `2px solid ${isSelected ? '#06C755' : isBooked ? '#e5e7eb' : '#e2e8f0'}`,
                              background: isSelected ? '#f0fdf4' : isBooked ? '#f9fafb' : '#fff',
                              cursor: isBooked ? 'default' : 'pointer', fontFamily: 'inherit',
                              opacity: isBooked && !booking ? 0.5 : 1,
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 38, height: 38, borderRadius: 10,
                                background: isSelected ? '#06C755' : isBooked ? '#e5e7eb' : '#f1f5f9',
                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: isSelected ? '#fff' : '#64748b', lineHeight: 1 }}>{DAYS_TH[d.getDay()]}</span>
                                <span style={{ fontSize: '16px', fontWeight: 800, color: isSelected ? '#fff' : '#1e293b', lineHeight: 1 }}>{d.getDate()}</span>
                              </div>
                              <div style={{ textAlign: 'left' }}>
                                <p style={{ fontSize: '13px', fontWeight: 700, color: isBooked ? '#9ca3af' : '#1e293b', margin: 0 }}>{fmtThai(s)}</p>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '2px 0 0' }}>{weekLabel(s)}</p>
                              </div>
                            </div>
                            {isBooked && booking && (
                              <span style={{ fontSize: '11px', fontWeight: 600, color: STATUS_CFG[booking.status].color, background: STATUS_CFG[booking.status].bg, borderRadius: 99, padding: '2px 8px' }}>
                                {STATUS_CFG[booking.status].label}
                              </span>
                            )}
                            {isSelected && !isBooked && (
                              <CheckCircle2 size={18} stroke="#06C755"/>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                    <CalendarOff size={32} stroke="#cbd5e1" strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 8px' }}/>
                    <p style={{ fontSize: '13px', margin: 0 }}>ยังไม่มีวันที่กำหนดให้จอง</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Confirm screen ── */}
          {roundStatus === 'OPEN' && screen === 'confirm' && selected && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px 20px', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: '20px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <CheckCircle2 size={28} stroke="#16a34a"/>
                </div>
                <p style={{ fontWeight: 700, fontSize: '15px', color: '#1e293b', margin: '0 0 4px' }}>ยืนยันการจองวันหยุด</p>
                <p style={{ fontSize: '22px', fontWeight: 800, color: '#06C755', margin: '8px 0 4px' }}>{fmtThai(selected)}</p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>{fmtMonthTH(month)}</p>
              </div>
              <div style={{ background: '#fffbeb', borderRadius: 12, padding: '12px 14px', border: '1px solid #fde68a' }}>
                <p style={{ fontSize: '12px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
                  ⚠️ หลังจากจองแล้วจะ<strong>รอการอนุมัติ</strong>จากแอดมิน
                  ระบบจะแจ้งผ่าน Line เมื่อได้รับการพิจารณา
                </p>
              </div>
            </div>
          )}

          {/* ── Success screen ── */}
          {screen === 'success' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', gap: 16 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={40} stroke="#16a34a"/>
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontWeight: 800, fontSize: '18px', color: '#16a34a', margin: '0 0 6px' }}>จองสำเร็จ!</p>
                <p style={{ fontSize: '14px', color: '#374151', margin: '0 0 4px', fontWeight: 600 }}>
                  {selected ? fmtThai(selected) : ''}
                </p>
                <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>รอการอนุมัติจากแอดมิน</p>
              </div>
              <button onClick={resetAndClose}
                style={{ background: '#06C755', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                กลับหน้าหลัก
              </button>
            </div>
          )}
        </div>

        {/* Bottom action */}
        {roundStatus === 'OPEN' && screen === 'home' && selected && (
          <div style={{ padding: '12px 16px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', flexShrink: 0 }}>
            <button onClick={() => setScreen('confirm')}
              style={{ width: '100%', background: '#06C755', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              จอง{fmtThai(selected)}
            </button>
          </div>
        )}

        {roundStatus === 'OPEN' && screen === 'confirm' && selected && (
          <div style={{ padding: '12px 16px 20px', background: '#fff', borderTop: '1px solid #e2e8f0', flexShrink: 0, display: 'flex', gap: 10 }}>
            <button onClick={() => setScreen('home')}
              style={{ flex: 1, background: '#f1f5f9', color: '#374151', border: 'none', borderRadius: 14, padding: '14px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              ยกเลิก
            </button>
            <button onClick={handleBook}
              style={{ flex: 2, background: '#06C755', color: '#fff', border: 'none', borderRadius: 14, padding: '14px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ยืนยัน
            </button>
          </div>
        )}
      </div>

      {/* Close hint */}
      <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontSize: '12px', pointerEvents: 'none' }}>
        คลิกนอกกรอบเพื่อปิด
      </div>
    </div>
  )
}
