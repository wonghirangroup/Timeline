// admin/src/components/ui/Skeleton.tsx
// โครงร่างระหว่างโหลด — ใช้แทนข้อความ "กำลังโหลด..." ให้ layout ไม่กระตุกตอนข้อมูลมา
import type { CSSProperties } from 'react'

export function Skeleton({ w = '100%', h = 14, r = 6, style }: { w?: number | string; h?: number | string; r?: number; style?: CSSProperties }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block', width: w, height: h, borderRadius: r,
        background: 'linear-gradient(90deg,#eef1f5 25%,#e2e7ee 50%,#eef1f5 75%)',
        backgroundSize: '200% 100%',
        animation: 'sk-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

// การ์ด KPI ระหว่างโหลด
export function SkeletonCard({ h = 96 }: { h?: number }) {
  return <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-lg)', padding: 20 }}>
    <Skeleton w={36} h={36} r={10} />
    <Skeleton w="55%" h={12} style={{ marginTop: 14 }} />
    <Skeleton w="35%" h={24} style={{ marginTop: 8 }} />
    <span style={{ display: 'block', height: h - 96 }} />
  </div>
}

// แถวรายการระหว่างโหลด
export function SkeletonRows({ rows = 5 }: { rows?: number }) {
  return <div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid rgba(0,0,0,0.03)' }}>
        <Skeleton w={36} h={36} r={99} />
        <div style={{ flex: 1 }}>
          <Skeleton w="45%" h={12} />
          <Skeleton w="30%" h={10} style={{ marginTop: 6 }} />
        </div>
      </div>
    ))}
  </div>
}
