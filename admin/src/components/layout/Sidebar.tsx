import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Building2, Clock, AlignLeft,
  ClipboardCheck, CalendarDays, FileClock, BarChart2,
  Megaphone, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal, MapPin, Table2, DoorOpen, FileText,
  TrendingUp, CalendarOff, MessageCircle, BookOpen,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
import { useNotifications } from '../../hooks/useNotifications'
import type { Role } from '../../stores/authStore'
import type { PlanFeatures } from '../../types'

// re-export สำหรับหน้าอื่น
export { Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal }

interface NavItem {
  path: string
  label: string
  icon: JSX.Element
  feature?: keyof PlanFeatures
  permKey?: string // feature key ของระบบสิทธิ์แบบละเอียด (v187) — ปิด "ดู" แล้วเมนูนี้หาย
  roles?: Role[] // ไม่ระบุ = ทุกบทบาทเห็น — ระบุ = จำกัดเฉพาะบทบาทในลิสต์
  badge?: number
  badgeTone?: 'action' | 'warn' // action = ต้องอนุมัติ (แดง), warn = ต้องไปตรวจสอบ (เหลือง)
}

interface NavSection {
  label?: string
  items: NavItem[]
}

// ── Flat nav — ไม่มี dropdown ทั้งหมด ──────────────────────────────────────
// จัดกลุ่มใหม่ (feedback 2026-09-22): ภาพรวม / ข้อมูล / กิจกรรม / รายงาน (แยก
// หมวดย่อย) / ตั้งค่า — "กะและเวลา" เปลี่ยนชื่อเป็น "เช็คอิน" เพราะเนื้อหาจริง
// ของหน้า /shift คือ "เช็คอินวันนี้" + "ตารางกะ" (ไม่ใช่หน้าจัดการนิยามกะ ซึ่ง
// อยู่ในแท็บ "จัดการกะ" ของหน้าสาขาต่างหาก) — OT/คำขอลาออก/ขอเอกสาร HR/ประกาศ
// ที่ user ไม่ได้ระบุตำแหน่งชัดเจน จัดไว้ใน "กิจกรรม" ต่อจาก 3 อันที่ระบุมา
// (ทั้งหมดเป็น workflow อนุมัติ/ดำเนินการเหมือนกัน)
const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { path: '/dashboard', label: 'ภาพรวม', icon: <LayoutGrid size={16}/> },
    ],
  },
  {
    label: 'ข้อมูล',
    items: [
      { path: '/branch',       label: 'สาขา',         permKey: 'branch',      icon: <Building2 size={16}/> },
      { path: '/employee',     label: 'พนักงาน',      permKey: 'employee',    icon: <Users     size={16}/> },
      { path: '/master-data',  label: 'Master Data',  permKey: 'master_data', icon: <Table2    size={16}/>, roles: ['SUPER_ADMIN', 'ADMIN', 'EXECUTIVE'] },
    ],
  },
  {
    label: 'กิจกรรม',
    items: [
      { path: '/shift',    label: 'เช็คอิน',            permKey: 'shift', icon: <Clock       size={16}/> },
      { path: '/leave',    label: 'การลา และ วันหยุด',  feature: 'leave_management', permKey: 'leave', icon: <CalendarDays size={16}/> },
      { path: '/offsite',  label: 'เช็คอินนอกสถานที่',  feature: 'gps_checkin', permKey: 'offsite', icon: <MapPin size={16}/> },
      { path: '/ot',                  label: 'OT',          feature: 'ot_management',  permKey: 'ot',                icon: <FileClock size={16}/> },
      { path: '/resignations',        label: 'คำขอลาออก',   feature: 'resignation',    permKey: 'resignation',       icon: <DoorOpen  size={16}/> },
      { path: '/document-requests',   label: 'ขอเอกสาร HR', feature: 'document_request', permKey: 'document_request', icon: <FileText size={16}/> },
      { path: '/announcement',        label: 'ประกาศ',      feature: 'announcement',   permKey: 'announcement',      icon: <Megaphone size={16}/> },
    ],
  },
  {
    label: 'รายงาน',
    items: [
      { path: '/report/executive',     label: 'รายงานผู้บริหาร',        permKey: 'report_executive',      icon: <TrendingUp   size={16}/> },
      { path: '/report/employee',      label: 'รายงานพนักงาน',          permKey: 'report_employee',       icon: <Users        size={16}/> },
      { path: '/report',               label: 'รายงานการเช็คอิน',       permKey: 'report_checkin',        icon: <BarChart2    size={16}/> },
      { path: '/report/branch',        label: 'รายงานสาขา',             permKey: 'report_branch',         icon: <Building2    size={16}/> },
      { path: '/report/holiday',       label: 'รายงานวันหยุด',          permKey: 'report_holiday',        icon: <CalendarOff  size={16}/> },
      { path: '/report/leave',         label: 'รายงานวันลา',            permKey: 'report_leave',          icon: <CalendarDays size={16}/> },
      { path: '/report/line-messages', label: 'รายงานการส่งข้อความไลน์', permKey: 'report_line_messages', icon: <MessageCircle size={16}/> },
      { path: '/audit-log',            label: 'บันทึกกิจกรรมพนักงาน',    icon: <FileClock size={16}/> },
    ],
  },
]

