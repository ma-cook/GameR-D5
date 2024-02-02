import { useRef } from 'react'

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
