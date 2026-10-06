// employee/src/components/ui/ResultDialog.tsx
// ป๊อปอัปผลลัพธ์พร้อมแอนิเมชันกลางตัวเดียวทั้งแอดมิน — ใช้หลังการบันทึก/แก้ไข/ลบ/ส่ง ที่สำคัญ (feedback 2026-10-06 "อันไหนที่มีการบันทึกหรือแก้ไข ให้มี Animation")
// เรียกจากที่ไหนก็ได้ (ไม่ต้องอยู่ใน component): showResult({ type: 'success', title: 'เพิ่มพนักงานแล้ว', details: [{ label: 'ชื่อ', value: '...' }] })
//   type: 'success' (วงกลมเขียว+เครื่องหมายถูกวาด) · 'deleted' (วงกลมแดงอ่อน+ถังขยะสั่น) · 'error' (วงกลมแดง+กากบาทวาด ไม่ปิดเอง)
// ปิดเองหลังไม่กี่วินาที (มีแถบเวลาวิ่ง) หรือกดพื้นหลัง/ปุ่ม/Esc · เคารพ prefers-reduced-motion
import { useEffect } from 'react'
import { create } from 'zustand'
import { Trash2 } from 'lucide-react'
const Z = { toast: 1100 }

export type ResultType = 'success' | 'deleted' | 'error'
export interface ResultDetail { label: string; value: React.ReactNode }
export interface ResultOptions {
  type: ResultType
  title: string
  subtitle?: string
  details?: ResultDetail[]
  /** ms ก่อนปิดเอง (ไม่ใส่ = ตามชนิด: success/deleted 3.2 วิ, มีรายละเอียด 5 วิ · error ไม่ปิดเอง) */
  duration?: number
  /** ข้อความปุ่มปิด */
  closeLabel?: string
  onClose?: () => void
}

interface Store { current: (ResultOptions & { id: number }) | null; show: (o: ResultOptions) => void; close: () => void }
let seq = 0
const useResultStore = create<Store>((set, get) => ({
  current: null,
  show: o => set({ current: { ...o, id: ++seq } }),
  close: () => { const c = get().current; set({ current: null }); c?.onClose?.() },
}))

export function showResult(o: ResultOptions) { useResultStore.getState().show(o) }

const COLORS: Record<ResultType, { main: string; soft: string; text: string }> = {
  success: { main: '#16a34a', soft: '#dcfce7', text: '#15803d' },
  deleted: { main: '#64748b', soft: '#f1f5f9', text: '#334155' },
  error:   { main: '#dc2626', soft: '#fee2e2', text: '#b91c1c' },
}

