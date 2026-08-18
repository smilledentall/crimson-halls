# Crimson Lead — Project Overview

## 1) Objetivo do Projeto

**Crimson Lead** é um jogo FPS (first-person shooter) estilo *Doom clássico* que roda inteiramente no navegador. O foco é uma base modular e extensível onde armas, inimigos, níveis, efeitos de partículas e progressão são definidos por **dados de configuração** (TypeScript objects/arrays) sem alterar o core da engine. O jogo combina:

- **Gameplay**: movimentação em primeira pessoa (EAXF), mira por mouse/pointer-lock, 5 armas, 5 tipos de inimigos, ondas de combate, portas/bosses, progressão de upgrades.
- **Editor de níveis 2D** integrado (acessível via `/#editor` ou menu) para criar/exportar grids de texto.
- **Sistema de save/checkpoint** em `localStorage` com persistência de sessão por nível.
- **Acessibilidade**: screen shake configurável, modo daltônico, tamanho de fonte do HUD.
- **Deploy zero-config** (Vite → Vercel/Netlify/qualquer host estático).

---

## 2) Tecnologias / Frameworks

| Camada | Tecnologia | Versão | Papel |
|--------|------------|--------|-------|
| Build / Dev | **Vite** | 8.x | Bundler, HMR, otimização de produção (tree-shaking, code-splitting) |
| Linguagem | **TypeScript** | 6.x (strict) | Tipagem estrita em toda a base |
| Render 3D | **Three.js** | 0.180.x | Cena, câmera, luzes, partículas, post-processing (Bloom + Vinheta) |
| Estado Global | **Zustand** | 5.x | Store reativo desacoplado da engine (fases, vida, munição, upgrades, settings) |
| UI / HUD | **React** | 19.x | Apenas camada de apresentação (menus, HUD, Settings, LevelEditor); a engine roda independente |
| Testes | **Vitest** | 4.x | Unit tests para lógica pura (colisão, dano, save, armas, LevelLoader) |
| Lint / Format | **ESLint 9** + **Prettier 3** | — | Padrão de código e formatação |
| Áudio | **Web Audio API** (via `AudioManager`) | nativo | SFX posicionais, loops de fogueira, música em camadas (exploração/combate) com crossfade |
| Shaders | **GLSL** (importados como strings) | — | Particle system (vertex/fragment), sangue, vinheta, bloom customizado |

---

## 3) Estrutura de Pastas (uma linha por pasta)

```
src/
├── core/              # Engine principal: loop, input, colisão, áudio, partículas, texturas, configs de iluminação
├── entities/          # Entidades do mundo: Player, Enemy (e EnemyTypes/), Pickup, Projectile, Rocket
├── weapons/           # Sistema de armas: Weapon (hitscan/projétil/melee), WeaponView, configuração e upgrades
├── levels/            # Carregamento e parsing de níveis (LevelLoader) + levels/ (grids de texto + ondas)
├── state/             # Zustand store (gameStore), saveSystem, settings, difficulty, progression, skills
├── ui/                # Componentes React: HUD, menus (MainMenu, Pause, Death, Epilogue), Settings, LevelEditor, TouchControls
├── shaders/           # GLSL: particleVertex/Fragment, bloodVertex/Fragment, vinheta
├── doors/             # Sprites e utilitários de portas
├── narrative/         # Textos de intro/notes por nível (story.config.ts)
├── assets/            # Modelos, texturas, sprites, sons (placeholders + fontes reais em assets/sounds/)
├── expansion/         # Documentos de planejamento de expansão (plan.md)
├── types/             # Declarações de tipo globais (ex.: glsl.d.ts)
├── App.tsx            # Raiz React: monta providers, HUD, menus condicionais à fase do jogo
├── main.ts            # Entry point: cria Engine, monta React no #root, debug log do store
└── index.css          # Estilos globais, variáveis CSS, responsividade, acessibilidade
```

---

## 4) Arquivos Principais e Responsabilidades

### Entry / Bootstrap
| Arquivo | Responsabilidade |
|---------|------------------|
| `src/main.ts` | Cria `Engine`, monta `App` no `#root`, habilita editor via `#editor`, log de debug do store |
| `src/App.tsx` | Componente raiz React: providers, render condicional de HUD/menus conforme `gameStore.phase` |
| `src/index.css` | Reset, variáveis CSS (cores, fontes), utilitários de acessibilidade (alto contraste, reduced motion) |

