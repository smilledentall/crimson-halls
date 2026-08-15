// Fragment shader das partículas: glow radial com núcleo quente, em vez de
// pontos quadrados. Usa gl_PointCoord para um sprite circular suave.
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Distância do centro do ponto (0 no centro, 0.5 na borda).
  float d = length(gl_PointCoord - vec2(0.5));
  float glow = smoothstep(0.5, 0.0, d);

  // Núcleo incandescente mais claro (fogo/explosão).
  float core = smoothstep(0.22, 0.0, d);
  vec3 rgb = vColor + core * vec3(0.55, 0.35, 0.1);

  gl_FragColor = vec4(rgb, glow * vAlpha);
}