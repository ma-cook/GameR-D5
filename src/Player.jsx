import React, { Suspense, useMemo, useRef, useEffect, useState } from 'react'
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
import { useLaserListener } from './useLaserListener'
import { shootLasers, updateLasersPosition } from './laserActions'
import { useReticule } from './useReticule'

export default function Player({ id, position, rotation, socket, torsoPosition, torsoRotation, socketClient }) {
  const newPosition = useRef([0, 0, 0])
  const direction = new THREE.Vector3()
  const pivotObject = new THREE.Object3D()
  const { isRightMouseDown, mouseMovement } = useMouse()
  const isLocalPlayer = useRef(id == socketClient.current.id)
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
  const keyboard = useKeyboard(shouldListen, isLocalPlayer.current)
  const { groundObjects, actions, mixer, setTime, setFinished } = useStore((state) => state)
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()
  const containerGroup = useRef()
  let activeAction = useRef(0)
  const inputHistory = useRef([])
  let prevPosition = new Vector3([0, 0, 0])
  useLaserListener(socket, laserGroup, lasers)
  const reticule = useReticule(containerGroup)
  const defaultPosition = new Vector3(0, 0, -50)
  const serverPosition = new THREE.Vector3()
  const serverRotation = new THREE.Vector3()
  const serverTorsoPosition = new THREE.Vector3()
  const serverTorsoRotation = new THREE.Vector3()
  const currentPosition = new Vector3()
  function updateRaycaster(raycaster, camera) {
    raycaster.setFromCamera({ x: 0, y: 0 }, camera)
  }

  //Player body
  const [ref, body] = useCompoundBody(
    () => ({
      mass: 1,
      shapes: [
        { args: [0.35], position: [0, 0.35, 0], type: 'Sphere' },
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
      allowSleep: true,
      fixedRotation: true
    }),
    useRef()
  )

  useEffect(() => {
    // Create a new Vector3 with the new position
    const newPositionVector = new THREE.Vector3(...position)
    // Copy the new position to the body's position
    body.position.copy(newPositionVector)
    const subscription = body.position.subscribe((bodyPosition) => {
      newPosition.current = bodyPosition
    })
    return () => {
      subscription()
    }
  }, [body, position])

  const updateSecondGroupQuaternion = () => {
    const gaze = new Quaternion()
    const euler = new Euler(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')
    gaze.setFromEuler(euler)
    secondGroup.current.setRotationFromQuaternion(gaze)
  }

  useEffect(() => {
    if (socketClient.current) {
      socketClient.current.on('gameState', (gameState) => {
        const data = gameState[id] // Get the data for this player

        if (data) {
          serverPosition.fromArray(data.position)
          serverRotation.fromArray(data.rotation)
          serverTorsoPosition.fromArray(data.torsoPosition)
          serverTorsoRotation.fromArray(data.torsoRotation)

          if (
            !serverPosition.equals(worldPosition) ||
            !serverRotation.equals(group.current.rotation) ||
            !serverTorsoPosition.equals(worldPosition) ||
            !serverTorsoRotation.equals(secondGroup.current.rotation)
          ) {
            const lastServerTime = data.time // Assume the server sends its time
            const inputsToReapply = inputHistory.current.filter((input) => input.time > lastServerTime)
            inputsToReapply.forEach((input, index) => {
              const delta = index > 0 ? input.time - inputsToReapply[index - 1].time : 0
              switch (input.input) {
                case 'KeyW':
                  activeAction = 1
                  inputVelocity.z = -40 * delta // You'll need to calculate delta
                  break
                case 'KeyS':
                  activeAction = 1
                  inputVelocity.z = 40 * delta // You'll need to calculate delta
                  break
                case 'KeyA':
                  activeAction = 1
                  inputVelocity.x = -40 * delta // You'll need to calculate delta
                  break
                case 'KeyD':
                  activeAction = 1
                  inputVelocity.x = 40 * delta // You'll need to calculate delta
                  break
                // Add cases for other inputs as needed
                default:
                  break
              }
            })
            inputHistory.current = inputHistory.current.filter((input) => input.time <= lastServerTime)
          }
        }
      })
    }
  }, [id, socketClient])

  useFrame(({ raycaster, camera }, delta) => {
    updateRaycaster(raycaster, camera)
    updateLasersPosition(lasers, group, laserGroup, delta)
    if (isLocalPlayer.current && isRightMouseDown) {
      shootLasers(secondGroup, laserGroup, lasers, socket, socketClient)
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
    const distance = worldPosition.distanceTo(group.current.position)
    inputVelocity.set(0, 0, 0)
    if (playerGrounded.current) {
      // if grounded I can walk
      if (keyboard['KeyW']) {
        activeAction = 1
        inputVelocity.z = -40 * delta
        inputHistory.current.push({ input: 'KeyW', time: Date.now() })
      }
      if (keyboard['KeyS']) {
        activeAction = 1
        inputVelocity.z = 40 * delta
        inputHistory.current.push({ input: 'KeyS', time: Date.now() })
      }
      if (keyboard['KeyA']) {
        activeAction = 1
        inputVelocity.x = -40 * delta
        inputHistory.current.push({ input: 'KeyA', time: Date.now() })
      }
      if (keyboard['KeyD']) {
        activeAction = 1
        inputVelocity.x = 40 * delta
        inputHistory.current.push({ input: 'KeyD', time: Date.now() })
      }
      inputVelocity.setLength(1.1) // clamps walking speed
      if (activeAction !== prevActiveAction.current) {
        if (prevActiveAction.current !== 1 && activeAction === 1) {
          actions['walk']
          actions['idle']
        }
        if (prevActiveAction.current !== 0 && activeAction === 0) {
          actions['idle']
          actions['walk']
        }
        prevActiveAction.current = activeAction
      }
      if (keyboard['Space']) {
        if (playerGrounded.current && !inJumpAction.current) {
          activeAction = 2
          inJumpAction.current = true
          actions['jump']
          inputVelocity.y = 6
        }
      }
      euler.y = yaw.rotation.y
      euler.order = 'YZX'
      quat.setFromEuler(euler)
      inputVelocity.applyQuaternion(quat)
      velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)

      body.applyImpulse([velocity.x, velocity.y, velocity.z], [0, 0, 0])
    }
    if (activeAction === 1) {
      mixer.update(delta * distance * 22.5)
    } else {
      mixer.update(delta)
    }
    if (worldPosition.y < -3) {
      body.velocity.set(0, 0, 0)
      body.position.set(0, 1, 0)

      body.applyImpulse([velocity.x, velocity.y, velocity.z], [0, 0, 0]).setFinished(false)
      setTime(0)
    }
    if (secondGroup.current) {
      secondGroup.current.position.set(group.current.position.x, group.current.position.y, group.current.position.z)
    }
    if (document.pointerLockElement) {
      // Make the Torso look at the mouse coordinates
      updateSecondGroupQuaternion()
    }

    if (isLocalPlayer.current) {
      if (secondGroup.current && secondGroup.current.position) {
        direction.subVectors(worldPosition, group.current.position).normalize()

        pivotObject.add(camera)
        pivotObject.position.copy(secondGroup.current.position)
        pivotObject.position.y += 1.5
        pivotObject.rotation.copy(secondGroup.current.rotation)
      }
    }
    if (isLocalPlayer.current) {
      const playerData = {
        id: socketClient.current.id,
        position: newPosition.current,
        rotation: group.current.rotation.toArray(),
        torsoPosition: secondGroup.current.position.toArray(),
        torsoRotation: secondGroup.current.rotation.toArray(),
        time: Date.now() // Add the current time
      }
      socket.emit('move', playerData)
    }
  })

  useFrame(() => {
    if (ref.current && body) {
      // Interpolate the position of the mesh to match the body's position
      ref.current.position.copy(body.position)
    }
  })

  return (
    <group ref={containerGroup}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={newPosition.current} rotation={rotation}>
        <Suspense fallback={null}>
          <Eve />
        </Suspense>
      </group>

      {/* Second Eve component */}
      <group ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)} position={torsoPosition} rotation={torsoRotation}>
        <Suspense fallback={null}>
          <Torso />
          <Text position={[0, 2.0, 0]} color="white" anchorX="center" anchorY="middle">
            {id}
          </Text>
        </Suspense>
      </group>

      <group ref={laserGroup}></group>
    </group>
  )
}
