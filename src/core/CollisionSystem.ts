/**
 * Colisão AABB no plano XZ (o jogador é tratado como um círculo).
 * As paredes vêm do LevelLoader e ficam centralizadas aqui,
 * para que a física não dependa de Three.js.
 */

export interface WallAABB {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

const EPSILON = 0.001

export class CollisionSystem {
  private walls: WallAABB[] = []

  setWalls(walls: WallAABB[]): void {
    this.walls = walls
  }

  getWalls(): WallAABB[] {
    return this.walls
  }

  /** Testa se um círculo em (x, z) com raio colide com alguma parede. */
  isBlocked(x: number, z: number, radius: number): boolean {
    for (const wall of this.walls) {
      if (this.circleIntersectsAABB(x, z, radius, wall)) return true
    }
    return false
  }

  /** True se o segmento (x0,z0)-(x1,z1) não atravessa nenhuma parede. */
  hasClearLine(x0: number, z0: number, x1: number, z1: number): boolean {
    const dx = x1 - x0
    const dz = z1 - z0
    for (const wall of this.walls) {
      if (this.segmentIntersectsAABB(x0, z0, dx, dz, wall)) return false
    }
    return true
  }

  private segmentIntersectsAABB(
    x0: number,
    z0: number,
    dx: number,
    dz: number,
    wall: WallAABB,
  ): boolean {
    let tmin = 0.001
    let tmax = 1 - 0.001

    // Slab method em 2D (paramétrico t em [0,1]): interseção segmento x AABB.
    if (Math.abs(dx) < 1e-9) {
      if (x0 < wall.minX || x0 > wall.maxX) return false
    } else {
      let t1 = (wall.minX - x0) / dx
      let t2 = (wall.maxX - x0) / dx
      if (t1 > t2) {
        const tmp = t1
        t1 = t2
        t2 = tmp
      }
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return false
    }

    if (Math.abs(dz) < 1e-9) {
      if (z0 < wall.minZ || z0 > wall.maxZ) return false
    } else {
      let t1 = (wall.minZ - z0) / dz
      let t2 = (wall.maxZ - z0) / dz
      if (t1 > t2) {
        const tmp = t1
        t1 = t2
        t2 = tmp
      }
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
    }

    return tmin <= tmax
  }

  /**
   * Move um eixo por vez (X depois Z) e, ao colidir, desliza pela face
   * da parede em vez de parar seco — dá o movimento "colado" de FPS clássico.
   * Ao final, garante que a posição nunca termine dentro de uma parede.
   */
  resolvePosition(
    pos: { x: number; z: number },
    delta: { x: number; z: number },
    radius: number,
  ): { x: number; z: number } {
    // Eixo X: `from` é a coordenada X, `fixed` é a Z.
    const candidateX = pos.x + delta.x
    const blockedX = delta.x !== 0 && this.isBlocked(candidateX, pos.z, radius)
    const x = blockedX
      ? this.clampAgainstWalls(pos.x, pos.z, 'x', Math.sign(delta.x), radius, Math.abs(delta.x))
      : candidateX

    // Eixo Z: `from` é a coordenada Z, `fixed` é a X já resolvida.
    const candidateZ = pos.z + delta.z
    const blockedZ = delta.z !== 0 && this.isBlocked(x, candidateZ, radius)
    const z = blockedZ
      ? this.clampAgainstWalls(pos.z, x, 'z', Math.sign(delta.z), radius, Math.abs(delta.z))
      : candidateZ

    // Rede de segurança: se a diagonal ficou dentro de uma parede (ex.: corte
    // de quina), reverte os eixos — o jogador nunca atravessa para o outro lado.
    if (this.isBlocked(x, z, radius)) {
      let safeX = x
      let safeZ = z
      if (this.isBlocked(x, pos.z, radius)) safeX = pos.x
      if (this.isBlocked(pos.x, z, radius)) safeZ = pos.z
      if (this.isBlocked(safeX, safeZ, radius)) return { x: pos.x, z: pos.z }
      return { x: safeX, z: safeZ }
    }

    return { x, z }
  }

  private clampAgainstWalls(
    from: number,
    fixed: number,
    axis: 'x' | 'z',
    direction: number,
    radius: number,
    travel: number,
  ): number {
    // Ponto de parada mais próximo: para movimento positivo, a menor face
    // "à frente" (face - raio); para negativo, a maior face "atrás" (face + raio).
    let stop = direction > 0 ? Infinity : -Infinity
    for (const wall of this.walls) {
      if (axis === 'x') {
        const nearFace = direction > 0 ? wall.minX : wall.maxX
        const inReach =
          direction > 0
            ? from < nearFace && nearFace - from < travel + radius
            : from > nearFace && from - nearFace < travel + radius
        if (!inReach) continue
        if (!(fixed + radius > wall.minZ && fixed - radius < wall.maxZ)) continue
        stop =
          direction > 0
            ? Math.min(stop, nearFace - radius - EPSILON)
            : Math.max(stop, nearFace + radius + EPSILON)
      } else {
        const nearFace = direction > 0 ? wall.minZ : wall.maxZ
        const inReach =
          direction > 0
            ? from < nearFace && nearFace - from < travel + radius
            : from > nearFace && from - nearFace < travel + radius
        if (!inReach) continue
        if (!(fixed + radius > wall.minX && fixed - radius < wall.maxX)) continue
        stop =
          direction > 0
            ? Math.min(stop, nearFace - radius - EPSILON)
            : Math.max(stop, nearFace + radius + EPSILON)
      }
    }
    // Nunca anda para trás: mantém no mínimo `from` (movimento +) ou no máximo `from`.
    return direction > 0 ? Math.max(from, stop) : Math.min(from, stop)
  }

  private circleIntersectsAABB(cx: number, cz: number, radius: number, wall: WallAABB): boolean {
    const closestX = clamp(cx, wall.minX, wall.maxX)
    const closestZ = clamp(cz, wall.minZ, wall.maxZ)
    const dx = cx - closestX
    const dz = cz - closestZ
    return dx * dx + dz * dz <= radius * radius
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
