import { useEffect } from 'react'
import * as THREE from 'three'

export function createReticule(reticuleGroup) {
  useEffect(() => {
    const reticuleGeometry = new THREE.RingGeometry(0.02, 0.03, 32)
    const reticuleMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide })
    const reticuleMesh = new THREE.Mesh(reticuleGeometry, reticuleMaterial)
    reticuleMesh.position.z = -2
    reticuleGroup.current.add(reticuleMesh)
  }, [reticuleGroup])
}

export function updateReticule(reticuleGroup, secondGroup) {
  reticuleGroup.current.position.x = secondGroup.current.position.x
  reticuleGroup.current.position.y = secondGroup.current.position.y
  reticuleGroup.current.position.z = secondGroup.current.position.z
  reticuleGroup.current.quaternion.copy(secondGroup.current.quaternion)
}
