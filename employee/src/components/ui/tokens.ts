// employee/src/components/ui/tokens.ts
// ══════════════════════════════════════════════════════════════════
//  Employee App — Design Tokens
//  แก้สีทั้งระบบตรงนี้ที่เดียว แล้ว copy ไปใส่ CSS :root ด้วย
// ══════════════════════════════════════════════════════════════════

export const COLOR = {
  // Primary — Vibrant Orange/Coral
  primary:       '#FF5E00',
  primaryMid:    '#FF7A29',
  primaryEnd:    '#FF9D5C',
  primaryBg:     '#FFF5F0',
  primarySubtle: '#FEF0E6',
  primaryBorder: 'rgba(255,94,0,0.15)',

  // Text
  textPrimary:   '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted:     '#9CA3AF',
  textOnAccent:  '#FFFFFF',

  // Surface
  white:         '#FFFFFF',
  pageBg:        '#F8F9FA',
  cardBg:        'rgba(255, 255, 255, 0.75)',

  // Status
  success:       '#10B981',
  successBg:     'rgba(16, 185, 129, 0.1)',
  successBorder: 'rgba(16, 185, 129, 0.25)',
  warning:       '#F59E0B',
  warningBg:     'rgba(245, 158, 11, 0.1)',
  warningBorder: 'rgba(245, 158, 11, 0.25)',
  error:         '#EF4444',
  errorBg:       'rgba(239, 68, 68, 0.1)',
  errorBorder:   'rgba(239, 68, 68, 0.25)',
  info:          '#3B82F6',
  infoBg:        'rgba(59, 130, 246, 0.1)',

  // Nav
  navBg:         'rgba(255, 255, 255, 0.85)',
  navBorder:     'rgba(255, 255, 255, 0.3)',
} as const

export const RADIUS = {
  sm:   8,
  md:   12,
  lg:   16,
  xl:   20,
  xxl:  28,
  full: 9999,
} as const

export const SHADOW = {
  card:     '0 4px 24px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
  cardLg:   '0 12px 48px rgba(255, 94, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)',
  btn:      '0 8px 24px rgba(255, 94, 0, 0.3), 0 2px 6px rgba(255, 94, 0, 0.15)',
  nav:      '0 8px 32px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.1)',
  glassGlow:'inset 0 0 0 1px rgba(255, 255, 255, 0.5), 0 8px 32px rgba(255, 94, 0, 0.15)',
} as const

export const FONT = {
  xs:   '11px',
  sm:   '13px',
  base: '15px',
  md:   '16px',
  lg:   '20px',
  xl:   '24px',
  '2xl':'32px',
} as const

// Status badge config
export const STATUS = {
  PENDING:  { label: 'รอพิจารณา', color: COLOR.warning, bg: COLOR.warningBg },
  APPROVED: { label: 'อนุมัติแล้ว', color: COLOR.success, bg: COLOR.successBg },
  REJECTED: { label: 'ไม่อนุมัติ',  color: COLOR.error,   bg: COLOR.errorBg  },
} as const
