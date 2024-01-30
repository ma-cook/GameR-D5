import { Canvas } from '@react-three/fiber'
import { Stats, useProgress, Html } from '@react-three/drei'
import Game from './Game'
import { Physics, Debug } from '@react-three/cannon'
import { Suspense } from 'react'
import { create } from 'zustand'
import { AnimationMixer } from 'three'
import React, { useState, useEffect, useRef } from 'react'
import geckos from '@geckos.io/client'

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
  useEffect(() => {
    // On mount initialize the geckos connection
    if (!geckosClient.current) {
      geckosClient.current = geckos({ port: 4444 })
      geckosClient.current.onConnect(() => {
        console.log('Connected to server')
      })

      geckosClient.current.on('gameState', (newGameState) => {
        if (JSON.stringify(newGameState) !== JSON.stringify(gameState)) {
          setClients(newGameState)
        }
      })
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
              <Game gameState={gameState} geckosClient={geckosClient} />
            </Physics>
            <gridHelper />
            <Stats />
          </Suspense>
        </Canvas>
        <div id="instructions">
          WASD to move
          <br />
          SPACE to jump.
          <br />
          Model from{' '}
          <a href="https://www.mixamo.com" target="_blank" rel="nofollow noreferrer">
            Mixamo
          </a>
        </div>
      </>
    )
  )
}
