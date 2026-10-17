export const PERIODICIDADES = [
  { valor: 'mensal', label: 'Mensal', meses: 1 },
  { valor: 'trimestral', label: 'Trimestral', meses: 3 },
  { valor: 'semestral', label: 'Semestral', meses: 6 },
  { valor: 'anual', label: 'Anual', meses: 12 },
];

export function labelPeriodicidade(valor) {
  return PERIODICIDADES.find((item) => item.valor === valor)?.label || valor;
}

export function mesesPeriodicidade(valor) {
  return PERIODICIDADES.find((item) => item.valor === valor)?.meses || 1;
}

export const SITUACOES_CONTRATO = {
  ativo: { label: 'Ativo', classe: 'text-bg-success' },
  encerrado: { label: 'Encerrado', classe: 'text-bg-secondary' },
  cancelado: { label: 'Cancelado', classe: 'text-bg-danger' },
};
