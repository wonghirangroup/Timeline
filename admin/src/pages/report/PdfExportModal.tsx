// admin/src/pages/report/PdfExportModal.tsx
// พิมพ์ / PDF รายงานการเข้างาน แบบ "ตารางวันหยุด + วันลา" (หน้าตาเดียวกับ Export ตารางแยกกลุ่มในปฏิทินรวม):
// ติ๊กเลือกคนที่จะออก + กรองสถานะพนักงาน + กรองสาขา + กรองประเภท (หยุด/ลา/สาย/ขาด ...) — feedback 2026-10-29
import { useMemo, useState } from 'react'
import { Printer, Search } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'

export interface PdfEmployee {
  id: string; first_name: string; last_name: string; nickname: string | null; employee_code: string
  branch: { name: string }; employee_status_type?: { name: string } | null
}
export interface PdfRow { info: PdfEmployee }
export interface PdfCell { status: string; tip: string; fill: boolean }

type Cat = 'dayoff' | 'holiday' | 'sick' | 'personal' | 'vacation' | 'leaveOther' | 'late' | 'absent' | 'offsite'
const CATS: { key: Cat; label: string; short: string; bg: string; defaultOn: boolean }[] = [
  { key: 'dayoff',     label: 'หยุดประจำ (จองไว้)',        short: 'หยุด',    bg: '#bae6fd', defaultOn: true },
  { key: 'holiday',    label: 'นักขัตฤกษ์ / ชดเชย / บริษัท', short: 'นักขัตฯ', bg: '#99f6e4', defaultOn: true },
  { key: 'sick',       label: 'ลาป่วย',                   short: 'ป่วย',    bg: '#fecaca', defaultOn: true },
  { key: 'personal',   label: 'ลากิจ',                    short: 'กิจ',     bg: '#ddd6fe', defaultOn: true },
  { key: 'vacation',   label: 'พักร้อน',                  short: 'พักร้อน', bg: '#fde68a', defaultOn: true },
  { key: 'leaveOther', label: 'ลาอื่นๆ (คลอด/บวช ฯลฯ)',   short: 'ลา',      bg: '#fbcfe8', defaultOn: true },
  { key: 'late',       label: 'มาสาย',                    short: 'สาย',     bg: '#fed7aa', defaultOn: true },
  { key: 'absent',     label: 'ขาด',                      short: 'ขาด',     bg: '#fca5a5', defaultOn: true },
  { key: 'offsite',    label: 'นอกสถานที่',               short: 'นอก',     bg: '#e9d5ff', defaultOn: true },
]

const NO_TYPE = 'ไม่ระบุ'
const typeOf = (e: PdfEmployee) => e.employee_status_type?.name || NO_TYPE

// สถานะช่องในรายงาน (จาก cellInfo) → หมวดที่พิมพ์ (null = ไม่ใช่วันหยุด/ลา/สาย/ขาด/นอกสถานที่ → ช่องธรรมดา)
function catOf(c: PdfCell): Cat | null {
  const st = c.status, tip = c.tip
  if (st === 'sick') return 'sick'
  if (st === 'vacation') return 'vacation'
  if (st === 'personal') return 'personal'
  if (st === 'late' || st === 'late2') return 'late'
  if (st === 'absent') return 'absent'
  if (st === 'offsite') return 'offsite'
  if (st === 'holiday' || st === 'leave') {
    if (tip.includes('หยุดประจำ')) return 'dayoff'
    if (st === 'holiday' || tip.includes('ชดเชย') || tip.includes('นักขัตฤกษ์') || tip.includes('วันหยุด') || tip.includes('วันสำคัญ')) return 'holiday'
    return 'leaveOther'
  }
  return null
}

