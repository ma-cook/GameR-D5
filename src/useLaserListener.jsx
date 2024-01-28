import { useEffect } from 'react'
import * as THREE from 'three'

export function useLaserListener(channel, laserGroup, lasers) {
  useEffect(() => {
    channel.on('laser', (laserData) => {
      // Create a new laser with the received data
      const laserGeometry = new THREE.BoxGeometry(0.2, 0.2, 0.8)
      const laserMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
      const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial)
      laserMesh.position.fromArray(laserData.position)
      laserMesh.quaternion.fromArray(laserData.quaternion)

      // Add the laser to the scene and the state
      laserGroup.current.add(laserMesh)
      lasers.push(laserMesh)
    })
  }, [channel, laserGroup, lasers])
}
