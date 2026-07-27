import * as THREE from 'three'
import { load3dAssets } from './three3dLoader'

/**
 * threeMarkerRenderer.ts
 * ─────────────────────────────────────────────────────────────
 * Render de marcadores 3D con UN SOLO contexto WebGL compartido.
 *
 * PROBLEMA que resuelve:
 *   Antes, cada marcador creaba su propio THREE.WebGLRenderer
 *   (1 contexto WebGL por dispositivo). Chrome solo mantiene
 *   ~16 contextos WebGL activos; al superarlos destruye los más
 *   antiguos, lo que provocaba marcadores en blanco, parpadeos
 *   y un arranque muy lento (crear un contexto cuesta ~10-30ms
 *   en el hilo principal, multiplicado por cada marcador).
 *
 * SOLUCIÓN:
 *   Un único WebGLRenderer offscreen compartido (singleton).
 *   Cada marcador conserva su propio grafo de objetos (modelo,
 *   textura de batería) y, al actualizarse, monta su grupo en la
 *   escena compartida, renderiza y copia el resultado a su
 *   canvas 2D visible con drawImage(). La API pública se mantiene
 *   idéntica: constructor(canvas) / update(...) / destroy().
 * ─────────────────────────────────────────────────────────────
 */

// Tamaño del buffer compartido: 112px CSS * 2 (DPR máx soportado)
const SHARED_SIZE = 224

interface SharedEngine {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
}

let sharedEngine: SharedEngine | null = null

function getSharedEngine(): SharedEngine {
  if (sharedEngine) return sharedEngine

  const canvas = document.createElement('canvas')
  canvas.width = SHARED_SIZE
  canvas.height = SHARED_SIZE

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true, // Habilitar antialiasing para que los bordes se vean lisos y suaves
    powerPreference: 'high-performance',
    precision: 'mediump'
  })
  renderer.setSize(SHARED_SIZE, SHARED_SIZE, false)
  renderer.setPixelRatio(1)
  renderer.setClearColor(0x000000, 0)

  const scene = new THREE.Scene()

  // Cámara cenital fija mirando al centro
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100)
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  // Iluminación (luces neutras para evitar tintes o reflejos azules indeseados)
  const ambient = new THREE.AmbientLight(0xffffff, 0.9)
  scene.add(ambient)

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.6)
  keyLight.position.set(2, 3, 5)
  scene.add(keyLight)

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.3)
  fillLight.position.set(-2, -3, 2)
  scene.add(fillLight)

  sharedEngine = { renderer, scene, camera }
  return sharedEngine
}