export default function ResultHost() {
  const current = useResultStore(s => s.current)
  const close = useResultStore(s => s.close)

  const type = current?.type
  const ms = current ? (current.duration ?? (current.type === 'error' ? 0 : (current.details?.length ? 5000 : 3200))) : 0
  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const t = ms > 0 ? setTimeout(close, ms) : undefined
    return () => { document.removeEventListener('keydown', onKey); if (t) clearTimeout(t) }
  }, [current?.id])  // eslint-disable-line react-hooks/exhaustive-deps

  if (!current || !type) return null
  const c = COLORS[type]
  return (
    <div role="alertdialog" aria-live="assertive" aria-label={current.title} onClick={close}
      style={{ position: 'fixed', inset: 0, zIndex: Z.toast + 10, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'rd-fade .2s ease-out both' }}>
      <style>{`
        @keyframes rd-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rd-card { from { transform: translateY(14px) scale(.96); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes rd-pop { 0% { transform: scale(.3); opacity: 0 } 60% { transform: scale(1.12); opacity: 1 } 100% { transform: scale(1) } }
        @keyframes rd-draw { to { stroke-dashoffset: 0 } }
        @keyframes rd-ring { 0% { transform: scale(.85); opacity: .5 } 100% { transform: scale(1.9); opacity: 0 } }
        @keyframes rd-rise { from { transform: translateY(8px); opacity: 0 } to { transform: none; opacity: 1 } }
        @keyframes rd-shake { 0%,100% { transform: rotate(0) } 20% { transform: rotate(-10deg) } 40% { transform: rotate(9deg) } 60% { transform: rotate(-6deg) } 80% { transform: rotate(4deg) } }
        @keyframes rd-bar { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        @media (prefers-reduced-motion: reduce) { .rd-anim, .rd-anim * { animation-duration: .01s !important; animation-delay: 0s !important } }
      `}</style>
      <div className="rd-anim" onClick={e => e.stopPropagation()}
        style={{ width: "min(420px, 100%)", background: '#fff', borderRadius: 20, boxShadow: '0 24px 70px rgba(0,0,0,.28)', overflow: 'hidden', animation: 'rd-card .3s cubic-bezier(.2,.9,.3,1.1) both' }}>
        <div style={{ padding: '30px 24px 20px', textAlign: 'center' }}>
          <div style={{ position: 'relative', width: 88, height: 88, margin: '0 auto 16px' }}>
            {type !== 'deleted' && <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: c.main, animation: 'rd-ring .9s ease-out .15s both' }} />}
            <svg viewBox="0 0 88 88" width="88" height="88" style={{ position: 'relative', animation: 'rd-pop .5s cubic-bezier(.2,.9,.3,1.2) both' }}>
              <circle cx="44" cy="44" r="40" fill={c.soft} stroke={c.main} strokeWidth="4" />
              {type === 'success' && (
                <path d="M26 46 L39 59 L63 31" fill="none" stroke={c.main} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray="60" strokeDashoffset="60" style={{ animation: 'rd-draw .45s ease-out .35s forwards' }} />
              )}
              {type === 'error' && (
                <g fill="none" stroke={c.main} strokeWidth="7" strokeLinecap="round" strokeDasharray="34" strokeDashoffset="34">
                  <path d="M30 30 L58 58" style={{ animation: 'rd-draw .3s ease-out .35s forwards' }} />
                  <path d="M58 30 L30 58" style={{ animation: 'rd-draw .3s ease-out .55s forwards' }} />
                </g>
              )}
            </svg>
            {type === 'deleted' && (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transformOrigin: '50% 80%', animation: 'rd-shake .6s ease-in-out .45s both' }}>
                <Trash2 size={34} color={c.main} />
              </span>
            )}
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: c.text, animation: 'rd-rise .4s ease-out .45s both' }}>{current.title}</div>
          {current.subtitle && <div style={{ fontSize: '.88rem', color: '#64748b', marginTop: 4, animation: 'rd-rise .4s ease-out .55s both' }}>{current.subtitle}</div>}
        </div>

        {current.details && current.details.length > 0 && (
          <div style={{ margin: '0 20px 6px', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden', animation: 'rd-rise .4s ease-out .65s both' }}>
            <div style={{ padding: '7px 14px', background: '#f8fafc', fontSize: '.7rem', fontWeight: 800, color: '#94a3b8', letterSpacing: '.06em' }}>ผลลัพธ์</div>
            {current.details.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 14, padding: '9px 14px', borderTop: '1px solid #f1f5f9', fontSize: '.84rem', animation: `rd-rise .35s ease-out ${0.75 + i * 0.07}s both` }}>
                <span style={{ color: '#64748b', flexShrink: 0 }}>{d.label}</span>
                <span style={{ color: '#111827', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{d.value}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '14px 20px 18px', display: 'flex', justifyContent: 'center' }}>
          <button onClick={close} autoFocus
            style={{ padding: '9px 28px', borderRadius: 12, border: 'none', background: type === 'error' ? '#dc2626' : '#244B83', color: '#fff', fontWeight: 700, fontSize: '.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {current.closeLabel ?? (type === 'error' ? 'ปิด' : 'ตกลง')}
          </button>
        </div>
        {ms > 0 && <div style={{ height: 3, background: c.soft }}><div key={current.id} style={{ height: '100%', background: c.main, transformOrigin: 'left', animation: `rd-bar ${ms}ms linear forwards` }} /></div>}
      </div>
    </div>
  )
}
