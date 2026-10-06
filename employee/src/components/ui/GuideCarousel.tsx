// employee/src/components/ui/GuideCarousel.tsx
// คู่มือเข้าใช้งานครั้งแรก (6 ภาพ: ค้นหาชื่อ → เลือกชื่อ → กรอกรหัส → รูปโปรไฟล์ → ยืนยัน → พร้อมใช้งาน)
// ปัดซ้าย-ขวาได้ (scroll-snap ของเบราว์เซอร์ ไม่ใช้ lib) · ปิดด้วย "ข้าม"/"เริ่มเลย"/Esc
// ใช้ 2 ที่: หน้าผูกบัญชี (เล่นครั้งแรกครั้งเดียว) และหน้าโปรไฟล์ (เปิดดูซ้ำได้ตลอด)
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

const STEPS = [1, 2, 3, 4, 5, 6].map(n => ({ n, src: `/guide/step-${n}.webp`, alt: n === 6 ? 'เรียบร้อย พร้อมใช้งาน YooNai แล้ว' : `ขั้นตอนที่ ${n}` }))
const SEEN_KEY = 'yoonai_guide_seen'

export function guideSeen(): boolean {
  try { return localStorage.getItem(SEEN_KEY) === '1' } catch { return false }
}
function markSeen() { try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ไม่มี storage ก็ข้าม */ } }

export function GuideCarousel({ onClose }: { onClose: () => void }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  const last = STEPS.length - 1

  function close() { markSeen(); onClose() }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  function go(i: number) {
    const el = trackRef.current
    if (!el) return
    const t = Math.max(0, Math.min(last, i))
    el.scrollTo({ left: t * el.clientWidth, behavior: 'smooth' })
  }
  function onScroll() {
    const el = trackRef.current
    if (!el || el.clientWidth === 0) return
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  const navBtn = (disabled: boolean): React.CSSProperties => ({
    width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: disabled ? 'default' : 'pointer',
    background: 'rgba(255,255,255,0.16)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    opacity: disabled ? 0.3 : 1, flexShrink: 0,
  })

  return (
    <div role="dialog" aria-modal="true" aria-label="คู่มือการใช้งาน YooNai"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#0f1b33', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', color: '#fff', flexShrink: 0 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 700, opacity: 0.9 }}>คู่มือการใช้งาน · {index + 1}/{STEPS.length}</span>
        <button onClick={close} aria-label="ปิดคู่มือ"
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(255,255,255,0.16)', border: 'none', color: '#fff', borderRadius: 99, padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          ข้าม <X size={14} />
        </button>
      </div>

      <div ref={trackRef} onScroll={onScroll}
        style={{ flex: 1, minHeight: 0, display: 'flex', overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {STEPS.map((s, i) => (
          <div key={s.n} style={{ flex: '0 0 100%', scrollSnapAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px', boxSizing: 'border-box' }}>
            <img src={s.src} alt={s.alt} draggable={false} loading={i < 2 ? 'eager' : 'lazy'}
              style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: 18, boxShadow: '0 10px 40px rgba(0,0,0,0.4)' }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px calc(14px + env(safe-area-inset-bottom))', flexShrink: 0 }}>
        <button onClick={() => go(index - 1)} disabled={index === 0} aria-label="ก่อนหน้า" style={navBtn(index === 0)}><ChevronLeft size={22} /></button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          {STEPS.map((s, i) => (
            <button key={s.n} onClick={() => go(i)} aria-label={`ไปหน้า ${i + 1}`}
              style={{ width: i === index ? 22 : 8, height: 8, borderRadius: 99, border: 'none', padding: 0, cursor: 'pointer', background: i === index ? '#F59E0B' : 'rgba(255,255,255,0.35)', transition: 'width .2s' }} />
          ))}
        </div>
        {index === last
          ? <button onClick={close} style={{ height: 44, borderRadius: 99, border: 'none', background: '#F59E0B', color: '#1f2937', fontWeight: 800, fontSize: '0.9rem', padding: '0 18px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>เริ่มเลย</button>
          : <button onClick={() => go(index + 1)} aria-label="ถัดไป" style={navBtn(false)}><ChevronRight size={22} /></button>}
      </div>
    </div>
  )
}
