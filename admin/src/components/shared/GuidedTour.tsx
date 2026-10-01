// admin/src/components/shared/GuidedTour.tsx
// ทัวร์แนะนำหน้าแบบมีสปอตไลท์ + การ์ดคำอธิบายทีละขั้นตอน — เดิมเขียนซ้ำกันคนละ
// ชุดในหน้าสาขา (BranchTour) กับหน้ากะ (ShiftTour) ทุกอย่างเหมือนกันทุกประการ
// ยกเว้นเนื้อหา เลยดึงมารวมเป็นตัวเดียวให้ทุกหน้าเรียกใช้ซ้ำได้ (feedback
// 2026-10-01: "อันไหนที่เป็นขั้นตอนก็อยากให้ออกมาในรูปแบบ Tipbox เหมือนกับกด
// วิธีใช้งาน") — หน้าที่จะใช้แค่ประกาศ steps ของตัวเอง แล้วใส่ data-tour="..."
// บน element เป้าหมาย ไม่ต้องเขียน overlay/สปอตไลท์เองอีก
import { useEffect, useState } from 'react'

export interface TourStep { selector: string; title: string; body: string }

export default function GuidedTour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<{ top: number; left: number; bottom: number; right: number; width: number; height: number } | null>(null)
  const PAD = 10

  useEffect(() => {
    const el = document.querySelector(`[data-tour="${steps[step].selector}"]`) as HTMLElement | null
    if (!el) { setRect(null); return }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    const timer = setTimeout(() => {
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, bottom: r.bottom, right: r.right, width: r.width, height: r.height })
    }, 200)
    return () => clearTimeout(timer)
  }, [step, steps])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault()
        if (step === steps.length - 1) { onClose(); return }
        setStep(s => s + 1)
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        setStep(s => Math.max(0, s - 1))
      } else if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step, steps.length, onClose])

  const TW = 304
  let tipTop = 80, tipLeft = 16
  if (rect) {
    const wh = window.innerHeight
    const belowOk = rect.bottom + PAD + 12 + 210 < wh
    tipTop  = belowOk ? rect.bottom + PAD + 12 : Math.max(70, rect.top - 210 - PAD)
    tipLeft = Math.max(16, Math.min(rect.left, window.innerWidth - TW - 16))
  }

  const cur   = steps[step]
  const total = steps.length

  return (
    <>
      <style>{`
        @keyframes guidedTourGlow{0%,100%{border-color:#244B83;box-shadow:0 0 0 5px rgba(36,75,131,0.18);}50%{border-color:#fbbf24;box-shadow:0 0 0 10px rgba(251,191,36,0.10);}}
        @keyframes guidedTourTipIn{from{opacity:0;transform:translateY(8px);}to{opacity:1;transform:none;}}
      `}</style>

      {/* 4-quadrant dim overlay — เจาะช่องให้ spotlight ไม่โดนมืด */}
      {rect ? (
        <>
          <div onClick={onClose} style={{ position:'fixed',top:0,left:0,right:0,height:Math.max(0,rect.top-PAD),background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.bottom+PAD,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.top-PAD,left:0,width:Math.max(0,rect.left-PAD),height:rect.height+PAD*2,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
          <div onClick={onClose} style={{ position:'fixed',top:rect.top-PAD,left:rect.right+PAD,right:0,height:rect.height+PAD*2,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
        </>
      ) : (
        <div onClick={onClose} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:9000,cursor:'default' }} />
      )}

      {/* Animated spotlight ring */}
      {rect && (
        <div style={{ position:'fixed',pointerEvents:'none',top:rect.top-PAD,left:rect.left-PAD,width:rect.width+PAD*2,height:rect.height+PAD*2,borderRadius:12,border:'3px solid #244B83',zIndex:9001,animation:'guidedTourGlow 1.4s ease-in-out infinite' }} />
      )}

      {/* Tooltip card */}
      <div key={step} style={{ position:'fixed',top:tipTop,left:tipLeft,width:TW,background:'#fff',borderRadius:16,boxShadow:'0 20px 60px rgba(0,0,0,0.25)',zIndex:9002,overflow:'hidden',animation:'guidedTourTipIn 0.22s cubic-bezier(0.16,1,0.3,1)' }}>
        <div style={{ background:'linear-gradient(135deg,#244B83,#244B83)',padding:'14px 16px 12px',position:'relative' }}>
          <div style={{ fontWeight:800,color:'#fff',fontSize:'15px',lineHeight:1.3,paddingRight:44 }}>{cur.title}</div>
          <span style={{ position:'absolute',top:11,right:14,fontSize:'11px',color:'rgba(255,255,255,0.85)',fontWeight:700,background:'rgba(0,0,0,0.18)',borderRadius:99,padding:'2px 8px' }}>{step+1}/{total}</span>
        </div>
        <div style={{ padding:'12px 16px 8px',fontSize:'13px',color:'#374151',lineHeight:1.65 }}>{cur.body}</div>
        <div style={{ padding:'2px 16px 8px',display:'flex',gap:5 }}>
          {steps.map((_,i) => (
            <button key={i} onClick={()=>setStep(i)} style={{ width:i===step?20:7,height:7,borderRadius:99,border:'none',cursor:'pointer',padding:0,background:i===step?'#244B83':i<step?'#B2C0D4':'#e5e7eb',transition:'all 0.25s' }} />
          ))}
        </div>
        <div style={{ padding:'4px 16px 14px',display:'flex',alignItems:'center',justifyContent:'space-between' }}>
          <button onClick={onClose} style={{ padding:'7px 10px',borderRadius:8,border:'1px solid #e5e7eb',background:'#fff',color:'var(--text-muted)',fontSize:'12px',cursor:'pointer',fontFamily:'inherit' }}>✕ ปิด</button>
          <div style={{ display:'flex',gap:6 }}>
            {step > 0 && (
              <button onClick={()=>setStep(s=>s-1)} style={{ padding:'7px 12px',borderRadius:8,border:'1px solid #e5e7eb',background:'#f9fafb',color:'#374151',fontSize:'12px',cursor:'pointer',fontFamily:'inherit' }}>← ก่อนหน้า</button>
            )}
            {step < total-1 ? (
              <button onClick={()=>setStep(s=>s+1)} style={{ padding:'7px 18px',borderRadius:8,border:'none',background:'#244B83',color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer',fontFamily:'inherit' }}>ถัดไป →</button>
            ) : (
              <button onClick={onClose} style={{ padding:'7px 18px',borderRadius:8,border:'none',background:'#16a34a',color:'#fff',fontWeight:700,fontSize:'13px',cursor:'pointer',fontFamily:'inherit' }}>✓ เสร็จแล้ว!</button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