interface SidebarProps {
  isMobile: boolean
  drawerOpen: boolean
  onClose: () => void
  collapsed?: boolean
  onToggleCollapse?: () => void
}

export default function Sidebar({ isMobile, drawerOpen, onClose, collapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const clear    = useAuthStore(s => s.clear)

  function handleLogout() { clear(); navigate('/login', { replace: true }) }

  const body = (
    <SidebarContent
      onLogout={handleLogout}
      onNavClick={isMobile ? onClose : () => {}}
      collapsed={!isMobile && collapsed}
      onToggleCollapse={!isMobile ? onToggleCollapse : undefined}
    />
  )

  if (!isMobile) {
    return (
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0,
        width: collapsed ? 64 : 260,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)', borderRight: '1px solid #E3ECF8',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: '4px 0 24px rgba(36,75,131,0.08)',
        transition: 'width 0.25s cubic-bezier(0.4,0,0.2,1)',
        overflow: 'hidden',
      }}>
        {body}
      </aside>
    )
  }

  return (
    <>
      {drawerOpen && (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.4)', zIndex: 99, backdropFilter: 'blur(2px)' }} />
      )}
      <aside style={{
        position: 'fixed', left: 0, top: 0, bottom: 0, width: 280,
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: drawerOpen ? '4px 0 24px rgba(36,75,131,0.18)' : 'none',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: '#EAF2FF', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B4A6B', zIndex: 3 }}
          onMouseEnter={e => e.currentTarget.style.background = '#DCE9FF'}
          onMouseLeave={e => e.currentTarget.style.background = '#EAF2FF'}
        >
          <X size={16} />
        </button>
        {body}
      </aside>
    </>
  )
}

// ── สีประจำหมวด ── รวมเป็นสีเดียวกันหมดทุกหมวด (feedback 2026-09-15 "ส้ม
// มากกว่า", ยังคงหลักการนี้ไว้ — ไม่แยกสีรุ้งต่อหมวด) แต่เปลี่ยนจากส้มเป็น
// ฟ้าอ่อน (rebrand 2026-09-25 "เอาธีมสีแบบนี้" ตามภาพอ้างอิง — active nav
// item ในภาพเป็น pill สีฟ้า ไม่ใช่ส้ม บน sidebar navy เข้ม) ส้มเก็บไว้เป็น
// accent เฉพาะจุดอื่น (เช่น role badge บน Topbar) ไม่ใช่สีหลักของ Sidebar แล้ว
interface SecAccent { text: string; bg: string }
const ACTIVE_ACCENT: SecAccent = { text: '#1D6FE0', bg: 'rgba(29,111,224,0.12)' }
const SETTINGS_ACCENT: SecAccent = { text: '#52617F', bg: 'rgba(82,97,127,0.12)' } // slate

