# Crimson Halls

Um FPS estilo *Doom clássico* rodando no navegador, em primeira pessoa, com uma base modular e extensível — armas, inimigos, níveis e efeitos são definidos por dados (configs) sem tocar no core.

## Stack

- **Vite + TypeScript** (strict) — build e tooling
- **Three.js** — renderização 3D, post-processing (bloom + vinheta), áudio posicional
- **Zustand** — estado global desacoplado da engine
- **React** — apenas a camada de UI/HUD (o jogo em si não depende de React)
- **Vitest** — testes unitários
- **ESLint + Prettier** — lint e formatação

## Rodando localmente

```bash
npm install        # instala as dependências
npm run dev        # servidor de desenvolvimento (Vite) → http://localhost:5173
```

## Scripts

| Comando            | Descrição                                         |
| ------------------ | ------------------------------------------------- |
| `npm run dev`      | Servidor de desenvolvimento                        |
| `npm run build`    | Build de produção (tsc + Vite) na pasta `dist/`    |
| `npm run preview`  | Pré-visualiza o build de produção                  |
| `npm test`         | Roda os testes unitários (Vitest)                  |
| `npm run lint`     | Roda o ESLint                                      |
| `npm run format`   | Formata o código com Prettier                      |

## Controles

- **EAXF** — mover (E = frente, A = esquerda, X = trás, F = direita)
- **Mouse** — olhar/mirar (Pointer Lock)
- **Shift** — correr
- **1–5** — trocar arma
- **G** — interagir (portas/entrar em outro nível)
- **P** — pausar
- **Touch** — joystick virtual (esquerda) + arrastar para mirar (direita) + botões de tiro/troca de arma

## Recursos

- 5 armas (pistola, escopeta, rifle, lançador de foguetes, motosserra) com dados em `weapons.config.ts`
- 5 tipos de inimigo (perseguidor, atirador, kamikaze, tanque) + arena de ondas no nível 5
- 5 níveis com dificuldade crescente, carregados de grids de texto (`.`, `#`, `P`, `E`, `S`, `K`, `T`, `H`, `A`, `F`, `D`)
- **Níveis ramificados**: portas (`D`) que levam a outros níveis — campanha linear 1→5 + sala secreta (`level-2b-secret`). Avançar é só por porta (G); limpar o setor destrava as portas (banner "SETOR LIMPO"), e só o nível final termina em vitória automaticamente ao limpar as ondas
- Editor de níveis 2D no jogo (menu → "Editor de Níveis" ou `/#editor`) que exporta/importa o formato do `LevelLoader`, incluindo portas
- Save/checkpoint em `localStorage`, dificuldade (Fácil/Normal/Difícil) e configurações persistidas separadamente
- Acessibilidade: screen shake configurável, modo daltônico, tamanho de fonte do HUD

## Áudio

Os efeitos são gerados proceduralmente por padrão. Para usar arquivos reais, solte `assets/sounds/<nome>.wav` em `src/assets/sounds/` usando os mesmos nomes dos efeitos (`pistol.wav`, `shotgun.wav`, `explosion.wav`, …). Fontes royalty-free sugeridas: [freesound.org](https://freesound.org), [kenney.nl](https://kenney.nl) (CC0), [opengameart.org](https://opengameart.org).

## Testes

```bash
npm test
```

Cobrem lógica pura (desacoplada do Three.js): `CollisionSystem` (colisão/slide/linha de visão), dano/vida com multiplicadores de dificuldade, `saveSystem` (versão/nível inválido), armas (cadência, munição, dry fire, splash), e `LevelLoader` (parsing + conectividade por flood-fill de todos os níveis).

## Deploy (Vercel)

O Vite é detectado automaticamente pelo Vercel:

- **CLI**: `npm i -g vercel && vercel` (na raiz do projeto)
- **Repositório**: importe o repo no dashboard — build command `npm run build`, output `dist`, sem variáveis de ambiente (não há backend/segredos).

O build de produção minifica, faz tree-shaking e separa o chunk do Three.js (cache estável).

## Estrutura

```
src/
  core/        # Engine, input, colisão, áudio, partículas, texturas, configs de luz
  entities/    # Player, Enemy (+ EnemyTypes/), Pickup, Projectile, Rocket
  weapons/     # Weapon (hitscan/projétil/corpo a corpo) + weapons.config.ts
  levels/      # LevelLoader + levels/ (grids + ondas)
  state/       # gameStore (zustand), saveSystem, settings, difficulty
  ui/          # HUD, menus, Settings, LevelEditor, TouchControls
  assets/      # modelos/texturas/sons (placeholders)
```
