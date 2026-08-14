# Plano de Expansão

## Visão geral
- **Níveis**: 10 novos níveis (level-6.ts a level-15.ts) com variações de layout, iluminação e desafios.
- **Inimigos**: 3 novos tipos
  1. **Swarm** – pequeno grupo de inimigos que se movem em formação.
  2. **Shielded** – inimigo com escudo que precisa ser destruído antes de causar dano.
  3. **Flying** – inimigo aéreo que atira de longe.
- **Recursos visuais**: 5 novos recursos
  1. **Texturas de lava** – para áreas de lava.
  2. **Iluminação volumétrica** – efeito de neblina.
  3. **Partículas de poeira** – ao mover o jogador.
  4. **Efeitos de sangue** – partículas de sangue mais realistas.
  5. **Shaders de fogo e explosão** – customizados.

## Próximos passos
1. Adicionar novos arquivos de nível e atualizar `src/levels/levels/index.ts`.
2. Criar classes de inimigos em `src/entities/EnemyTypes` e registrar em `createEnemy`.
3. Implementar nova dificuldade `extreme` em `src/state/difficulty.config.ts`.
4. Criar shaders em `src/shaders` e integrá‑los no `ParticleSystem`.
5. Substituir `ParticleSystem` por `three-gpu-particles`.
6. Adicionar suporte a acelerômetro em `src/core/InputManager.ts`.
