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
import { useLaserListener } from './useLaserListener'

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
  useLaserListener(channel, laserGroup, lasers)
  let inputSequenceNumber = 0
  const reticule = useReticule(containerGroup)
  const defaultPosition = new Vector3(0, 0, -50)
  const serverPosition = new THREE.Vector3()
  const serverRotation = new THREE.Vector3()
  const newPositionVector = new THREE.Vector3()
  const serverTorsoRotation = new THREE.Vector3()
  const currentPosition = new Vector3()
  const gaze = new THREE.Quaternion()

  const playerShapes = [
    { args: [0.1], position: [0, 0.1, 0], type: 'Sphere' },
    { args: [0.5, 0.5, 0.5], position: [0, 0.25, 0], type: 'Box' }
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

  function emitMoveEvent() {
    clearTimeout(moveTimeoutId)

    moveTimeoutId = setTimeout(() => {
      if (group.current) {
        playerData.id = geckosClient.current.id
        playerData.position = newPosition.current
        playerData.rotation = group.current.rotation.toArray()
        playerData.torsoRotation = secondGroup.current.rotation.toArray()
        playerData.time = Date.now()
      }
      // Convert the data to a string
      const dataString = JSON.stringify(playerData)

      // Encode the string to a Uint8Array
      const playerDataArray = new TextEncoder().encode(dataString)
      if (channel) {
        channel.emit('move', playerDataArray)
      }
    }, 1) // 400ms debounce time
  }
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
            inJumpAction.current = false
            actions['jump']
          }
        }
      },
      material: 'slippery',
      linearDamping: 10,
      position: position,

      fixedRotation: true
    }),
    useRef()
  )

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (body.current) {
        const velocity = body.current.velocity
        if (Math.abs(velocity.x) < 0.01 && Math.abs(velocity.y) < 0.01 && Math.abs(velocity.z) < 0.01) {
          body.current.setLinearVelocity({ x: 0, y: 0, z: 0 })
        }
      }
    }, 1) // 1/200th of a second is 5 milliseconds

    return () => {
      clearInterval(intervalId)
    }
  }, [body])

  const updateSecondGroupQuaternion = useCallback(() => {
    euler.set(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')
    gaze.setFromEuler(euler)

    secondGroup.current.setRotationFromQuaternion(gaze)
  }, [pitch.rotation.x, yaw.rotation.y, secondGroup.current])

  const handleGameState = (gameState) => {
    const data = gameState[id]
    if (!data) return

    serverPosition.fromArray(data.position)
    serverRotation.fromArray(data.rotation)
    serverTorsoRotation.fromArray(data.torsoRotation)

    const lastServerTime = data.time
    inputHistory.current = inputHistory.current.reduce((newInputHistory, input, index) => {
      const delta = index > 0 ? input.time - inputHistory.current[index - 1].time : 0
      if (input.time <= lastServerTime) {
        newInputHistory.push(input)
      } else {
        activeAction = 1
        inputVelocity[input.input === 'KeyA' || input.input === 'KeyD' ? 'x' : 'z'] = (input.input === 'KeyW' || input.input === 'KeyA' ? -100 : 100) * delta
      }
      return newInputHistory
    }, [])
  }

  useEffect(() => {
    geckosClient.current.on('gameState', handleGameState)
  }, [id, geckosClient])

  const handleFrame = ({ raycaster, camera }, delta) => {
    if (geckosClient.current) {
      newPositionVector.set(position)
      body.position.subscribe((bodyPosition) => {
        newPosition.current = bodyPosition
      })
      updateRaycaster(raycaster, camera)
      updateLasersPosition(lasers, group, laserGroup, delta, channel)
      handleLaserFiring()
      handleIntersections(raycaster, camera)
      handlePlayerMovement(delta, raycaster)
      handleLocalPlayer(camera)
    }
  }

  useFrame(handleFrame)

  function handleLaserFiring() {
    if (isLocalPlayer.current && isRightMouseDown) {
      const now = Date.now()
      if (now - lastFired.current > cooldown) {
        shootLasers(secondGroup, laserGroup, lasers, channel, geckosClient)
        lastFired.current = now
      }
    }
  }

  function handleIntersections(raycaster, camera) {
    if (raycaster && camera) {
      const intersects = raycaster.intersectObjects(Object.values(groundObjects), false)
      if (intersects.length > 0) {
        const intersection = intersects[0]
        // Ensure reticule.current and intersection are defined before accessing their properties
        if (reticule.current && intersection) {
          reticule.current.position.copy(intersection.point)
        }
      } else if (reticule.current) {
        // Also check here for reticule.current before accessing its properties
        defaultPosition.set(0, 0, -50)
        defaultPosition.applyMatrix4(camera.matrixWorld)
        reticule.current.position.lerp(defaultPosition, 0.6)
      }
    }
  }

  function handlePlayerMovement(delta, raycaster) {
    let activeAction = 0
    ref.current.getWorldPosition(worldPosition)
    playerGrounded.current = isPlayerGrounded(raycaster, worldPosition)
    body.linearDamping.set(playerGrounded.current ? 0.999 : 0)
    inputVelocity.set(0, 0, 0)
    if (playerGrounded.current) {
      handleGroundedPlayerMovement(delta)
    }
  }

  function isPlayerGrounded(raycaster, worldPosition) {
    raycasterOffset.copy(worldPosition)
    raycasterOffset.y += 0.01
    raycaster.set(raycasterOffset, down)
    return raycaster.intersectObjects(Object.values(groundObjects), false).some((i) => i.distance < 0.028)
  }

  const keyToVelocity = {
    KeyW: -100,
    KeyS: 100,
    KeyA: -100,
    KeyD: 100
  }

  function handleGroundedPlayerMovement(delta) {
    ;['KeyW', 'KeyS', 'KeyA', 'KeyD'].forEach((key) => {
      if (keyboard[key]?.pressed) {
        activeAction = 1
        inputVelocity.z = key === 'KeyW' || key === 'KeyS' ? keyToVelocity[key] * delta : inputVelocity.z
        inputVelocity.x = key === 'KeyA' || key === 'KeyD' ? keyToVelocity[key] * delta : inputVelocity.x
        inputHistory.current.push({ input: key, time: keyboard[key].time })
      }
    })
    handleJumpAction()
    euler.y = yaw.rotation.y
    euler.order = 'YZX'
    quat.setFromEuler(euler)
    inputVelocity.applyQuaternion(quat)
    velocity.set(inputVelocity.x, inputVelocity.y, inputVelocity.z)
    //SEND TO SERVER First!!!! (MOVE EVENT)
    body.applyImpulse([velocity.x, velocity.y, velocity.z], [0, 0, 0])
  }

  function handleJumpAction() {
    if (keyboard['Space']?.pressed && !inJumpAction.current) {
      activeAction = 2
      inJumpAction.current = true
      actions['jump']
      inputVelocity.y = 6
      inputHistory.current.push({ input: 'Space', time: keyboard['Space'].time })
    } else if (!keyboard['Space']?.pressed && inJumpAction.current) {
      inJumpAction.current = false
    }
  }

  function handleLocalPlayer(camera) {
    if (isLocalPlayer.current) {
      if (document.pointerLockElement) {
        updateSecondGroupQuaternion()
      }
      pivotObject.add(camera)
      pivotObject.position.copy(secondGroup.current.position)
      pivotObject.position.y += 1.5
      pivotObject.rotation.copy(secondGroup.current.rotation)
      clearTimeout(moveTimeoutId)

      group.current.position.lerp(worldPosition, 0.9)

      secondGroup.current.position.copy(group.current.position)

      newPositionVector.fromArray(newPosition.current)

      emitMoveEvent()
    }
  }
  //test
  return (
    <group ref={containerGroup}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={[newPosition.current[0], newPosition.current[1], newPosition.current[2]]} rotation={rotation}>
        <Eve />
      </group>

      {/* Second Eve component */}
      <group
        ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)}
        position={[newPosition.current[0], newPosition.current[1], newPosition.current[2]]}
        rotation={torsoRotation}>
        <Torso />
      </group>

      <group ref={laserGroup}></group>
    </group>
  )
}

export default React.memo(Player)
