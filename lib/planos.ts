export const PLANOS = {
  essencial: {
    nome: 'Essencial',
    carrosseis_por_mes: 12,
    perfis_max: 1,
    agendamento: false,
    historico_dias: 30,
  },
  profissional: {
    nome: 'Profissional',
    carrosseis_por_mes: 30,
    perfis_max: 3,
    agendamento: true,
    historico_dias: null, // ilimitado
  },
} as const;

export type PlanoKey = keyof typeof PLANOS;

export function getLimites(plano: PlanoKey) {
  return PLANOS[plano];
}
