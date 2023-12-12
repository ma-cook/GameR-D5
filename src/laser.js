import * as THREE from 'three'

export function createLaser(secondGroup, laserGroup, lasers, socket, socketClient) {
  // Create lasers and set their positions
  const laserGeometry = new THREE.BoxGeometry(0.05, 0.05, 0.2)
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
