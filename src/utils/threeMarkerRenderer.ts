import * as THREE from 'three'
import { load3dAssets } from './three3dLoader'

export class ThreeMarkerRenderer {
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private model: THREE.Group | null = null
  private baseMesh: THREE.Mesh | null = null
  private markerGroup: THREE.Group | null = null
  // Caché para evitar redibujados innecesarios y subidas de textura redundantes a la GPU
  private lastBattery = -1
  private lastSelected = false

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.init()
  }

  private drawBaseTexture(battery: number, isSelected: boolean) {
    const roundedBattery = Math.round(battery)
    if (this.lastBattery === roundedBattery && this.lastSelected === isSelected) {
      return // Evitar procesamiento si el estado no cambió
    }
    this.lastBattery = roundedBattery
    this.lastSelected = isSelected

    if (!this.textureCanvas) return
    const ctx = this.textureCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 256, 256)

    const radius = 98

    // 1. Círculo interior oscuro
    ctx.beginPath()
    ctx.arc(128, 128, radius, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.fill()

    // 2. Borde del círculo único (borde base)
    ctx.lineWidth = 14
    ctx.strokeStyle = isSelected ? '#22d3ee' : 'rgba(165, 243, 252, 0.2)'
    ctx.stroke()

    // 3. Anillo dinámico de batería integrado en la misma franja
    const clampedBattery = Math.max(0, Math.min(100, battery))
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (clampedBattery / 100) * 2 * Math.PI
    
    ctx.beginPath()
    ctx.arc(128, 128, radius, startAngle, endAngle)
    ctx.lineWidth = 14
    ctx.lineCap = 'round'

    let strokeColor = '#10B981' // Verde (>50%)
    if (clampedBattery <= 20) {
      strokeColor = '#EF4444' // Rojo (<20%)
    } else if (clampedBattery <= 50) {
      strokeColor = '#F59E0B' // Naranja (20% - 50%)
    }
    ctx.strokeStyle = strokeColor
    ctx.stroke()

    if (this.baseTexture) {
      this.baseTexture.needsUpdate = true
    }
  }

  private async init() {
    try {
      const assets = await load3dAssets()
      if (this.isDestroyed) return

      const size = this.canvas.width || 120

      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true,
        antialias: true, // Habilitar antialiasing para que los bordes se vean lisos y suaves
        powerPreference: 'high-performance',
        precision: 'mediump'
      })
      this.renderer.setSize(size, size, false)
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2.0)) // Escalar dinámicamente limitando el máximo para balancear nitidez y rendimiento
      this.renderer.setClearColor(0x000000, 0)

      this.scene = new THREE.Scene()

      // Cámara cenital fija mirando al centro
      this.camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
      this.camera.position.set(0, 0, 4)
      this.camera.lookAt(0, 0, 0)

      // Iluminación
      const ambient = new THREE.AmbientLight(0xffffff, 0.8)
      this.scene.add(ambient)

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
      keyLight.position.set(2, 3, 5)
      this.scene.add(keyLight)

      const fillLight = new THREE.DirectionalLight(0x88aaff, 0.4)
      fillLight.position.set(-2, -3, 2)
      this.scene.add(fillLight)

      // Grupo para el marcador completo
      this.markerGroup = new THREE.Group()
      this.scene.add(this.markerGroup)

      // Crear el canvas de textura 2D para la base
      this.textureCanvas = document.createElement('canvas')
      this.textureCanvas.width = 256
      this.textureCanvas.height = 256
      this.baseTexture = new THREE.CanvasTexture(this.textureCanvas)
      this.baseTexture.colorSpace = THREE.SRGBColorSpace

      this.drawBaseTexture(100, false)

      // Mesh plano para el círculo y el anillo de batería
      const baseGeo = new THREE.PlaneGeometry(3.8, 3.8)
      const baseMat = new THREE.MeshBasicMaterial({
        map: this.baseTexture,
        transparent: true,
        depthWrite: false
      })
      this.baseMesh = new THREE.Mesh(baseGeo, baseMat)
      // Posición en Z ligeramente detrás para evitar z-fighting con el modelo
      this.baseMesh.position.z = -0.05
      this.markerGroup.add(this.baseMesh)

      // Preparar el modelo 3D
      this.model = assets.model.clone()
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.center()
          child.material = new THREE.MeshPhongMaterial({
            color: 0x0088ff,
            normalMap: assets.normalMap,
            normalScale: new THREE.Vector2(2.5, 2.5),
            shininess: 90,
            specular: new THREE.Color(0xaaccff)
          })
        }
      })

      // Calcular escala de la flecha
      const box = new THREE.Box3().setFromObject(this.model)
      const size3d = new THREE.Vector3()
      box.getSize(size3d)
      const maxDim = Math.max(size3d.x, size3d.y, size3d.z)
      this.baseScale = 1.4 / maxDim

      // Aplicar escala 3D a la flecha, extruyéndola en Z para que tenga volumen
      this.model.scale.set(this.baseScale, this.baseScale, this.baseScale * 3.5)
      this.model.position.set(0, 0, 0.05)
      this.markerGroup.add(this.model)

      this.render()
    } catch (err) {
      console.error('Error al inicializar ThreeMarkerRenderer:', err)
    }
  }

  // Actualiza rumbo, selección, batería e inclinación 3D del mapa
  public update(course: number, isSelected: boolean, mapTilt = 0, battery = 100) {
    // 1. Actualizar textura de base
    this.drawBaseTexture(battery, isSelected)

    // 2. Rotar la flecha según el rumbo
    if (this.model) {
      this.model.rotation.z = -THREE.MathUtils.degToRad(course)
      
      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshPhongMaterial
          if (mat) mat.color.setHex(isSelected ? 0x22d3ee : 0x0088ff)
        }
      })

      const relScale = isSelected ? 1.2 : 1.0
      this.model.scale.set(
        this.baseScale * relScale,
        this.baseScale * relScale,
        this.baseScale * relScale * 3.5
      )
    }

    // 3. Inclinar el grupo completo en X para acostarlo sobre la calle en perspectiva
    if (this.markerGroup) {
      this.markerGroup.rotation.x = -THREE.MathUtils.degToRad(mapTilt)
    }

    this.render()
  }

  private render() {
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera)
    }
  }

  public destroy() {
    this.isDestroyed = true
    if (this.renderer) {
      this.renderer.dispose()
    }
    if (this.baseTexture) {
      this.baseTexture.dispose()
    }

    // Liberar en profundidad la memoria GPU de los meshes, geometrías y materiales
    if (this.scene) {
      this.scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose()
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose())
            } else {
              object.material.dispose()
            }
          }
        }
      })
    }

    this.scene = null
    this.camera = null
    this.model = null
    this.baseMesh = null
    this.markerGroup = null
    this.textureCanvas = null
  }
}

