import React, { Suspense, useMemo, useRef, useEffect, useState, useCallback } from 'react'
import { Vector3, Euler, Quaternion, Matrix4, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh, BoxGeometry, Object3D } from 'three'
import { useCompoundBody } from '@react-three/cannon'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { Vec3 } from 'cannon-es'
import Eve from './Eve'
import Torso from './Torso'
import useFollowCam from './useFollowCam'
import useKeyboard from './useKeyboard'
import { useStore } from './App'
import * as THREE from 'three'
import useMouse from './useMouse'

import { shootLasers, updateLasersPosition } from './laserActions'
import { useReticule } from './useReticule'

const Player = ({ id, position, rotation, channel, torsoRotation, geckosClient }) => {
  const lastFired = useRef(Date.now())
  const cooldown = 200
  const newPosition = useRef([0, 0, 0])
  const direction = new THREE.Vector3()
  const pivotObject = new THREE.Object3D()
  const { isRightMouseDown, mouseMovement } = useMouse()
  const isLocalPlayer = useRef(id == geckosClient.current.id)
  const playerGrounded = useRef(false)
  const inJumpAction = useRef(false)
  const group = useRef()
  const shouldListen = isLocalPlayer.current
  let pivot, alt, yaw, pitch, secondGroup, updateMouseMovement
  if (isLocalPlayer) {
    ;({ pivot, alt, yaw, pitch, secondGroup, updateMouseMovement } = useFollowCam(group, [0, 1, 1.5], isLocalPlayer.current))
  }
  const velocity = useMemo(() => new Vector3(), [])
  const inputVelocity = useMemo(() => new Vector3(), [])
  const euler = useMemo(() => new Euler(), [])
  const quat = useMemo(() => new Quaternion(), [])
  const worldPosition = useMemo(() => new Vector3(), [])
  const raycasterOffset = useMemo(() => new Vector3(), [])
  const contactNormal = useMemo(() => new Vector3(0, 0, 0), [])
  const down = useMemo(() => new Vec3(0, -1, 0), [])
  const prevActiveAction = useRef(0) // 0:idle, 1:walking, 2:jumping
  const keyboard = useKeyboard(shouldListen, isLocalPlayer)
  const { groundObjects, actions, mixer, setTime, setFinished } = useStore((state) => state)
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()
  const containerGroup = useRef()
  let activeAction = useRef(0)
  const inputHistory = useRef([])
  let prevPosition = new Vector3([0, 0, 0])

  const reticule = useReticule(containerGroup)
  const defaultPosition = new Vector3(0, 0, -50)
  const serverPosition = new THREE.Vector3()
  const serverRotation = new THREE.Vector3()
  const newPositionVector = new THREE.Vector3()
  const serverTorsoRotation = new THREE.Vector3()
  const currentPosition = new Vector3()
  const gaze = new THREE.Quaternion()
  const playerShapes = [
    { args: [0.35], position: [0, 0.35, 0], type: 'Sphere' },
    { args: [0.25], position: [0, 0.75, 0], type: 'Sphere' },
    { args: [0.25], position: [0, 1.25, 0], type: 'Sphere' }
  ]

  const playerData = {
    id: null,
    position: null,
    rotation: null,
    torsoRotation: null,
    time: null
  }

  const inputHistoryItem = {
    input: null,
    time: null
  }

  let moveTimeoutId = null
  function updateRaycaster(raycaster, camera) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera)
  }

  //Player body
  const [ref, body] = useCompoundBody(
    () => ({
      mass: 1,
      shapes: playerShapes,
      onCollide: (e) => {
        if (e.contact.bi.id !== e.body.id) {
          contactNormal.set(...e.contact.ni)
        }
        if (contactNormal.dot(down) > 0.5) {
          if (inJumpAction.current) {
            // landed
            inJumpAction.current = true
            actions['jump']
          }
        }
      },
      material: 'slippery',
      position: position,
      allowSleep: true
    }),
    useRef()
  )

  const updateSecondGroupQuaternion = useCallback(() => {
    euler.set(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')
    gaze.setFromEuler(euler)
    secondGroup.current.setRotationFromQuaternion(gaze)
  }, [pitch.rotation.x, yaw.rotation.y, secondGroup.current])

  useEffect(() => {
    if (geckosClient.current) {
      geckosClient.current.on('gameState', (gameState) => {
        const data = gameState[id] // Get the data for this player

        if (data) {
          serverPosition.fromArray(data.position)
          serverRotation.fromArray(data.rotation)
          serverTorsoRotation.fromArray(data.torsoRotation)

          const lastServerTime = data.time // Assume the server sends its time
          const newInputHistory = []
          inputHistory.current.forEach((input, index) => {
            if (input.time > lastServerTime) {
              const delta = index > 0 ? input.time - inputHistory.current[index - 1].time : 0
              switch (input.input) {
                case 'KeyW':
                  activeAction = 1
                  inputVelocity.z = -100 * delta // You'll need to calculate delta
                  break
                case 'KeyS':
                  activeAction = 1
                  inputVelocity.z = 100 * delta // You'll need to calculate delta
                  break
                case 'KeyA':
                  activeAction = 1
                  inputVelocity.x = -100 * delta // You'll need to calculate delta
                  break
                case 'KeyD':
                  activeAction = 1
                  inputVelocity.x = 100 * delta // You'll need to calculate delta
                  break
                // Add cases for other inputs as needed
                default:
                  break
              }
            } else {
              newInputHistory.push(input)
            }
          })
          inputHistory.current = newInputHistory
        }
      })
    }
  }, [id, geckosClient])

  useFrame(({ raycaster, camera }, delta) => {
    const newPositionVector = new THREE.Vector3(...position)
    // Copy the new position to the body's position
    body.position.copy(newPositionVector)
    body.position.subscribe((bodyPosition) => {
      newPosition.current = bodyPosition
    })
    updateRaycaster(raycaster, camera)
    updateLasersPosition(lasers, group, laserGroup, delta)
    if (isLocalPlayer.current && isRightMouseDown) {
      const now = Date.now()
      // Check if enough time has passed since the last fired laser
      if (now - lastFired.current > cooldown) {
        shootLasers(secondGroup, laserGroup, lasers, channel, geckosClient)
        // Update the timestamp of the last fired laser
        lastFired.current = now
      }
    }
    const intersects = raycaster.intersectObjects(Object.values(groundObjects), false)
    if (intersects.length > 0) {
      const intersection = intersects[0]
      reticule.current.position.copy(intersection.point)
    } else {
      defaultPosition.set(0, 0, -50)
      defaultPosition.applyMatrix4(camera.matrixWorld)
      reticule.current.position.lerp(defaultPosition, 0.6)
    }
    let activeAction = 0 // 0:idle, 1:walking, 2:jumping

    ref.current.getWorldPosition(worldPosition)
    playerGrounded.current = false
    raycasterOffset.copy(worldPosition)
    raycasterOffset.y += 0.01
    raycaster.set(raycasterOffset, down)
    raycaster.intersectObjects(Object.values(groundObjects), false).forEach((i) => {
      if (i.distance < 0.028) {
        playerGrounded.current = true
      }
    })
    if (!playerGrounded.current) {
      body.linearDamping.set(0) // in the air
    } else {
      body.linearDamping.set(0.999)
    }

    inputVelocity.set(0, 0, 0)
    if (playerGrounded.current) {
      // if grounded I can walk
      ;['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach((key) => {
        if (keyboard[key]?.pressed) {
          activeAction = 1
          inputVelocity.z = key === 'KeyW' || key === 'KeyS' ? (key === 'KeyW' ? -100 : 100) * delta : inputVelocity.z
          inputVelocity.x = key === 'KeyA' || key === 'KeyD' ? (key === 'KeyA' ? -100 : 100) * delta : inputVelocity.x
          inputHistory.current.push({ input: key, time: keyboard[key].time })
        }
      })
      if (keyboard['Space']?.pressed) {
        activeAction = 2
        inJumpAction.current = true
        actions['jump']
        inputVelocity.y = 6
        inputHistory.current.push({ input: 'Space', time: keyboard['Space'].time })
      } else if (!keyboard['Space']?.pressed && inJumpAction.current && playerGrounded.current) {
        inJumpAction.current = false
      }
      euler.y = yaw.rotation.y
      euler.order = 'YZX'
      quat.setFromEuler(euler)
      inputVelocity.applyQuaternion(quat)
      velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
      body.applyImpulse([velocity.x, velocity.y, velocity.z], [0, 0, 0])
    }

    if (isLocalPlayer.current) {
      if (document.pointerLockElement) {
        // Make the Torso look at the mouse coordinates
        updateSecondGroupQuaternion()
      }
      pivotObject.add(camera)
      // Update newPositionVector with the latest newPosition

      pivotObject.position.copy(newPositionVector)
      pivotObject.position.y += 1.5
      pivotObject.rotation.copy(secondGroup.current.rotation)
      // Clear the previous timeout
      clearTimeout(moveTimeoutId)
      group.current.position.lerp(worldPosition, 0.9)
      secondGroup.current.position.set(group.current.position.x, group.current.position.y, group.current.position.z)
      // Set a new timeout
      moveTimeoutId = setTimeout(() => {
        playerData.id = geckosClient.current.id
        playerData.position = newPosition.current
        playerData.rotation = group.current.rotation.toArray()
        playerData.torsoRotation = secondGroup.current.rotation.toArray()
        playerData.time = Date.now()

        channel.emit('move', playerData)
      }, 200) // 200ms debounce time
    }
  })

  return (
    <group ref={containerGroup}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={[newPosition.current[0], newPosition.current[1], newPosition.current[2]]} rotation={rotation}>
        <Suspense fallback={null}>
          <Eve />
        </Suspense>
      </group>

      {/* Second Eve component */}
      <group ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)} rotation={torsoRotation}>
        <Suspense fallback={null}>
          <Torso />
        </Suspense>
      </group>

      <group ref={laserGroup}></group>
    </group>
  )
}

export default React.memo(Player)
