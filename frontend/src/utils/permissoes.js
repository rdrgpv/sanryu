// Telas do admin que cada perfil vê. Espelha backend/src/middleware/permissoes.js, que é quem
// realmente bloqueia (403) — aqui é só pra esconder do menu o que daria erro.
const TELAS_RECEPCAO = [
  /^\/admin\/?$/,
  /^\/admin\/alunos(\/|$)/,
  /^\/admin\/responsaveis(\/|$)/,
  /^\/admin\/interessados(\/|$)/,
  /^\/admin\/contratos(\/|$)/,
  /^\/admin\/mensalidades(\/|$)/,
  /^\/admin\/turmas\/?$/,
  /^\/admin\/turmas\/\d+\/chamada$/,
  /^\/admin\/frequencia(\/|$)/,
  /^\/admin\/eventos\/?$/,
  /^\/admin\/eventos\/\d+\/(inscricoes|lista-inscritos|autorizacoes)$/,
  /^\/admin\/academias\/?$/,
  /^\/admin\/alunos-externos\/?$/,
  /^\/admin\/balcao\/?$/,
  /^\/admin\/pedidos\/?$/,
];

export function podeVer(perfil, caminho) {
  if (perfil === 'admin') return true;
  if (perfil === 'recepcao') return TELAS_RECEPCAO.some((padrao) => padrao.test(caminho));
  return false;
}

export function ehAdmin(perfil) {
  return perfil === 'admin';
}
