import { useRef } from 'react'

import React from 'react'

export default function Eve() {
  const ref = useRef()

  return (
    <>
      <group ref={ref}>
        <mesh castShadow receiveShadow position={[0, 0.25, 0]}>
          <meshStandardMaterial color="white" />
          <boxGeometry args={[0.5, 0.5, 0.5]} />
        </mesh>
      </group>
    </>
  )
}
