import { Suspense, useMemo, useRef, useEffect, useState } from 'react'
import { Vector3, Euler, Quaternion, Matrix4, Raycaster, SphereGeometry, MeshBasicMaterial, Mesh } from 'three'
import Eve from './Eve'
import { useCompoundBody, useSphere } from '@react-three/cannon'
import useKeyboard from './useKeyboard'
import { useFrame, useThree } from '@react-three/fiber'
import { Vec3 } from 'cannon-es'
import useFollowCam from './useFollowCam'
import { useStore } from './App'
import Torso from './Torso'
import * as THREE from 'three'
import { Object3D } from 'three'

export default function Player({ position }) {
  const playerGrounded = useRef(false)
  const inJumpAction = useRef(false)
  const group = useRef()
  const { yaw, pitch, secondGroup, updateMouseMovement } = useFollowCam(group, [0, 1, 1.5])
  const velocity = useMemo(() => new Vector3(), [])
  const inputVelocity = useMemo(() => new Vector3(), [])
  const euler = useMemo(() => new Euler(), [])
  const quat = useMemo(() => new Quaternion(), [])
  const targetQuaternion = useMemo(() => new Quaternion(), [])
  const worldPosition = useMemo(() => new Vector3(), [])
  const raycasterOffset = useMemo(() => new Vector3(), [])
  const contactNormal = useMemo(() => new Vec3(0, 0, 0), [])
  const down = useMemo(() => new Vec3(0, -1, 0), [])
  const rotationMatrix = useMemo(() => new Matrix4(), [])
  const prevActiveAction = useRef(0) // 0:idle, 1:walking, 2:jumping
  const keyboard = useKeyboard()
  const secondGroupPosition = useMemo(() => new Vector3(), [])
  const { groundObjects, actions, mixer, setTime, setFinished } = useStore((state) => state)
  const reticule = useRef() // Ref for the reticule mesh
  const raycaster = useMemo(() => new Raycaster(), [])
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()

  const containerGroup = useRef()

  const { camera, scene } = useThree()

  const [isRightMouseDown, setRightMouseDown] = useState(false)

  const handleMouseDown = (event) => {
    if (event.button === 2) {
      setRightMouseDown(true)
    }
  }

  const handleMouseUp = (event) => {
    if (event.button === 2) {
      setRightMouseDown(false)
    }
  }

  useEffect(() => {
    document.addEventListener('mousemove', updateMouseMovement)
    return () => {
      document.removeEventListener('mousemove', updateMouseMovement)
    }
  }, [updateMouseMovement])

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
  }

  useEffect(() => {
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
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
      containerGroup.current.remove(mesh) // Remove the reticule when the component unmounts
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
      reticule.current.position.lerp(defaultPosition, 0.1) // Adjust the lerp factor as needed
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
      const laserDirection = new Vector3(0, 0, 1).applyQuaternion(laser.quaternion)
      laser.position.add(laserDirection.clone().multiplyScalar(100 * delta)) // Adjust the speed as needed

      // You may also want to remove lasers that are too far from the player
      if (laser.position.distanceTo(group.current.position) > 100) {
        laserGroup.current.remove(laser)
        // Remove the laser from the state as well
        lasers.splice(lasers.indexOf(laser), 1)
      }
    })

    if (isRightMouseDown) {
      shootLasers()
    }

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

    if (document.pointerLockElement) {
      updateSecondGroupQuaternion()

      // Make the Torso look at the mouse coordinates
      secondGroup.current.lookAt(reticule.current.position)
    }

    rotationMatrix.lookAt(worldPosition, group.current.position, group.current.up)

    targetQuaternion.setFromRotationMatrix(rotationMatrix)
    if (distance > 0.0001 && !group.current.quaternion.equals(targetQuaternion)) {
      targetQuaternion.z = 0
      targetQuaternion.x = 0
      targetQuaternion.normalize()
      group.current.quaternion.rotateTowards(targetQuaternion, delta * 6)
    }

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
      inputVelocity.setLength(0.7) // clamps walking speed

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

    group.current.position.lerp(worldPosition, 0.9)
    secondGroup.current.position.lerp(worldPosition, 0.9)
  })

  return (
    <group ref={containerGroup} position={position}>
      {/* First Eve component */}
      <group ref={(groupRef) => (group.current = groupRef)} position={position}>
        <Suspense fallback={null}>
          <Eve />
        </Suspense>
      </group>

      {/* Second Eve component */}
      <group ref={(secondGroupRef) => (secondGroup.current = secondGroupRef)} position={secondGroupPosition}>
        <Suspense fallback={null}>
          <Torso />
        </Suspense>
      </group>

      <group ref={laserGroup}></group>
    </group>
  )
}