const MON_TH = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const DOW_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export default function PdfExportModal({ rows, dateKeys, title, cellOf, onClose }: {
  rows: PdfRow[]; dateKeys: string[]; title: string; cellOf: (empId: string, dateKey: string) => PdfCell; onClose: () => void
}) {
  const branches = useMemo(() => [...new Set(rows.map(r => r.info.branch.name))].sort((a, b) => a.localeCompare(b, 'th')), [rows])
  const [branchOn, setBranchOn] = useState<Set<string>>(() => new Set(branches))
  // สถานะพนักงาน = ประเภทการจ้างที่ตั้งไว้ (ทำงานประจำ / พาร์ทไทม์ / ...) ตามข้อมูลจริงของพนักงานที่มี
  const types = useMemo(() => [...new Set(rows.map(r => typeOf(r.info)))].sort((x, y) => x.localeCompare(y, 'th')), [rows])
  const [statusOn, setStatusOn] = useState<Set<string>>(() => new Set(types))
  const [catOn, setCatOn] = useState<Set<Cat>>(() => new Set(CATS.filter(c => c.defaultOn).map(c => c.key)))
  const [excluded, setExcluded] = useState<Set<string>>(new Set())   // คนที่เอาติ๊กออก
  const [q, setQ] = useState('')

  const toggle = <T,>(set: Set<T>, v: T, fn: (s: Set<T>) => void) => { const n = new Set(set); n.has(v) ? n.delete(v) : n.add(v); fn(n) }

  // คนที่ผ่านตัวกรองสถานะ + สาขา (แสดงในรายการติ๊ก)
  const shown = useMemo(() => rows.filter(r => {
    if (!branchOn.has(r.info.branch.name)) return false
    if (!statusOn.has(typeOf(r.info))) return false
    if (q.trim()) {
      const t = `${r.info.first_name} ${r.info.last_name} ${r.info.nickname ?? ''} ${r.info.employee_code}`.toLowerCase()
      if (!t.includes(q.trim().toLowerCase())) return false
    }
    return true
  }), [rows, branchOn, statusOn, q])
  const selected = shown.filter(r => !excluded.has(r.info.id))

  function setAll(on: boolean) {
    setExcluded(prev => { const n = new Set(prev); for (const r of shown) on ? n.delete(r.info.id) : n.add(r.info.id); return n })
  }

  function buildAndPrint() {
    const win = window.open('', '_blank')
    if (!win) return
    const on = (c: Cat | null) => !!c && catOn.has(c)
    const groups = new Map<string, PdfRow[]>()
    for (const r of selected) { const k = r.info.branch.name; groups.set(k, [...(groups.get(k) ?? []), r]) }
    // คอลัมน์สรุปท้ายแถว: หยุด / ลา / พักร้อน / สาย / ขาด / นอก (เฉพาะประเภทที่เลือกแสดง)
    const sums: { label: string; cats: Cat[] }[] = ([
      { label: 'หยุด', cats: ['dayoff', 'holiday'] }, { label: 'ลา', cats: ['sick', 'personal', 'leaveOther'] },
      { label: 'พักร้อน', cats: ['vacation'] }, { label: 'สาย', cats: ['late'] }, { label: 'ขาด', cats: ['absent'] }, { label: 'นอก', cats: ['offsite'] },
    ] as { label: string; cats: Cat[] }[]).filter(s => s.cats.some(c => catOn.has(c)))

    const dayHead = dateKeys.map(k => {
      const d = new Date(k + 'T00:00:00'); const w = d.getDay()
      return `<th class="${w === 0 ? 'sun' : w === 6 ? 'sat' : ''}">${d.getDate()}<div class="dow">${DOW_TH[w]}</div></th>`
    }).join('')
    const sumHead = sums.map(s => `<th class="sum">${s.label}</th>`).join('')

    const section = (branch: string, list: PdfRow[]) => {
      const body = list.map(r => {
        const counts: Record<string, number> = {}
        const cells = dateKeys.map(k => {
          const c = cellOf(r.info.id, k)
          const cat = catOf(c)
          if (!on(cat)) return `<td class="daynum">${Number(k.slice(8))}</td>`
          const meta = CATS.find(x => x.key === cat)!
          if (!c.fill) counts[cat!] = (counts[cat!] ?? 0) + 1   // เสาร์-อาทิตย์คั่นกลางใบลา: โชว์อย่างเดียว ไม่นับ
          return `<td class="mark" style="background:${meta.bg}">${meta.short}</td>`
        }).join('')
        const sumCells = sums.map(s => { const n = s.cats.reduce((a, c) => a + (counts[c] ?? 0), 0); return `<td class="sumv">${n || ''}</td>` }).join('')
        const name = esc(r.info.nickname || r.info.first_name)
        return `<tr><td class="name">${name} <span class="code">${esc(r.info.employee_code)}</span></td>${cells}${sumCells}</tr>`
      }).join('')
      return `<h2>${esc(branch)} <span class="count">(${list.length} คน)</span></h2>
        <table><thead><tr><th class="namecol">พนักงาน</th>${dayHead}${sumHead}</tr></thead><tbody>${body}</tbody></table>`
    }

    const legend = CATS.filter(c => catOn.has(c.key)).map(c => `<span class="lg"><i style="background:${c.bg}"></i>${c.short} = ${c.label}</span>`).join('')
    win.document.write(`<html><head><title>${esc(title)}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;color-adjust:exact!important}
        body{font-family:'Sarabun',sans-serif;padding:14px;color:#1e293b}
        h1{font-size:19px;margin:0 0 2px}
        .sub{font-size:12px;color:#6b7280;margin:0 0 12px}
        h2{font-size:13px;margin:16px 0 6px;color:#111827}
        h2 .count{font-size:11px;font-weight:400;color:#9ca3af}
        table{width:100%;border-collapse:collapse;table-layout:fixed;margin-bottom:6px;page-break-inside:auto}
        tr{page-break-inside:avoid}
        th,td{border:1px solid #9ca3af;font-size:8.5px;text-align:center;padding:2px 0;overflow:hidden;white-space:nowrap}
        th{color:#374151;font-weight:700;background:#f3f4f6}
        th .dow{font-size:7px;color:#6b7280;font-weight:400}
        th.sun{color:#dc2626} th.sat{color:#2563eb}
        .namecol,td.name{width:92px;text-align:left;padding-left:5px;text-overflow:ellipsis}
        td.name{font-weight:700;font-size:9.5px}
        td.name .code{font-weight:400;color:#6b7280;font-size:7.5px}
        th.sum{width:30px}
        td.sumv{font-weight:700;background:#f9fafb}
        td.mark{font-weight:700;color:#111827;font-size:7.5px}
        td.daynum{color:#cbd5e1}
        .legend{margin-top:12px;font-size:10px;color:#4b5563;display:flex;flex-wrap:wrap;gap:4px 14px}
        .lg i{display:inline-block;width:10px;height:10px;border:1px solid #9ca3af;margin-right:4px;vertical-align:middle}
      </style></head><body>
      <h1>${esc(title)}</h1>
      <div class="sub">${selected.length} คน · พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      ${[...groups.entries()].map(([b, l]) => section(b, l)).join('')}
      <div class="legend">${legend}</div>
      </body></html>`)
    win.document.close(); win.focus(); win.print()
  }

  const chip = (on: boolean): React.CSSProperties => ({
    padding: '4px 12px', borderRadius: 99, fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1.5px solid ${on ? '#244B83' : '#e5e7eb'}`, background: on ? '#244B83' : '#fff', color: on ? '#fff' : '#475569',
  })
  const label: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: 6 }

  return (
    <Modal onClose={onClose} width={1180}>
      <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>พิมพ์ / PDF — ตารางวันหยุด + วันลา</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{title} · เลือกคนและประเภทที่จะแสดง แล้วกดพิมพ์ (บันทึกเป็น PDF ได้ที่หน้าต่างพิมพ์)</div>
        </div>

        <div>
          <div style={label}>ประเภทที่แสดงในตาราง</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATS.map(c => (
              <button key={c.key} onClick={() => toggle(catOn, c.key, setCatOn)} style={chip(catOn.has(c.key))}>
                {catOn.has(c.key) ? '✓ ' : ''}{c.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
          <div>
            <div style={label}>สถานะพนักงาน (ประเภทการจ้าง)</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {types.map(t => <button key={t} onClick={() => toggle(statusOn, t, setStatusOn)} style={chip(statusOn.has(t))}>{t}</button>)}
            </div>
          </div>
          {branches.length > 1 && (
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ ...label, display: 'flex', gap: 10 }}>
                <span>สาขา</span>
                <button onClick={() => setBranchOn(new Set(branches))} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>เลือกทั้งหมด</button>
                <button onClick={() => setBranchOn(new Set())} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.72rem', textDecoration: 'underline', fontFamily: 'inherit', padding: 0 }}>ล้าง</button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {branches.map(b => <button key={b} onClick={() => toggle(branchOn, b, setBranchOn)} style={chip(branchOn.has(b))}>{b}</button>)}
              </div>
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
            <div style={{ ...label, marginBottom: 0 }}>เลือกคน ({selected.length}/{shown.length})</div>
            <div style={{ position: 'relative', flex: '1 1 160px', maxWidth: 260 }}>
              <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาชื่อ / รหัส"
                style={{ width: '100%', boxSizing: 'border-box', padding: '6px 8px 6px 28px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.8rem', fontFamily: 'inherit' }} />
            </div>
            <button onClick={() => setAll(true)} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', fontFamily: 'inherit' }}>ติ๊กทั้งหมด</button>
            <button onClick={() => setAll(false)} style={{ border: 'none', background: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline', fontFamily: 'inherit' }}>เอาติ๊กออกทั้งหมด</button>
          </div>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 300, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {shown.length === 0 && <div style={{ padding: 16, color: 'var(--text-muted)', fontSize: '0.82rem' }}>ไม่มีพนักงานตามตัวกรองนี้</div>}
            {shown.map(r => (
              <label key={r.info.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', fontSize: '0.82rem', cursor: 'pointer', borderBottom: '1px solid #f3f4f6' }}>
                <input type="checkbox" checked={!excluded.has(r.info.id)} onChange={() => toggle(excluded, r.info.id, setExcluded)} />
                <span title={`${r.info.first_name} ${r.info.last_name}`} style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.info.nickname || r.info.first_name}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{r.info.branch.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="secondary" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" icon={<Printer size={14} />} disabled={selected.length === 0 || catOn.size === 0} onClick={buildAndPrint}>
            พิมพ์ / PDF ({selected.length} คน)
          </Button>
        </div>
      </div>
    </Modal>
  )
}