// sidebar โทนสว่าง (feedback 2026-10-08 "อยากได้ sidebar แบบนี้" — Playful Mascot): พื้นขาว-ฟ้าอ่อน,
// เมนู active = pill น้ำเงินทึบตัวอักษรขาว, ไอคอนอยู่ในกล่องมนสีต่อเมนู
type IconTone = { bg: string; fg: string }
const TONE_BLUE: IconTone   = { bg: '#E3EEFF', fg: '#1D6FE0' }
const TONE_ORANGE: IconTone = { bg: '#FFEBD6', fg: '#EA6A00' }
const TONE_TEAL: IconTone   = { bg: '#D9F5F0', fg: '#0F8F7E' }
const TONE_VIOLET: IconTone = { bg: '#EDE6FF', fg: '#6D3FD8' }
const TONE_SLATE: IconTone  = { bg: '#EAEEF5', fg: '#52617F' }
const ICON_TONE: Record<string, IconTone> = {
  '/branch': TONE_TEAL, '/employee': TONE_ORANGE, '/master-data': TONE_VIOLET,
  '/shift': TONE_BLUE, '/leave': TONE_TEAL, '/offsite': TONE_ORANGE,
  '/ot': TONE_VIOLET, '/resignations': TONE_ORANGE, '/document-requests': TONE_TEAL, '/announcement': TONE_VIOLET,
  '/audit-log': TONE_SLATE, '/manual': TONE_VIOLET, '/settings': TONE_SLATE,
}
const toneOf = (path: string): IconTone => ICON_TONE[path] ?? (path.startsWith('/report') ? TONE_BLUE : TONE_BLUE)

const ROLE_CHIP: Partial<Record<string, { label: string; bg: string; color: string }>> = {
  EXECUTIVE: { label: 'ผู้บริหาร · อ่านอย่างเดียว', bg: '#E6ECF4', color: '#475569' },
  DEPT_HEAD: { label: 'หัวหน้าแผนก · เห็นเฉพาะแผนกที่ดูแล', bg: '#eef2ff', color: '#4338ca' },
}

