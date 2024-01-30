import { Vector3 } from 'three'
import { createLaser } from './laser'

export const shootLasers = (secondGroup, laserGroup, lasers, channel, geckosClient) => {
  createLaser(secondGroup, laserGroup, lasers, channel, geckosClient)
}

export const updateLasersPosition = (lasers, group, laserGroup, delta, channel) => {
  ;[...lasers].forEach((laser) => {
    // Create a copy of the lasers array
    const laserDirection = new Vector3(0, 0, -1).applyQuaternion(laser.quaternion)
    laser.position.add(laserDirection.clone().multiplyScalar(100 * delta))
  })
}
