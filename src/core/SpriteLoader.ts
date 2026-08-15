import * as THREE from 'three'

/**
 * Carrega sprites dos inimigos, remove o fundo verde (chroma key) e cacheia.
 * Como as imagens são JPEG (sem alfa), também faz "despill": pixels de borda
 * com contaminação parcial de verde (franja típica de compressão JPEG) têm o
 * excesso de verde removido, evitando halo verde ao redor das criaturas.
 */

export interface SpriteEntry {
  texture: THREE.CanvasTexture
  /** Largura / altura em pixels da imagem original. */
  aspect: number
  /** Caixa do conteúdo (pixels não-croma-key), em pixels da imagem original. */
  contentBounds: { minX: number; minY: number; maxX: number; maxY: number } | null
}

const GREEN_KEY_THRESHOLD = 22
const GREEN_MIN = 50
const FRINGE_THRESHOLD = 6

const cache = new Map<string, SpriteEntry>()

/** Pré-carrega os sprites (chamado uma vez na inicialização da engine). */
export async function preloadEnemySprites(urls: string[]): Promise<void> {
  const missing = urls.filter(url => !cache.has(url))
  await Promise.all(
    missing.map(url =>
      loadSprite(url)
        .then(entry => cache.set(url, entry))
        .catch(() => {
          // imagem ausente/erro — mantém sem sprite (placeholder)
        }),
    ),
  )
}

/** Retorna o sprite em cache (nulo se ainda não carregou / indisponível). */
export function getSpriteEntry(url: string | undefined): SpriteEntry | null {
  if (!url) return null
  return cache.get(url) ?? null
}

/** Carrega (se preciso) e retorna o sprite, sem depender do pré-carregamento. */
export async function getSpriteEntryAsync(url: string | undefined): Promise<SpriteEntry | null> {
  if (!url) return null
  const cached = cache.get(url)
  if (cached) return cached
  try {
    const entry = await loadSprite(url)
    cache.set(url, entry)
    return entry
  } catch {
    return null
  }
}

/** Recorta a textura para a caixa do conteúdo (remove margens transparentes). */
export function getCroppedTexture(entry: SpriteEntry): THREE.CanvasTexture | null {
  const bounds = entry.contentBounds
  if (!bounds) return null
  const source = entry.texture.image as HTMLCanvasElement
  const cropW = bounds.maxX - bounds.minX + 1
  const cropH = bounds.maxY - bounds.minY + 1
  if (cropW <= 0 || cropH <= 0) return null
  const canvas = document.createElement('canvas')
  canvas.width = cropW
  canvas.height = cropH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(source, bounds.minX, bounds.minY, cropW, cropH, 0, 0, cropW, cropH)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

async function loadSprite(url: string): Promise<SpriteEntry> {
  const image = new Image()
  image.src = url
  if (typeof image.decode === 'function') {
    try {
      await image.decode()
    } catch {
      // cai no onload abaixo
    }
  }
  if (!(image.naturalWidth > 0 || image.width > 0)) {
    await new Promise<void>(resolve => {
      image.onload = () => resolve()
      image.onerror = () => resolve()
    })
  }

  const width = image.naturalWidth || image.width || 1
  const height = image.naturalHeight || image.height || 1
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas 2D indisponível')

  context.drawImage(image, 0, 0)
  const imageData = context.getImageData(0, 0, width, height)
  const data = imageData.data

  let minX = width
  let minY = height
  let maxX = -1
  let maxY = -1

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const maxRB = Math.max(r, b)
    const greenDominance = g - maxRB

    if (greenDominance > GREEN_KEY_THRESHOLD && g >= GREEN_MIN) {
      // Fundo verde sólido → transparente.
      data[i + 3] = 0
    } else {
      if (greenDominance > FRINGE_THRESHOLD) {
        // Franja parcial (borda do personagem): remove o excesso de verde.
        data[i + 1] = maxRB
      }
      const x = (i / 4) % width
      const y = Math.floor(i / 4 / width)
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
    }
  }

  context.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const contentBounds =
    maxX >= minX && maxY >= minY ? { minX, minY, maxX, maxY } : null
  return { texture, aspect: width / height, contentBounds }
}
