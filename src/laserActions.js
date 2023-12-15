import { Vector3 } from 'three'
import { createLaser } from './laser'

export const shootLasers = (secondGroup, laserGroup, lasers, socket, socketClient) => {
  createLaser(secondGroup, laserGroup, lasers, socket, socketClient)
}

export const updateLasersPosition = (lasers, group, laserGroup, delta) => {
  lasers.forEach((laser) => {
    const laserDirection = new Vector3(0, 0, -1).applyQuaternion(laser.quaternion)
    laser.position.add(laserDirection.clone().multiplyScalar(100 * delta))

    if (laser.position.distanceTo(group.current.position) > 100) {
      laserGroup.current.remove(laser)
      lasers.splice(lasers.indexOf(laser), 1)
    }
  })
}
