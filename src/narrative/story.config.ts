/**
 * Narrativa central de Crimson Lead — textos separados da lógica de
 * apresentação para edição sem tocar no código.
 *
 * Premissa: o jogador é um Registrador (arquivista) enviado a Crimson Lead,
 * uma instituição que virou um labirinto autônomo. O Thane foi o primeiro
 * prisioneiro — e também a porta que o lugar mantém trancada por dentro.
 */

export const PREMISE = {
  player: 'Registrador de Crimson Lead',
  world: 'Uma ala-asa do asilo/lar "Crimson Lead" que aprendeu a se reconfigurar.',
  threat: 'O Thane, o primeiro prisioneiro, tornou-se o guardião — e a chave.',
}

export interface LevelIntro {
  title: string
  /** Estilo "diário / transmissão captada". */
  lines: string[]
}

/** Abertura por nível da campanha (e do chefe). Chave = id do nível. */
export const LEVEL_INTROS: Record<string, LevelIntro> = {
  'level-1': {
    title: 'Hall de Entrada',
    lines: [
      'Registro nº 1. A ala norte foi lacrada após o incidente — mas as tochas ainda queimam.',
      'Alguma coisa mantém este lugar aceso. E algo me observa pelos corredores.',
    ],
  },
  'level-2': {
    title: 'Corredores de Crimson',
    lines: [
      'As paredes mudam de lugar à noite. Ou é a fumaça dos canos.',
      'Encontrei marcas de garras e um molho de chaves coberto de sangue seco.',
    ],
  },
  'level-3': {
    title: 'Profundezas de Crimson',
    lines: [
      'Quanto mais fundo, mais vermelho o ar.',
      'Ouvi uma voz recitando meu próprio nome. Juro que não escrevi nada disso.',
    ],
  },
  'level-4': {
    title: 'Salões dos Condenados',
    lines: [
      'As portas sabem onde estou. Fecham sozinhas atrás de mim.',
      'O Thane não é o "mestre" deste lugar. Ele foi o primeiro prisioneiro.',
    ],
  },
  'level-5': {
    title: 'Arena do Thane',
    lines: [
      'Ele guarda o que Crimson esconde desde o primeiro dia.',
      'Se eu não voltar, queimem os registros.',
    ],
  },
  'level-6': {
    title: 'Caldeiras de Lava',
    lines: [
      'O calor sobe dos andares que ninguém cartografou.',
      'Algo com asas patrulha os poços de fogo.',
    ],
  },
  'level-7': {
    title: 'Galerias dos Enxames',
    lines: [
      'Eles se movem como uma única criatura.',
      'Não existe "um" — existe a multidão.',
    ],
  },
  'level-8': {
    title: 'Santuário dos Escudos',
    lines: [
      'As armas fracas ricocheteiam na escuridão.',
      'Troveja lá dentro. Troveja e espera.',
    ],
  },
  'level-9': {
    title: 'Alturas de Crimson',
    lines: [
      'O teto sumiu. Só restou o vôo deles.',
      'Não olhe para baixo — o andar não tem fim.',
    ],
  },
  'level-10': {
    title: 'Forja de Obsidiana',
    lines: [
      'As paredes negras ainda guardam o calor da forja.',
      'Aqui o metal aprendeu a andar.',
    ],
  },
  'level-11': {
    title: 'Salões Assombrados',
    lines: [
      'Cada porta repete o eco de um nome.',
      'Os vivos aqui são apenas convidados.',
    ],
  },
  'level-12': {
    title: 'Necrópole de Obsidiana',
    lines: [
      'As tumbas foram abertas. E devolvidas.',
      'O que enterraram em Crimson nunca dormiu.',
    ],
  },
  'level-13': {
    title: 'Antessala do Núcleo',
    lines: [
      'O ar vibra perto do coração do prédio.',
      'Estou mais perto do que qualquer registro.',
    ],
  },
  'level-14': {
    title: 'Salões do Fim',
    lines: [
      'As tochas aqui queimam roxo.',
      'Não há portas de volta a partir daqui.',
    ],
  },
  'level-15': {
    title: 'Núcleo de Crimson',
    lines: [
      'O centro. A razão de tudo isto existir.',
      'Fecha o registro. Queime o resto.',
    ],
  },
}

/** Notas de lore encontradas nas salas secretas. Chave = id do nível. */
export const SECRET_NOTES: Record<string, string> = {
  'level-1b-secret':
    'Nota de enfermeira: "Eles não estão mortos. Estão apenas descontentes. Não os alimente depois da meia-noite."',
  'level-2b-secret':
    'Diário do Warden: "Descobri por que chamam de Lead. Cada porta leva a um lugar que existiu antes. Ou depois."',
  'level-3c-secret':
    'Inscrição na parede: "Quem coleciona o sangue de Crimson não enxerga o próprio reflexo."',
  'level-4b-secret':
    'Aviso do arsenal: "As armas que queimam a carne também queimam a lembrança. Use apenas em desespero."',
  'level-5b-secret':
    'Anotação de bolso: "O Thane não é o guardião. Ele é a porta. E ela está trancada por dentro."',
}

/** Retorna a nota de lore de um nível (ou texto padrão). */
export function getSecretNote(levelId: string): string {
  return SECRET_NOTES[levelId] ?? 'Uma página arrancada. Não restou nada legível.'
}

/** Encerramento exibido após derrotar o chefe. */
export const EPILOGUE: string[] = [
  'O Thane cai, e com ele, o eco dos corredores.',
  'Os registros estão completos — ou o que resta deles.',
  'Em algum lugar de Crimson Lead, as tochas continuam acesas.',
  'Esperando o próximo registro.',
]
