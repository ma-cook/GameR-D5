import { Canvas } from '@react-three/fiber'
import { Stats, useProgress, Html } from '@react-three/drei'
import Game from './Game'
import { Physics, Debug } from '@react-three/cannon'
import { Suspense } from 'react'
import { create } from 'zustand'
import { AnimationMixer } from 'three'
import React, { useMemo, useState, useEffect, useRef } from 'react'
import geckos from '@geckos.io/client'
import Box from './Box'
import Floor from './Floor'
import { throttle } from 'lodash'

import './App.css'

export const useStore = create(() => ({
  groundObjects: {},
  actions: {
    shoot: () => {
      set((state) => ({ lasers: [...state.lasers, Date.now()] }))
      // Implement logic for firing lasers
    }
    //toggleSound: (sound) => {
    // Implement logic for toggling sound
    //}
    // ... Other existing actions
  },
  lasers: [], // New state for storing laser shots
  mixer: new AnimationMixer()
}))

function Loader() {
  const { progress } = useProgress()
  return <Html center>{progress} % loaded</Html>
}

export default function App() {
  const geckosClient = useRef(null)
  const cameraRef = useRef()
  const [gameState, setClients] = useState({})
  const throttledSetClients = useMemo(() => throttle(setClients, 0.5), [])
  useEffect(() => {
    // On mount initialize the geckos connection
    if (!geckosClient.current) {
      geckosClient.current = geckos({ port: 4444 })
      geckosClient.current.onConnect(() => {
        console.log('Connected to server')
      })

      geckosClient.current.on(
        'gameState',
        (gameStateBuffer) => {
          const data = gameStateBuffer.data
          const string = String.fromCharCode.apply(null, data)
          const newGameState = JSON.parse(string)
          if (JSON.stringify(newGameState) !== JSON.stringify(gameState)) {
            throttledSetClients(newGameState)
          }
        },
        [throttledSetClients]
      )
    }

    // Dispose gracefully
    return () => {
      if (geckosClient.current && geckosClient.current.localPeerConnection) {
        geckosClient.current.close()
      }
    }
  }, [])

  return (
    geckosClient.current && (
      <>
        <Canvas shadows onPointerDown={(e) => e.target.requestPointerLock()}>
          <Suspense fallback={<Loader />}>
            <ambientLight />

            <Physics>
              <Floor />
              <Box />

              <Game gameState={gameState} geckosClient={geckosClient} />
            </Physics>
            <Stats />
          </Suspense>
        </Canvas>
        <div id="instructions">
          WASD to move
          <br />
          SPACE to jump.
          <br />
        </div>
      </>
    )
  )
}
