import { Debug, useContactMaterial } from '@react-three/cannon'
import Floor from './Floor'
import Obstacles from './Obstacles'
import Player from './Player'
import { useControls } from 'leva'
import Box from './Box'
import React, { useState, useEffect, useRef } from 'react'

function Game({ gameState, geckosClient }) {
  useContactMaterial('ground', 'slippery', {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })

  const channel = geckosClient.current

  return (
    <>
      <Floor />
      <Box />
      {Object.values(gameState).map((clientData) => {
        const { id, position, rotation, torsoRotation, reticulePosition } = clientData

        return (
          <Player
            id={id}
            key={id}
            position={position}
            rotation={rotation}
            channel={channel}
            torsoRotation={torsoRotation}
            reticulePosition={reticulePosition}
            geckosClient={geckosClient}
          />
        )
      })}
    </>
  )
}

export default React.memo(Game)
