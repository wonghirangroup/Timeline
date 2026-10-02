// แสดงเลขที่คำขอ (request_no เช่น LV-2569-0001) เป็นชิปเล็ก — กดเพื่อคัดลอก ไว้อ้างอิง/ค้นหา/แจ้งกันในทีม
import { useState } from 'react'

export default function RequestNo({ no }: { no?: string | null }) {
  const [copied, setCopied] = useState(false)
  if (!no) return null
  return (
    <span
      title={copied ? 'คัดลอกแล้ว' : 'เลขที่คำขอ — กดเพื่อคัดลอก'}
      onClick={e => { e.stopPropagation(); navigator.clipboard?.writeText(no).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200) }).catch(() => {}) }}
      style={{ fontFamily: "ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace", fontSize: '0.68rem', fontWeight: 700, color: copied ? '#16a34a' : '#475569', background: copied ? '#dcfce7' : '#f1f5f9', padding: '1px 7px', borderRadius: 6, cursor: 'copy', whiteSpace: 'nowrap', letterSpacing: '0.02em' }}>
      {copied ? 'คัดลอกแล้ว' : no}
    </span>
  )
}