### Engine Core (`src/core/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `Engine.ts` | **Coração do jogo** (~2100 linhas): loop principal (`animate`), spawn de inimigos/ondas, colisão, partículas, luzes, portas, alavancas, chefes, transição de nível, HUD updates, save/checkpoint, flashlight, cressets (luz + som), bloom/vignette composer |
| `AudioManager.ts` | Web Audio API wrapper: SFX posicionais (`playPositional`), loops contínuos (`startLoopingPositional`), música em duas camadas com crossfade, fallback procedural se `.wav` ausente |
| `CollisionSystem.ts` | Colisão AABB + slide, raycast (linha de visão), verificação de passagem por portas; testado isoladamente |
| `ParticleSystem.ts` | GPU particle system (3000 partículas): nascimento com atributos (birthPosition, velocity, color, life, gravity), simulação no vertex shader, bloom-friendly |
| `InputManager.ts` / `InputManagerMobile.ts` | Teclado/mouse (pointer-lock) + touch (joystick virtual + arrastar para mirar) |
| `LevelTextureLoader.ts` | Carrega texturas de nível (paredes, chão, teto) com cache e fallback |
| `SpriteLoader.ts` | Carrega sprites inimigos/armas/portas com chroma-key (verde) → textura com alpha |
| `lighting.config.ts` | Constantes de iluminação: tocha, flashlight, ambient, hemisphere, decay, distances |
| `spawnPosition.ts` | Encontra posição válida de spawn (fora de paredes, longe do player) |
| `splash.ts` | Cálculo de dano em área (foguetes, explosões) com falloff quadrático |
| `device.ts` | Detecção de touch/pointer capabilities |

### Entidades (`src/entities/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `Player.ts` | Movimento (EAXF), yaw/pitch, bob ao andar, colisão, vida, regeneração, aplicação na câmera |
| `Enemy.ts` | Classe base: IA simples (persegue, atira, foge), animação de sprite (billboard), dano/morte, drops |
| `EnemyTypes/` | 5 subtipos: `ChaserEnemy` (corre), `RangedEnemy` (atira projéteis), `KamikazeEnemy` (explode ao contato), `TankEnemy` (vida alta, lento), `FlyingEnemy` (voa), `BossEnemy` (arena final) |
| `Pickup.ts` | Itens coletáveis: vida, munição, moeda, chave; animação flutuante |
| `Projectile.ts` / `Rocket.ts` | Projéteis hitscan vs. físicos (foguete com trilha de partículas + explosão) |
| `player.config.ts` / `pickup.config.ts` | Constantes de velocidade, vida, regen, tamanhos, valores de pickups |

### Armas (`src/weapons/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `Weapon.ts` | Factory `createWeapon(id)`: hitscan (pistola/escopeta/rifle), projétil (foguete), melee (motosserra); cadência, spread, recuo, munição |
| `WeaponView.ts` | ViewModel 3D da arma (sprite + bob + recuo + muzzle flash), sincroniza com câmera |
| `weapons.config.ts` | **Definição declarativa** de todas as 5 armas: dano, cadência, spread, projétil, sprite, som, upgrade tree |
| `weapon-upgrades.ts` | Aplica upgrades comprados (dano, cadência, munição, spread, projéteis extras) |
| `weaponSprites.ts` / `doorSprites.ts` | URLs e helpers de carregamento de sprites com chroma-key |

### Níveis (`src/levels/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `LevelLoader.ts` | Parser de grids de texto (`.`, `#`, `P`, `E`, `S`, `K`, `T`, `H`, `A`, `F`, `D`, `X`, `L`, `V`, `B`, `N`, `R`, `M`, `C`) → `ParsedLevel` (walls, doors, cressets, enemies, pickups, waves, portas secretas, boss). Inclui flood-fill de conectividade para validação |
| `levels/` | 5 níveis da campanha (`level-1.ts` … `level-5.ts`) + `level-2b-secret.ts` + índices exportados em `index.ts` |

### Estado / Persistência (`src/state/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `gameStore.ts` | Zustand store: phase (menu/playing/paused/editor/gameover/victory), vida, munição, kills, moeda, upgrades, weapons unlocked, settings (shake, daltonismo, fontSize), nível atual, sessão por nível |
| `saveSystem.ts` | Serializa/deserializa `gameStore` para `localStorage` com versionamento e migração |
| `settings.ts` / `difficulty.config.ts` / `progression.config.ts` / `skills.config.ts` | Tabelas de dados: dificuldades (multiplicadores), custos de upgrade, XP por nível, skills passivas |

