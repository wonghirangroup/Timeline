// employee/src/components/ui/DayOffGuide.tsx
// คู่มือในแอป: จองวันหยุด / สลับกับเพื่อน / ขอเปลี่ยนวัน — เปิดจากปุ่ม "คู่มือ" ในหน้า วันลา → จองหยุด
// ภาพ: public/guide/dayoff/*.webp (จับจากแอปจริงด้วยข้อมูลสมมติ วงเลขแดง = ปุ่มที่ต้องกด) · ปิดด้วย X / Esc / พื้นหลัง
import { useEffect, useState, type ReactNode } from 'react'
import { X, CalendarPlus, Repeat, CalendarClock } from 'lucide-react'
import { lockScroll } from '../../lib/scrollLock'

export type DayOffGuideTab = 'book' | 'swap' | 'change'

interface Step { title: string; body: ReactNode; img: string; alt: string; note?: { tone: 'info' | 'warn' | 'ok'; text: ReactNode } }

const TABS: { id: DayOffGuideTab; label: string; Icon: typeof Repeat }[] = [
  { id: 'book', label: 'จองวันหยุด', Icon: CalendarPlus },
  { id: 'swap', label: 'สลับกับเพื่อน', Icon: Repeat },
  { id: 'change', label: 'ขอเปลี่ยนวัน', Icon: CalendarClock },
]

const INTRO: Record<DayOffGuideTab, ReactNode> = {
  book: <>จองวันหยุดของเดือนผ่านปฏิทินในแอป แล้วรอผู้จัดการอนุมัติ จองได้ไม่เกินโควต้าต่อเดือนของคุณ</>,
  swap: <>วันหยุดที่อนุมัติแล้วแก้เองตรงๆ ไม่ได้ ถ้ามีเพื่อนในสาขายินดีแลกวันกัน ใช้วิธีนี้ — <b>เพื่อนกดยอมรับแล้วสลับทันที ไม่ต้องรอแอดมิน</b></>,
  change: <>อยากย้ายวันหยุดที่อนุมัติแล้วไปวันอื่น ส่งคำขอให้แอดมินอนุมัติ — <b>ระหว่างรอ วันเดิมยังใช้ได้ตามปกติ</b></>,
}

