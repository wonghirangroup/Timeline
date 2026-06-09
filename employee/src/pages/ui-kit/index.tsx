// employee/src/pages/ui-kit/index.tsx — Employee Mobile UI Kit
// เข้าที่ /ui-kit — ใช้ดู design และแก้ TOKENS ที่ tokens.ts

import { useState } from 'react'
import {
  QrCode, LogOut, History, CalendarDays, User,
  CheckCircle2, XCircle, AlertTriangle, Info,
  Clock, MapPin, Building2, ChevronRight, Bell,
  FileText, Flame, Star, Zap,
} from 'lucide-react'
import {
  Button, Card, Badge, Avatar, Divider, InfoRow,
  SectionTitle, EmptyState, GradientBar, PageHeader,
  QuickStatCard, COLOR, RADIUS, FONT, STATUS,
} from '../../components/ui'

// ── Section Wrapper ────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, paddingHorizontal: 20 }}>
        <span style={{ fontSize: FONT.sm, fontWeight: 800, color: COLOR.primary, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          {title}
        </span>
        <div style={{ flex: 1, height: 1, background: COLOR.primaryBorder }} />
      </div>
      {children}
    </div>
  )
}

// ── Swatch ────────────────────────────────────────────────────────
function ColorSwatch({ label, value, light }: { label: string; value: string; light?: boolean }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 52, height: 52, borderRadius: RADIUS.lg, background: value, border: '1px solid rgba(0,0,0,0.08)', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: '8px', color: light ? COLOR.textSecondary : '#fff', fontWeight: 700, fontFamily: 'monospace' }}>
          {value.length <= 7 ? value.replace('#','') : '···'}
        </span>
      </div>
      <span style={{ fontSize: '10px', color: COLOR.textMuted, textAlign: 'center', maxWidth: 56, lineHeight: 1.2 }}>{label}</span>
    </div>
  )
}

