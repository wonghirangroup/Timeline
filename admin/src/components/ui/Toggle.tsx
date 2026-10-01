// admin/src/components/ui/Toggle.tsx
// สวิตช์เปิด/ปิดแบบใช้ร่วมกัน — ดึงมาจากสไตล์ที่ใช้ซ้ำอยู่แล้วหลายจุด (เช่น
// การแจ้งเตือน LINE ในหน้าตั้งค่า) ให้เป็น component เดียวแทนก็อปสไตล์ซ้ำ
import type { CSSProperties } from 'react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  size?: 'sm' | 'md'
  'aria-label'?: string
}

export default function Toggle({ checked, onChange, disabled, size = 'md', 'aria-label': ariaLabel }: ToggleProps) {
  const width  = size === 'sm' ? 36 : 42
  const height = size === 'sm' ? 20 : 24
  const knob   = size === 'sm' ? 15 : 18
  const pad    = size === 'sm' ? 2.5 : 3

  const btnStyle: CSSProperties = {
    width, height, borderRadius: 99, border: 'none', position: 'relative', flexShrink: 0, padding: 0,
    background: checked ? '#244B83' : '#e5e7eb', transition: 'background 0.15s',
    cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1,
  }
  const knobStyle: CSSProperties = {
    position: 'absolute', top: pad, left: checked ? width - knob - pad : pad,
    width: knob, height: knob, borderRadius: '50%', background: '#fff',
    transition: 'left 0.15s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
  }

  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={ariaLabel} disabled={disabled}
      onClick={() => !disabled && onChange(!checked)} style={btnStyle}>
      <span style={knobStyle} />
    </button>
  )
}
