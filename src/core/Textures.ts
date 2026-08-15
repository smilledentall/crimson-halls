import * as THREE from 'three'

/**
 * Texturas procedurais (geradas via canvas) para paredes, chão e teto.
 * Servem como fallback se as texturas de imagem falharem ao carregar.
 */

function createCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D indisponível')
  return [canvas, ctx]
}

/** Adiciona ruído leve (grão) para quebrar a uniformidade. */
function addNoise(ctx: CanvasRenderingContext2D, size: number, amount: number): void {
  const imageData = ctx.getImageData(0, 0, size, size)
  const data = imageData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * amount
    data[i] += n
    data[i + 1] += n
    data[i + 2] += n
  }
  ctx.putImageData(imageData, 0, 0)
}

function toTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  return texture
}

/** Paredes: tijolos vermelho-escuros com argamassa. */
function createWallTexture(): THREE.CanvasTexture {
  const size = 128
  const [, ctx] = createCanvas(size)
  const brickW = 32
  const brickH = 16
  const colors = ['#6a3a40', '#5a2f34', '#4a262b', '#743f45']

  ctx.fillStyle = '#3c1f24'
  ctx.fillRect(0, 0, size, size)

  const rows = Math.ceil(size / brickH)
  const cols = Math.ceil(size / brickW) + 1
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offset = (row % 2) * (brickW / 2)
      ctx.fillStyle = colors[(row + col) % colors.length]
      ctx.fillRect(col * brickW - offset, row * brickH, brickW - 2, brickH - 2)
    }
  }

  // Linhas de argamassa.
  ctx.strokeStyle = 'rgba(10, 4, 5, 0.6)'
  ctx.lineWidth = 1.5
  for (let y = 0; y <= size; y += brickH) {
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(size, y + 0.5)
    ctx.stroke()
  }
  for (let row = 0; row < rows; row++) {
    const y = row * brickH + brickH - 1
    const offset = (row % 2) * (brickW / 2)
    for (let col = -1; col < cols; col++) {
      const x = col * brickW - offset
      ctx.beginPath()
      ctx.moveTo(x + 0.5, y)
      ctx.lineTo(x + 0.5, y + 4)
      ctx.stroke()
    }
  }

  addNoise(ctx, size, 18)
  return toTexture(canvasFrom(ctx))
}

/** Chão: lajotas de pedra com rejunte e manchas. */
function createFloorTexture(): THREE.CanvasTexture {
  const size = 128
  const [, ctx] = createCanvas(size)
  const tile = 32
  const tones = ['#2a2020', '#241b1b', '#2f2424', '#1f1818']

  ctx.fillStyle = '#170f10'
  ctx.fillRect(0, 0, size, size)

  for (let r = 0; r < size / tile; r++) {
    for (let c = 0; c < size / tile; c++) {
      ctx.fillStyle = tones[(r + c) % tones.length]
      ctx.fillRect(c * tile, r * tile, tile - 1, tile - 1)
      // Mancha sutil em algumas lajotas.
      if ((r * 7 + c * 13) % 5 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.18)'
        ctx.fillRect(c * tile + 6, r * tile + 4, tile - 12, tile - 8)
      }
    }
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
  ctx.lineWidth = 1.5
  for (let i = 0; i <= size; i += tile) {
    ctx.beginPath()
    ctx.moveTo(i + 0.5, 0)
    ctx.lineTo(i + 0.5, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i + 0.5)
    ctx.lineTo(size, i + 0.5)
    ctx.stroke()
  }

  addNoise(ctx, size, 12)
  return toTexture(canvasFrom(ctx))
}

