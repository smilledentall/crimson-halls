/**
 * Configuração central de iluminação e névoa.
 *
 * IMPORTANTE: o Three r155+ usa modelo de luz FÍSICO (intensidade em candela
 * com queda 1/distância²). Intensidades de PointLight/SpotLight precisam ser
 * altas (dezenas) — valores "~1" só funcionavam no modelo legado removido.
 * A luz ambiente, por outro lado, é um multiplicador direto: use uma COR
 * CLARA (quase branca) com intensidade moderada, senão o ambiente fica escuro
 * por mais que o intensity seja alto.
 */
export const LIGHTING_CONFIG = {
  // Cor clara é essencial — 0x4a3a52*0.85 dá só ~20% de luz efetiva.
  ambientColor: 0xd8d0e0,
  ambientIntensity: 0.75,
  // Hemisfério: céu claro + chão avermelhado.
  hemisphereSky: 0xfff0e0,
  hemisphereGround: 0x30181f,
  hemisphereIntensity: 0.65,
  // Exposição do tone mapping (maior = mais claro).
  exposure: 1.35,
  // Névoa: desligue (fogEnabled:false) para isolar problemas de luz.
  fogEnabled: true,
  fogColor: 0x221016,
  fogNear: 18,
  fogFar: 150,
  // Tochas (luzes pontuais marcadas com 'F' no grid). Em candela.
  torchColor: 0xff9a4a,
  torchIntensity: 55,
  torchDistance: 34,
  torchHeight: 1.9,
  // Lanterna do jogador (SpotLight filho da câmera) — garante visibilidade
  // mínima em qualquer ponto do mapa, independente das tochas fixas.
  flashlightColor: 0xffe6c0,
  flashlightIntensity: 85,
  flashlightDistance: 48,
  flashlightAngle: 0.6,
  flashlightPenumbra: 0.5,
} as const