const STEPS: Record<DayOffGuideTab, Step[]> = {
  book: [
    { title: 'เปิดหน้าจองหยุด', img: 'book-1', alt: 'หน้าจองหยุด แสดงปฏิทินเดือนที่เปิดรับจอง',
      body: <>ที่เมนูล่างกด <b>วันลา</b> → แท็บ <b>จองหยุด</b> → <b>วันหยุดประจำ</b> ดูว่าเดือนนั้นขึ้น “เปิดรับการจอง” (สีเขียว) ถ้าขึ้นว่ายังไม่เปิด ให้รอประกาศจากผู้จัดการ</>,
      note: { tone: 'info', text: <>ข้อความ “เลือกวันหยุดได้สูงสุด … วัน/เดือน” บอกโควต้าของคุณ ตัวเลขในวงเล็บคือจำนวนที่เลือกแล้ว</> } },
    { title: 'แตะวันที่อยากหยุด', img: 'book-2', alt: 'ปฏิทินที่เลือกวันหยุดไว้ 3 วัน และปุ่มส่งคำขอ',
      body: <>แตะวันที่ต้องการ (เลือกได้หลายวันตามโควต้า) วันที่เลือกจะเป็นสีน้ำเงิน แตะซ้ำเพื่อยกเลิก วันที่ผ่านมาแล้วเลือกไม่ได้</>,
      note: { tone: 'info', text: <>จุดเล็กใต้ตัวเลข = มีเพื่อนจองวันนั้นไว้แล้ว (จุดแดง = ตำแหน่งเดียวกัน) แตะดูชื่อได้ ยังจองได้ แต่ถ้าเป็นตำแหน่งเดียวกัน ต้องรอแอดมินพิจารณา</> } },
    { title: 'กดส่งคำขอ', img: 'book-3', alt: 'หน้าต่างส่งคำขอจองวันหยุดแล้ว',
      body: <>กดปุ่ม <b>ส่งคำขอหยุด … วัน</b> เมื่อสำเร็จจะขึ้น “ส่งคำขอจองวันหยุดแล้ว” รอผู้จัดการพิจารณา วันที่อนุมัติแล้วจะเป็นสีเขียว “อนุมัติแล้ว”</>,
      note: { tone: 'ok', text: <>วันที่ยัง <b>รอพิจารณา</b> ยกเลิกเองได้ที่ปุ่ม “ยกเลิก” · วันที่อนุมัติแล้ว ให้ใช้แท็บ “สลับกับเพื่อน” หรือ “ขอเปลี่ยนวัน”</> } },
  ],
  swap: [
    { title: 'กด “ขอสลับ” ที่วันของคุณ', img: 'swap-1', alt: 'รายการวันหยุดที่อนุมัติแล้ว แต่ละวันมีปุ่มขอสลับ',
      body: <>ที่หน้า วันลา → จองหยุด → วันหยุดประจำ จะเห็นวันหยุดที่อนุมัติแล้ว กดปุ่ม <b>ขอสลับ</b> ที่วันที่อยากแลก</> },
    { title: 'เลือกเพื่อนที่จะสลับด้วย', img: 'swap-2', alt: 'รายชื่อเพื่อนพร้อมวันหยุดของเขา',
      body: <>จะมีรายชื่อเพื่อนพร้อมวันหยุดของเขา กด <b>ขอสลับ</b> ข้างชื่อเพื่อนที่ต้องการ</>,
      note: { tone: 'info', text: <>มีเฉพาะเพื่อนสาขาเดียวกันที่วันหยุดอนุมัติแล้ว ถ้าไม่เห็นชื่อเพื่อน แปลว่าวันหยุดของเขายังไม่อนุมัติ</> } },
    { title: 'รอเพื่อนตอบรับ', img: 'swap-3', alt: 'แถบสีเหลืองบอกว่ารอเพื่อนตอบรับคำขอสลับ',
      body: <>ด้านบนจะมีแถบสีเหลือง <b>“รอ … ตอบรับคำขอสลับวันหยุด”</b> วันหยุดของคุณยังเป็นวันเดิมจนกว่าเพื่อนจะตอบ</> },
    { title: 'ฝั่งเพื่อน: ยอมรับหรือปฏิเสธ', img: 'swap-4', alt: 'กล่องคำขอสลับที่เพื่อนเห็น มีปุ่มยอมรับและปฏิเสธ',
      body: <>เพื่อนจะเห็นกล่องสีม่วง <b>“คำขอสลับวันหยุด”</b> บอกว่าใครขอสลับวันไหนกับวันไหน กด <b>ยอมรับ</b> วันหยุดสลับกันทันที หรือกด <b>ปฏิเสธ</b></>,
      note: { tone: 'warn', text: <>ถ้าขึ้น “สลับไม่ได้ — คุณมีวันหยุดวันนั้นอยู่แล้ว” แปลว่าวันที่จะได้ชนกับวันหยุดอื่น ให้ลองวันอื่น หรือใช้ “ขอเปลี่ยนวัน”</> } },
  ],
  change: [
    { title: 'กด “แก้ไขวันที่จอง”', img: 'change-1', alt: 'ปุ่มแก้ไขวันที่จอง (ขอเปลี่ยนวัน) ใต้รายการวันหยุด',
      body: <>ใต้รายการวันหยุดที่อนุมัติแล้ว กดปุ่ม <b>แก้ไขวันที่จอง (ขอเปลี่ยนวัน)</b></>,
      note: { tone: 'info', text: <>ปุ่มนี้มีเมื่อคุณมีวันหยุดที่อนุมัติแล้ว และช่วงเปิดรับจองของเดือนนั้นยังเปิดอยู่ ถ้าปิดแล้ว ให้แจ้งแอดมิน</> } },
    { title: 'เลือกวันที่จะย้าย', img: 'change-2', alt: 'รายการวันหยุดที่อนุมัติแล้ว แต่ละวันมีปุ่มเปลี่ยนวันนี้',
      body: <>กด <b>เปลี่ยนวันนี้</b> ที่วันที่อยากย้าย</> },
    { title: 'เลือกวันใหม่จากปฏิทิน', img: 'change-3', alt: 'ปฏิทินเลือกวันใหม่ วันเดิมสีเขียว วันที่เลือกสีน้ำเงิน',
      body: <>แตะวันที่ต้องการหยุดแทน — <b>เขียว = วันเดิม</b> · <b>น้ำเงิน = วันใหม่ที่เลือก</b> · <b>เทา = เลือกไม่ได้</b> (ผ่านมาแล้ว หรือมีวันหยุดอยู่แล้ว) เปลี่ยนเดือนได้ด้วยลูกศร</> },
    { title: 'ส่งคำขอ', img: 'change-4', alt: 'ข้อความส่งคำขอเปลี่ยนวันแล้ว',
      body: <>กด <b>ส่งคำขอเปลี่ยนวัน (รอแอดมินอนุมัติ)</b> เมื่อสำเร็จจะขึ้น “ส่งคำขอเปลี่ยนวันแล้ว” กด <b>ตกลง</b></> },
    { title: 'ดูสถานะ หรือยกเลิกคำขอ', img: 'change-5', alt: 'กล่องสีเหลืองใต้วันเดิมบอกว่ารอแอดมินอนุมัติ',
      body: <>ใต้วันเดิมมีกล่องสีเหลือง <b>“ขอเปลี่ยนเป็น … รอแอดมินอนุมัติ (วันเดิมยังใช้ได้)”</b> เปลี่ยนใจกด <b>ยกเลิกการเปลี่ยน</b> ได้</>,
      note: { tone: 'ok', text: <>แอดมินอนุมัติ → วันเดิมถูกแทนที่ด้วยวันใหม่ · แอดมินไม่อนุมัติ → วันเดิมยังอยู่เหมือนเดิม</> } },
  ],
}

