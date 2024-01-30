import { useEffect, useMemo } from 'react'
import * as THREE from 'three'

export function useLaserListener(channel, laserGroup, lasers) {
  // Use useMemo to create geometry and material only once
  const laserGeometry = useMemo(() => new THREE.BoxGeometry(0.2, 0.2, 0.8), [])
  const laserMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: 0x00ff00 }), [])

  useEffect(() => {
    channel.on('laser', (laserData) => {
      // Create a new laser with the received data
      const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial)
      laserMesh.position.fromArray(laserData.position)
      laserMesh.quaternion.fromArray(laserData.quaternion)

      // Add the laser to the scene and the state
      laserGroup.current.add(laserMesh)
      lasers.push(laserMesh)
      laserMesh.originalPosition = laserMesh.position.clone()
    })

    channel.on('removeLaser', (laserId) => {
      // Find the laser with the given id
      const laserToRemove = lasers.find((laser) => laser.id === laserId)

      if (laserToRemove) {
        // Remove the laser from the scene and the state
        laserGroup.current.remove(laserToRemove)
        const index = lasers.indexOf(laserToRemove)
        if (index !== -1) {
          lasers.splice(index, 1)
        }
      }
    })
  }, [channel, laserGroup, lasers, laserGeometry, laserMaterial]) // Add laserGeometry and laserMaterial to the dependency array
}
