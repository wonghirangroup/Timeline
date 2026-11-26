// admin/src/pages/report/policy.tsx
// รายงานนโยบาย — ดูว่ากลุ่ม/สาขา/ฝ่าย/แผนก/ตำแหน่ง/รายคน ตั้งสิทธิ์จองวันหยุด · ยื่นลา · ปรับเงินเมื่อสาย · ปรับเงินเมื่อขาดไว้อย่างไร
// 2 มุมมอง: (1) ตามระดับ — ตารางทุกระดับ + ค่าที่ตั้งเอง  (2) อธิบายรายคน — ไล่ 6 ชั้นว่าชั้นไหนเป็นตัวชนะ
// ใช้ข้อมูลที่ API เดิมส่งอยู่แล้ว (employees/groups/branches/divisions/departments/positions) ไม่มี endpoint ใหม่
// ลำดับ "เจาะจงกว่าชนะ" ตรงกับ resolvePolicyFromChain ฝั่ง server (group.service.ts)
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Layers, UserSearch, Search, Download } from 'lucide-react'
import { api } from '../../lib/axios'
import { useIsMobile } from '../../hooks/useIsMobile'
import { downloadCsv } from '../../lib/exportCsv'
import InfoTooltip from '../../components/ui/InfoTooltip'

type Flag = 'booking' | 'leave' | 'late_fine' | 'absent_fine'
type Node = { booking_enabled?: boolean | null; leave_enabled?: boolean | null; late_fine_enabled?: boolean | null; absent_fine_enabled?: boolean | null }

interface Named extends Node { id: string; name: string }
interface ApiGroup extends Named { _count?: { branches: number } }
interface ApiBranch extends Named { group_id?: string | null }
interface ApiDivision extends Named { group?: { id: string; name: string } | null }
interface ApiDepartment extends Named { division?: { id: string; name: string; group_id: string } | null }
interface ApiPosition extends Named { department?: { id: string; name: string; division?: { id: string; name: string } | null } | null }
interface ApiEmployee {
  id: string; employee_code: string; first_name: string; last_name: string; nickname: string | null; is_active: boolean
  booking_enabled_override?: boolean | null; leave_enabled_override?: boolean | null
  late_fine_enabled_override?: boolean | null; absent_fine_enabled_override?: boolean | null
  branch: (Named & { group_id?: string | null; group?: Node | null })
  position?: (Named & { department?: (Named & { division?: (Named & { group?: { id: string; name: string } | null }) | null }) | null }) | null
}

const FLAGS: { key: Flag; field: keyof Node; label: string; on: string; off: string; hint: string }[] = [
  { key: 'booking',     field: 'booking_enabled',     label: 'จองวันหยุด',   on: 'จองได้',   off: 'จองไม่ได้', hint: 'พนักงานจองวันหยุดประจำเดือนผ่านไลน์ได้หรือไม่' },
  { key: 'leave',       field: 'leave_enabled',       label: 'ยื่นลา',       on: 'ลาได้',    off: 'ลาไม่ได้',  hint: 'พนักงานยื่นใบลาผ่านไลน์ได้หรือไม่' },
  { key: 'late_fine',   field: 'late_fine_enabled',   label: 'ปรับเมื่อสาย', on: 'ปรับ',     off: 'ไม่ปรับ',   hint: 'เช็คอินสายแล้วโดนปรับเงินตามกะหรือไม่ (ไม่ตั้ง = ปรับตามกะ)' },
  { key: 'absent_fine', field: 'absent_fine_enabled', label: 'ปรับเมื่อขาด', on: 'ปรับ',     off: 'ไม่ปรับ',   hint: 'ขาดงานแล้วมีค่าปรับขาดหรือไม่ (ไม่ตั้ง = ปรับตามกะ)' },
]

