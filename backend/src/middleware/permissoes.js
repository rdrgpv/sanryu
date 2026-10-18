const { perfilDo } = require('./auth');

// O que o perfil "recepcao" pode fazer nas rotas /api/admin. Tudo que não está aqui é só do admin
// (financeiro, configurações, preços, usuários, loja/compras, excluir aluno, desfazer pagamento...).
// Lista de liberação, não de bloqueio: rota nova nasce restrita até alguém decidir liberar.
// Os caminhos são relativos a /api/admin.
const RECEPCAO = [
  ['GET', /^\/dashboard$/],

  ['GET', /^\/alunos(\/\d+)?$/],
  ['POST', /^\/alunos$/],
  ['PUT', /^\/alunos\/\d+$/],
  ['POST', /^\/alunos\/\d+\/matricular$/],
  ['GET', /^\/alunos\/\d+\/verificar-gatame$/],
  ['POST', /^\/alunos\/\d+\/cadastrar-gatame$/],

  // Academias e alunos Morganti externos (eventos/exames) — sem excluir.
  ['GET', /^\/academias$/],
  ['POST', /^\/academias$/],
  ['PUT', /^\/academias\/\d+$/],

  ['GET', /^\/responsaveis(\/\d+)?$/],
  ['POST', /^\/responsaveis$/],
  ['PUT', /^\/responsaveis\/\d+$/],

  ['GET', /^\/(turmas|unidades|faixas|instrutores|planos|tipos-evento)(\/\d+)?$/],

  ['GET', /^\/contratos(\/\d+)?$/],
  ['POST', /^\/contratos$/],
  ['POST', /^\/contratos\/simular$/],
  ['PUT', /^\/contratos\/\d+$/],
  ['POST', /^\/contratos\/\d+\/(assinar|encerrar)$/],

  ['GET', /^\/mensalidades$/],
  ['POST', /^\/mensalidades\/gerar$/],
  ['POST', /^\/mensalidades\/\d+\/(pagamento|enviar-email|verificar-pagamento)$/],

  ['GET', /^\/leads$/],
  ['POST', /^\/leads$/],
  ['PUT', /^\/leads\/\d+$/],
  ['POST', /^\/leads\/\d+\/converter$/],

  ['GET', /^\/frequencia$/],

  ['GET', /^\/eventos(\/\d+)?$/],
  ['GET', /^\/eventos\/\d+\/(inscricoes|autorizacoes)$/],
  ['POST', /^\/inscricoes\/\d+\/verificar-pagamento$/],
  ['POST', /^\/inscricoes\/\d+\/cadastrar-aluno$/],

  // Venda no balcão e retirada dos pedidos da loja (ver e entregar). Estoque/compras/inventário: admin.
  ['GET', /^\/balcao\/(produtos|vendas-do-dia)$/],
  ['POST', /^\/balcao\/vendas$/],
  ['GET', /^\/pedidos(\/\d+)?$/],
  ['POST', /^\/pedidos\/\d+\/entregar$/],
];

const PERMISSOES = { recepcao: RECEPCAO };

function permitido(perfil, metodo, caminho) {
  if (perfil === 'admin') return true;
  return (PERMISSOES[perfil] || []).some(([metodoPermitido, padrao]) => metodoPermitido === metodo && padrao.test(caminho));
}

function exigirPermissao(req, res, next) {
  if (!permitido(perfilDo(req), req.method, req.path)) {
    return res.status(403).json({ error: 'Seu perfil não tem acesso a esta função. Fale com o administrador.' });
  }
  next();
}

module.exports = { exigirPermissao, permitido, RECEPCAO };
