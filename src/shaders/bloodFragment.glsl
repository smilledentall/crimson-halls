// Fragment shader das partículas de sangue: gota com núcleo opaco escuro e
// borda suave, sem glow aditivo — sangue não deve brilhar como fogo.
precision highp float;

varying vec3 vColor;
varying float vAlpha;

void main() {
  // Distância do centro do ponto (0 no centro, 0.5 na borda).
  float d = length(gl_PointCoord - vec2(0.5));

  // Núcleo opaco (sangue denso) e borda que desvanece suavemente.
  float opacity = 1.0 - smoothstep(0.28, 0.5, d);

  // Mancha desuniforme: ligeira variação radial escura, como respingo real.
  float mottle = 0.9 + 0.1 * sin(d * 18.0);

  gl_FragColor = vec4(vColor * mottle, opacity * vAlpha);
}