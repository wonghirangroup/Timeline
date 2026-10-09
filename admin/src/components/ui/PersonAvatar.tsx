// admin/src/components/ui/PersonAvatar.tsx
// รูปโปรไฟล์วงกลมของพนักงาน — ไม่มีรูปใช้ตัวอักษรแรกของชื่อบนพื้น gradient (สีคงที่ตามชื่อ ไม่เปลี่ยนเมื่อรายการเรียงใหม่)
// feedback 2026-10-09 "กด Card พวกนี้แล้วแสดงรูปโปรไฟล์พนักงานด้วย"
import { avatarUrl } from '../../lib/upload'

function hueOf(name: string) {
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}

export default function PersonAvatar({ name, photoUrl, size = 36 }: { name: string; photoUrl?: string | null; size?: number }) {
  const h = hueOf(name)
  return (
    <div aria-hidden="true" style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0, overflow: 'hidden',
      background: photoUrl ? '#e2e8f0' : `linear-gradient(135deg, hsl(${h},60%,60%), hsl(${(h + 30) % 360},70%,45%))`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: Math.round(size * 0.36), fontWeight: 800, color: '#fff',
    }}>
      {photoUrl
        ? <img src={avatarUrl(photoUrl, size * 2) ?? photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.trim().charAt(0)}
    </div>
  )
}
