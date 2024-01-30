import * as THREE from 'three'

export function createLaser(secondGroup, laserGroup, lasers, channel, geckosClient) {
  // Create the laser data
  const laserData = {
    id: geckosClient.current.id,
    position: [secondGroup.current.position.x, secondGroup.current.position.y + 1, secondGroup.current.position.z],
    quaternion: secondGroup.current.quaternion.toArray()
  }

  // Emit the laser data
  channel.emit('laser', laserData)
}
