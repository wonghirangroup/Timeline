// admin/src/pages/manual/index.tsx
// หน้า "วิธีการใช้งาน" — คู่มือแอดมินในแอป: หมวดซ้าย · ค้นหาหัวข้อ · ภาพหน้าจอพร้อมวงเลขชี้ปุ่ม
// พิมพ์ได้ 2 แบบ: "เฉพาะหมวดนี้" / "ทั้งเล่ม" (ใช้ระบบพิมพ์ของเบราว์เซอร์ → บันทึกเป็น PDF) — เนื้อหาอยู่ใน content.ts
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { BookOpen, Search, Printer, FileDown, Info, Lightbulb, AlertTriangle, ZoomIn, X, ChevronRight } from 'lucide-react'
import { useIsMobile } from '../../hooks/useIsMobile'
import Modal from '../../components/ui/Modal'
import { MANUAL } from './content'
import type { Block, Category, Topic, NoteTone } from './content'

const NAVY = '#244B83'
const INK = '#131C45'

// **ตัวหนา** แบบง่าย
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return <>{parts.map((p, i) => p.startsWith('**') ? <b key={i} style={{ color: INK }}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)}</>
}

const NOTE: Record<NoteTone, { bg: string; border: string; color: string; icon: ReactNode; label: string }> = {
  info: { bg: '#F1F5F9', border: '#CBD5E1', color: '#334155', icon: <Info size={16} />, label: 'หมายเหตุ' },
  tip:  { bg: '#ECFDF5', border: '#A7F3D0', color: '#065F46', icon: <Lightbulb size={16} />, label: 'เคล็ดลับ' },
  warn: { bg: '#FFFBEB', border: '#FDE68A', color: '#92400E', icon: <AlertTriangle size={16} />, label: 'ข้อควรระวัง' },
}

function NumDot({ n, size = 24 }: { n: number | string; size?: number }) {
  return (
    <span style={{ width: size, height: size, borderRadius: '50%', background: '#ef2d56', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.54, fontWeight: 800, flexShrink: 0, lineHeight: 1 }}>{n}</span>
  )
}

function BlockView({ b, onZoom }: { b: Block; onZoom: (src: string, alt: string) => void }) {
  if (b.type === 'p') return <p style={{ margin: '0 0 12px', lineHeight: 1.75, color: '#374151' }}><Inline text={b.text} /></p>

  if (b.type === 'steps') {
    return (
      <ol style={{ listStyle: 'none', margin: '0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {b.items.map((it, i) => (
          <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', lineHeight: 1.7, color: '#374151' }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#E6ECF4', color: NAVY, fontWeight: 800, fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</span>
            <span><Inline text={it} /></span>
          </li>
        ))}
      </ol>
    )
  }

  if (b.type === 'image') {
    return (
      <figure style={{ margin: '4px 0 18px', breakInside: 'avoid' }}>
        <button type="button" onClick={() => onZoom(b.src, b.alt)} title="คลิกเพื่อขยายภาพ" aria-label={`ขยายภาพ: ${b.alt}`}
          style={{ position: 'relative', display: 'block', width: '100%', maxWidth: b.width ?? 960, padding: 0, border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', background: '#F8FAFC', cursor: 'zoom-in', boxShadow: '0 2px 10px rgba(15,23,42,0.06)' }}>
          <img src={b.src} alt={b.alt} loading="lazy" style={{ display: 'block', width: '100%', height: 'auto' }} />
          <span className="no-print" style={{ position: 'absolute', right: 8, bottom: 8, background: 'rgba(15,23,42,0.7)', color: '#fff', borderRadius: 8, padding: '3px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}><ZoomIn size={12} /> ขยาย</span>
        </button>
        <figcaption style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {b.callouts.map(c => (
            <div key={c.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: '0.88rem', color: '#4B5563', lineHeight: 1.6 }}>
              <NumDot n={c.n} size={22} /><span><Inline text={c.text} /></span>
            </div>
          ))}
        </figcaption>
      </figure>
    )
  }

  const t = NOTE[b.tone]
  return (
    <div role="note" style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, padding: '11px 14px', margin: '0 0 12px', color: t.color, fontSize: '0.86rem', lineHeight: 1.65, breakInside: 'avoid' }}>
      <span style={{ marginTop: 2, flexShrink: 0 }}>{t.icon}</span>
      <span><b>{t.label}: </b><Inline text={b.text} /></span>
    </div>
  )
}