// ── Check-in Button Preview ────────────────────────────────────────
function CheckInBtnPreview() {
  const [state, setState] = useState<'idle'|'done'>('idle')
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 120, height: 120, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {state === 'idle' && (
          <>
            <div className="animate-pulse-ring"   style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})` }} />
            <div className="animate-pulse-ring-2" style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `linear-gradient(135deg, ${COLOR.primary}, ${COLOR.primaryEnd})` }} />
          </>
        )}
        <button
          onClick={() => setState(s => s === 'idle' ? 'done' : 'idle')}
          style={{
            width: 112, height: 112, borderRadius: '50%', border: 'none',
            background: state === 'done'
              ? 'linear-gradient(145deg,#16a34a,#15803d)'
              : `linear-gradient(145deg,${COLOR.primary},${COLOR.primaryMid},${COLOR.primaryEnd})`,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            boxShadow: state === 'done' ? '0 4px 20px rgba(22,163,74,0.35)' : `0 6px 24px rgba(255,107,53,0.4)`,
            cursor: 'pointer', position: 'relative', zIndex: 1, transition: 'all 0.3s',
          }}
        >
          {state === 'done'
            ? <CheckCircle2 size={32} color="#fff" />
            : <QrCode size={28} color="#fff" />}
          <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff' }}>
            {state === 'done' ? 'บันทึกแล้ว' : 'แตะเพื่อสแกน'}
          </span>
        </button>
      </div>
      <p style={{ fontSize: FONT.xs, color: COLOR.textMuted }}>กดเพื่อสลับ state</p>
    </div>
  )
}

// ── Bottom Nav Preview ─────────────────────────────────────────────
function BottomNavPreview() {
  const [active, setActive] = useState('/checkin')
  const items = [
    { path: '/checkin',  label: 'เช็คอิน',  Icon: QrCode },
    { path: '/checkout', label: 'เช็คเอาท์', Icon: LogOut },
    { path: '/history',  label: 'ประวัติ',  Icon: History },
    { path: '/leave',    label: 'วันลา',    Icon: CalendarDays },
    { path: '/profile',  label: 'โปรไฟล์', Icon: User },
  ]
  return (
    <div style={{ background: COLOR.navBg, border: `1px solid ${COLOR.navBorder}`, borderRadius: RADIUS.xl, overflow: 'hidden', boxShadow: '0 4px 20px rgba(255,107,53,0.08)' }}>
      <div style={{ display: 'flex', padding: '8px 4px' }}>
        {items.map(({ path, label, Icon }) => {
          const isActive = active === path
          return (
            <button key={path} onClick={() => setActive(path)}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 2px', border: 'none', background: 'transparent', cursor: 'pointer', position: 'relative' }}
            >
              {isActive && (
                <div style={{ position: 'absolute', top: 2, left: '50%', transform: 'translateX(-50%)', width: 44, height: 32, borderRadius: 10, background: `${COLOR.primary}18`, border: `1px solid ${COLOR.primaryBorder}` }} />
              )}
              <span style={{ position: 'relative', zIndex: 1, color: isActive ? COLOR.primary : COLOR.textMuted, display: 'flex', transform: isActive ? 'translateY(-1px)' : 'none', transition: 'all 0.15s' }}>
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.7} />
              </span>
              <span style={{ position: 'relative', zIndex: 1, fontSize: '9px', fontWeight: isActive ? 700 : 500, color: isActive ? COLOR.primary : COLOR.textMuted }}>{label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────
export default function UiKitPage() {
  return (
    <div className="page-container" style={{ maxWidth: 430, margin: '0 auto' }}>

      {/* Sticky header */}
      <PageHeader
        title="🎨 UI Kit"
        right={
          <span style={{ fontSize: FONT.xs, color: COLOR.primary, fontWeight: 700, padding: '4px 10px', background: `${COLOR.primary}15`, borderRadius: RADIUS.full }}>
            Employee App
          </span>
        }
      />

      <div style={{ padding: '20px 16px' }}>

        {/* Intro */}
        <Card style={{ marginBottom: 28, background: `linear-gradient(135deg,${COLOR.primaryBg},#fff)` }}>
          <GradientBar width={32} />
          <p style={{ margin: 0, fontSize: FONT.sm, color: COLOR.textSecondary, lineHeight: 1.7, textAlign: 'center' }}>
            แก้ไข <strong style={{ color: COLOR.primary }}>tokens.ts</strong> เพื่อเปลี่ยนสีทั้งระบบ<br />
            และ <strong style={{ color: COLOR.primary }}>components/ui/index.tsx</strong> สำหรับแก้ component
          </p>
        </Card>

        {/* ── 1. Colors ── */}
        <Section title="1. Color Tokens">
          <Card noPadding>
            <div style={{ padding: '14px 12px 4px' }}>
              <p style={{ margin: '0 0 12px', fontSize: FONT.xs, color: COLOR.textMuted, fontWeight: 600 }}>Primary Orange</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <ColorSwatch label="primary"    value={COLOR.primary} />
                <ColorSwatch label="primaryMid" value={COLOR.primaryMid} />
                <ColorSwatch label="primaryEnd" value={COLOR.primaryEnd} />
                <ColorSwatch label="primaryBg"  value={COLOR.primaryBg} light />
              </div>
              <Divider />
              <p style={{ margin: '12px 0', fontSize: FONT.xs, color: COLOR.textMuted, fontWeight: 600 }}>Status Colors</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
                <ColorSwatch label="success" value={COLOR.success} />
                <ColorSwatch label="warning" value={COLOR.warning} />
                <ColorSwatch label="error"   value={COLOR.error} />
                <ColorSwatch label="info"    value={COLOR.info} />
              </div>
              <Divider />
              <p style={{ margin: '12px 0', fontSize: FONT.xs, color: COLOR.textMuted, fontWeight: 600 }}>Neutral</p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', paddingBottom: 14 }}>
                <ColorSwatch label="textPrimary"   value={COLOR.textPrimary} />
                <ColorSwatch label="textSecondary" value={COLOR.textSecondary} />
                <ColorSwatch label="textMuted"     value={COLOR.textMuted} />
              </div>
            </div>
          </Card>
        </Section>

        {/* ── 2. Check-in Button ── */}
        <Section title="2. Check-in Button (หน้าหลัก)">
          <Card style={{ textAlign: 'center', padding: '24px 16px' }}>
            <CheckInBtnPreview />
          </Card>
        </Section>

        {/* ── 3. Buttons ── */}
        <Section title="3. Buttons">
          <Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Button fullWidth icon={<QrCode size={15} />}>เช็คอิน (Primary)</Button>
              <Button fullWidth variant="outline" icon={<CalendarDays size={15} />}>ขอวันลา (Outline)</Button>
              <Button fullWidth variant="ghost" icon={<History size={15} />}>ดูประวัติ (Ghost)</Button>
              <Button fullWidth variant="danger">ยกเลิกคำขอ (Danger)</Button>
              <Button fullWidth loading>กำลังประมวลผล...</Button>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button size="sm">เล็ก</Button>
                <Button size="md">กลาง</Button>
                <Button size="lg">ใหญ่</Button>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── 4. Badges ── */}
        <Section title="4. Status Badges">
          <Card>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Badge status="PENDING" />
              <Badge status="APPROVED" />
              <Badge status="REJECTED" />
              <Badge label="มาปกติ"    color="#16a34a" bg="rgba(22,163,74,0.1)" />
              <Badge label="มาสาย"     color={COLOR.warning} bg={COLOR.warningBg} />
              <Badge label="ขาดงาน"    color={COLOR.error} bg={COLOR.errorBg} />
              <Badge label="ลาป่วย"    color="#3b82f6" bg="rgba(59,130,246,0.1)" />
              <Badge label="ลากิจ"     color="#8b5cf6" bg="rgba(139,92,246,0.1)" />
              <Badge label="ลาพักร้อน" color="#f59e0b" bg="rgba(245,158,11,0.1)" />
              <Badge label="LIFF"       color="#06b6d4" bg="rgba(6,182,212,0.1)" />
              <Badge label="QR Code"    color={COLOR.primary} bg={`${COLOR.primary}15`} />
            </div>
          </Card>
        </Section>

        {/* ── 5. Avatar ── */}
        <Section title="5. Avatar">
          <Card>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <Avatar name="สมชาย" size={36} />
              <Avatar name="วิภาวดี" size={48} />
              <Avatar name="ธนวัฒน์" size={64} />
              <Avatar name="นันทิชา" size={80} />
              {/* Profile card example */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, background: COLOR.primaryBg, padding: '10px 14px', borderRadius: RADIUS.lg, border: `1px solid ${COLOR.primaryBorder}` }}>
                <Avatar name="สมชาย" size={44} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: FONT.base, color: COLOR.textPrimary }}>สมชาย มีสุข</div>
                  <div style={{ fontSize: FONT.sm, color: COLOR.textSecondary }}>EMP001 · สาขาสีลม</div>
                  <Badge label="พร้อม" color={COLOR.success} bg={COLOR.successBg} size="sm" />
                </div>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── 6. Cards ── */}
        <Section title="6. Cards">
          {/* Glass card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Card>
              <SectionTitle right={<Badge label="วันนี้" color={COLOR.primary} bg={`${COLOR.primary}15`} size="sm" />}>
                รายการวันนี้
              </SectionTitle>
              <InfoRow label="กะ"           value="กะเช้า 08:00–17:00" icon={<Clock size={13} />} />
              <InfoRow label="เช็คอิน"      value="07:58 น."           icon={<CheckCircle2 size={13} color={COLOR.success} />} />
              <InfoRow label="สาขา"         value="สาขาสีลม"           icon={<Building2 size={13} />} />
              <InfoRow label="ตำแหน่ง GPS"  value="ในรัศมีสาขา"        icon={<MapPin size={13} color={COLOR.success} />} />
            </Card>

            {/* Stat row */}
            <div style={{ display: 'flex', gap: 10 }}>
              <QuickStatCard icon={<Flame size={20} color={COLOR.primary} />}  label="ต่อเนื่อง"  value="12" color={COLOR.primary} />
              <QuickStatCard icon={<Star size={20} color="#f59e0b" />}          label="มาตรงเวลา" value="94%" color="#d97706" />
              <QuickStatCard icon={<Zap size={20} color="#8b5cf6" />}           label="วันลาคงเหลือ" value="7" color="#8b5cf6" />
            </div>

            {/* Action card */}
            <Card style={{ padding: 0 }}>
              {[
                { icon: <QrCode size={18} color={COLOR.primary} />,         label: 'เช็คอิน / เช็คเอาท์', sub: 'สแกน QR Code' },
                { icon: <CalendarDays size={18} color="#8b5cf6" />,          label: 'ขอวันลา',              sub: 'ลาป่วย ลากิจ ลาพักร้อน' },
                { icon: <FileText size={18} color="#0284c7" />,              label: 'ดูประวัติ',             sub: 'ย้อนหลัง 3 เดือน' },
                { icon: <Bell size={18} color="#d97706" />,                  label: 'แจ้งเตือน',             sub: '2 รายการใหม่' },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: RADIUS.md, background: `${COLOR.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginRight: 12 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: FONT.base, fontWeight: 600, color: COLOR.textPrimary }}>{item.label}</div>
                    <div style={{ fontSize: FONT.sm, color: COLOR.textMuted }}>{item.sub}</div>
                  </div>
                  <ChevronRight size={16} color={COLOR.textMuted} />
                </div>
              ))}
            </Card>
          </div>
        </Section>

        {/* ── 7. Alert Boxes ── */}
        <Section title="7. Alert / Notice Boxes">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {([
              { icon: <CheckCircle2 size={16} />, color: COLOR.success, bg: COLOR.successBg, border: 'rgba(22,163,74,0.25)', msg: 'เช็คอินสำเร็จ — 07:58 น.' },
              { icon: <AlertTriangle size={16} />, color: COLOR.warning, bg: COLOR.warningBg, border: 'rgba(217,119,6,0.25)', msg: 'มาสาย 12 นาที — ค่าปรับ 50 บาท' },
              { icon: <XCircle size={16} />,       color: COLOR.error,   bg: COLOR.errorBg,   border: 'rgba(220,38,38,0.25)', msg: 'นอกรัศมีสาขา — ต้องรอ Admin อนุมัติ' },
              { icon: <Info size={16} />,           color: COLOR.info,    bg: COLOR.infoBg,    border: 'rgba(2,132,199,0.25)', msg: 'วันลาพักร้อนหมดอายุ 31 ธ.ค. นี้' },
            ] as { icon: React.ReactNode; color: string; bg: string; border: string; msg: string }[]).map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: RADIUS.lg, background: a.bg, border: `1px solid ${a.border}`, color: a.color, fontSize: FONT.sm, fontWeight: 500 }}>
                {a.icon} {a.msg}
              </div>
            ))}
          </div>
        </Section>

        {/* ── 8. Bottom Nav Preview ── */}
        <Section title="8. Bottom Navigation">
          <BottomNavPreview />
          <p style={{ textAlign: 'center', fontSize: FONT.xs, color: COLOR.textMuted, marginTop: 10 }}>กดแต่ละ icon เพื่อดู active state</p>
        </Section>

        {/* ── 9. Empty States ── */}
        <Section title="9. Empty States">
          <Card>
            <EmptyState icon="📭" title="ยังไม่มีประวัติ" sub="เริ่มเช็คอินวันแรกได้เลย!" />
          </Card>
        </Section>

        {/* ── 10. Typography ── */}
        <Section title="10. Typography">
          <Card>
            {[
              { label: '2xl / 30px — H1',  size: FONT['2xl'], w: 800 },
              { label: 'xl / 24px — H2',   size: FONT.xl, w: 700 },
              { label: 'lg / 20px — H3',   size: FONT.lg, w: 700 },
              { label: 'md / 16px — H4',   size: FONT.md, w: 600 },
              { label: 'base / 14px — Body',size: FONT.base, w: 400 },
              { label: 'sm / 12.5px — Sub', size: FONT.sm, w: 400 },
              { label: 'xs / 11px — Label', size: FONT.xs, w: 500 },
            ].map(t => (
              <div key={t.label} style={{ display: 'flex', alignItems: 'baseline', gap: 10, paddingBottom: 10, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                <span style={{ width: 130, fontSize: '9px', color: COLOR.textMuted, fontFamily: 'monospace', flexShrink: 0 }}>{t.label}</span>
                <span style={{ fontSize: t.size, fontWeight: t.w, color: COLOR.textPrimary, lineHeight: 1.3 }}>ระบบ TimeLine</span>
              </div>
            ))}
          </Card>
        </Section>

        {/* ── 11. Gradient & Animations ── */}
        <Section title="11. Gradients & Animations">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {/* Gradient bar */}
            <Card style={{ textAlign: 'center', padding: '20px 16px' }}>
              <GradientBar width={60} />
              <div className="gradient-text" style={{ fontSize: FONT.xl, fontWeight: 800 }}>TimeLine HR</div>
              <div style={{ fontSize: FONT.sm, color: COLOR.textMuted }}>gradient-text class</div>
            </Card>
            {/* Gradient bg preview */}
            <div style={{ borderRadius: RADIUS.xl, overflow: 'hidden' }}>
              <div className="gradient-bg" style={{ padding: '20px', color: '#fff', textAlign: 'center' }}>
                <div style={{ fontSize: FONT.md, fontWeight: 700 }}>gradient-bg class</div>
                <div style={{ fontSize: FONT.sm, opacity: 0.85, marginTop: 4 }}>ใช้กับปุ่มหลัก & header</div>
              </div>
            </div>
            {/* Clock animation */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <div className="animate-dot-blink" style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR.success }} />
              <div className="animate-dot-blink" style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR.warning, animationDelay: '0.3s' }} />
              <div className="animate-dot-blink" style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR.primary, animationDelay: '0.6s' }} />
            </div>
            <p style={{ textAlign: 'center', fontSize: FONT.xs, color: COLOR.textMuted }}>animate-dot-blink · animate-fade-in · animate-slide-up · animate-success-pop</p>
          </div>
        </Section>

        {/* Footer */}
        <div style={{ padding: '16px', borderRadius: RADIUS.xl, background: COLOR.primaryBg, border: `1px solid ${COLOR.primaryBorder}`, textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: FONT.xs, color: COLOR.primary, fontWeight: 600, marginBottom: 4 }}>📁 ไฟล์ที่ต้องแก้เพื่อปรับ Design</div>
          <div style={{ fontSize: FONT.xs, color: COLOR.textSecondary, lineHeight: 1.8 }}>
            <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>components/ui/tokens.ts</code> — สีทั้งหมด<br />
            <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>components/ui/index.tsx</code> — Components<br />
            <code style={{ background: '#fff', padding: '1px 6px', borderRadius: 4 }}>index.css</code> — Animations & CSS classes
          </div>
        </div>

      </div>
    </div>
  )
}
