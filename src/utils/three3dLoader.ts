import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'

interface LoadedAssets {
  model: THREE.Group
  normalMap: THREE.Texture
}

let loadPromise: Promise<LoadedAssets> | null = null

export function load3dAssets(): Promise<LoadedAssets> {
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const textureLoader = new THREE.TextureLoader()
    const objLoader = new OBJLoader()

    const normalMapPromise = new Promise<THREE.Texture>((res, rej) => {
      textureLoader.load(
        '/arrow_texture_normal.png',
        (texture) => {
          texture.wrapS = THREE.RepeatWrapping
          texture.wrapT = THREE.RepeatWrapping
          res(texture)
        },
        undefined,
        (err) => rej(new Error('Error al cargar la textura de normales: ' + err))
      )
    })

    const modelPromise = new Promise<THREE.Group>((res, rej) => {
      objLoader.load(
        '/arrow_model.obj',
        (obj) => {
          res(obj)
        },
        undefined,
        (err) => rej(new Error('Error al cargar el modelo OBJ: ' + err))
      )
    })

    Promise.all([modelPromise, normalMapPromise])
      .then(([model, normalMap]) => {
        resolve({ model, normalMap })
      })
      .catch((err) => {
        loadPromise = null
        reject(err)
      })
  })

  return loadPromise
}
