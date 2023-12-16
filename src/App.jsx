import { Canvas } from '@react-three/fiber'
import { Stats, useProgress, Html } from '@react-three/drei'
import Game from './Game'
import { Physics, Debug } from '@react-three/cannon'
import { Suspense } from 'react'
import { create } from 'zustand'
import { AnimationMixer } from 'three'
import React, { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'

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
  const socketClient = useRef(null)
  const cameraRef = useRef()
  const [gameState, setClients] = useState({})
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
      socketClient.current.on('gameState', (gameState) => {
        setClients(gameState)
      })
    }
  }, [])

  return (
    socketClient.current && (
      <>
        <Canvas shadows onPointerDown={(e) => e.target.requestPointerLock()}>
          <Suspense fallback={<Loader />}>
            <ambientLight />
            <spotLight position={[2.5, 5, 5]} angle={Math.PI / 3} penumbra={0.5} castShadow shadow-mapSize-height={2048} shadow-mapSize-width={2048} intensity={Math.PI * 25} />
            <spotLight position={[-2.5, 5, 5]} angle={Math.PI / 3} penumbra={0.5} castShadow shadow-mapSize-height={2048} shadow-mapSize-width={2048} intensity={Math.PI * 25} />
            <Physics>
              <Game gameState={gameState} socketClient={socketClient} />
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
