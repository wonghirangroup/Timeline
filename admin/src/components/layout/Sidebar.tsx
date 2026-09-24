import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutGrid, Users, Building2, Clock, AlignLeft,
  ClipboardCheck, CalendarDays, FileClock, BarChart2,
  Megaphone, Settings, LogOut, X, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, XCircle, MoreHorizontal, MapPin, Table2, DoorOpen, FileText,
  TrendingUp, CalendarOff, MessageCircle,
} from 'lucide-react'
import { useAuthStore } from '../../stores/authStore'
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
}

interface NavSection {
  label?: string
  items: NavItem[]
}

// ── Flat nav — ไม่มี dropdown ทั้งหมด ──────────────────────────────────────
// จัดกลุ่มใหม่ (feedback 2026-09-22): ภาพรวม / ข้อมูล / การกระทำ / รายงาน (แยก
// หมวดย่อย) / ตั้งค่า — "กะและเวลา" เปลี่ยนชื่อเป็น "เช็คอิน" เพราะเนื้อหาจริง
// ของหน้า /shift คือ "เช็คอินวันนี้" + "ตารางกะ" (ไม่ใช่หน้าจัดการนิยามกะ ซึ่ง
// อยู่ในแท็บ "จัดการกะ" ของหน้าสาขาต่างหาก) — OT/คำขอลาออก/ขอเอกสาร HR/ประกาศ
// ที่ user ไม่ได้ระบุตำแหน่งชัดเจน จัดไว้ใน "การกระทำ" ต่อจาก 3 อันที่ระบุมา
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
    label: 'การกระทำ',
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
        background: 'var(--bg-sidebar)', borderRight: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
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
        background: 'var(--bg-sidebar)',
        display: 'flex', flexDirection: 'column', zIndex: 100,
        transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        boxShadow: drawerOpen ? '4px 0 24px rgba(0,0,0,0.2)' : 'none',
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(101,129,168,0.14)', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,247,237,0.75)', zIndex: 1 }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(101,129,168,0.24)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(101,129,168,0.14)'}
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
const ACTIVE_ACCENT: SecAccent = { text: '#2DA6DD', bg: 'rgba(45,166,221,0.18)' }
const SETTINGS_ACCENT: SecAccent = { text: '#94A3B8', bg: 'rgba(148,163,184,0.16)' } // slate

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
  function NavItem({ item, accent }: { item: { path: string; label: string; icon: JSX.Element; badge?: number }; accent: SecAccent }) {
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
          borderRadius: 'var(--radius-md)',
          textDecoration: 'none', fontSize: '14px',
          fontWeight: isActive ? 700 : 500,
          color: isActive ? accent.text : 'rgba(255,247,237,0.6)',
          background: isActive ? accent.bg : 'transparent',
          boxShadow: isActive ? `inset 3px 0 0 ${accent.text}` : 'none',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(45,166,221,0.12)'; e.currentTarget.style.color = '#f8fafc'; } }}
        onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,247,237,0.6)'; } }}
      >
        <div style={{ width: 28, height: 28, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: isActive ? accent.text : 'inherit' }}>
          {item.icon}
        </div>
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span style={{ background: 'var(--error)', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: 99, flexShrink: 0 }}>
                {item.badge}
              </span>
            )}
          </>
        )}
      </NavLink>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Logo + collapse toggle */}
      <div style={{
        padding: collapsed ? '16px 0' : '20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0,
        display: 'flex',
        flexDirection: collapsed ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap: collapsed ? 10 : 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: collapsed ? 0 : 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-hover))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800, color: '#fff', boxShadow: '0 4px 12px rgba(36,75,131,0.4)' }}>
            TL
          </div>
          {!collapsed && (
            <p style={{ fontSize: 15, fontWeight: 800, color: '#f8fafc', margin: 0, lineHeight: 1.2, whiteSpace: 'nowrap' }}>TimeLine HR</p>
          )}
        </div>

        {/* Collapse toggle button — desktop only */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? 'ขยาย sidebar' : 'ย่อ sidebar'}
            style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, border: 'none', background: 'rgba(101,129,168,0.14)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,247,237,0.6)', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(101,129,168,0.26)'; e.currentTarget.style.color = '#f8fafc' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(101,129,168,0.14)'; e.currentTarget.style.color = 'rgba(255,247,237,0.6)' }}
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '11px', fontWeight: 700, color: 'rgba(255,247,237,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 10px 6px', whiteSpace: 'nowrap' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent.text, flexShrink: 0 }} />
                  {section.label}
                </div>
              )}
              {collapsed && si > 0 && (
                <div style={{ height: 1, background: 'rgba(101,129,168,0.10)', margin: '8px 4px' }} />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {visItems.map(item => <NavItem key={item.path} item={item} accent={accent} />)}
              </div>
              {!collapsed && si < NAV_SECTIONS.length - 1 && (
                <div style={{ height: 1, background: 'rgba(101,129,168,0.10)', margin: '12px 10px 4px' }} />
              )}
            </div>
          )
        })}

        {/* Settings */}
        {visible(undefined, undefined, 'settings') && (
          <div style={{ marginTop: 8, paddingTop: collapsed ? 0 : 8 }}>
            <NavItem item={{ path: '/settings', label: 'การตั้งค่า', icon: <Settings size={16}/> }} accent={SETTINGS_ACCENT} />
          </div>
        )}
      </nav>

      {/* Footer — role chip + logout (user profile อยู่ Topbar) */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: collapsed ? '12px 8px' : '12px' }}>
        {roleChip && !collapsed && (
          <div style={{ margin: '0 2px 8px', padding: '7px 10px', borderRadius: 8, background: 'rgba(101,129,168,0.10)', fontSize: '11px', fontWeight: 600, color: 'rgba(255,247,237,0.75)', lineHeight: 1.4 }}>
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
            fontSize: '14px', color: '#f87171', background: 'transparent', fontWeight: 600, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={16} />
          {!collapsed && 'ออกจากระบบ'}
        </button>
      </div>
    </div>
  )
}