type LevelKey = 'person' | 'position' | 'department' | 'division' | 'branch' | 'group'
const LEVEL_LABEL: Record<LevelKey, string> = { person: 'รายคน', position: 'ตำแหน่ง', department: 'แผนก', division: 'ฝ่าย', branch: 'สาขา', group: 'กลุ่ม' }
const LEVEL_COLOR: Record<LevelKey, { c: string; bg: string }> = {
  person: { c: '#b45309', bg: '#fef3c7' }, position: { c: '#7c3aed', bg: '#ede9fe' }, department: { c: '#0e7490', bg: '#cffafe' },
  division: { c: '#1d4ed8', bg: '#dbeafe' }, branch: { c: '#15803d', bg: '#dcfce7' }, group: { c: '#475569', bg: '#e2e8f0' },
}
// ลำดับจากเจาะจงที่สุด → กว้างที่สุด (ต้องตรงกับ server)
const CHAIN_ORDER: LevelKey[] = ['person', 'position', 'department', 'division', 'branch', 'group']

const pick = (v: boolean | null | undefined) => (v === null || v === undefined ? null : v)

// ไล่ 6 ชั้นของพนักงานหนึ่งคน คืนค่าที่แต่ละชั้นตั้งไว้ + ชั้นที่ชนะ (ไม่มีชั้นไหนตั้ง = ค่าเริ่มต้น เปิด/ปรับตามกะ)
function explain(e: ApiEmployee, flag: Flag, groupName: string) {
  const f = FLAGS.find(x => x.key === flag)!
  const pos = e.position, dept = pos?.department, div = dept?.division, br = e.branch
  const overrideKey = (f.field + '_override') as keyof ApiEmployee
  const layers: { level: LevelKey; name: string; value: boolean | null }[] = [
    { level: 'person', name: `${e.first_name} ${e.last_name}`.trim(), value: pick(e[overrideKey] as boolean | null | undefined) },
    { level: 'position', name: pos?.name ?? '—', value: pick(pos?.[f.field]) },
    { level: 'department', name: dept?.name ?? '—', value: pick(dept?.[f.field]) },
    { level: 'division', name: div?.name ?? '—', value: pick(div?.[f.field]) },
    { level: 'branch', name: br?.name ?? '—', value: pick(br?.[f.field]) },
    { level: 'group', name: groupName || '—', value: pick(br?.group?.[f.field]) },
  ]
  const winner = layers.find(l => l.value !== null) ?? null
  return { layers, winner, value: winner ? winner.value! : true }
}

function Chip({ text, color, bg, title }: { text: string; color: string; bg: string; title?: string }) {
  return <span title={title} style={{ fontSize: '0.72rem', fontWeight: 700, color, background: bg, padding: '2px 9px', borderRadius: 99, whiteSpace: 'nowrap' }}>{text}</span>
}
// ค่าที่ "ตั้งไว้ที่ชั้นนี้" — null = ไม่ได้ตั้ง (ใช้ค่าจากชั้นบน)
function SetChip({ flag, v }: { flag: typeof FLAGS[number]; v: boolean | null | undefined }) {
  if (v === null || v === undefined) return <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>ไม่ได้ตั้ง</span>
  return v ? <Chip text={flag.on} color="#15803d" bg="#dcfce7" /> : <Chip text={flag.off} color="#b91c1c" bg="#fee2e2" />
}
function LevelChip({ level }: { level: LevelKey }) {
  const c = LEVEL_COLOR[level]
  return <Chip text={LEVEL_LABEL[level]} color={c.c} bg={c.bg} />
}

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 12px', fontSize: '0.74rem', fontWeight: 700, color: '#475569', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '9px 12px', fontSize: '0.84rem', borderBottom: '1px solid #f1f5f9', verticalAlign: 'middle' }

