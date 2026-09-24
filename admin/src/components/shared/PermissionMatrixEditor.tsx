// admin/src/components/shared/PermissionMatrixEditor.tsx
// Matrix สิทธิ์แบบละเอียดต่อบัญชี (Phase 1 — จัดการได้จริง ยังไม่มีผลต่อการเข้าถึงจริง
// ดู brain log v187 / plan reflective-bouncing-reddy)
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck, Search, RotateCcw, X } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../ui/Toast'
import Button from '../ui/Button'
import Modal from '../ui/Modal'

type PermissionAction = 'view' | 'add' | 'edit' | 'delete' | 'approve'
const ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'view', label: 'ดู' },
  { key: 'add', label: 'เพิ่ม' },
  { key: 'edit', label: 'แก้ไข' },
  { key: 'delete', label: 'ลบ' },
  { key: 'approve', label: 'อนุมัติ' },
]
interface FeatureDef { key: string; label: string; section: string }
type PermissionRow = { feature: string } & Record<PermissionAction, boolean>

const SECTION_ORDER = ['ข้อมูล', 'การกระทำ', 'รายงาน', 'ตั้งค่า']

function rowFullCount(r: PermissionRow) { return ACTIONS.filter(a => r[a.key]).length }

export default function PermissionMatrixEditor({ userId, userLabel, onClose }: { userId: string; userLabel: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const [search, setSearch] = useState('')
  const [rows, setRows] = useState<PermissionRow[] | null>(null)

  const { data: features = [], isLoading: loadingFeatures } = useQuery<FeatureDef[]>({
    queryKey: ['permissions', 'features'],
    queryFn: () => api.get('/api/v1/admin/permissions/features').then((r: any) => r.data.data),
  })
  const { data: fetchedPerms, isLoading: loadingPerms } = useQuery<PermissionRow[]>({
    queryKey: ['permissions', userId],
    queryFn: () => api.get(`/api/v1/admin/users/${userId}/permissions`).then((r: any) => r.data.data),
  })
  useEffect(() => { if (fetchedPerms) setRows(fetchedPerms) }, [fetchedPerms])

  const saveMutation = useMutation({
    mutationFn: (permissions: PermissionRow[]) => api.put(`/api/v1/admin/users/${userId}/permissions`, { permissions }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['permissions', userId] }); showToast('success', 'บันทึกสิทธิ์สำเร็จ'); onClose() },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })
  const resetMutation = useMutation({
    mutationFn: () => api.post(`/api/v1/admin/users/${userId}/permissions/reset`),
    onSuccess: (r: any) => { setRows(r.data.data); showToast('success', 'รีเซ็ตเป็นค่าเริ่มต้นของ role แล้ว') },
    onError: () => showToast('error', 'รีเซ็ตไม่สำเร็จ'),
  })

  const byFeature = useMemo(() => new Map((rows ?? []).map(r => [r.feature, r])), [rows])
  const sections = useMemo(() => {
    const q = search.trim().toLowerCase()
    const filtered = features.filter(f => !q || f.label.toLowerCase().includes(q))
    const map = new Map<string, FeatureDef[]>()
    for (const f of filtered) {
      if (!map.has(f.section)) map.set(f.section, [])
      map.get(f.section)!.push(f)
    }
    return SECTION_ORDER.filter(s => map.has(s)).map(s => ({ section: s, items: map.get(s)! }))
  }, [features, search])

  const totalGranted = (rows ?? []).reduce((sum, r) => sum + rowFullCount(r), 0)
  const totalPossible = features.length * ACTIONS.length

  const toggle = (feature: string, action: PermissionAction) => {
    setRows(prev => (prev ?? []).map(r => r.feature === feature ? { ...r, [action]: !r[action] } : r))
  }
  const setSectionAll = (items: FeatureDef[], value: boolean) => {
    const keys = new Set(items.map(f => f.key))
    setRows(prev => (prev ?? []).map(r => keys.has(r.feature)
      ? { ...r, ...Object.fromEntries(ACTIONS.map(a => [a.key, value])) }
      : r))
  }

  const loading = loadingFeatures || loadingPerms || !rows

  return (
    <Modal onClose={onClose} width={720} labelledBy="perm-matrix-title">
      <div style={{ padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: '#FEF8F6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#C85E3A', flexShrink: 0 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 id="perm-matrix-title" style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#111827' }}>สิทธิ์การใช้งานแบบละเอียด</h3>
              <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{userLabel}</p>
            </div>
          </div>
          <button onClick={onClose} aria-label="ปิด" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}><X size={18} /></button>
        </div>

        {!loading && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', minWidth: 160 }}>
              <Search size={14} color="#9ca3af" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input
                value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหาเมนู..."
                style={{ width: '100%', padding: '7px 10px 7px 30px', fontSize: '12.5px', borderRadius: 8, border: '1px solid #e5e7eb', boxSizing: 'border-box' }}
              />
            </div>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#C85E3A', background: '#FEF8F6', padding: '5px 10px', borderRadius: 99, whiteSpace: 'nowrap' }}>
              ให้สิทธิ์แล้ว {totalGranted}/{totalPossible} สิทธิ์ย่อย
            </span>
          </div>
        )}

        <div style={{ maxHeight: '56vh', overflowY: 'auto', border: '1px solid #E6ECF4', borderRadius: 10 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>กำลังโหลด...</p>
          ) : sections.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '30px 0' }}>ไม่พบเมนูที่ค้นหา</p>
          ) : (
            sections.map(({ section, items }) => (
              <div key={section} style={{ borderBottom: '1px solid #f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#f9fafb', position: 'sticky', top: 0 }}>
                  <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#374151' }}>{section}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => setSectionAll(items, true)} style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>เลือกทั้งหมด</button>
                    <button onClick={() => setSectionAll(items, false)} style={{ fontSize: '11px', fontWeight: 600, color: '#dc2626', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px' }}>ล้าง</button>
                  </div>
                </div>
                {items.map(f => {
                  const row = byFeature.get(f.key)
                  if (!row) return null
                  return (
                    <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderTop: '1px solid #f8fafc' }}>
                      <span style={{ flex: '1 1 140px', minWidth: 100, fontSize: '12.5px', color: '#1f2937' }}>{f.label}</span>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        {ACTIONS.map(a => (
                          <label key={a.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '11.5px', color: '#6b7280', cursor: 'pointer' }}>
                            <input type="checkbox" checked={row[a.key]} onChange={() => toggle(f.key, a.key)} />
                            {a.label}
                          </label>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16 }}>
          <Button variant="ghost" icon={<RotateCcw size={13} />} onClick={() => resetMutation.mutate()} loading={resetMutation.isPending} disabled={loading}>
            รีเซ็ตเป็นค่าเริ่มต้น
          </Button>
          <div style={{ flex: 1 }} />
          <Button variant="ghost" onClick={onClose}>ยกเลิก</Button>
          <Button variant="primary" onClick={() => rows && saveMutation.mutate(rows)} loading={saveMutation.isPending} disabled={loading}>บันทึก</Button>
        </div>
      </div>
    </Modal>
  )
}
