// admin/src/components/ui/StatDetailModal.tsx
// popup รายละเอียดหลังการ์ดสรุป — ใช้กับการ์ดที่ไม่มีรายการให้ "กรอง" ในหน้าเดียวกัน (เช่น การ์ดสรุปในหน้ารายงาน/ปฏิทิน)
// feedback 2026-10-06 "ตรงไหนที่มี Card สรุปสามารถกดเข้าไปเพื่อดูได้ จะเป็น popup หรือ Filter ก็ได้ ในทุกๆหน้าของแอดมิน"
import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import Modal from './Modal'

export interface StatRow { key: string; primary: ReactNode; secondary?: ReactNode; right?: ReactNode }

interface Props {
  title: string
  /** จำนวนรวมที่แสดงข้างหัวข้อ (ไม่ใส่ = นับจาก rows) */
  count?: number | string
  color?: string
  rows: StatRow[]
  /** ข้อความเมื่อไม่มีรายการ */
  empty?: string
  /** แสดงผลสรุปเพิ่มเหนือรายการ (เช่น ยอดรวมเงิน) */
  footer?: ReactNode
  onClose: () => void
}

const cell: CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '10px 18px', borderTop: '1px solid #f1f5f9', fontSize: '0.85rem' }

export default function StatDetailModal({ title, count, color = '#244B83', rows, empty = 'ไม่มีรายการ', footer, onClose }: Props) {
  return (
    <Modal onClose={onClose} width={480} labelledBy="stat-detail-title">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 18px' }}>
        <h3 id="stat-detail-title" style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#111827', flex: 1 }}>
          {title}
          <span style={{ marginLeft: 8, padding: '2px 10px', borderRadius: 99, background: `color-mix(in srgb, ${color} 14%, white)`, color, fontSize: '0.8rem', fontWeight: 800 }}>{count ?? rows.length}</span>
        </h3>
        <button onClick={onClose} aria-label="ปิด" style={{ border: 'none', background: '#f1f5f9', borderRadius: 8, width: 30, height: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={15} /></button>
      </div>
      <div style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        {rows.length === 0
          ? <div style={{ ...cell, justifyContent: 'center', color: '#94a3b8', padding: '30px 18px' }}>{empty}</div>
          : rows.map(r => (
            <div key={r.key} style={cell}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: '#111827' }}>{r.primary}</div>
                {r.secondary && <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>{r.secondary}</div>}
              </div>
              {r.right && <div style={{ flexShrink: 0, textAlign: 'right', fontSize: '0.8rem', color: '#475569', fontWeight: 600 }}>{r.right}</div>}
            </div>
          ))}
      </div>
      {footer && <div style={{ ...cell, background: '#f8fafc', fontWeight: 700 }}>{footer}</div>}
    </Modal>
  )
}
