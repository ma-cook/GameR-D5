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

export default function Player({ secondGroupRef, id, position, rotation, socket, torsoPosition, torsoRotation, reticulePosition, socketClient }) {
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
  const contactNormal = useMemo(() => new Vec3(0, 0, 0), [])
  const down = useMemo(() => new Vec3(0, -1, 0), [])
  const prevActiveAction = useRef(0) // 0:idle, 1:walking, 2:jumping
  const keyboard = useKeyboard(shouldListen, isLocalPlayer.current)
  const { groundObjects, actions, mixer, setTime, setFinished } = useStore((state) => state)
  const reticule = useRef() // Ref for the reticule mesh
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()
  const containerGroup = useRef()
  const { camera } = useThree()

  const shootLasers = () => {
    // Create lasers and set their positions
    const laserGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5)
    const laserMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
    const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial)
    laserMesh.position.set(secondGroup.current.position.x, secondGroup.current.position.y + 1, secondGroup.current.position.z)
    laserMesh.quaternion.copy(secondGroup.current.quaternion)

    // Add the lasers to the scene
    laserGroup.current.add(laserMesh)

    // Add the lasers to the state for later reference
    lasers.push(laserMesh)

    const laserData = {
      id: socketClient.current.id,
      position: laserMesh.position.toArray(),
      quaternion: laserMesh.quaternion.toArray()
    }
    socket.emit('laser', laserData)
  }

  useEffect(() => {
    socket.on('laser', (laserData) => {
      // Create a new laser with the received data
      const laserGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5)
      const laserMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial)
      laserMesh.position.fromArray(laserData.position)
      laserMesh.quaternion.fromArray(laserData.quaternion)

      // Add the laser to the scene and the state
      laserGroup.current.add(laserMesh)
      lasers.push(laserMesh)
    })

    return () => {
      socket.off('laser')
    }
  }, [])

  // Create the reticule mesh
  useEffect(() => {
    const geometry = new SphereGeometry(0.05, 16, 16)
    const material = new MeshBasicMaterial({ color: 0xff0000 })
    const mesh = new Mesh(geometry, material)
    reticule.current = mesh
    containerGroup.current.add(mesh) // Add the reticule to the group
    return () => {
      if (mesh !== null && containerGroup.current !== null) {
        containerGroup.current.remove(mesh) // Remove the reticule when the component unmounts
      }
    }
  }, [])

  useFrame(({ raycaster }, delta) => {
    // Update the raycaster based on the mouse position
    raycaster.setFromCamera({ x: 0, y: 0 }, camera)

    // Find intersections with objects in the scene
    const intersects = raycaster.intersectObjects(Object.values(groundObjects), false)

    if (intersects.length > 0) {
      // If there is an intersection, update the reticule's position
      const intersection = intersects[0]
      reticule.current.position.copy(intersection.point)
    } else {
      // If there is no intersection, gradually move the reticule towards the default position

      const defaultPosition = new Vector3(0, 0, -50) // Adjust the distance as needed
      defaultPosition.applyMatrix4(camera.matrixWorld)
      reticule.current.position.lerp(defaultPosition, 0.6) // Adjust the lerp factor as needed
    }
  })

  //Player body
  const [ref, body] = useCompoundBody(
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
      position: position
    }),
    useRef()
  )

  const updateSecondGroupQuaternion = () => {
    // Assuming yaw.rotation is the mouse movement data
    const gaze = new Quaternion()

    // Set pitch directly to euler.x
    const euler = new Euler(pitch.rotation.x, yaw.rotation.y, 0, 'YZX')

    // Convert euler angles to quaternion
    gaze.setFromEuler(euler)

    secondGroup.current.setRotationFromQuaternion(gaze)
  }

  useFrame(({ raycaster }, delta) => {
    lasers.forEach((laser) => {
      // Assuming lasers have a property like 'direction' that indicates their movement direction
      const laserDirection = new Vector3(0, 0, -1).applyQuaternion(laser.quaternion)
      laser.position.add(laserDirection.clone().multiplyScalar(100 * delta)) // Adjust the speed as needed

      // You may also want to remove lasers that are too far from the player
      if (laser.position.distanceTo(group.current.position) > 100) {
        laserGroup.current.remove(laser)
        // Remove the laser from the state as well
        lasers.splice(lasers.indexOf(laser), 1)
      }
    })

    if (isLocalPlayer.current && isRightMouseDown) {
      shootLasers()
    }
    false
    let activeAction = 0 // 0:idle, 1:walking, 2:jumping
    body.angularFactor.set(0, 0, 0)

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
      body.linearDamping.set(0.9999999)
    }

    const distance = worldPosition.distanceTo(group.current.position)

    inputVelocity.set(0, 0, 0)
    if (playerGrounded.current) {
      // if grounded I can walk
      if (keyboard['KeyW']) {
        activeAction = 1
        inputVelocity.z = -40 * delta
      }
      if (keyboard['KeyS']) {
        activeAction = 1
        inputVelocity.z = 40 * delta
      }
      if (keyboard['KeyA']) {
        activeAction = 1
        inputVelocity.x = -40 * delta
      }
      if (keyboard['KeyD']) {
        activeAction = 1
        inputVelocity.x = 40 * delta
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
      group.current.position.set(0, 1, 0)

      setFinished(false)
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
      // Only update position when the player is moving
      group.current.position.lerp(worldPosition, 0.9)

      if (secondGroup.current && secondGroup.current.position) {
        const pivotObject = new THREE.Object3D()
        const direction = new THREE.Vector3()
        direction.subVectors(worldPosition, group.current.position).normalize()

        // Make the player face the target
        group.current.lookAt(group.current.position.clone().add(direction))
        pivotObject.add(camera)

        // Update the pivot object's position when the secondGroup's position is updated
        pivotObject.position.copy(secondGroup.current.position)
        pivotObject.position.y += 1.5
        // Rotate the pivot object instead of the camera
        pivotObject.rotation.copy(secondGroup.current.rotation)
      }
    }

    if (isLocalPlayer.current) {
      const playerData = {
        id: socketClient.current.id,
        position: group.current.position.toArray(),
        rotation: group.current.rotation.toArray(),
        torsoPosition: secondGroup.current.position.toArray(),
        torsoRotation: secondGroup.current.rotation.toArray()
      }

      socket.emit('move', playerData)
    }
  })

  return (
    <group ref={containerGroup}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={position} rotation={rotation}>
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
