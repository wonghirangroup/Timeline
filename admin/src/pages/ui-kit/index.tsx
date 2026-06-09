// admin/src/pages/ui-kit/index.tsx
// ══════════════════════════════════════════════════════════════════
//  UI Kit — Design Tokens & Component Showcase
//  แก้สี/ขนาด/style ได้ที่ TOKENS ด้านล่างนี้ แล้วจะส่งผลทั้ง preview
//  ** หน้านี้ไม่ได้ต่อกับ API จริง ใช้สำหรับ design ล้วนๆ **
// ══════════════════════════════════════════════════════════════════

// ─── Design Tokens ────────────────────────────────────────────────
export const TOKENS = {
  color: {
    // Primary
    primary:        '#f97316',   // orange-500  → ปุ่มหลัก, active state
    primaryDark:    '#ea580c',   // orange-600  → hover, gradient end
    primaryLight:   '#fff7ed',   // orange-50   → active bg, chip bg
    primaryBorder:  '#fed7aa',   // orange-200  → border, divider

    // Text
    textPrimary:    '#111827',   // gray-900    → ชื่อหัวข้อ, label
    textSecondary:  '#374151',   // gray-700    → body text
    textMuted:      '#6b7280',   // gray-500    → placeholder, sub-text
    textDisabled:   '#9ca3af',   // gray-400    → disabled

    // Surface
    white:          '#ffffff',
    surface:        '#f8fafc',   // gray-50     → page background
    surfaceCard:    '#ffffff',   // card background
    border:         '#e5e7eb',   // gray-200    → input border

    // Status
    success:        '#16a34a',
    successBg:      '#dcfce7',
    warning:        '#d97706',
    warningBg:      '#fef3c7',
    error:          '#dc2626',
    errorBg:        '#fee2e2',
    info:           '#0284c7',
    infoBg:         '#e0f2fe',
  },
  radius: {
    sm:   6,
    md:   8,
    lg:   12,
    xl:   16,
    full: 9999,
  },
  shadow: {
    sm:  '0 1px 4px rgba(0,0,0,0.06)',
    md:  '0 4px 16px rgba(0,0,0,0.08)',
    lg:  '0 8px 30px rgba(0,0,0,0.12)',
    orange: '0 4px 16px rgba(249,115,22,0.35)',
  },
  font: {
    xs:   '11px',
    sm:   '12.5px',
    base: '13.5px',
    md:   '15px',
    lg:   '18px',
    xl:   '22px',
  },
}

// ─── Sub-components ────────────────────────────────────────────────
import { useState } from 'react'
import {
  CheckCircle2, XCircle, AlertTriangle, Info,
  Bell, Settings, User, LogOut, Search, Plus,
  ChevronDown, Eye, EyeOff,
} from 'lucide-react'

const T = TOKENS  // shorthand

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: T.font.md, fontWeight: 700, color: T.color.textPrimary }}>{title}</h3>
        <div style={{ flex: 1, height: 1, background: T.color.primaryBorder }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' }}>
        {children}
      </div>
    </div>
  )
}

function TokenSwatch({ label, value, text = '#fff' }: { label: string; value: string; text?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 56, height: 56, borderRadius: T.radius.md, background: value, border: '1px solid rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '9px', color: text, fontWeight: 700, fontFamily: 'monospace' }}>{value.replace('#','')}</span>
      </div>
      <span style={{ fontSize: T.font.xs, color: T.color.textMuted, textAlign: 'center', maxWidth: 64 }}>{label}</span>
    </div>
  )
}

