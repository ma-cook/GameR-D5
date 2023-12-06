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
        <mesh castShadow receiveShadow position={[15, 0, 0]}>
          <meshStandardMaterial color="white" />
          <boxGeometry args={[10, 10, 10]} />
        </mesh>
      </group>
    </>
  )
}