function SidebarContent({ onLogout, onNavClick, collapsed, onToggleCollapse }: {
  onLogout: () => void; onNavClick: () => void
  collapsed: boolean; onToggleCollapse?: () => void
}) {
  const location        = useLocation()
  const enabledFeatures = useAuthStore(s => s.enabledFeatures)
  const permissions     = useAuthStore(s => s.permissions)
  const role            = useAuthStore(s => s.role)
  const roleChip        = role ? ROLE_CHIP[role] : undefined
  // ตัวเลขบนเมนู = งานที่รออนุมัติ/ต้องตรวจสอบ — ใช้ endpoint เดียวกับกระดิ่ง (react-query แชร์ cache poll ทุก 45 วิ ไม่ยิงซ้ำ)
  const { data: notif } = useNotifications()
  const mc = notif?.menu_counts
  const MENU_BADGE: Record<string, { n: number; tone: 'action' | 'warn' } | undefined> = {
    '/leave':             mc ? { n: mc.leave, tone: 'action' } : undefined,
    '/ot':                mc ? { n: mc.ot, tone: 'action' } : undefined,
    '/resignations':      mc ? { n: mc.resignation, tone: 'action' } : undefined,
    '/document-requests': mc ? { n: mc.document_request, tone: 'action' } : undefined,
    '/employee':          mc ? { n: mc.employee, tone: 'warn' } : undefined,
  }

  // ปิดจริงที่ backend ด้วย (requireFeature middleware) — ตรงนี้แค่ซ่อนเมนูให้ตรงกับสิทธิ์
  // ไม่มี key ใน enabledFeatures เลย (tenant ไม่เคยถูกตั้งค่า) = เปิดใช้งานทุกฟีเจอร์ (ค่า default)
  //
  // permKey เพิ่มจากระบบสิทธิ์แบบละเอียด (v187/v198 "อยากให้เห็นว่า account ไหน
  // จะเห็นเมนูไหนใน Sidebar") — permissions เป็น null ระหว่างที่ยังโหลดครั้งแรก
  // ไม่ทัน (ก่อน /auth/me รอบแรกตอบกลับ) หรือ SUPER_ADMIN (ไม่มี tenant/ไม่มีแถว)
  // ถือว่าเห็นทุกเมนูไปก่อน (fallback ปลอดภัยแบบเดียวกับฝั่ง backend) — permKey
  // ที่ยังไม่มีแถวใน map ก็ถือว่าเห็น (getUserPermissions default เป็น true อยู่แล้ว)
  function visible(feature?: keyof PlanFeatures, roles?: Role[], permKey?: string) {
    if (roles && (!role || !roles.includes(role))) return false
    if (feature && enabledFeatures && enabledFeatures[feature] === false) return false
    if (permKey && permissions && permissions[permKey]?.view === false) return false
    return true
  }

  // ── helper: icon-centered nav link ───────────────────────────────────────
  function NavItem({ item, accent }: { item: { path: string; label: string; icon: JSX.Element; badge?: number; badgeTone?: 'action' | 'warn' }; accent: SecAccent }) {
    const badgeBg = item.badgeTone === 'warn' ? '#f59e0b' : 'var(--error)'
    const badgeText = item.badge != null && item.badge > 99 ? '99+' : item.badge
    // highlight ค้างไว้ถ้ายังอยู่ในหน้าลูกของเมนูนี้ เช่น /employee/:id ก็ยัง highlight "พนักงาน"
    // ยกเว้น /report — เดิม prefix-match ทำให้ "รายงานการเช็คอิน" (path /report)
    // ค้าง highlight ตอนเข้าหน้ารายงานหมวดอื่นด้วย (/report/branch ฯลฯ) เพราะ
    // ตอนนี้เป็น sibling routes แยกกัน ไม่ใช่หน้าลูกของ /report จริง (feedback
    // 2026-09-22 "จัดกลุ่มรายงานใหม่แยก 7 หมวด")
    const isActive = location.pathname === item.path ||
      (item.path !== '/report' && location.pathname.startsWith(item.path + '/'))
    return (
      <NavLink
        to={item.path}
        onClick={onNavClick}
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 12,
          padding: collapsed ? '10px 0' : '10px 12px',
          justifyContent: collapsed ? 'center' : 'flex-start',
          borderRadius: 14,
          textDecoration: 'none', fontSize: '14px',
          fontWeight: isActive ? 800 : 600,
          color: isActive ? '#fff' : '#1E2A4A',
          background: isActive ? 'linear-gradient(180deg, #2F86F2, #1D5FD0)' : 'transparent',
          boxShadow: isActive ? '0 8px 18px -6px rgba(29,95,208,0.55)' : 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = '#EEF5FF'; e.currentTarget.style.color = '#0B2A8A'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#1E2A4A'; } }}
      >
        <div style={{ position: 'relative', width: 32, height: 32, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: isActive ? 'rgba(255,255,255,0.22)' : toneOf(item.path).bg, color: isActive ? '#fff' : toneOf(item.path).fg }}>
          {item.icon}
          {collapsed && item.badge != null && item.badge > 0 && (
            <span style={{ position: 'absolute', top: 1, right: 1, width: 9, height: 9, borderRadius: '50%', background: badgeBg, border: '1.5px solid #fff' }} />
          )}
        </div>
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span title={item.badgeTone === 'warn' ? 'ต้องไปตรวจสอบ' : 'รอดำเนินการ/อนุมัติ'} style={{ background: badgeBg, color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0, minWidth: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                {badgeText}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Logo + mascot + collapse toggle */}
      <div style={{
        position: 'relative', overflow: 'hidden',
        padding: collapsed ? '14px 0' : '14px 16px',
        borderBottom: '1px solid #E3ECF8', flexShrink: 0,
        display: 'flex', flexDirection: 'column', alignItems: collapsed ? 'center' : 'stretch', justifyContent: 'center', gap: collapsed ? 10 : 0,
        minHeight: collapsed ? 0 : 88,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 10 }}>
          <img src="/yoonai-logo.png" alt="YooNai" style={{ height: collapsed ? 44 : 52, width: collapsed ? 44 : 52, objectFit: 'cover', flexShrink: 0, borderRadius: 14, boxShadow: '0 4px 12px rgba(36,75,131,0.14)' }} />
          {!collapsed && (
            <p style={{ fontSize: 21, fontWeight: 800, color: '#0B2A8A', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>YooNai</p>
          )}
        </div>

        {!collapsed && (
          <img src="/dashboard/owl-wave.webp" alt="" aria-hidden="true" draggable={false}
            style={{ position: 'absolute', right: 40, bottom: 2, width: 58, height: 58, objectFit: 'contain', pointerEvents: 'none', userSelect: 'none' }} />
        )}

        {/* Collapse toggle button — desktop only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'ขยาย sidebar' : 'ย่อ sidebar'}
            style={collapsed
              ? { flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: 'none', background: '#EAF2FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B4A6B' }
              : { position: 'absolute', top: 10, right: 10, width: 26, height: 26, borderRadius: 8, border: 'none', background: '#EAF2FF', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B4A6B' }}
          >
            {collapsed ? <ChevronRight size={14}/> : <ChevronLeft size={14}/>}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: collapsed ? '12px 8px' : '16px 12px', overflowX: 'hidden' }}>
        {NAV_SECTIONS.map((section, si) => {
          const visItems = section.items.filter(it => visible(it.feature, it.roles, it.permKey))
          if (visItems.length === 0) return null
          const accent = ACTIVE_ACCENT
          return (
            <div key={si} style={{ marginBottom: 8 }}>
              {section.label && !collapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '11px', fontWeight: 700, color: '#7C8BAA', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 10px 6px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent.text, flexShrink: 0 }} />
                  {section.label}
                </div>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: '#E3ECF8', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visItems.map(item => <NavItem key={item.path} item={{ ...item, badge: MENU_BADGE[item.path]?.n, badgeTone: MENU_BADGE[item.path]?.tone }} accent={accent} />)}
              </div>
              {!collapsed && si < NAV_SECTIONS.length - 1 && (
                <div style={{ height: 1, background: '#E3ECF8', margin: '12px 10px 4px' }} />
              )}
            </div>
          )
        })}

        {/* คู่มือการใช้งาน — ทุกบัญชีเห็น */}
        <div style={{ marginTop: 8 }}>
          <NavItem item={{ path: '/manual', label: 'วิธีการใช้งาน', icon: <BookOpen size={16}/> }} accent={SETTINGS_ACCENT} />
        </div>

        {/* Settings */}
        {visible(undefined, undefined, 'settings') && (
          <div style={{ marginTop: 8, paddingTop: collapsed ? 0 : 8 }}>
            <NavItem item={{ path: '/settings', label: 'การตั้งค่า', icon: <Settings size={16}/> }} accent={SETTINGS_ACCENT} />
          </div>
        )}
      </nav>

      {/* Footer — role chip + logout (user profile อยู่ Topbar) */}
      <div style={{ borderTop: '1px solid #E3ECF8', padding: collapsed ? '12px 8px' : '12px' }}>
        {roleChip && !collapsed && (
          <div style={{ margin: '0 2px 8px', padding: '7px 10px', borderRadius: 8, background: '#EAF2FF', fontSize: '11px', fontWeight: 600, color: '#475569', lineHeight: 1.4 }}>
            {roleChip.label}
          </div>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? 'ออกจากระบบ' : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '10px 12px',
            borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', width: '100%',
            fontSize: '14px', color: '#E11D48', background: 'transparent', fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFF1F2' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          {!collapsed && 'ออกจากระบบ'}
        </button>
      </div>
    </div>
  )
}