// ─── Buttons ──────────────────────────────────────────────────────
function BtnPrimary({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button disabled={disabled} style={{
      padding: '9px 18px', borderRadius: T.radius.md, border: 'none',
      background: disabled ? '#fed7aa' : `linear-gradient(135deg,${T.color.primary},${T.color.primaryDark})`,
      color: '#fff', fontWeight: 600, fontSize: T.font.sm, cursor: disabled ? 'not-allowed' : 'pointer',
      boxShadow: disabled ? 'none' : T.shadow.orange, transition: 'all 0.15s',
    }}>{children}</button>
  )
}
function BtnOutline({ children }: { children: React.ReactNode }) {
  return (
    <button style={{
      padding: '9px 18px', borderRadius: T.radius.md, border: `1.5px solid ${T.color.primary}`,
      background: 'transparent', color: T.color.primary, fontWeight: 600,
      fontSize: T.font.sm, cursor: 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  )
}
function BtnGhost({ children }: { children: React.ReactNode }) {
  return (
    <button style={{
      padding: '9px 18px', borderRadius: T.radius.md, border: `1px solid ${T.color.border}`,
      background: '#fff', color: T.color.textSecondary, fontWeight: 500,
      fontSize: T.font.sm, cursor: 'pointer',
    }}>{children}</button>
  )
}
function BtnDanger({ children }: { children: React.ReactNode }) {
  return (
    <button style={{
      padding: '9px 18px', borderRadius: T.radius.md, border: 'none',
      background: T.color.error, color: '#fff', fontWeight: 600,
      fontSize: T.font.sm, cursor: 'pointer',
    }}>{children}</button>
  )
}

// ─── Badges ───────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: T.radius.full, background: bg, color, fontSize: T.font.xs, fontWeight: 600 }}>{label}</span>
  )
}

// ─── Alert / Toast ────────────────────────────────────────────────
function AlertBox({ type, msg }: { type: 'success'|'warning'|'error'|'info'; msg: string }) {
  const map = {
    success: { icon: <CheckCircle2 size={16} />, color: T.color.success, bg: T.color.successBg, border: '#86efac' },
    warning: { icon: <AlertTriangle size={16} />, color: T.color.warning, bg: T.color.warningBg, border: '#fcd34d' },
    error:   { icon: <XCircle size={16} />,       color: T.color.error,   bg: T.color.errorBg,   border: '#fca5a5' },
    info:    { icon: <Info size={16} />,           color: T.color.info,    bg: T.color.infoBg,    border: '#7dd3fc' },
  }
  const s = map[type]
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: T.radius.md, background: s.bg, border: `1px solid ${s.border}`, color: s.color, fontSize: T.font.sm, minWidth: 280 }}>
      {s.icon} {msg}
    </div>
  )
}

// ─── Card ─────────────────────────────────────────────────────────
function Card({ title, sub, children }: { title: string; sub?: string; children?: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: T.radius.lg, border: `1px solid ${T.color.border}`, overflow: 'hidden', minWidth: 240 }}>
      <div style={{ background: `linear-gradient(to right,${T.color.primary},${T.color.primaryDark})`, padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: T.font.base, color: '#fff' }}>{title}</div>
        {sub && <div style={{ fontSize: T.font.xs, color: 'rgba(255,255,255,0.75)', marginTop: 2 }}>{sub}</div>}
      </div>
      {children && <div style={{ padding: '14px 16px' }}>{children}</div>}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────