export class ThreeMarkerRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D | null = null
  private model: THREE.Group | null = null
  private baseMesh: THREE.Mesh | null = null
  private markerGroup: THREE.Group | null = null
  private textureCanvas: HTMLCanvasElement | null = null
  private baseTexture: THREE.CanvasTexture | null = null
  private baseScale = 1.0
  private isDestroyed = false
  // Caché para evitar redibujados innecesarios y subidas de textura redundantes a la GPU
  private lastBattery = -1
  private lastSelected = false
  private lastCourse = 0
  private lastTilt = 0
  private lastCustomColorHex?: number
  private lastShowBatteryRing = true

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas

    // El canvas pasa a ser un destino 2D: ajustar su resolución interna
    // al DPR para mantener la misma nitidez que daba el renderer WebGL directo
    const dpr = Math.min(window.devicePixelRatio || 1, 2.0)
    const cssSize = canvas.width || 120
    canvas.width = Math.round(cssSize * dpr)
    canvas.height = Math.round(cssSize * dpr)
    this.ctx = canvas.getContext('2d')

    // Crear el canvas de textura 2D e inicializar la textura inmediatamente (sincrónico)
    this.textureCanvas = document.createElement('canvas')
    this.textureCanvas.width = 256
    this.textureCanvas.height = 256
    this.baseTexture = new THREE.CanvasTexture(this.textureCanvas)
    this.baseTexture.colorSpace = THREE.SRGBColorSpace

    this.init()
  }

  private drawBaseTexture(battery: number, isSelected: boolean, showBatteryRing = true) {
    const roundedBattery = Math.round(battery)
    if (this.lastBattery === roundedBattery && this.lastSelected === isSelected && this.lastShowBatteryRing === showBatteryRing) {
      return // Evitar procesamiento si el estado no cambió
    }
    this.lastBattery = roundedBattery
    this.lastSelected = isSelected
    this.lastShowBatteryRing = showBatteryRing

    if (!this.textureCanvas) return
    const ctx = this.textureCanvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, 256, 256)

    // Si se indica no mostrar el anillo de batería (modo Escolta), no dibujar nada en el canvas
    if (!showBatteryRing) {
      if (this.baseTexture) this.baseTexture.needsUpdate = true
      return
    }

    const radius = 98

    // 1. Círculo interior oscuro
    ctx.beginPath()
    ctx.arc(128, 128, radius, 0, 2 * Math.PI)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)'
    ctx.fill()

    // 2. Borde del círculo único (borde base para Hardware)
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

    // 4. Marcador de origen de batería (Muesca de precisión UI refinada)
    // Línea radial de inicio (corte pulido a 12 en punto)
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(128, 128 - (radius - 12))
    ctx.lineTo(128, 128 - (radius + 12))
    ctx.lineWidth = 3
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()

    // Micro-nodo central incrustado perfectamente en el canal del anillo
    ctx.beginPath()
    ctx.arc(128, 128 - radius, 4, 0, 2 * Math.PI)
    ctx.fillStyle = '#ffffff'
    ctx.fill()
    ctx.restore()

    if (this.baseTexture) {
      this.baseTexture.needsUpdate = true
    }
  }

  private async init() {
    try {
      const assets = await load3dAssets()
      if (this.isDestroyed) return

      // Grupo para el marcador completo (se monta en la escena compartida solo al renderizar)
      this.markerGroup = new THREE.Group()

      // Dibujar textura de base inmediatamente con los últimos datos guardados (respetando showBatteryRing)
      this.drawBaseTexture(this.lastBattery !== -1 ? this.lastBattery : 100, this.lastSelected, this.lastShowBatteryRing)

      // Mesh plano para el círculo y el anillo de batería
      const baseGeo = new THREE.PlaneGeometry(3.8, 3.8)
      const baseMat = new THREE.MeshBasicMaterial({
        map: this.baseTexture!,
        transparent: true,
        depthWrite: false
      })
      this.baseMesh = new THREE.Mesh(baseGeo, baseMat)
      // Posición en Z ligeramente detrás para evitar z-fighting con el modelo
      this.baseMesh.position.z = -0.05
      // Ocultar el disco de base si es un marcador de escolta (sin anillo de batería)
      this.baseMesh.visible = this.lastShowBatteryRing
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
            shininess: 40,
            specular: new THREE.Color(0xffffff)
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

      // Dibujar y actualizar de inmediato con los datos actuales acumulados
      this.update(
        this.lastCourse,
        this.lastSelected,
        this.lastTilt,
        this.lastBattery !== -1 ? this.lastBattery : 100,
        this.lastCustomColorHex,
        this.lastShowBatteryRing
      )
    } catch (err) {
      console.error('Error al inicializar ThreeMarkerRenderer:', err)
    }
  }

  // Actualiza rumbo, selección, batería e inclinación 3D del mapa
  public update(course: number, isSelected: boolean, mapTilt = 0, battery = 100, customColorHex?: number, showBatteryRing = true) {
    this.lastCourse = course
    this.lastTilt = mapTilt
    this.lastCustomColorHex = customColorHex
    this.lastShowBatteryRing = showBatteryRing

    // 1. Actualizar textura de base y visibilidad del disco circular
    this.drawBaseTexture(battery, isSelected, showBatteryRing)
    if (this.baseMesh) {
      this.baseMesh.visible = showBatteryRing
    }

    // 2. Rotar la flecha según el rumbo
    if (this.model) {
      this.model.rotation.z = -THREE.MathUtils.degToRad(course)

      const arrowColor = customColorHex !== undefined
        ? customColorHex
        : (isSelected ? 0x22d3ee : 0x0088ff)

      this.model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material as THREE.MeshPhongMaterial
          if (mat) mat.color.setHex(arrowColor)
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
    if (!this.markerGroup || !this.ctx || this.isDestroyed) return
    try {
      const engine = getSharedEngine()
      engine.scene.add(this.markerGroup)
      engine.renderer.render(engine.scene, engine.camera)
      // Copiar el frame renderizado al canvas 2D visible del marcador
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.ctx.drawImage(engine.renderer.domElement, 0, 0, this.canvas.width, this.canvas.height)
      engine.scene.remove(this.markerGroup)
    } catch (err) {
      // Si WebGL no está disponible, el marcador simplemente queda sin flecha 3D
      console.error('Error al renderizar marcador 3D:', err)
    }
  }

  public destroy() {
    this.isDestroyed = true
    if (this.baseTexture) {
      this.baseTexture.dispose()
      this.baseTexture = null
    }

    // Liberar la geometría y material propios del disco de base
    if (this.baseMesh) {
      if (this.baseMesh.geometry) this.baseMesh.geometry.dispose()
      const baseMat = this.baseMesh.material as THREE.Material | THREE.Material[]
      if (Array.isArray(baseMat)) {
        baseMat.forEach((mat) => mat.dispose())
      } else if (baseMat) {
        baseMat.dispose()
      }
    }

    // Liberar SOLO los materiales del modelo clonado.
    // La geometría y la normalMap pertenecen al asset global compartido
    // (load3dAssets) y NO deben disponerse aquí.
    if (this.model) {
      this.model.traverse((object) => {
        if (object instanceof THREE.Mesh && object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((mat) => mat.dispose())
          } else {
            object.material.dispose()
          }
        }
      })
    }

    this.ctx = null
    this.model = null
    this.baseMesh = null
    this.markerGroup = null
    this.textureCanvas = null
  }
}
