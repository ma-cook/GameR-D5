import { useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useEffect } from 'react'
import { useStore } from './App'
import React from 'react'

export default function Eve() {
  const ref = useRef()

  return (
    <>
      <group ref={ref}>
        <mesh castShadow receiveShadow>
          <meshStandardMaterial color="white" />
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
      </group>
    </>
  )
}
