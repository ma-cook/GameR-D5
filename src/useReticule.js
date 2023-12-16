import { useEffect, useRef } from 'react'
import { SphereGeometry, MeshBasicMaterial, Mesh } from 'three'

export function useReticule(containerGroup) {
  const reticule = useRef()

  useEffect(() => {
    const geometry = new SphereGeometry(0.05, 16, 16)
    const material = new MeshBasicMaterial({ color: 0xff0000 })
    const mesh = new Mesh(geometry, material)
    reticule.current = mesh
    containerGroup.current.add(mesh)

    return () => {
      if (mesh !== null && containerGroup.current !== null) {
        containerGroup.current.remove(mesh)
      }
    }
  }, [containerGroup])

  return reticule
}
