import * as THREE from 'three'
import {
  clonedCeilingTexture,
  clonedFloorTexture,
  clonedLavaTexture,
  clonedWallTexture,
} from './Textures'

/** Importa todas as texturas de imagem (o Vite resolve as URLs no build). */
const textureImports = import.meta.glob<string>('/src/assets/textures/*.jpeg', {
  eager: true,
  import: 'default',
})

export interface LevelTextures {
  wall: THREE.Texture
  floor: THREE.Texture
  ceiling: THREE.Texture
  /** True quando o chão do nível é lava (chão emissivo). */
  lavaFloor?: boolean
}

const textureCache = new Map<string, LevelTextures>()
const loader = new THREE.TextureLoader()

/** Resolve a URL da textura de um tipo/sufixo, ou null se a imagem não existe. */
function resolveTextureUrl(type: 'parede' | 'chao' | 'teto', suffix: string): string | null {
  const key = `/src/assets/textures/${type}-${suffix}.jpeg`
  return textureImports[key] ?? null
}

/**
 * Carrega e cacheia as texturas de imagem para um nível.
 * Se uma imagem falhar, usa a textura procedural como fallback.
 */
export async function getLevelTextures(levelId: string): Promise<LevelTextures> {
  if (textureCache.has(levelId)) {
    return textureCache.get(levelId)!
  }

  // Mapeamento de IDs de níveis para nomes de arquivos (caminhos A e B).
  const textureNames: Record<string, string> = {
    'level-1': '1',
    'level-2': '2',
    // O nível 3 principal não tem conjunto próprio de imagens; usa o da Cripta (A-3).
    'level-3': 'A-3',
    'level-3a-path': 'A-3',
    'level-3b-path': 'B-3',
    'level-4': '4',
    'level-5': '5',
    // Fases da expansão reutilizam os conjuntos existentes por variação.
    'level-6': '5',
    'level-7': 'A-3',
    'level-8': 'B-3',
    'level-9': '4',
    'level-10': '5',
    'level-11': 'A-3',
    'level-12': 'B-3',
    'level-13': '4',
    'level-14': '5',
    'level-15': 'A-3',
  }

  // Níveis com chão de lava (caldeiras): chão emissivo gerado proceduralmente.
  const lavaFloorLevels = new Set(['level-6'])

  let baseName = textureNames[levelId]
  if (!baseName) {
    // Para salas secretas e outros níveis sem textura própria, tenta
    // herdar do nível pai se for uma ramificação.
    if (levelId === 'level-1b-secret') baseName = textureNames['level-1']
    else if (levelId === 'level-2b-secret') baseName = textureNames['level-2']
    else if (levelId === 'level-3c-secret') baseName = textureNames['level-3']
    else if (levelId === 'level-4b-secret') baseName = textureNames['level-4']
    else if (levelId === 'level-5b-secret') baseName = textureNames['level-5']
  }

  const textures: Partial<LevelTextures> = {}

  const loadOrFallback = async (type: 'parede' | 'chao' | 'teto'): Promise<THREE.Texture> => {
    const url = baseName ? resolveTextureUrl(type, baseName) : null
    if (!url) {
      // Sem imagem própria: fallback procedural.
      return type === 'parede'
        ? clonedWallTexture(2, 2)
        : type === 'chao'
          ? clonedFloorTexture(2, 2)
          : clonedCeilingTexture(2, 2)
    }
    try {
      const loadedTexture = await loader.loadAsync(url)
      loadedTexture.colorSpace = THREE.SRGBColorSpace
      loadedTexture.wrapS = THREE.RepeatWrapping
      loadedTexture.wrapT = THREE.RepeatWrapping
      loadedTexture.repeat.set(1, 1)
      return loadedTexture
    } catch (error) {
      console.warn(`Erro ao carregar textura ${url}:`, error)
      return type === 'parede'
        ? clonedWallTexture(2, 2)
        : type === 'chao'
          ? clonedFloorTexture(2, 2)
          : clonedCeilingTexture(2, 2)
    }
  }

  const isLavaFloor = lavaFloorLevels.has(levelId)

  textures.wall = await loadOrFallback('parede')
  textures.floor = isLavaFloor ? clonedLavaTexture(1, 1) : await loadOrFallback('chao')
  textures.ceiling = await loadOrFallback('teto')
  if (isLavaFloor) textures.lavaFloor = true

  const finalTextures = textures as LevelTextures
  textureCache.set(levelId, finalTextures)
  return finalTextures
}