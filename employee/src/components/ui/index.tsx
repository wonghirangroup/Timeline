// employee/src/components/ui/index.tsx — Component Library
// ใช้ import { Button, Card, Badge, ... } from '../../components/ui'

import type { CSSProperties, ReactNode } from 'react'
import { COLOR, RADIUS, SHADOW, FONT, STATUS } from './tokens'

// ─── Button ───────────────────────────────────────────────────────
interface BtnProps {
  children: ReactNode
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  icon?: ReactNode
}

export function Button({ children, variant = 'primary', size = 'md', fullWidth, disabled, loading, onClick, type = 'button', icon }: BtnProps) {
  const sizes: Record<string, CSSProperties> = {
    sm: { padding: '8px 14px', fontSize: FONT.sm, borderRadius: RADIUS.md },
    md: { padding: '12px 22px', fontSize: FONT.base, borderRadius: RADIUS.md },
    lg: { padding: '15px 28px', fontSize: FONT.md,  borderRadius: RADIUS.lg },
  }
  const variants: Record<string, CSSProperties> = {
    primary: {
      background: disabled || loading
        ? 'rgba(255,107,53,0.35)'
        : `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryMid}, ${COLOR.primaryEnd})`,
      color: COLOR.textOnAccent,
      border: 'none',
      boxShadow: disabled || loading ? 'none' : SHADOW.btn,
    },
    outline: {
      background: 'transparent',
      color: COLOR.primary,
      border: `1.5px solid ${COLOR.primary}`,
    },
    ghost: {
      background: COLOR.primaryBg,
      color: COLOR.primary,
      border: `1px solid ${COLOR.primaryBorder}`,
    },
    danger: {
      background: COLOR.error,
      color: COLOR.textOnAccent,
      border: 'none',
    },
  }
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        width: fullWidth ? '100%' : undefined,
        fontWeight: 700, fontFamily: 'inherit',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'transform 0.12s, opacity 0.12s',
        ...sizes[size],
        ...variants[variant],
      }}
      onMouseDown={e => { if (!disabled && !loading) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)' }}
      onMouseUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)' }}
    >
      {loading ? <span className="animate-spin">⏳</span> : icon}
      {children}
    </button>
  )
}

// ─── Card ─────────────────────────────────────────────────────────
interface CardProps {
  children: ReactNode
  style?: CSSProperties
  className?: string
  padding?: number | string
  noPadding?: boolean
  onClick?: () => void
}
export function Card({ children, style, className = '', padding = 16, noPadding, onClick }: CardProps) {
  return (
    <div
      className={`glass-card ${className}`}
      onClick={onClick}
      style={{
        padding: noPadding ? 0 : padding,
        cursor: onClick ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── Badge / Status Chip ──────────────────────────────────────────
interface BadgeProps {
  status?: keyof typeof STATUS
  label?: string
  color?: string
  bg?: string
  size?: 'sm' | 'md'
  dot?: boolean
}
export function Badge({ status, label, color, bg, size = 'md', dot }: BadgeProps) {
  const cfg = status ? STATUS[status] : null
  const c = color ?? cfg?.color ?? COLOR.textMuted
  const b = bg    ?? cfg?.bg    ?? 'rgba(0,0,0,0.06)'
  const l = label ?? cfg?.label ?? ''
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '2px 8px' : '4px 12px',
      borderRadius: RADIUS.full,
      background: b, color: c,
      fontSize: size === 'sm' ? FONT.xs : FONT.sm,
      fontWeight: 700, lineHeight: 1.4,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c, display: 'inline-block', flexShrink: 0 }} />}
      {l}
    </span>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────
interface AvatarProps {
  name: string
  size?: number
  fontSize?: number
}
export function Avatar({ name, size = 48, fontSize }: AvatarProps) {
  const initial = name ? name.charAt(0) : '?'
  const fs = fontSize ?? Math.round(size * 0.4)
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: fs, fontWeight: 700, color: COLOR.textOnAccent,
      boxShadow: `0 4px 16px rgba(255,107,53,0.28)`,
    }}>
      {initial}
    </div>
  )
}

// ─── Divider ──────────────────────────────────────────────────────
export function Divider({ margin = '8px 0' }: { margin?: string }) {
  return <div style={{ height: 1, background: 'rgba(0,0,0,0.06)', margin }} />
}

// ─── InfoRow ──────────────────────────────────────────────────────
export function InfoRow({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: FONT.sm, color: COLOR.textSecondary, fontWeight: 500 }}>
        {icon}{label}
      </span>
      <span style={{ fontSize: FONT.base, fontWeight: 600, color: COLOR.textPrimary }}>{value}</span>
    </div>
  )
}

// ─── SectionTitle ─────────────────────────────────────────────────
export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
      <h3 style={{ margin: 0, fontSize: FONT.base, fontWeight: 700, color: COLOR.textPrimary }}>{children}</h3>
      {right}
    </div>
  )
}

// ─── EmptyState ───────────────────────────────────────────────────
export function EmptyState({ icon = '📭', title, sub }: { icon?: string; title: string; sub?: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: '2.4rem', marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: FONT.base, fontWeight: 600, color: COLOR.textSecondary, marginBottom: 6 }}>{title}</div>
      {sub && <div style={{ fontSize: FONT.sm, color: COLOR.textMuted }}>{sub}</div>}
    </div>
  )
}

// ─── LoadingSkeleton ──────────────────────────────────────────────
export function SkeletonLine({ width = '100%', height = 14, mb = 8 }: { width?: string | number; height?: number; mb?: number }) {
  return (
    <div style={{
      width, height, borderRadius: RADIUS.sm, marginBottom: mb,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  )
}

// ─── GradientAccent ───────────────────────────────────────────────
export function GradientBar({ width = 40 }: { width?: number }) {
  return (
    <div style={{ width, height: 4, borderRadius: RADIUS.full, background: `linear-gradient(90deg,${COLOR.primary},${COLOR.primaryEnd})`, margin: '0 auto 16px' }} />
  )
}

// ─── PageHeader (App top bar) ─────────────────────────────────────
export function PageHeader({ title, right, transparent }: { title: string; right?: ReactNode; transparent?: boolean }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 40,
      padding: '14px 20px 12px',
      background: transparent ? 'transparent' : 'rgba(255,255,255,0.92)',
      backdropFilter: transparent ? 'none' : 'blur(20px)',
      borderBottom: transparent ? 'none' : `1px solid ${COLOR.primaryBorder}`,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <h1 style={{ margin: 0, fontSize: FONT.md, fontWeight: 800, color: COLOR.textPrimary }}>{title}</h1>
      {right}
    </div>
  )
}

// ─── QuickStatCard ────────────────────────────────────────────────
export function QuickStatCard({ icon, label, value, color = COLOR.primary }: {
  icon: ReactNode; label: string; value: string | number; color?: string
}) {
  return (
    <Card style={{ flex: 1, textAlign: 'center', minWidth: 80 }} padding={12}>
      <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: FONT.xl, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: FONT.xs, color: COLOR.textMuted, marginTop: 2 }}>{label}</div>
    </Card>
  )
}

// re-export tokens
export { COLOR, RADIUS, SHADOW, FONT, STATUS }
