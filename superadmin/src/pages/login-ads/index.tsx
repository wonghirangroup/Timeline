// superadmin/src/pages/login-ads/index.tsx
// จัดการแบนเนอร์ฝั่งซ้ายของหน้า login แอดมิน (feedback 2026-09-28 "พื้นที่ฝั่ง
// ซ้ายของฟอร์ม superadmin จัดการเพิ่มเหมือนโฆษณาได้") — หมุนสลับได้หลายรูป,
// มีลิงก์เปิดแท็บใหม่ได้ (ดู admin/src/pages/login/index.tsx ฝั่งที่แสดงผลจริง)
import { useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Image, Plus, Pencil, Trash2, ArrowUp, ArrowDown, X, Link as LinkIcon, Eye, EyeOff, Loader2 } from 'lucide-react'
import { api } from '../../lib/axios'
import { useToast } from '../../components/ui/Toast'
import { uploadLoginAdImage } from '../../lib/upload'

interface LoginAd {
  id: string; image_url: string; link_url: string | null; title: string | null
  sort_order: number; is_active: boolean
}

const card: React.CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }
const inputSt: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fff' }
const labelSt: React.CSSProperties = { fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-body)', marginBottom: 4, display: 'block' }

export default function SALoginAdsPage() {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const { data: ads = [], isLoading } = useQuery<LoginAd[]>({
    queryKey: ['sa', 'login-ads'],
    queryFn: () => api.get('/api/v1/super-admin/login-ads').then(r => r.data.data),
  })
  const [editing, setEditing] = useState<LoginAd | 'new' | null>(null)

  const toggleMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => api.patch(`/api/v1/super-admin/login-ads/${id}`, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa', 'login-ads'] }),
    onError: () => showToast('error', 'เปลี่ยนสถานะไม่สำเร็จ'),
  })
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/super-admin/login-ads/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['sa', 'login-ads'] }); showToast('success', 'ลบแบนเนอร์แล้ว') },
    onError: () => showToast('error', 'ลบไม่สำเร็จ'),
  })
  const swapMut = useMutation({
    mutationFn: (body: { id_a: string; id_b: string }) => api.post('/api/v1/super-admin/login-ads/swap-order', body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sa', 'login-ads'] }),
    onError: () => showToast('error', 'สลับลำดับไม่สำเร็จ'),
  })

  function move(idx: number, dir: -1 | 1) {
    const other = ads[idx + dir]
    if (!other) return
    swapMut.mutate({ id_a: ads[idx].id, id_b: other.id })
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', margin: 0 }}>แบนเนอร์หน้า Login</h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#64748b', maxWidth: 560 }}>
            รูปที่หมุนสลับกันฝั่งซ้ายของหน้า login แอดมิน (แทนที่ข้อความแนะนำฟีเจอร์เดิมทั้งหมด) — กดรูปแล้วเปิดลิงก์แท็บใหม่ได้ถ้าตั้งไว้
          </p>
        </div>
        <button onClick={() => setEditing('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 10, border: 'none', background: 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', flexShrink: 0 }}>
          <Plus size={15} /> เพิ่มแบนเนอร์
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-gray)' }}>กำลังโหลด...</div>
      ) : ads.length === 0 ? (
        <div style={{ ...card, padding: '50px 20px', textAlign: 'center', color: '#94a3b8' }}>
          <Image size={26} style={{ marginBottom: 8 }} />
          <div style={{ fontWeight: 600 }}>ยังไม่มีแบนเนอร์</div>
          <div style={{ fontSize: '0.8rem', marginTop: 4 }}>ตอนนี้หน้า login แอดมินจะโชว์ข้อความแนะนำฟีเจอร์เดิมแทน จนกว่าจะเพิ่มอย่างน้อย 1 รูป</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
          {ads.map((ad, idx) => (
            <div key={ad.id} style={{ ...card, padding: 12, display: 'flex', alignItems: 'center', gap: 12, opacity: ad.is_active ? 1 : 0.55 }}>
              <img src={ad.image_url} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', flexShrink: 0, background: '#f1f5f9' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#111827' }}>{ad.title || '(ไม่มีชื่อภายใน)'}</div>
                {ad.link_url ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <LinkIcon size={11} style={{ flexShrink: 0 }} /> {ad.link_url}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>ไม่มีลิงก์</div>
                )}
                <div style={{ fontSize: '0.72rem', fontWeight: 700, marginTop: 4, color: ad.is_active ? 'var(--success-text)' : '#94a3b8' }}>
                  {ad.is_active ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <button onClick={() => move(idx, -1)} disabled={idx === 0} title="เลื่อนขึ้น"
                  style={{ padding: 5, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: idx === 0 ? 'not-allowed' : 'pointer', opacity: idx === 0 ? 0.4 : 1, color: '#374151' }}><ArrowUp size={13} /></button>
                <button onClick={() => move(idx, 1)} disabled={idx === ads.length - 1} title="เลื่อนลง"
                  style={{ padding: 5, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', cursor: idx === ads.length - 1 ? 'not-allowed' : 'pointer', opacity: idx === ads.length - 1 ? 0.4 : 1, color: '#374151' }}><ArrowDown size={13} /></button>
              </div>
              <button onClick={() => toggleMut.mutate({ id: ad.id, is_active: !ad.is_active })} title={ad.is_active ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                style={{ padding: 7, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: ad.is_active ? '#16a34a' : '#94a3b8' }}>
                {ad.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => setEditing(ad)} title="แก้ไข"
                style={{ padding: 7, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', color: '#374151' }}><Pencil size={14} /></button>
              <button onClick={() => { if (confirm('ลบแบนเนอร์นี้?')) deleteMut.mutate(ad.id) }} title="ลบ"
                style={{ padding: 7, borderRadius: 8, border: '1px solid #fecaca', background: '#fff', cursor: 'pointer', color: '#dc2626' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      )}

      {editing && <EditModal ad={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function EditModal({ ad, onClose }: { ad: LoginAd | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { showToast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState(ad?.image_url ?? '')
  const [linkUrl, setLinkUrl] = useState(ad?.link_url ?? '')
  const [title, setTitle] = useState(ad?.title ?? '')
  const [uploading, setUploading] = useState(false)

  const saveMut = useMutation({
    mutationFn: () => ad
      ? api.patch(`/api/v1/super-admin/login-ads/${ad.id}`, { image_url: imageUrl, link_url: linkUrl || null, title: title || null })
      : api.post('/api/v1/super-admin/login-ads', { image_url: imageUrl, link_url: linkUrl || null, title: title || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sa', 'login-ads'] })
      showToast('success', ad ? 'บันทึกแล้ว' : 'เพิ่มแบนเนอร์แล้ว')
      onClose()
    },
    onError: () => showToast('error', 'บันทึกไม่สำเร็จ'),
  })

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      setImageUrl(await uploadLoginAdImage(file))
    } catch {
      showToast('error', 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 16, width: 440, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{ad ? 'แก้ไขแบนเนอร์' : 'เพิ่มแบนเนอร์'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }} aria-label="ปิด"><X size={18} /></button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelSt}>รูปแบนเนอร์</label>
            {imageUrl && <img src={imageUrl} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, marginBottom: 8, background: '#f1f5f9' }} />}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} disabled={uploading}
              style={{ fontSize: '0.8rem' }} />
            {uploading && <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#64748b', marginTop: 6 }}><Loader2 size={13} className="animate-spin" /> กำลังอัปโหลด...</div>}
          </div>
          <div>
            <label style={labelSt}>ลิงก์เมื่อกด (ไม่บังคับ — เปิดแท็บใหม่)</label>
            <input style={inputSt} value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div>
            <label style={labelSt}>ชื่อภายใน (ไม่บังคับ — ไม่โชว์บนหน้า login ใช้ดูในลิสต์นี้เฉยๆ)</label>
            <input style={inputSt} value={title} onChange={e => setTitle(e.target.value)} placeholder="เช่น โปรโมชั่นเดือนตุลาคม" />
          </div>
        </div>

        <div style={{ padding: '14px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #d1d5db', background: '#fff', color: '#374151', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>ยกเลิก</button>
          <button onClick={() => saveMut.mutate()} disabled={!imageUrl || uploading || saveMut.isPending}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: (!imageUrl || uploading) ? '#cbd5e1' : 'var(--sa-accent)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: (!imageUrl || uploading) ? 'not-allowed' : 'pointer' }}>
            {saveMut.isPending ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  )
}
