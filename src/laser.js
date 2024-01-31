import * as THREE from 'three'

export function createLaser(secondGroup, laserGroup, lasers, channel, geckosClient) {
  // Create the laser data
  if (secondGroup.current) {
    const laserData = {
      id: geckosClient.current.id,
      position: [secondGroup.current.position.x, secondGroup.current.position.y + 1, secondGroup.current.position.z],
      quaternion: secondGroup.current.quaternion.toArray()
    }
    channel.emit('laser', laserData)
  }

  // Emit the laser data
}
