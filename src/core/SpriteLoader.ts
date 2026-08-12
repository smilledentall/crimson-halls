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
}

const GREEN_KEY_THRESHOLD = 28
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

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const maxRB = Math.max(r, b)
    const greenDominance = g - maxRB

    if (greenDominance > GREEN_KEY_THRESHOLD && g >= GREEN_MIN) {
      // Fundo verde sólido → transparente.
      data[i + 3] = 0
    } else if (greenDominance > FRINGE_THRESHOLD) {
      // Franja parcial (borda do personagem): remove o excesso de verde.
      data[i + 1] = maxRB
    }
  }

  context.putImageData(imageData, 0, 0)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return { texture, aspect: width / height }
}