const NOTE_STYLE = {
  info: { bg: '#EAF2FF', fg: '#1E3A8A' },
  warn: { bg: '#FFF4D6', fg: '#92400E' },
  ok:   { bg: '#E3F6EA', fg: '#15803D' },
} as const

export function DayOffGuide({ onClose, initialTab = 'book' }: { onClose: () => void; initialTab?: DayOffGuideTab }) {
  const [tab, setTab] = useState<DayOffGuideTab>(initialTab)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const unlock = lockScroll()
    return () => { document.removeEventListener('keydown', onKey); unlock() }
  }, [onClose])

  const steps = STEPS[tab]
  return (
    <div role="dialog" aria-modal="true" aria-label="คู่มือจองหยุด สลับ และแก้ไขวันหยุด"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: '#EAF4FF', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flexShrink: 0, background: '#fff', borderBottom: '1px solid #E3ECF8', padding: 'max(12px, env(safe-area-inset-top, 0px)) 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0B1B4D' }}>คู่มือจองหยุด · สลับ · แก้ไข</div>
          <button onClick={onClose} aria-label="ปิดคู่มือ"
            style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: '#EEF4FF', color: '#1D4ED8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>
        <div role="tablist" style={{ display: 'flex', gap: 6, padding: 4, borderRadius: 99, background: '#EAF2FF' }}>
          {TABS.map(({ id, label, Icon }) => {
            const on = tab === id
            return (
              <button key={id} role="tab" aria-selected={on} onClick={() => setTab(id)}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '9px 4px', borderRadius: 99, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 800, whiteSpace: 'nowrap',
                  background: on ? '#fff' : 'transparent', color: on ? '#1D6FE0' : '#64748B', boxShadow: on ? '0 3px 10px rgba(29,111,224,0.18)' : 'none' }}>
                <Icon size={14} /> {label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '16px 16px max(28px, env(safe-area-inset-bottom, 0px))' }}>
        <div style={{ fontSize: '0.9rem', color: '#475875', lineHeight: 1.7, marginBottom: 16 }}>{INTRO[tab]}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {steps.map((s, i) => (
            <div key={tab + i} style={{ background: '#fff', border: '1px solid #E3ECF8', borderRadius: 22, padding: 16, boxShadow: '0 6px 18px rgba(36,75,131,0.08)' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: '50%', background: '#1D6FE0', color: '#fff', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0B1B4D', paddingTop: 2 }}>{s.title}</div>
              </div>
              <div style={{ fontSize: '0.88rem', color: '#475875', lineHeight: 1.7 }}>{s.body}</div>
              {s.note && (
                <div style={{ marginTop: 10, padding: '10px 12px', borderRadius: 12, background: NOTE_STYLE[s.note.tone].bg, color: NOTE_STYLE[s.note.tone].fg, fontSize: '0.8rem', lineHeight: 1.65 }}>{s.note.text}</div>
              )}
              <img src={`/guide/dayoff/${s.img}.webp`} alt={s.alt} width={520} height={1126} loading="lazy"
                style={{ display: 'block', width: '100%', maxWidth: 260, height: 'auto', margin: '14px auto 0', borderRadius: 20, border: '1px solid #E3ECF8', boxShadow: '0 6px 18px rgba(36,75,131,0.12)' }} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, textAlign: 'center', fontSize: '0.78rem', color: '#64748B', lineHeight: 1.7 }}>
          ภาพประกอบใช้ข้อมูลตัวอย่าง · วงกลมแดงเลขลำดับ = ปุ่มที่ต้องกด<br />ไม่แน่ใจ ถามแอดมินได้เสมอ
        </div>
      </div>
    </div>
  )
}