### UI (`src/ui/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `HUD.tsx` | Barra de vida, munição, arma ativa, moeda, kill count, minimapa, indicador de flashlight, mensagens de setor limpo |
| `MainMenu.tsx` / `PauseMenu.tsx` / `DeathScreen.tsx` / `Epilogue.tsx` | Telas de fluxo principal |
| `Settings.tsx` | Dificuldade, acessibilidade (shake, colorblind, font), controles, volume master/sfx/music |
| `LevelEditor.tsx` | Editor 2D: grade editável, paleta de tiles, portas com target/label/secret, exporta/importa JSON compatível com `LevelLoader` |
| `TouchControls.tsx` | Joystick virtual (esquerda) + área de mira (direita) + botões tiro/troca arma/flashlight |
| `LevelTransition.tsx` / `LevelIntro.tsx` / `NoteModal.tsx` / `Credits.tsx` | Transições e narrativa |
| `Upgrades.tsx` | Tela de gastar skill points / currency em upgrades de armas e passivas |

### Shaders (`src/shaders/`)
| Arquivo | Responsabilidade |
|---------|------------------|
| `particleVertex.glsl` / `particleFragment.glsl` | Simulação GPU de partículas de fogo: integração velocidade+gravidade, fade por idade, billboard, glow radial |
| `bloodVertex.glsl` / `bloodFragment.glsl` | Partículas de sangue (projetadas no chão/parede) |
| (vinheta inline em `Engine.ts`) | Pós-processamento: vinheta radial + UnrealBloomPass |

---

## 5) Como Rodar Localmente

### Pré-requisitos
- **Node.js 20+** (recomendado LTS)
- **npm 10+** (ou pnpm/yarn)

### Instalação e Desenvolvimento
```bash
# 1. Clone o repositório
git clone <url-do-repo>
cd Game-crimson-halls

# 2. Instale dependências
npm install

# 3. Inicie o servidor de desenvolvimento (Vite + HMR)
npm run dev
# → abre http://localhost:5173
```

### Scripts Disponíveis
| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor dev com HMR (porta 5173) |
| `npm run build` | Build de produção (`tsc -b && vite build`) → pasta `dist/` |
| `npm run preview` | Serve o build de produção localmente para validação |
| `npm test` | Executa testes unitários (Vitest) |
| `npm run lint` | Executa ESLint em toda a base |
| `npm run format` | Formata código com Prettier |

### Acessando o Editor de Níveis
- Via URL: `http://localhost:5173/#editor`
- Ou pelo menu principal → "Editor de Níveis"

### Deploy (Vercel / Netlify / GitHub Pages / qualquer static host)
```bash
npm run build
# pasta dist/ pronta para deploy
```
- **Vercel**: detecta Vite automaticamente (`vercel` na raiz ou import no dashboard)
- **Build command**: `npm run build`
- **Output directory**: `dist`
- Sem variáveis de ambiente necessárias (não há backend/segredos)

---

## Notas de Arquitetura

- **Separação Engine ↔ UI**: A `Engine` (Three.js loop) não depende de React; o `App.tsx` apenas monta a UI e passa a instância da engine. Isso permite testar a lógica pura isoladamente.
- **Data-driven**: Novas armas/inimigos/níveis são adicionados editando arquivos `.ts` em `weapons.config.ts`, `EnemyTypes/`, `levels/` — sem tocar no core.
- **Testes cobrem lógica pura**: `CollisionSystem`, dano/vida com multiplicadores, `saveSystem` (versão/migração), armas (cadência, munição, dry fire, splash), `LevelLoader` (parsing + flood-fill de todos os níveis).
- **Áudio**: Por padrão usa síntese procedural. Para sons reais, adicione `.wav` em `src/assets/sounds/` com nomes iguais aos `SfxName` (`pistol.wav`, `shotgun.wav`, `fireplace.wav`, etc.).
- **Acessibilidade**: `prefers-reduced-motion`, modo daltônico (filtro CSS), tamanho de fonte HUD, screen shake toggle — tudo persistido no store.

---

*Gerado automaticamente a partir da análise do código-fonte. Última atualização: agosto 2026.*