/** Teto: gesso escuro com fissuras. */
function createCeilingTexture(): THREE.CanvasTexture {
  const size = 128
  const [, ctx] = createCanvas(size)

  ctx.fillStyle = '#1c1214'
  ctx.fillRect(0, 0, size, size)

  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(0,0,0,${0.1 + Math.random() * 0.25})`
    ctx.lineWidth = 0.5 + Math.random()
    ctx.beginPath()
    const x = Math.random() * size
    const y = Math.random() * size
    ctx.moveTo(x, y)
    ctx.lineTo(x + (Math.random() - 0.5) * 40, y + (Math.random() - 0.5) * 40)
    ctx.stroke()
  }

  addNoise(ctx, size, 14)
  return toTexture(canvasFrom(ctx))
}

/** Lava: crosta escura rachada com magma incandescente (usada em caldeiras). */
function createLavaTexture(): THREE.CanvasTexture {
  const size = 256
  const [, ctx] = createCanvas(size)

  // Crosta basal escura.
  ctx.fillStyle = '#140b08'
  ctx.fillRect(0, 0, size, size)

  // Manchas de magma de fundo (radiais), espalhadas antes das rachaduras.
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 14 + Math.random() * 30
    const hue = 15 + Math.random() * 20 // 15 (laranja) a 35 (amarelo)
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, `hsla(${hue}, 95%, ${48 + Math.random() * 15}%, 0.55)`)
    grad.addColorStop(0.5, `hsla(${hue - 8}, 90%, 30%, 0.35)`)
    grad.addColorStop(1, 'rgba(20, 8, 4, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // Rede de rachaduras de magma: caminhos aleatórios grossos e brilhantes.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  for (let i = 0; i < 60; i++) {
    let x = Math.random() * size
    let y = Math.random() * size
    const steps = 4 + Math.floor(Math.random() * 6)
    const width = 1 + Math.random() * 3
    const glow = Math.random() * 0.7 + 0.3
    ctx.shadowBlur = 6 + Math.random() * 8
    ctx.shadowColor = 'rgba(255, 90, 10, 0.9)'
    ctx.strokeStyle = `hsla(${20 + Math.random() * 20}, 95%, ${40 + Math.random() * 40}%, ${glow})`
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x, y)
    for (let s = 0; s < steps; s++) {
      x += (Math.random() - 0.5) * 46
      y += (Math.random() - 0.5) * 46
      ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.shadowBlur = 0

  // Centros incandescentes amarelo-brancos sobre as rachaduras.
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * size
    const y = Math.random() * size
    const r = 2 + Math.random() * 5
    const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(255, 240, 190, 0.9)')
    grad.addColorStop(0.5, 'rgba(255, 150, 40, 0.6)')
    grad.addColorStop(1, 'rgba(255, 80, 0, 0)')
    ctx.fillStyle = grad
    ctx.fillRect(x - r, y - r, r * 2, r * 2)
  }

  addNoise(ctx, size, 16)
  return toTexture(canvasFrom(ctx))
}

function canvasFrom(ctx: CanvasRenderingContext2D): HTMLCanvasElement {
  return ctx.canvas
}

/**
 * Texturas base em cache (singleton). As texturas NÃO mudam entre níveis —
 * gerá-las de novo a cada buildLevel desperdiça tempo na main thread durante
 * a transição. Aqui elas são criadas uma única vez e clonadas por nível
 * (o clone compartilha a imagem; apenas o `repeat` muda).
 */
let cachedWall: THREE.CanvasTexture | null = null
let cachedFloor: THREE.CanvasTexture | null = null
let cachedCeiling: THREE.CanvasTexture | null = null
let cachedLava: THREE.CanvasTexture | null = null

export function getWallTexture(): THREE.CanvasTexture {
  if (!cachedWall) cachedWall = createWallTexture()
  return cachedWall
}

export function getFloorTexture(): THREE.CanvasTexture {
  if (!cachedFloor) cachedFloor = createFloorTexture()
  return cachedFloor
}

export function getCeilingTexture(): THREE.CanvasTexture {
  if (!cachedCeiling) cachedCeiling = createCeilingTexture()
  return cachedCeiling
}

/** Versão clonada com repeat próprio (para não alterar a textura compartilhada). */
export function clonedWallTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const texture = getWallTexture().clone()
  texture.repeat.set(repeatX, repeatY)
  return texture
}

export function clonedFloorTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const texture = getFloorTexture().clone()
  texture.repeat.set(repeatX, repeatY)
  return texture
}

export function clonedCeilingTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const texture = getCeilingTexture().clone()
  texture.repeat.set(repeatX, repeatY)
  return texture
}

export function getLavaTexture(): THREE.CanvasTexture {
  if (!cachedLava) cachedLava = createLavaTexture()
  return cachedLava
}

/** Versão clonada com repeat próprio (para não alterar a textura compartilhada). */
export function clonedLavaTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const texture = getLavaTexture().clone()
  texture.repeat.set(repeatX, repeatY)
  return texture
}
