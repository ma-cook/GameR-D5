import { Debug, useContactMaterial } from '@react-three/cannon'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Player from './Player'
import { useControls } from 'leva'
import Box from './Box'
import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

function ToggleDebug({ children }) {
  const debugRendererVisible = useControls('Debug Renderer', { visible: false })

  return <>{debugRendererVisible.visible ? <Debug color={0x008800}>{children}</Debug> : <>{children}</>}</>
}

export default function Game({ socket }) {
  const socketClient = useRef(null)
  const [clients, setClients] = useState({})
  useContactMaterial('ground', 'slippery', {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })

  useEffect(() => {
    // On mount initialize the socket connection
    socketClient.current = io()

    // Dispose gracefully
    return () => {
      if (socketClient.current) socketClient.current.disconnect()
    }
  }, [])

  useEffect(() => {
    if (socketClient.current) {
      socketClient.current.on('move', (clients) => {
        setClients(clients)
      })
    }
  }, [])

  return (
    <>
      <ToggleDebug>
        <Floor />
        <Box />
        <Player position={[0, 1, 0]} socket={socket} />
      </ToggleDebug>
    </>
  )
}
