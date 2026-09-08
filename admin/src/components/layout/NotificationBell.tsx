import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Bell, ClipboardList, Clock, DoorOpen, CalendarOff, AlertTriangle,
  FileWarning, Target, ArrowLeftRight, Check,
} from 'lucide-react'
import { useNotifications, type NotifItem, type NotifSeverity } from '../../hooks/useNotifications'

const SEV: Record<NotifSeverity, { dot: string; bg: string; fg: string }> = {
  action: { dot: 'var(--action-primary)', bg: 'var(--accent-light)',  fg: 'var(--action-primary-hover)' },
  warn:   { dot: 'var(--warning)',        bg: 'var(--warning-bg)',     fg: 'var(--warning-text)' },
  info:   { dot: '#94a3b8',               bg: '#f1f5f9',               fg: '#475569' },
}

const KIND_ICON: Record<string, JSX.Element> = {
  pending_leave:          <ClipboardList size={15} />,
  pending_ot:             <Clock size={15} />,
  pending_resignation:    <DoorOpen size={15} />,
  pending_weekly_off:     <CalendarOff size={15} />,
  worked_on_own_day_off:  <AlertTriangle size={15} />,
  weekly_off_swap:        <ArrowLeftRight size={15} />,
  expiring_document:      <FileWarning size={15} />,
  probation_due:          <Target size={15} />,
}

function relThai(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.round(diff / 60000)
  if (m < 1) return 'เมื่อครู่'
  if (m < 60) return `${m} นาทีที่แล้ว`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} ชม.ที่แล้ว`
  const d = Math.round(h / 24)
  if (d === 1) return 'เมื่อวาน'
  if (d < 30) return `${d} วันที่แล้ว`
  return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const GROUP_LABEL: { key: NotifSeverity; label: string }[] = [
  { key: 'action', label: 'ต้องดำเนินการ' },
  { key: 'warn',   label: 'ควรตรวจสอบ' },
  { key: 'info',   label: 'ความเคลื่อนไหวล่าสุด' },
]

export default function NotificationBell({ isMobile }: { isMobile: boolean }) {
  const navigate = useNavigate()
  const { data } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const items = data?.items ?? []
  const badge = (data?.count ?? 0) + (data?.warn_count ?? 0)

  useEffect(() => {
    if (!open || isMobile) return
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open, isMobile])

  useEffect(() => {
    if (!open) return
    function esc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [open])

  function go(it: NotifItem) {
    setOpen(false)
    navigate(it.link)
  }

  const panel = (
    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: isMobile ? '80vh' : 460 }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-main)' }}>การแจ้งเตือน</span>
        {badge > 0 && (
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--action-primary-hover)', background: 'var(--accent-light)', padding: '2px 9px', borderRadius: 99 }}>
            {badge} รายการ
          </span>
        )}
      </div>

      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.length === 0 ? (
          <div style={{ padding: '44px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10, color: '#22c55e' }}><Check size={30} /></div>
            <div style={{ fontSize: 13, fontWeight: 600 }}>ไม่มีรายการค้าง</div>
            <div style={{ fontSize: 11.5, marginTop: 3 }}>คำขอและการแจ้งเตือนทั้งหมดจัดการครบแล้ว</div>
          </div>
        ) : (
          GROUP_LABEL.map(g => {
            const rows = items.filter(i => i.severity === g.key)
            if (rows.length === 0) return null
            return (
              <div key={g.key}>
                <div style={{ padding: '10px 18px 5px', fontSize: 10.5, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
                  {g.label} · {rows.length}
                </div>
                {rows.map(it => {
                  const s = SEV[it.severity]
                  return (
                    <button key={it.id} onClick={() => go(it)}
                      style={{ display: 'flex', gap: 11, width: '100%', textAlign: 'left', padding: '11px 18px', border: 'none', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)', cursor: 'pointer', fontFamily: 'inherit', transition: 'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-subtle)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}
                    >
                      <span style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, background: s.bg, color: s.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                        {KIND_ICON[it.kind] ?? <Bell size={15} />}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--text-main)' }}>{it.title}</span>
                        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1, lineHeight: 1.45 }}>{it.detail}</span>
                        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-faint)', marginTop: 3 }}>{relThai(it.at)}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`การแจ้งเตือน${badge > 0 ? ` (${badge} รายการ)` : ''}`}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 9, color: 'var(--text-body)', display: 'flex', transition: 'background 0.15s' }}
        onMouseEnter={e => !isMobile && (e.currentTarget.style.background = 'var(--bg-subtle)')}
        onMouseLeave={e => !isMobile && (e.currentTarget.style.background = 'none')}
      >
        <Bell size={19} />
        {badge > 0 && (
          <span style={{
            position: 'absolute', top: 1, right: 1, minWidth: 16, height: 16, padding: '0 4px',
            borderRadius: 99, background: 'var(--action-danger)', color: '#fff', fontSize: 10, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--glass-bg)',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </button>

      {!isMobile && open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 12px)', right: 0, width: 360,
          background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          border: '1px solid rgba(0,0,0,0.05)', zIndex: 300, overflow: 'hidden',
          animation: 'fade-in-up 0.18s cubic-bezier(0.16,1,0.3,1)',
        }}>
          {panel}
        </div>
      )}

      {isMobile && open && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', zIndex: 300, display: 'flex', alignItems: 'flex-end' }}
          onClick={() => setOpen(false)}>
          <div style={{ width: '100%', background: 'var(--bg-card)', borderRadius: '20px 20px 0 0', paddingBottom: 'max(12px, env(safe-area-inset-bottom))', overflow: 'hidden', boxShadow: 'var(--shadow-float)' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
              <div style={{ width: 40, height: 4, borderRadius: 99, background: 'rgba(0,0,0,0.1)' }} />
            </div>
            {panel}
          </div>
        </div>
      )}
    </div>
  )
}
