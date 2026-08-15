// Vertex shader das partículas (fogo/explosão): propaga cor, vida e tamanho
// por partícula e dimensiona o ponto pela distância à câmera (sizeAttenuation).
attribute vec3 color;
attribute float size;
attribute float alpha;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vColor = color;
  vAlpha = alpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float dist = max(-mvPosition.z, 0.5);
  gl_PointSize = min(size * (240.0 / dist), 64.0);
  gl_Position = projectionMatrix * mvPosition;
}
