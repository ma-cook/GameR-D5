import * as THREE from 'three'

export function createLaser(secondGroup, laserGroup, lasers, channel, geckosClient) {
  // Create the laser data
  if (secondGroup.current) {
    const laserData = {
      id: geckosClient.current.id,
      position: [secondGroup.current.position.x, secondGroup.current.position.y + 1, secondGroup.current.position.z],
      quaternion: secondGroup.current.quaternion.toArray()
    }

    // Convert the laser data to a Uint8Array
    const encoder = new TextEncoder()
    const uint8Array = encoder.encode(JSON.stringify(laserData))

    // Emit the laser data as binary
    channel.emit('laser', uint8Array)
  }
}
