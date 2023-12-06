import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStore } from './App'

export default function useLasers(socket, isLocalPlayer, secondGroup) {
  const lasers = useStore((state) => state.lasers)
  const laserGroup = useRef()

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

  return { lasers, laserGroup, shootLasers }
}