export default function PolicyReportPage() {
  const isMobile = useIsMobile()
  const [view, setView] = useState<'level' | 'person'>('level')
  const [search, setSearch] = useState('')
  const [onlySet, setOnlySet] = useState(true)
  const [levelFilter, setLevelFilter] = useState<LevelKey | ''>('')
  const [personId, setPersonId] = useState('')

  const { data: employees = [], isLoading } = useQuery<ApiEmployee[]>({
    queryKey: ['employees', 'all'],
    queryFn: () => api.get('/api/v1/admin/employees', { params: { includeInactive: true } }).then(r => r.data.data),
  })
  const { data: groups = [] } = useQuery<ApiGroup[]>({ queryKey: ['groups'], queryFn: () => api.get('/api/v1/admin/groups').then(r => r.data.data) })
  const { data: branches = [] } = useQuery<ApiBranch[]>({ queryKey: ['branches'], queryFn: () => api.get('/api/v1/admin/branches').then(r => r.data.data) })
  const { data: divisions = [] } = useQuery<ApiDivision[]>({ queryKey: ['divisions'], queryFn: () => api.get('/api/v1/admin/divisions').then(r => r.data.data) })
  const { data: departments = [] } = useQuery<ApiDepartment[]>({ queryKey: ['departments'], queryFn: () => api.get('/api/v1/admin/departments').then(r => r.data.data) })
  const { data: positions = [] } = useQuery<ApiPosition[]>({ queryKey: ['positions'], queryFn: () => api.get('/api/v1/admin/positions').then(r => r.data.data) })

  const active = useMemo(() => employees.filter(e => e.is_active), [employees])

  // จำนวนพนักงาน (ที่ยังใช้งาน) ใต้แต่ละโหนด — ใช้บอกว่าค่าที่ตั้งกระทบกี่คน
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    const add = (k?: string | null) => { if (k) m.set(k, (m.get(k) ?? 0) + 1) }
    for (const e of active) {
      add('branch:' + e.branch?.id)
      add('group:' + e.branch?.group_id)
      add('position:' + e.position?.id)
      add('department:' + e.position?.department?.id)
      add('division:' + e.position?.department?.division?.id)
    }
    return m
  }, [active])

  type Row = { key: string; level: LevelKey; name: string; parent: string; count: number | null; node: Node; hasAny: boolean }
  const rows: Row[] = useMemo(() => {
    const out: Row[] = []
    const mk = (level: LevelKey, n: Named, parent: string) => {
      const hasAny = FLAGS.some(f => pick(n[f.field]) !== null)
      out.push({ key: level + ':' + n.id, level, name: n.name, parent, count: counts.get(level + ':' + n.id) ?? 0, node: n, hasAny })
    }
    groups.forEach(g => mk('group', g, ''))
    branches.forEach(b => mk('branch', b, groups.find(g => g.id === b.group_id)?.name ?? ''))
    divisions.forEach(d => mk('division', d, d.group?.name ?? ''))
    departments.forEach(d => mk('department', d, d.division?.name ?? ''))
    positions.forEach(p => mk('position', p, [p.department?.division?.name, p.department?.name].filter(Boolean).join(' › ')))
    // รายคน: เฉพาะคนที่ตั้ง override อย่างน้อย 1 ค่า
    for (const e of active) {
      const node: Node = {
        booking_enabled: e.booking_enabled_override, leave_enabled: e.leave_enabled_override,
        late_fine_enabled: e.late_fine_enabled_override, absent_fine_enabled: e.absent_fine_enabled_override,
      }
      if (FLAGS.some(f => pick(node[f.field]) !== null)) {
        out.push({ key: 'person:' + e.id, level: 'person', name: `${e.first_name} ${e.last_name}`.trim(), parent: e.branch?.name ?? '', count: null, node, hasAny: true })
      }
    }
    return out
  }, [groups, branches, divisions, departments, positions, active, counts])

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows
      .filter(r => (onlySet ? r.hasAny : true))
      .filter(r => !levelFilter || r.level === levelFilter)
      .filter(r => !q || `${r.name} ${r.parent}`.toLowerCase().includes(q))
      .sort((a, b) => CHAIN_ORDER.indexOf(b.level) - CHAIN_ORDER.indexOf(a.level) || a.name.localeCompare(b.name, 'th'))
  }, [rows, onlySet, levelFilter, search])

  const setCount = (f: typeof FLAGS[number], val: boolean) => rows.filter(r => pick(r.node[f.field]) === val).length

  function exportCsv() {
    const head = ['ระดับ', 'ชื่อ', 'สังกัด', 'พนักงาน (คน)', ...FLAGS.map(f => f.label)]
    const body = shown.map(r => [
      LEVEL_LABEL[r.level], r.name, r.parent, r.count === null ? '' : String(r.count),
      ...FLAGS.map(f => { const v = pick(r.node[f.field]); return v === null ? 'ไม่ได้ตั้ง' : v ? f.on : f.off }),
    ])
    downloadCsv([head, ...body], `รายงานนโยบาย_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  const personList = useMemo(() => {
    const q = search.trim().toLowerCase()
    return active
      .filter(e => !q || `${e.first_name} ${e.last_name} ${e.nickname ?? ''} ${e.employee_code}`.toLowerCase().includes(q))
      .sort((a, b) => a.employee_code.localeCompare(b.employee_code))
  }, [active, search])
  const person = employees.find(e => e.id === personId) ?? null

  const tabBtn = (v: 'level' | 'person', label: string, Icon: typeof Layers) => (
    <button key={v} onClick={() => { setView(v); setSearch('') }}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', fontWeight: view === v ? 700 : 500, background: view === v ? '#fff' : 'transparent', color: view === v ? '#244B83' : 'var(--text-muted)', boxShadow: view === v ? '0 1px 3px rgba(0,0,0,.08)' : 'none' }}>
      <Icon size={15} /> {label}
    </button>
  )

  const searchBox = (
    <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 320 }}>
      <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94a3b8' }} />
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder={view === 'level' ? 'ค้นหาชื่อ / สังกัด...' : 'ค้นหาชื่อ / รหัสพนักงาน...'}
        style={{ width: '100%', padding: '8px 10px 8px 30px', borderRadius: 9, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.84rem', boxSizing: 'border-box' }} />
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b' }}>รายงานนโยบาย</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: '#64748b' }}>
          ดูว่าแต่ละระดับ (กลุ่ม · สาขา · ฝ่าย · แผนก · ตำแหน่ง · รายคน) ตั้งสิทธิ์จองวันหยุด ยื่นลา และค่าปรับไว้อย่างไร — ระดับที่เจาะจงกว่าจะชนะระดับที่กว้างกว่า
        </p>
      </div>

      <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: 11, padding: 3, width: 'fit-content', maxWidth: '100%', overflowX: 'auto' }}>
        {tabBtn('level', 'ดูตามระดับ', Layers)}
        {tabBtn('person', 'อธิบายรายคน', UserSearch)}
      </div>

      {view === 'level' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: 10 }}>
            {FLAGS.map(f => (
              <div key={f.key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', background: '#fff' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', display: 'flex', alignItems: 'center', gap: 4 }}>{f.label}<InfoTooltip content={f.hint} /></div>
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <Chip text={`${f.on} ${setCount(f, true)} จุด`} color="#15803d" bg="#dcfce7" />
                  <Chip text={`${f.off} ${setCount(f, false)} จุด`} color="#b91c1c" bg="#fee2e2" />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {searchBox}
            <select value={levelFilter} onChange={e => setLevelFilter(e.target.value as LevelKey | '')}
              style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid #e2e8f0', fontFamily: 'inherit', fontSize: '0.84rem', background: '#fff' }}>
              <option value="">ทุกระดับ</option>
              {(['group', 'branch', 'division', 'department', 'position', 'person'] as LevelKey[]).map(l => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.84rem', color: '#475569', cursor: 'pointer' }}>
              <input type="checkbox" checked={onlySet} onChange={e => setOnlySet(e.target.checked)} /> แสดงเฉพาะที่มีการตั้งค่า
            </label>
            <button onClick={exportCsv} disabled={!shown.length}
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem' }}>
              <Download size={14} /> CSV
            </button>
          </div>

          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead>
                <tr>
                  <th style={th}>ระดับ</th><th style={th}>ชื่อ</th><th style={th}>สังกัด</th><th style={{ ...th, textAlign: 'right' }}>พนักงาน</th>
                  {FLAGS.map(f => <th key={f.key} style={th}>{f.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {isLoading && <tr><td style={td} colSpan={8}>กำลังโหลด...</td></tr>}
                {!isLoading && shown.length === 0 && (
                  <tr><td style={{ ...td, color: '#64748b', textAlign: 'center', padding: 28 }} colSpan={8}>
                    {onlySet ? 'ยังไม่มีระดับไหนตั้งค่าไว้ — ทุกคนใช้ค่าเริ่มต้น (จองได้ · ลาได้ · ปรับเงินตามกะ)' : 'ไม่พบรายการ'}
                  </td></tr>
                )}
                {shown.map(r => (
                  <tr key={r.key}>
                    <td style={td}><LevelChip level={r.level} /></td>
                    <td style={{ ...td, fontWeight: 600, color: '#1e293b' }}>{r.name}</td>
                    <td style={{ ...td, color: '#64748b' }}>{r.parent || '—'}</td>
                    <td style={{ ...td, textAlign: 'right', color: '#475569' }}>{r.count === null ? '1 คน' : `${r.count} คน`}</td>
                    {FLAGS.map(f => <td key={f.key} style={td}><SetChip flag={f} v={r.node[f.field]} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>
            "ไม่ได้ตั้ง" = ใช้ค่าจากระดับที่กว้างกว่า ถ้าไม่มีระดับไหนตั้งเลยจะเป็นค่าเริ่มต้น (จองได้ · ลาได้ · ปรับเงินตามกะ) · ตั้งค่าได้ที่หน้าสาขา · ผังองค์กร · กลุ่ม · ฟอร์มพนักงาน
          </p>
        </>
      )}

      {view === 'person' && (
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(240px, 300px) 1fr', gap: 14, alignItems: 'start' }}>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {searchBox}
            <div style={{ maxHeight: isMobile ? 200 : 520, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
              {personList.slice(0, 200).map(e => (
                <button key={e.id} onClick={() => setPersonId(e.id)}
                  style={{ textAlign: 'left', padding: '7px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.84rem', background: e.id === personId ? '#e8eef7' : 'transparent', color: '#1e293b', fontWeight: e.id === personId ? 700 : 500 }}>
                  {e.first_name} {e.last_name} <span style={{ color: '#94a3b8', fontWeight: 400 }}>· {e.employee_code}</span>
                </button>
              ))}
              {personList.length === 0 && <span style={{ color: '#64748b', fontSize: '0.84rem', padding: 8 }}>ไม่พบพนักงาน</span>}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {!person && (
              <div style={{ border: '1px dashed #cbd5e1', borderRadius: 12, padding: 28, textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                เลือกพนักงานทางซ้าย เพื่อดูว่าแต่ละสิทธิ์ได้ค่ามาจากระดับไหน
              </div>
            )}
            {person && (
              <>
                <div style={{ fontSize: '0.9rem', color: '#334155' }}>
                  <b style={{ color: '#1e293b' }}>{person.first_name} {person.last_name}</b> · {person.branch?.name}{person.position ? ` · ${person.position.name}` : ''}
                </div>
                {FLAGS.map(f => {
                  const r = explain(person, f.key, groups.find(g => g.id === person.branch?.group_id)?.name ?? '')
                  return (
                    <div key={f.key} style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                        <b style={{ fontSize: '0.88rem', color: '#1e293b' }}>{f.label}</b>
                        <span style={{ color: '#94a3b8' }}>→</span>
                        {r.value ? <Chip text={f.on} color="#15803d" bg="#dcfce7" /> : <Chip text={f.off} color="#b91c1c" bg="#fee2e2" />}
                        <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                          {r.winner ? `เพราะ${LEVEL_LABEL[r.winner.level]} “${r.winner.name}” ตั้งไว้` : 'ไม่มีระดับไหนตั้ง จึงใช้ค่าเริ่มต้น'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {r.layers.map((l, i) => {
                          const isWin = r.winner?.level === l.level
                          const overridden = !isWin && l.value !== null
                          return (
                            <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 14px', borderBottom: i < r.layers.length - 1 ? '1px solid #f1f5f9' : 'none', background: isWin ? '#fffbeb' : 'transparent', opacity: overridden ? 0.55 : 1 }}>
                              <span style={{ width: 62 }}><LevelChip level={l.level} /></span>
                              <span style={{ flex: 1, minWidth: 0, fontSize: '0.84rem', color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                              <SetChip flag={f} v={l.value} />
                              <span style={{ width: 92, textAlign: 'right', fontSize: '0.72rem', fontWeight: 700, color: isWin ? '#b45309' : '#94a3b8' }}>
                                {isWin ? '✓ ตัวชนะ' : overridden ? 'ถูกชั้นล่างทับ' : ''}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>อ่านจากบนลงล่าง — ชั้นแรกที่มีการตั้งค่าคือตัวชนะ (บน = เจาะจงที่สุด) ชั้นที่จางคือตั้งไว้แต่ถูกชั้นที่เจาะจงกว่าทับ</p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
