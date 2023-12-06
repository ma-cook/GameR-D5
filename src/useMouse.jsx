import { useEffect, useState } from 'react'

export default function useMouse() {
  const [isRightMouseDown, setRightMouseDown] = useState(false)
  const [mouseMovement, setMouseMovement] = useState({ x: 0, y: 0 })

  const handleMouseDown = (event) => {
    if (event.button === 2) {
      setRightMouseDown(true)
    }
  }

  const handleMouseUp = (event) => {
    if (event.button === 2) {
      setRightMouseDown(false)
    }
  }

  const updateMouseMovement = (event) => {
    setMouseMovement({ x: event.clientX, y: event.clientY })
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mousemove', updateMouseMovement)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mousemove', updateMouseMovement)
    }
  }, [])

  return { isRightMouseDown, mouseMovement }
}
