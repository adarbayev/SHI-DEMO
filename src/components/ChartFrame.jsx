import { useLayoutEffect, useRef, useState } from 'react'
import clsx from 'clsx'

export default function ChartFrame({ className, children, style }) {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return undefined
    let animationFrame = 0

    function updateSize() {
      const rect = element.getBoundingClientRect()
      const nextSize = {
        width: Math.max(0, Math.floor(rect.width)),
        height: Math.max(0, Math.floor(rect.height)),
      }
      setSize((current) => {
        if (current.width === nextSize.width && current.height === nextSize.height) {
          return current
        }
        return nextSize
      })
    }

    function scheduleUpdate() {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(updateSize)
    }

    scheduleUpdate()
    const observer = new ResizeObserver(scheduleUpdate)
    observer.observe(element)
    window.addEventListener('resize', scheduleUpdate)
    window.visualViewport?.addEventListener('resize', scheduleUpdate)

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('resize', scheduleUpdate)
      window.visualViewport?.removeEventListener('resize', scheduleUpdate)
    }
  }, [])

  return (
    <div ref={ref} className={clsx('w-full max-w-full min-w-0', className)} style={style}>
      {size.width > 0 && size.height > 0 ? children(size) : null}
    </div>
  )
}
