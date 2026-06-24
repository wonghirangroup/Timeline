import { useRef } from 'react'

/**
 * Returns touch handlers that call onNext / onPrev when the user swipes
 * horizontally past `threshold` pixels. Attach to the scrollable list container.
 */
export function useSwipePage(
  onNext: () => void,
  onPrev: () => void,
  threshold = 50,
) {
  const startX = useRef<number | null>(null)

  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.touches[0].clientX
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return
      const diff = startX.current - e.changedTouches[0].clientX
      if (diff >  threshold) onNext()
      if (diff < -threshold) onPrev()
      startX.current = null
    },
  }
}