function TopicView({ topic, onZoom, catTitle }: { topic: Topic; onZoom: (src: string, alt: string) => void; catTitle?: string }) {
  return (
    <section id={`topic-${topic.id}`} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: '22px 26px', marginBottom: 18, scrollMarginTop: 90, breakInside: 'avoid-page' }}>
      {catTitle && <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', marginBottom: 4 }}>{catTitle}</div>}
      <h2 style={{ margin: '0 0 6px', fontSize: '1.2rem', fontWeight: 800, color: INK }}>{topic.title}</h2>
      <p style={{ margin: '0 0 16px', color: '#6B7280', lineHeight: 1.65, fontSize: '0.92rem' }}>{topic.intro}</p>
      {topic.blocks.map((b, i) => <BlockView key={i} b={b} onZoom={onZoom} />)}
    </section>
  )
}

function topicText(t: Topic): string {
  const parts: string[] = [t.title, t.intro, t.keywords ?? '']
  for (const b of t.blocks) {
    if (b.type === 'p' || b.type === 'note') parts.push(b.text)
    else if (b.type === 'steps') parts.push(...b.items)
    else if (b.type === 'image') parts.push(b.alt, ...b.callouts.map(c => c.text))
  }
  return parts.join(' ').toLowerCase()
}

export default function ManualPage() {
  const isMobile = useIsMobile(900)
  const [catId, setCatId] = useState(MANUAL[0].id)
  const [query, setQuery] = useState('')
  const [zoom, setZoom] = useState<{ src: string; alt: string } | null>(null)
  const [printAll, setPrintAll] = useState(false)
  const [activeTopic, setActiveTopic] = useState<string | null>(null)
  const topRef = useRef<HTMLDivElement>(null)

  const cat: Category = MANUAL.find(c => c.id === catId) ?? MANUAL[0]
  const q = query.trim().toLowerCase()

  // ผลค้นหาข้ามทุกหมวด
  const results = useMemo(() => {
    if (!q) return null
    return MANUAL.flatMap(c => c.topics.filter(t => topicText(t).includes(q)).map(t => ({ cat: c, topic: t })))
  }, [q])

  // พิมพ์ทั้งเล่ม: เรนเดอร์ทุกหมวดก่อน แล้วค่อยเรียก print · เสร็จแล้วกลับมาโหมดปกติ
  useEffect(() => {
    if (!printAll) return
    const done = () => setPrintAll(false)
    window.addEventListener('afterprint', done, { once: true })
    const t = setTimeout(() => window.print(), 400)
    return () => { clearTimeout(t); window.removeEventListener('afterprint', done) }
  }, [printAll])

  // ไฮไลต์หัวข้อที่กำลังอ่านในแถบซ้าย
  useEffect(() => {
    if (results || printAll) return
    const els = cat.topics.map(t => document.getElementById(`topic-${t.id}`)).filter(Boolean) as HTMLElement[]
    if (els.length === 0) return
    setActiveTopic(cat.topics[0].id)
    const io = new IntersectionObserver(entries => {
      const vis = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
      if (vis) setActiveTopic(vis.target.id.replace('topic-', ''))
    }, { rootMargin: '-90px 0px -60% 0px' })
    els.forEach(e => io.observe(e))
    return () => io.disconnect()
  }, [cat, results, printAll])

  function goCat(id: string) { setCatId(id); setQuery(''); setTimeout(() => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 30) }
  function goTopic(catOf: string, topicId: string) {
    if (catOf !== catId || results) { setCatId(catOf); setQuery('') }
    setTimeout(() => document.getElementById(`topic-${topicId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const shown: { cat: Category; topics: Topic[] }[] = printAll
    ? MANUAL.map(c => ({ cat: c, topics: c.topics }))
    : results ? [] : [{ cat, topics: cat.topics }]

  return (
    <div ref={topRef}>
      {/* หัวหน้า + ค้นหา + ปุ่มพิมพ์ */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><BookOpen size={22} /></div>
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <h1 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, color: INK }}>วิธีการใช้งาน</h1>
          <div style={{ fontSize: '0.84rem', color: '#6B7280', marginTop: 2 }}>คู่มือทีละขั้นตอน พร้อมภาพหน้าจอและวงเลขชี้ตำแหน่งปุ่ม</div>
        </div>
        <div style={{ position: 'relative', flex: '1 1 260px', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="ค้นหาหัวข้อ เช่น ลา, เพิ่มพนักงาน, เช็คอิน"
            style={{ width: '100%', boxSizing: 'border-box', padding: '10px 34px 10px 36px', borderRadius: 12, border: '1px solid #D1D5DB', fontSize: '0.9rem', fontFamily: 'inherit', background: '#fff' }} />
          {query && <button onClick={() => setQuery('')} aria-label="ล้างคำค้น" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#6B7280', display: 'flex' }}><X size={15} /></button>}
        </div>
        <button onClick={() => window.print()} style={btn(false)}><Printer size={15} /> เฉพาะหมวดนี้</button>
        <button onClick={() => setPrintAll(true)} style={btn(true)}><FileDown size={15} /> ทั้งเล่ม</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '280px minmax(0, 1fr)', gap: 22, alignItems: 'start' }}>
        {/* แถบหมวดซ้าย */}
        <nav className="no-print" aria-label="หมวดคู่มือ" style={{ position: isMobile ? 'static' : 'sticky', top: 12, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 10, maxHeight: isMobile ? 'none' : 'calc(100vh - 150px)', overflowY: 'auto' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94A3B8', letterSpacing: '.06em', padding: '6px 10px' }}>หมวดคู่มือ</div>
          {MANUAL.map(c => {
            const open = c.id === catId && !results
            return (
              <div key={c.id}>
                <button onClick={() => goCat(c.id)} aria-expanded={open}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.92rem', fontWeight: 800, textAlign: 'left',
                    background: open ? '#E6ECF4' : 'transparent', color: open ? INK : '#374151' }}>
                  <span style={{ flex: 1 }}>{c.title}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', background: '#F1F5F9', borderRadius: 99, padding: '1px 8px' }}>{c.topics.length}</span>
                  <ChevronRight size={15} style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s', color: '#94A3B8' }} />
                </button>
                {open && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 1, padding: '4px 0 8px 12px' }}>
                    {c.topics.map(t => (
                      <button key={t.id} onClick={() => goTopic(c.id, t.id)}
                        style={{ textAlign: 'left', padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', lineHeight: 1.4,
                          background: activeTopic === t.id ? '#F4F6F9' : 'transparent', color: activeTopic === t.id ? NAVY : '#4B5563', fontWeight: activeTopic === t.id ? 800 : 500,
                          borderLeft: `3px solid ${activeTopic === t.id ? NAVY : 'transparent'}` }}>
                        {t.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* เนื้อหา */}
        <main style={{ minWidth: 0 }}>
          {results ? (
            <div>
              <div className="no-print" style={{ fontSize: '0.88rem', color: '#6B7280', marginBottom: 12 }}>
                พบ <b style={{ color: INK }}>{results.length}</b> หัวข้อที่ตรงกับ “{query}”
              </div>
              {results.length === 0 && (
                <div style={{ background: '#fff', border: '1px dashed #CBD5E1', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#6B7280' }}>
                  ไม่พบหัวข้อที่ตรงกัน ลองใช้คำสั้นลง เช่น “ลา” “พนักงาน” “เช็คอิน”
                </div>
              )}
              {results.map(r => <TopicView key={r.topic.id} topic={r.topic} catTitle={r.cat.title} onZoom={(src, alt) => setZoom({ src, alt })} />)}
            </div>
          ) : shown.map(g => (
            <div key={g.cat.id}>
              <div style={{ margin: '0 0 14px', padding: '2px 4px' }}>
                <h2 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 800, color: INK }}>{g.cat.title}</h2>
                <p style={{ margin: '4px 0 0', color: '#6B7280', fontSize: '0.92rem' }}>{g.cat.intro}</p>
              </div>
              {g.topics.map(t => <TopicView key={t.id} topic={t} onZoom={(src, alt) => setZoom({ src, alt })} />)}
            </div>
          ))}

          <div className="no-print" style={{ textAlign: 'center', color: '#94A3B8', fontSize: '0.78rem', padding: '8px 0 24px' }}>
            ภาพในคู่มือใช้ข้อมูลสมมติ — หน้าจอจริงของคุณจะแสดงข้อมูลของบริษัทคุณเอง
          </div>
        </main>
      </div>

      {zoom && (
        <Modal onClose={() => setZoom(null)} width={1280} labelledBy="manual-zoom-title">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #E5E7EB' }}>
            <span id="manual-zoom-title" style={{ fontWeight: 800, color: INK }}>{zoom.alt}</span>
            <button onClick={() => setZoom(null)} aria-label="ปิด" style={{ border: 'none', background: '#F1F5F9', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
          </div>
          <img src={zoom.src} alt={zoom.alt} style={{ display: 'block', width: '100%', height: 'auto' }} />
        </Modal>
      )}
    </div>
  )
}

function btn(primary: boolean): React.CSSProperties {
  return { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 12, fontFamily: 'inherit', fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
    border: primary ? 'none' : '1px solid #D1D5DB', background: primary ? NAVY : '#fff', color: primary ? '#fff' : '#374151' }
}
