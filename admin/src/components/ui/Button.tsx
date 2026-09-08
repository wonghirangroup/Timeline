import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

// สีตามชนิดการกระทำ — อย่าใส่สีปุ่มเองในหน้า ให้เลือก variant ที่สื่อความหมาย
//   primary       บันทึก / ยืนยัน / ปุ่มหลัก 1 อันต่อหน้า           (ส้มทึบ)
//   success       อนุมัติ / ยืนยันเชิงบวก                          (เขียวทึบ)
//   danger        ลบ / ปฏิเสธ / ทำลาย — ใน modal ยืนยัน            (แดงทึบ)
//   success-soft  อนุมัติแบบ inline ในลิสต์                        (เขียวจาง)
//   danger-soft   ลบ/ปฏิเสธแบบ inline ในลิสต์                      (แดงจาง)
//   secondary     แก้ไข / การกระทำรอง                             (ขาว+ขอบเทา)
//   ghost         ยกเลิก / ปิด / ข้าม                              (โปร่ง)
export type ButtonVariant =
  | 'primary' | 'success' | 'danger'
  | 'success-soft' | 'danger-soft'
  | 'secondary' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  /** ไอคอนนำหน้า label (lucide) */
  icon?: ReactNode
  /** ไอคอนต่อท้าย label */
  iconRight?: ReactNode
  /** แสดง spinner + disable */
  loading?: boolean
  /** กว้างเต็มพื้นที่ */
  block?: boolean
  children?: ReactNode
}

const ICON_SIZE: Record<ButtonSize, number> = { sm: 13, md: 15, lg: 16 }

const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon, iconRight, loading = false, block = false,
    disabled, className, children, type = 'button', ...rest },
  ref,
) {
  const cls = [
    'tl-btn', `tl-btn--${variant}`, `tl-btn--${size}`,
    block ? 'tl-btn--block' : '',
    className ?? '',
  ].filter(Boolean).join(' ')

  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading
        ? <Loader2 size={ICON_SIZE[size]} className="animate-spin" style={{ flexShrink: 0 }} />
        : icon}
      {children != null && <span>{children}</span>}
      {!loading && iconRight}
    </button>
  )
})

export default Button
