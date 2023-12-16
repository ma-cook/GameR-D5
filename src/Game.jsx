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

export default function Game({ gameState, socketClient }) {
  useContactMaterial('ground', 'slippery', {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })

  const socket = socketClient.current

  return (
    <>
      <ToggleDebug>
        <Floor />
        <Box />
        {Object.values(gameState).map((clientData, index) => {
          const { id, position, rotation, torsoPosition, torsoRotation, reticulePosition } = clientData

          return (
            <Player
              id={id}
              key={index}
              position={position}
              rotation={rotation}
              socket={socket}
              torsoPosition={torsoPosition}
              torsoRotation={torsoRotation}
              reticulePosition={reticulePosition}
              socketClient={socketClient}
            />
          )
        })}
      </ToggleDebug>
    </>
  )
}
