import { useContactMaterial } from '@react-three/cannon'
import { throttle } from 'lodash'
import Player from './Player'

import React, { useMemo } from 'react'

const MemoizedPlayer = React.memo(Player)

function Game({ gameState, geckosClient }) {
  useContactMaterial('ground', 'slippery', {
    friction: 0,
    restitution: 0.3,
    contactEquationStiffness: 1e8,
    contactEquationRelaxation: 3
  })

  const channel = useMemo(() => geckosClient.current, [geckosClient])
  const throttledGameState = useMemo(() => throttle(() => gameState, 0.5), [gameState])
  return (
    <>
      {Object.values(throttledGameState()).map((clientData) => {
        const { id, position, rotation, torsoRotation, reticulePosition } = clientData

        return (
          geckosClient.current && (
            <MemoizedPlayer
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
        )
      })}
    </>
  )
}

export default React.memo(Game)
