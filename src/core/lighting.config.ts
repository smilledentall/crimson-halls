/**
 * Configuração central de iluminação e névoa.
 *
 * IMPORTANTE: o Three r155+ usa modelo de luz FÍSICO (intensidade em candela
 * com queda 1/distância²). Intensidades de PointLight/SpotLight precisam ser
 * altas (dezenas) — valores "~1" só funcionavam no modelo legado removido.
 * A luz ambiente, por outro lado, é um multiplicador direto: use uma COR
 * CLARA (quase branca) com intensidade moderada, senão o ambiente fica escuro
 * por mais que o intensity seja alto.
 *
 * Filosofia de iluminação: as tochas (cressets) são a FONTE DOMINANTE de luz
 * fixa. O ambiente global é mantido baixo de propósito, para que a área longe
 * de qualquer tocha fique visivelmente sombria (mas navegável). A lanterna do
 * jogador garante visibilidade mínima em qualquer ponto — é ela que permite
 * reduzir o ambiente sem deixar o jogo ilegível.
 */
export const LIGHTING_CONFIG = {
  // Cor clara é essencial — 0x4a3a52*0.85 dá só ~20% de luz efetiva.
  // Intensidade baixa: longe das tochas o corredor fica escuro, não "claro".
  // (0.2 é o piso seguro: escuro e atmosférico, mas ainda navegável.)
  ambientColor: 0xd8d0e0,
  ambientIntensity: 0.2,
  // Hemisfério: céu claro + chão avermelhado, intensidade reduzida para não
  // aplainar o contraste (a poça de luz das tochas precisa se destacar).
  hemisphereSky: 0xfff0e0,
  hemisphereGround: 0x30181f,
  hemisphereIntensity: 0.14,
  // Exposição do tone mapping (maior = mais claro). Mantida estável: subir
  // levanta também o ambiente escuro, anulando o contraste das tochas.
  exposure: 1.35,
  // Névoa: desligue (fogEnabled:false) para isolar problemas de luz.
  fogEnabled: true,
  fogColor: 0x221016,
  fogNear: 18,
  fogFar: 150,
  // ── CALIBRAÇÃO OFICIAL DA TOCHA (cresset 'X') ──────────────────────────
  // Estes valores são ÚNICOS e CENTRAIS — NÃO sobrescrever por tema/nível.
  // Qualquer cresset novo (campanha, secretos ou caminhos bifurcados) usa
  // automaticamente estes valores, sem recalibração individual. Se precisar
  // alterar o visual das tochas do jogo, mude SOMENTE aqui.
  torchColor: 0xff9a4a,
  // Intensidade (candela) reduzida: evita o estouro branco no ponto mais
  // próximo (parede a 0.5 m do cresset) e no teto acima, mantendo a poça
  // de luz perceptível sem saturar.
  torchIntensity: 12,
  // Alcance máximo da luz (m). Suficiente para uma poça ao redor da tocha.
  torchDistance: 28,
  // Decay (atenuação). < 2 (físico) deixa a propagação mais suave/distribuída:
  // reduz a dominância do ponto mais próximo (menos clarão) e espalha mais
  // luz para as paredes secundárias. 1.5 é o ponto de equilíbrio calibrado.
  torchDecay: 1.5,
  // Posição da chama VISUAL (a partícula de fogo nasce a 1.78 m).
  torchFlameHeight: 1.78,
  // Altura da ORIGEM DA LUZ (m): alinhada à altura da chama para que o
  // ponto mais brilhante coincida com o fogo visual, não flutuando acima.
  // Antes era 3.0 (efeito "lâmpada na parede"); agora igual a torchFlameHeight.
  torchLightHeight: 1.78,
  // Lanterna do jogador (SpotLight filho da câmera) — garante visibilidade
  // mínima em qualquer ponto do mapa, independente das tochas fixas.
  // Levemente reforçada, pois agora é a garantia de leitura em trechos escuros.
  flashlightColor: 0xffe6c0,
  flashlightIntensity: 100,
  flashlightDistance: 55,
  flashlightAngle: 0.6,
  flashlightPenumbra: 0.5,
} as const