function InputDemo() {
  const [show, setShow] = useState(false)
  const baseInput: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: T.radius.md,
    border: `1.5px solid ${T.color.border}`, fontSize: T.font.sm,
    fontFamily: 'inherit', color: T.color.textPrimary, outline: 'none',
    boxSizing: 'border-box', background: '#fff',
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 280 }}>
      {/* Text */}
      <input style={baseInput} placeholder="อีเมล"
        onFocus={e => { e.target.style.borderColor = T.color.primary }}
        onBlur={e => { e.target.style.borderColor = T.color.border }} />
      {/* Password */}
      <div style={{ position: 'relative' }}>
        <input type={show ? 'text' : 'password'} style={{ ...baseInput, paddingRight: 40 }} placeholder="รหัสผ่าน"
          onFocus={e => { e.target.style.borderColor = T.color.primary }}
          onBlur={e => { e.target.style.borderColor = T.color.border }} />
        <button onClick={() => setShow(s => !s)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.color.textMuted }}>
          {show ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.color.textMuted }} />
        <input style={{ ...baseInput, paddingLeft: 32 }} placeholder="ค้นหา..."
          onFocus={e => { e.target.style.borderColor = T.color.primary }}
          onBlur={e => { e.target.style.borderColor = T.color.border }} />
      </div>
      {/* Error state */}
      <div>
        <input style={{ ...baseInput, borderColor: T.color.error }} defaultValue="ข้อมูลผิด" />
        <div style={{ fontSize: T.font.xs, color: T.color.error, marginTop: 3 }}>กรุณากรอกข้อมูลให้ถูกต้อง</div>
      </div>
      {/* Disabled */}
      <input style={{ ...baseInput, background: '#f3f4f6', color: T.color.textDisabled, cursor: 'not-allowed' }} disabled placeholder="ปิดการใช้งาน" />
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────
export default function UiKitPage() {
  const [dropOpen, setDropOpen] = useState(false)

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Title */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: T.radius.full, background: T.color.primaryLight, color: T.color.primary, fontSize: T.font.xs, fontWeight: 700, marginBottom: 8 }}>🎨 DESIGN SYSTEM</div>
        <h1 style={{ margin: 0, fontSize: T.font.xl, fontWeight: 800, color: T.color.textPrimary }}>UI Kit — TimeLine HR</h1>
        <p style={{ margin: '6px 0 0', fontSize: T.font.sm, color: T.color.textMuted }}>แก้ TOKENS ใน <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontSize: T.font.xs }}>/pages/ui-kit/index.tsx</code> บรรทัดบนสุด เพื่อเปลี่ยนสีทั้งระบบ</p>
      </div>

      {/* ── 1. Colors ── */}
      <Section title="1. Color Tokens">
        <TokenSwatch label="primary"      value={T.color.primary}      />
        <TokenSwatch label="primaryDark"  value={T.color.primaryDark}  />
        <TokenSwatch label="primaryLight" value={T.color.primaryLight} text={T.color.primary} />
        <TokenSwatch label="primaryBorder"value={T.color.primaryBorder}text={T.color.primary} />
        <div style={{ width: 1, background: T.color.border, alignSelf: 'stretch', margin: '0 4px' }} />
        <TokenSwatch label="textPrimary"  value={T.color.textPrimary}  />
        <TokenSwatch label="textSecondary"value={T.color.textSecondary}/>
        <TokenSwatch label="textMuted"    value={T.color.textMuted}    />
        <TokenSwatch label="textDisabled" value={T.color.textDisabled} />
        <div style={{ width: 1, background: T.color.border, alignSelf: 'stretch', margin: '0 4px' }} />
        <TokenSwatch label="success" value={T.color.success} />
        <TokenSwatch label="warning" value={T.color.warning} />
        <TokenSwatch label="error"   value={T.color.error}   />
        <TokenSwatch label="info"    value={T.color.info}    />
      </Section>

      {/* ── 2. Buttons ── */}
      <Section title="2. Buttons">
        <BtnPrimary>บันทึก</BtnPrimary>
        <BtnOutline>แก้ไข</BtnOutline>
        <BtnGhost>ยกเลิก</BtnGhost>
        <BtnDanger>ลบ</BtnDanger>
        <BtnPrimary disabled>กำลังบันทึก...</BtnPrimary>
        <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: T.radius.md, border: 'none', background: `linear-gradient(135deg,${T.color.primary},${T.color.primaryDark})`, color: '#fff', fontWeight: 600, fontSize: T.font.sm, cursor: 'pointer', boxShadow: T.shadow.orange }}>
          <Plus size={14} /> เพิ่มใหม่
        </button>
      </Section>

      {/* ── 3. Badges ── */}
      <Section title="3. Badges & Status Chips">
        <Badge label="อนุมัติแล้ว"   color={T.color.success} bg={T.color.successBg} />
        <Badge label="รออนุมัติ"     color={T.color.warning} bg={T.color.warningBg} />
        <Badge label="ปฏิเสธ"        color={T.color.error}   bg={T.color.errorBg}   />
        <Badge label="Admin"          color={T.color.primaryDark} bg={T.color.primaryLight} />
        <Badge label="Manager"        color={T.color.info}    bg={T.color.infoBg}    />
        <Badge label="มาปกติ"         color='#166534'         bg='#dcfce7'           />
        <Badge label="มาสาย"          color='#92400e'         bg='#fef3c7'           />
        <Badge label="ขาดงาน"         color={T.color.error}   bg={T.color.errorBg}   />
        <Badge label="วันหยุด"        color='#0369a1'         bg='#e0f2fe'           />
      </Section>

      {/* ── 4. Alerts ── */}
      <Section title="4. Alert Boxes">
        <AlertBox type="success" msg="บันทึกข้อมูลเรียบร้อยแล้ว" />
        <AlertBox type="warning" msg="กรุณาตรวจสอบข้อมูลอีกครั้ง" />
        <AlertBox type="error"   msg="เกิดข้อผิดพลาด ไม่สามารถดำเนินการได้" />
        <AlertBox type="info"    msg="ระบบกำลังปรับปรุงข้อมูล" />
      </Section>

      {/* ── 5. Cards ── */}
      <Section title="5. Cards">
        <Card title="ภาพรวมวันนี้" sub="8 มิถุนายน 2568">
          <p style={{ margin: 0, fontSize: T.font.sm, color: T.color.textMuted }}>พนักงานเข้างาน 24/30 คน</p>
        </Card>
        <Card title="สรุปการลา" sub="เดือนมิถุนายน" />
        {/* Plain card ไม่มี gradient header */}
        <div style={{ background: '#fff', borderRadius: T.radius.lg, border: `1px solid ${T.color.border}`, padding: '16px', minWidth: 200, boxShadow: T.shadow.sm }}>
          <div style={{ fontSize: T.font.sm, fontWeight: 600, color: T.color.textPrimary, marginBottom: 6 }}>Card ธรรมดา</div>
          <div style={{ fontSize: T.font.xs, color: T.color.textMuted }}>ใช้สำหรับ widget ทั่วไป</div>
        </div>
      </Section>

      {/* ── 6. Inputs ── */}
      <Section title="6. Form Inputs">
        <InputDemo />
        {/* Select */}
        <div style={{ minWidth: 200, position: 'relative' }}>
          <button
            onClick={() => setDropOpen(o => !o)}
            style={{ width: '100%', padding: '9px 36px 9px 12px', borderRadius: T.radius.md, border: `1.5px solid ${T.color.border}`, background: '#fff', fontSize: T.font.sm, color: T.color.textPrimary, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
          >
            <span>เลือกสาขา</span>
            <ChevronDown size={14} color={T.color.textMuted} style={{ transition: 'transform 0.2s', transform: dropOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
          </button>
          {dropOpen && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, background: '#fff', border: `1px solid ${T.color.border}`, borderRadius: T.radius.md, boxShadow: T.shadow.md, zIndex: 10, overflow: 'hidden' }}>
              {['วงษ์หิรัญ', 'ฟุคุโระ แม่กิมเฮง', 'ฟุคุโระ ไนท์สวนหมาก'].map(b => (
                <button key={b} onClick={() => setDropOpen(false)} style={{ display: 'block', width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: T.font.sm, color: T.color.textSecondary, cursor: 'pointer', fontFamily: 'inherit' }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.color.primaryLight }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
                >{b}</button>
              ))}
            </div>
          )}
        </div>
      </Section>

      {/* ── 7. Navigation Items ── */}
      <Section title="7. Navigation Items">
        {/* Active item */}
        <div style={{ width: 220, border: `1px solid ${T.color.primaryBorder}`, borderRadius: T.radius.lg, overflow: 'hidden' }}>
          {[
            { label: 'Dashboard', active: false },
            { label: 'จัดการพนักงาน', active: true },
            { label: 'จัดการสาขา', active: false },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: item.active ? T.color.primaryLight : 'transparent', borderLeft: item.active ? `3px solid ${T.color.primary}` : '3px solid transparent', fontSize: T.font.sm, fontWeight: item.active ? 600 : 400, color: item.active ? T.color.primaryDark : T.color.textSecondary, cursor: 'pointer' }}>
              <User size={14} color={item.active ? T.color.primary : T.color.textDisabled} />
              {item.label}
            </div>
          ))}
        </div>
        {/* Page Header Shell preview */}
        <div style={{ borderRadius: T.radius.lg, overflow: 'hidden', boxShadow: T.shadow.md, minWidth: 320 }}>
          <div style={{ background: `linear-gradient(to right,${T.color.primary},${T.color.primaryDark})`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: T.font.xs, color: 'rgba(254,215,170,0.9)', fontWeight: 500 }}>หน้าหลัก</span>
            <span style={{ color: 'rgba(254,215,170,0.5)' }}>›</span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>จัดการพนักงาน</span>
          </div>
          <div style={{ background: '#fff', padding: '10px 20px', fontSize: T.font.xs, color: T.color.textMuted }}>
            ← Page Header Shell (แสดงทุกหน้าอัตโนมัติใน Layout.tsx)
          </div>
        </div>
      </Section>

      {/* ── 8. Icon actions ── */}
      <Section title="8. Icon Action Buttons">
        {[
          { icon: <Bell size={16} />,     label: 'แจ้งเตือน', color: T.color.info     },
          { icon: <Settings size={16} />, label: 'ตั้งค่า',   color: T.color.textMuted},
          { icon: <User size={16} />,     label: 'โปรไฟล์',   color: T.color.primary  },
          { icon: <LogOut size={16} />,   label: 'ออก',       color: T.color.error     },
        ].map(a => (
          <div key={a.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <button style={{ width: 40, height: 40, borderRadius: T.radius.md, border: `1px solid ${T.color.border}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: a.color }}>
              {a.icon}
            </button>
            <span style={{ fontSize: T.font.xs, color: T.color.textMuted }}>{a.label}</span>
          </div>
        ))}
      </Section>

      {/* ── 9. Typography ── */}
      <Section title="9. Typography Scale">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 400 }}>
          {[
            { label: 'xl / 22px', size: T.font.xl, w: 800 },
            { label: 'lg / 18px', size: T.font.lg, w: 700 },
            { label: 'md / 15px', size: T.font.md, w: 600 },
            { label: 'base / 13.5px', size: T.font.base, w: 500 },
            { label: 'sm / 12.5px', size: T.font.sm, w: 400 },
            { label: 'xs / 11px', size: T.font.xs, w: 400 },
          ].map(t => (
            <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
              <span style={{ width: 120, fontSize: T.font.xs, color: T.color.textDisabled, fontFamily: 'monospace' }}>{t.label}</span>
              <span style={{ fontSize: t.size, fontWeight: t.w, color: T.color.textPrimary }}>ระบบบริหารพนักงาน TimeLine</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Footer note */}
      <div style={{ marginTop: 40, padding: '16px 20px', borderRadius: T.radius.lg, background: T.color.primaryLight, border: `1px solid ${T.color.primaryBorder}`, fontSize: T.font.xs, color: T.color.primaryDark }}>
        💡 <strong>วิธีเปลี่ยนสีทั้งระบบ:</strong> แก้ค่าใน <code>TOKENS.color.primary</code> และ <code>TOKENS.color.primaryDark</code> ที่บรรทัดบนสุดของไฟล์นี้
        แล้ว copy ค่าไปใส่ใน <code>Topbar.tsx</code>, <code>Sidebar.tsx</code>, <code>Layout.tsx</code> ด้วย เนื่องจากยังไม่ได้ import TOKEN ข้ามไฟล์
      </div>
    </div>
  )
}
