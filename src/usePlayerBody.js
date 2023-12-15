import { useRef } from 'react'
import { useCompoundBody } from '@react-three/cannon'

export default function usePlayerBody(position, contactNormal, down, inJumpAction, actions) {
  return useCompoundBody(
    () => ({
      mass: 1,
      shapes: [
        { args: [0.25], position: [0, 0.25, 0], type: 'Sphere' },
        { args: [0.25], position: [0, 0.75, 0], type: 'Sphere' },
        { args: [0.25], position: [0, 1.25, 0], type: 'Sphere' }
      ],
      onCollide: (e) => {
        if (e.contact.bi.id !== e.body.id) {
          contactNormal.set(...e.contact.ni)
        }
        if (contactNormal.dot(down) > 0.5) {
          if (inJumpAction.current) {
            // landed
            inJumpAction.current = false
            actions['jump']
          }
        }
      },
      material: 'slippery',
      linearDamping: 0,
      position: position,
      allowSleep: true
    }),
    useRef()
  )
}
