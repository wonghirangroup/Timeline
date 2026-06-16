import { useEffect } from 'react'

export function useScrollLock(locked: boolean) {
  useEffect(() => {
    const el = document.querySelector('main') as HTMLElement | null
    if (!el) return
    if (locked) {
      el.style.overflow = 'hidden'
    }
    return () => {
      el.style.overflow = ''
    }
  }, [locked])
}
