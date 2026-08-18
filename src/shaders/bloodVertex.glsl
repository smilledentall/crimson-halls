// Vertex shader das partículas de sangue com SIMULAÇÃO NA GPU:
// integra posição/gravidade e encosta as gotas no chão (FLOOR_Y), onde elas
// "empocam": param de cair, desvanecem devagar e arrastam um pouco.
attribute vec3 birthPosition;
attribute vec3 birthVelocity;
attribute vec3 color;
attribute float size;
attribute float maxLife;
attribute float gravity;
attribute float birthTime;

uniform float uTime;
uniform float uFloorY;

varying vec3 vColor;
varying float vAlpha;

void main() {
  float age = uTime - birthTime;

  if (age < 0.0 || age > maxLife) {
    vColor = color;
    vAlpha = 0.0;
    gl_Position = vec4(0.0, -1000.0, 0.0, 1.0);
    gl_PointSize = 1.0;
    return;
  }

  float t = age / maxLife;

  vec3 pos = birthPosition + birthVelocity * age;
  pos.y -= 0.5 * gravity * age * age;

  // Ao tocar o chão: empoca — fica na FLOOR_Y e desvanece devagar.
  float fadeRate;
  if (pos.y <= uFloorY) {
    pos.y = uFloorY;
    fadeRate = 1.8;
  } else {
    fadeRate = 3.5;
  }

  vColor = color * exp(-fadeRate * age);
  vAlpha = 1.0 - t;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  float dist = max(-mvPosition.z, 0.5);
  gl_PointSize = min(size * (240.0 / dist), 48.0);
  gl_Position = projectionMatrix * mvPosition;
}