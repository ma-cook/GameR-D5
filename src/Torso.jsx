import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import { useStore } from './App'
import React from 'react'

export default function Torso() {
  const ref = useRef()

  return (
    <>
      <group ref={ref}>
        <mesh castShadow receiveShadow position={[0, 1, 0]}>
          <meshStandardMaterial color="white" />
          <boxGeometry args={[0.3, 0.4, 0.8]} />
        </mesh>
      </group>
    </>
  )
}
