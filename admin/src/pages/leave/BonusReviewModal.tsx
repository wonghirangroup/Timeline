// admin/src/pages/leave/BonusReviewModal.tsx
// ตรวจคนที่ "จองวันหยุดไม่ครบโควต้า / มาทำงานในวันหยุดที่จองไว้" ของเดือน → ให้พักร้อนสะสมเป็นรายคน
// (ย้ายมาจากหน้านโยบายพักร้อน — feedback 2026-10-26: อยากเห็นแบบหน้าลงวันหยุดหลายคน ว่าใครเหลือหยุดไม่ครบ · ไม่สนอายุงาน 1 ปี/ตำแหน่ง)
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Gift, X } from 'lucide-react'
import { useToast } from '../../components/ui/Toast'
import { api } from '../../lib/axios'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import InfoTooltip from '../../components/ui/InfoTooltip'
import Toggle from '../../components/ui/Toggle'
import Button from '../../components/ui/Button'
import { useIsReadOnly } from '../../stores/authStore'

const cardBox: React.CSSProperties = { background: '#fff', padding: '16px 18px' }

// ── ตรวจโบนัสพักร้อนสิ้นเดือน ("หยุดไม่ครบโควต้า") — ดูรายชื่อ + เลือกรายคนก่อนให้จริง ──────────────────────
interface BonusRow {
  employee_id: string; employee_code: string; full_name: string; nickname: string | null; branch_name: string | null
  photo_url?: string | null
  quota: number; booked: number; effective_off: number; shortfall: number; granted_days: number | null
}
function prevMonthYm(): string {
  const d = new Date(Date.now() + 7 * 3600_000); d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() - 1)
  return d.toISOString().slice(0, 7)
}
function currentYm(): string { return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 7) }
function BonusReviewCard() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const readOnly = useIsReadOnly()
  const [ym, setYm] = useState(currentYm())   // เปิดมาโฟกัสเดือนปัจจุบัน (ดูประมาณการ) — เปลี่ยนไปเดือนที่แล้วเพื่อให้โบนัสจริงได้
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [confirm, setConfirm] = useState(false)

  const { data, isLoading, isError } = useQuery<{ ym: string; month_ended: boolean; skip_ids: string[]; rows: BonusRow[]; skipped: number; auto: boolean }>({
    queryKey: ['vacation-bonus-review', ym],
    queryFn: () => api.get('/api/v1/admin/vacation-policy/bonus-review', { params: { ym } }).then(r => r.data.data),
    enabled: /^\d{4}-\d{2}$/.test(ym),
  })
  const rows = data?.rows ?? []
  // ค่าเริ่มต้น: ติ๊กทุกคนที่ยังไม่ได้รับของเดือนนี้ (เอาออกเองได้ทีละคน)
  const skipIds = new Set(data?.skip_ids ?? [])
  const preview = data ? !data.month_ended : false   // เดือนที่ยังไม่จบ = ดูประมาณการอย่างเดียว (ให้จริงไม่ได้ แต่ตั้ง "ไม่ให้" ล่วงหน้าได้)
  // ค่าเริ่มต้น: ติ๊กทุกคนที่ยังไม่ได้รับของเดือนนี้ ยกเว้นคนที่ตั้ง "ไม่ให้" ไว้ (เอาออกเองได้ทีละคน)
  useEffect(() => { setPicked(new Set(rows.filter(r => r.granted_days == null && !skipIds.has(r.employee_id)).map(r => r.employee_id))) }, [data])
  const skipMut = useMutation({
    mutationFn: (v: { employee_id: string; skip: boolean }) => api.put('/api/v1/admin/vacation-policy/bonus-review/skip', { ym, ...v }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }),
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const grantMut = useMutation({
    mutationFn: () => api.post('/api/v1/admin/vacation-policy/bonus-review/grant', { ym, employee_ids: [...picked] }).then(r => r.data),
    onSuccess: (res: any) => {
      qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }); qc.invalidateQueries({ queryKey: ['admin', 'vacation-remaining'] })
      showToast('success', res?.message ?? 'ให้โบนัสพักร้อนแล้ว'); setConfirm(false)
    },
    onError: (e: any) => { showToast('error', e?.response?.data?.error?.message ?? 'ให้โบนัสไม่สำเร็จ'); setConfirm(false) },
  })
  const autoMut = useMutation({
    mutationFn: (v: boolean) => api.patch('/api/v1/admin/tenant-settings', { vacation_bonus_auto: v }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vacation-bonus-review'] }); qc.invalidateQueries({ queryKey: ['tenant-settings'] }); showToast('success', 'บันทึกแล้ว') },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  const pending = rows.filter(r => r.granted_days == null)
  const selectedRows = rows.filter(r => picked.has(r.employee_id) && r.granted_days == null)
  const selectedDays = selectedRows.reduce((n, r) => n + r.shortfall, 0)
  const toggle = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  const cell: React.CSSProperties = { padding: '8px 10px', fontSize: '0.82rem', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }

  return (
    <div style={cardBox}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
        <div style={{ width: 32, height: 32, borderRadius: 9, background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#15803d' }}><Gift size={15} /></div>
        <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>ตรวจโบนัสพักร้อนสิ้นเดือน (หยุดไม่ครบโควต้า)</div>
        <InfoTooltip size="md" title="โบนัสพักร้อนสิ้นเดือน" width={320} content={
          <ul style={{ margin: 0, paddingLeft: 16 }}>
            <li>คนที่ <b>หยุดจริงไม่ครบโควต้า</b> ของเดือนจะได้พักร้อนเพิ่มเท่ากับส่วนที่ขาด (โควต้า − วันที่หยุดได้จริง)</li>
            <li>วันที่จองไว้แต่ <b>มาเช็คอินทำงานจริง</b> นับว่าไม่ได้หยุด (ตั้งเปิด/ปิดได้ที่การ์ด "นโยบายการลา")</li>
            <li>ติ๊กเลือกรายคนก่อนกด "ให้โบนัส" · เดือนเดียวกันให้ซ้ำคนเดิมไม่ได้</li>
          </ul>
        } />
        <input type="month" value={ym} onChange={e => setYm(e.target.value)} max={currentYm()}
          style={{ marginLeft: 'auto', marginRight: 44, padding: '7px 10px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '13px', fontFamily: 'inherit' }} />
      </div>
      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px 42px' }}>
        ใครจองวันหยุดไม่ครบโควต้าของเดือน หรือมาทำงานในวันหยุดที่จองไว้ จะได้พักร้อนสะสมเท่ากับส่วนที่ขาด (ไม่ดูอายุงาน/ตำแหน่ง) · เดือนปัจจุบันดูเป็นประมาณการได้ และกด "ไม่ให้" ไว้ก่อนได้ · ให้จริงได้หลังสิ้นเดือน
      </p>
      {preview && (
        <div style={{ marginLeft: 42, marginBottom: 12, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '9px 12px', fontSize: '12.5px', color: '#92400e' }}>
          <b>ประมาณการ</b> — เดือนนี้ยังไม่จบ ระบบนับวันที่จองไว้เป็นวันหยุดตามปกติ ตัวเลขอาจเปลี่ยนถ้ามีการจอง/เช็คอินเพิ่ม · ให้โบนัสจริงได้หลังสิ้นเดือน · กด <b>"ไม่ให้เดือนนี้"</b> ข้างชื่อ เพื่อกันไว้ล่วงหน้า (ระบบอัตโนมัติจะข้ามคนนี้ด้วย)
        </div>
      )}

      <div style={{ marginLeft: 42, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: '9px 12px', marginBottom: 12 }}>
        <span style={{ fontSize: '12.5px', color: '#374151' }}>
          <b>ให้ระบบเพิ่มโบนัสอัตโนมัติ</b> ทุกวันที่ 1 {data?.auto ? '(เปิดอยู่ — ไม่ผ่านการตรวจ)' : '(ปิดอยู่ — รอให้คุณตรวจและกดให้เอง)'}
        </span>
        <Toggle checked={!!data?.auto} disabled={readOnly || autoMut.isPending} onChange={v => autoMut.mutate(v)} aria-label="ให้ระบบเพิ่มโบนัสพักร้อนอัตโนมัติ" />
      </div>

      <div style={{ marginLeft: 42 }}>
        {isLoading ? <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>กำลังคำนวณ...</div>
          : isError ? <div style={{ fontSize: '13px', color: '#dc2626' }}>โหลดไม่สำเร็จ</div>
          : rows.length === 0 ? (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '14px 0' }}>เดือนนี้ไม่มีใครหยุดไม่ครบโควต้า (หยุดครบแล้ว {data?.skipped ?? 0} คน)</div>
          ) : (
            <>
              {/* การ์ดแยกตามสาขา หน้าตาเหมือนหน้า "เช็คอินวันนี้": รูป + ชื่อ + จะได้กี่วัน + สถานะ */}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '12.5px', color: '#374151', marginBottom: 10, cursor: readOnly || preview || pending.length === 0 ? 'default' : 'pointer' }}>
                <input type="checkbox" aria-label="เลือกทั้งหมด" disabled={readOnly || preview || pending.length === 0}
                  checked={pending.length > 0 && selectedRows.length === pending.length}
                  onChange={e => setPicked(e.target.checked ? new Set(pending.map(r => r.employee_id)) : new Set())} />
                เลือกทั้งหมด
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14, alignItems: 'start' }}>
                {(() => {
                  const byBranch = new Map<string, BonusRow[]>()
                  for (const r of rows) { const k = r.branch_name ?? 'ไม่ระบุสาขา'; byBranch.set(k, [...(byBranch.get(k) ?? []), r]) }
                  return [...byBranch.entries()].map(([branch, list]) => (
                    <div key={branch} style={{ border: '1px solid #e5e7eb', borderRadius: 14, background: '#fff', overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid #f1f5f9', fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>
                        <span>{branch}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 99, padding: '2px 9px' }}>{list.length} คน</span>
                      </div>
                      {list.map(r => {
                        const done = r.granted_days != null
                        const skipped = skipIds.has(r.employee_id)
                        const worked = r.booked - r.effective_off
                        return (
                          <div key={r.employee_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #f8fafc', background: done ? '#f0fdf4' : skipped ? '#fef2f2' : '#fff', opacity: !done && !preview && !skipped && !picked.has(r.employee_id) ? 0.6 : 1 }}>
                            <input type="checkbox" disabled={readOnly || done || preview} checked={!done && !preview && picked.has(r.employee_id)} onChange={() => toggle(r.employee_id)} aria-label={`เลือก ${r.full_name}`} />
                            {r.photo_url
                              ? <img src={r.photo_url} alt="" style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              : <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dbeafe', color: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>{(r.nickname || r.full_name).slice(0, 1)}</div>}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.full_name}{r.nickname ? ` (${r.nickname})` : ''}</div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                โควต้า {r.quota} · หยุดได้จริง {r.effective_off}{worked > 0 ? ` (มาทำงานวันหยุด ${worked})` : ''}
                              </div>
                              {!readOnly && !done && (
                                <button disabled={skipMut.isPending} onClick={() => skipMut.mutate({ employee_id: r.employee_id, skip: !skipped })}
                                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '0.7rem', color: '#2563eb', textDecoration: 'underline', fontFamily: 'inherit', padding: 0, marginTop: 2 }}>
                                  {skipped ? 'ยกเลิก (ให้ตามปกติ)' : 'ไม่ให้เดือนนี้'}
                                </button>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#15803d' }}>+{r.shortfall} วัน</div>
                              {done
                                ? <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#15803d', background: '#dcfce7', borderRadius: 99, padding: '1px 8px' }}>ให้แล้ว +{r.granted_days}</span>
                                : skipped
                                  ? <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b91c1c', background: '#fee2e2', borderRadius: 99, padding: '1px 8px' }}>ตั้งไว้ไม่ให้</span>
                                  : <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#b45309', background: '#fef3c7', borderRadius: 99, padding: '1px 8px' }}>{preview ? 'ประมาณการ' : 'รอตรวจ'}</span>}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ))
                })()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: 12 }}>
                <span style={{ fontSize: '12.5px', color: '#374151' }}>เลือก <b>{selectedRows.length}</b> จาก {pending.length} คนที่รอ · รวม <b>{selectedDays}</b> วัน{data && data.skipped > 0 ? ` · (ข้าม ${data.skipped} คนที่หยุดครบแล้ว)` : ''}</span>
                {!readOnly && !preview && <Button variant="primary" disabled={selectedRows.length === 0} onClick={() => setConfirm(true)}>ให้โบนัส {selectedRows.length} คน</Button>}
              </div>
            </>
          )}
      </div>

      {confirm && (
        <ConfirmDialog
          title="ให้โบนัสพักร้อน?"
          message={`ให้โบนัสพักร้อนของเดือน ${ym} แก่ ${selectedRows.length} คน รวม ${selectedDays} วัน — เพิ่มเข้าโควต้าพักร้อนของแต่ละคนทันที และให้เดือนเดียวกันซ้ำไม่ได้`}
          confirmLabel="ให้โบนัส"
          onConfirm={() => grantMut.mutate()}
          onCancel={() => setConfirm(false)}
        />
      )}
    </div>
  )
}


export default function BonusReviewModal({ onClose }: { onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 1000, display: 'flex', alignItems: 'stretch', justifyContent: 'stretch', padding: 0 }}>
      <div onClick={e => e.stopPropagation()} style={{ position: 'relative', background: '#fff', borderRadius: 0, width: '100%', height: '100%', overflowY: 'auto' }}>
        <button onClick={onClose} aria-label="ปิด" style={{ position: 'absolute', top: 12, right: 12, background: '#f3f4f6', border: 'none', borderRadius: 8, padding: 6, cursor: 'pointer', display: 'flex' }}><X size={16} /></button>
        <BonusReviewCard />
      </div>
    </div>
  )
}
