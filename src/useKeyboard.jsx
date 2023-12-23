import { useRef, useEffect } from 'react'

export default function useKeyboard(shouldListen, isLocalPlayer) {
  const keyMap = useRef({})

  useEffect(() => {
    const onDocumentKey = (e) => {
      keyMap.current[e.code] = e.type === 'keydown' ? { pressed: true, time: Date.now() } : { pressed: false, time: Date.now() }
    }
    if (shouldListen && isLocalPlayer) {
      document.addEventListener('keydown', onDocumentKey)
      document.addEventListener('keyup', onDocumentKey)
    }

    return () => {
      document.removeEventListener('keydown', onDocumentKey)
      document.removeEventListener('keyup', onDocumentKey)
    }
  }, [shouldListen, isLocalPlayer])

  return keyMap.current
}
