/**
 * Narrativa central de Crimson Halls — textos separados da lógica de
 * apresentação para edição sem tocar no código.
 *
 * Premissa: o jogador é um Registrador (arquivista) enviado a Crimson Halls,
 * uma instituição que virou um labirinto autônomo. O Thane foi o primeiro
 * prisioneiro — e também a porta que o lugar mantém trancada por dentro.
 */

export const PREMISE = {
  player: 'Registrador de Crimson Halls',
  world: 'Uma ala-asa do asilo/lar "Crimson Halls" que aprendeu a se reconfigurar.',
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
}

/** Notas de lore encontradas nas salas secretas. Chave = id do nível. */
export const SECRET_NOTES: Record<string, string> = {
  'level-1b-secret':
    'Nota de enfermeira: "Eles não estão mortos. Estão apenas descontentes. Não os alimente depois da meia-noite."',
  'level-2b-secret':
    'Diário do Warden: "Descobri por que chamam de Halls. Cada porta leva a um lugar que existiu antes. Ou depois."',
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
  'Em algum lugar de Crimson Halls, as tochas continuam acesas.',
  'Esperando o próximo registro.',
]
