const sequelize = require('../config/database');
const Admin = require('./Admin');
const Instrutor = require('./Instrutor');
const Turma = require('./Turma');
const Aluno = require('./Aluno');
const Matricula = require('./Matricula');
const Faixa = require('./Faixa');
const TipoEvento = require('./TipoEvento');
const Evento = require('./Evento');
const Banco = require('./Banco');
const EventoAluno = require('./EventoAluno');
const EventoAutorizacao = require('./EventoAutorizacao');
const Unidade = require('./Unidade');
const Responsavel = require('./Responsavel');
const Plano = require('./Plano');
const Contrato = require('./Contrato');
const ConfiguracaoAcademia = require('./ConfiguracaoAcademia');
const Mensalidade = require('./Mensalidade');
const Presenca = require('./Presenca');
const Aula = require('./Aula');
const ContaFinanceira = require('./ContaFinanceira');
const CategoriaFinanceira = require('./CategoriaFinanceira');
const Lancamento = require('./Lancamento');
const Recorrencia = require('./Recorrencia');
const Transferencia = require('./Transferencia');
const CodigoAcesso = require('./CodigoAcesso');
const Configuracao = require('./Configuracao');
const Produto = require('./Produto');
const Cor = require('./Cor');
const Tamanho = require('./Tamanho');
const ProdutoVariacao = require('./ProdutoVariacao');
const TipoPersonalizacao = require('./TipoPersonalizacao');
const EstoqueMovimentacao = require('./EstoqueMovimentacao');
const Pedido = require('./Pedido');
const PedidoItem = require('./PedidoItem');
const PedidoItemPersonalizacao = require('./PedidoItemPersonalizacao');
const Fornecedor = require('./Fornecedor');
const PedidoCompra = require('./PedidoCompra');
const PedidoCompraItem = require('./PedidoCompraItem');
const PedidoItemCompra = require('./PedidoItemCompra');

Instrutor.hasMany(Turma, { foreignKey: 'instrutorId', as: 'turmas' });
Turma.belongsTo(Instrutor, { foreignKey: 'instrutorId', as: 'instrutor' });

Aluno.belongsToMany(Turma, { through: Matricula, foreignKey: 'alunoId', otherKey: 'turmaId', as: 'turmas' });
Turma.belongsToMany(Aluno, { through: Matricula, foreignKey: 'turmaId', otherKey: 'alunoId', as: 'alunos' });

Matricula.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });
Matricula.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });
Aluno.hasMany(Matricula, { foreignKey: 'alunoId', as: 'matriculas' });
Turma.hasMany(Matricula, { foreignKey: 'turmaId', as: 'matriculas' });

TipoEvento.hasMany(Evento, { foreignKey: 'tipoEventoId', as: 'eventos' });
Evento.belongsTo(TipoEvento, { foreignKey: 'tipoEventoId', as: 'tipoEvento' });

Evento.hasMany(EventoAluno, { foreignKey: 'eventoId', as: 'inscricoes' });
EventoAluno.belongsTo(Evento, { foreignKey: 'eventoId', as: 'evento' });

Evento.hasMany(EventoAutorizacao, { foreignKey: 'eventoId', as: 'autorizacoes' });
EventoAutorizacao.belongsTo(Evento, { foreignKey: 'eventoId', as: 'evento' });

Instrutor.hasOne(Admin, { foreignKey: 'instrutorId', as: 'acesso' });
Admin.belongsTo(Instrutor, { foreignKey: 'instrutorId', as: 'instrutor' });

Instrutor.hasMany(Evento, { foreignKey: 'instrutorId', as: 'eventos' });
Evento.belongsTo(Instrutor, { foreignKey: 'instrutorId', as: 'instrutor' });

Aluno.hasMany(EventoAluno, { foreignKey: 'alunoId', as: 'inscricoesEvento' });
EventoAluno.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });

Unidade.hasMany(Aluno, { foreignKey: 'unidadeId', as: 'alunos' });
Aluno.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });

Unidade.hasMany(Turma, { foreignKey: 'unidadeId', as: 'turmas' });
Turma.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });

Responsavel.hasMany(Aluno, { foreignKey: 'responsavelId', as: 'alunos' });
Aluno.belongsTo(Responsavel, { foreignKey: 'responsavelId', as: 'responsavel' });

Unidade.hasMany(Plano, { foreignKey: 'unidadeId', as: 'planos' });
Plano.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });

Aluno.hasMany(Contrato, { foreignKey: 'alunoId', as: 'contratos' });
Contrato.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });

Plano.hasMany(Contrato, { foreignKey: 'planoId', as: 'contratos' });
Contrato.belongsTo(Plano, { foreignKey: 'planoId', as: 'plano' });

Contrato.hasMany(Mensalidade, { foreignKey: 'contratoId', as: 'mensalidades' });
Mensalidade.belongsTo(Contrato, { foreignKey: 'contratoId', as: 'contrato' });

Aluno.hasMany(Mensalidade, { foreignKey: 'alunoId', as: 'mensalidades' });
Mensalidade.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });

Aluno.hasMany(Presenca, { foreignKey: 'alunoId', as: 'presencas' });
Presenca.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });

Turma.hasMany(Presenca, { foreignKey: 'turmaId', as: 'presencas' });
Presenca.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

Turma.hasMany(Aula, { foreignKey: 'turmaId', as: 'aulas' });
Aula.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });

Lancamento.belongsTo(CategoriaFinanceira, { foreignKey: 'categoriaId', as: 'categoria' });
Lancamento.belongsTo(ContaFinanceira, { foreignKey: 'contaFinanceiraId', as: 'conta' });
Lancamento.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });
Lancamento.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'fornecedor' });
Recorrencia.belongsTo(CategoriaFinanceira, { foreignKey: 'categoriaId', as: 'categoria' });
Recorrencia.belongsTo(ContaFinanceira, { foreignKey: 'contaFinanceiraId', as: 'conta' });
Recorrencia.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });
Recorrencia.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'fornecedor' });
ContaFinanceira.belongsTo(Unidade, { foreignKey: 'unidadeId', as: 'unidade' });
Transferencia.belongsTo(ContaFinanceira, { foreignKey: 'contaOrigemId', as: 'contaOrigem' });
Transferencia.belongsTo(ContaFinanceira, { foreignKey: 'contaDestinoId', as: 'contaDestino' });

Faixa.hasMany(Aluno, { foreignKey: 'faixaId', as: 'alunos' });
Aluno.belongsTo(Faixa, { foreignKey: 'faixaId', as: 'faixa' });

Faixa.hasMany(Instrutor, { foreignKey: 'faixaId', as: 'instrutores' });
Instrutor.belongsTo(Faixa, { foreignKey: 'faixaId', as: 'faixa' });

Produto.hasMany(ProdutoVariacao, { foreignKey: 'produtoId', as: 'variacoes' });
ProdutoVariacao.belongsTo(Produto, { foreignKey: 'produtoId', as: 'produto' });

Cor.hasMany(ProdutoVariacao, { foreignKey: 'corId', as: 'variacoes' });
ProdutoVariacao.belongsTo(Cor, { foreignKey: 'corId', as: 'cor' });

Tamanho.hasMany(ProdutoVariacao, { foreignKey: 'tamanhoId', as: 'variacoes' });
ProdutoVariacao.belongsTo(Tamanho, { foreignKey: 'tamanhoId', as: 'tamanho' });

ProdutoVariacao.hasMany(EstoqueMovimentacao, { foreignKey: 'produtoVariacaoId', as: 'movimentacoes' });
EstoqueMovimentacao.belongsTo(ProdutoVariacao, { foreignKey: 'produtoVariacaoId', as: 'produtoVariacao' });

Pedido.hasMany(PedidoItem, { foreignKey: 'pedidoId', as: 'itens', onDelete: 'CASCADE' });
PedidoItem.belongsTo(Pedido, { foreignKey: 'pedidoId', as: 'pedido' });

ProdutoVariacao.hasMany(PedidoItem, { foreignKey: 'produtoVariacaoId', as: 'pedidoItens' });
PedidoItem.belongsTo(ProdutoVariacao, { foreignKey: 'produtoVariacaoId', as: 'produtoVariacao' });

PedidoItem.hasMany(PedidoItemPersonalizacao, { foreignKey: 'pedidoItemId', as: 'personalizacoes', onDelete: 'CASCADE' });
PedidoItemPersonalizacao.belongsTo(PedidoItem, { foreignKey: 'pedidoItemId', as: 'pedidoItem' });

TipoPersonalizacao.hasMany(PedidoItemPersonalizacao, { foreignKey: 'tipoPersonalizacaoId', as: 'itensPersonalizados' });
PedidoItemPersonalizacao.belongsTo(TipoPersonalizacao, { foreignKey: 'tipoPersonalizacaoId', as: 'tipoPersonalizacao' });

PedidoItem.hasMany(EstoqueMovimentacao, { foreignKey: 'pedidoItemId', as: 'movimentacoes' });
EstoqueMovimentacao.belongsTo(PedidoItem, { foreignKey: 'pedidoItemId', as: 'pedidoItem' });

Fornecedor.hasMany(PedidoCompra, { foreignKey: 'fornecedorId', as: 'pedidosCompra' });
PedidoCompra.belongsTo(Fornecedor, { foreignKey: 'fornecedorId', as: 'fornecedor' });

PedidoCompra.hasMany(PedidoCompraItem, { foreignKey: 'pedidoCompraId', as: 'itens', onDelete: 'CASCADE' });
PedidoCompraItem.belongsTo(PedidoCompra, { foreignKey: 'pedidoCompraId', as: 'pedidoCompra' });

ProdutoVariacao.hasMany(PedidoCompraItem, { foreignKey: 'produtoVariacaoId', as: 'pedidoCompraItens' });
PedidoCompraItem.belongsTo(ProdutoVariacao, { foreignKey: 'produtoVariacaoId', as: 'produtoVariacao' });

PedidoItem.hasMany(PedidoItemCompra, { foreignKey: 'pedidoItemId', as: 'alocacoes' });
PedidoItemCompra.belongsTo(PedidoItem, { foreignKey: 'pedidoItemId', as: 'pedidoItem' });

PedidoCompraItem.hasMany(PedidoItemCompra, { foreignKey: 'pedidoCompraItemId', as: 'alocacoes' });
PedidoItemCompra.belongsTo(PedidoCompraItem, { foreignKey: 'pedidoCompraItemId', as: 'pedidoCompraItem' });

PedidoCompraItem.hasMany(EstoqueMovimentacao, { foreignKey: 'pedidoCompraItemId', as: 'movimentacoes' });
EstoqueMovimentacao.belongsTo(PedidoCompraItem, { foreignKey: 'pedidoCompraItemId', as: 'pedidoCompraItem' });

module.exports = {
  sequelize,
  Admin,
  Instrutor,
  Turma,
  Aluno,
  Matricula,
  Faixa,
  TipoEvento,
  Evento,
  Banco,
  EventoAluno,
  EventoAutorizacao,
  Unidade,
  Responsavel,
  Plano,
  Contrato,
  ConfiguracaoAcademia,
  Mensalidade,
  Presenca,
  Aula,
  ContaFinanceira,
  CategoriaFinanceira,
  Lancamento,
  Recorrencia,
  Transferencia,
  CodigoAcesso,
  Configuracao,
  Produto,
  Cor,
  Tamanho,
  ProdutoVariacao,
  TipoPersonalizacao,
  EstoqueMovimentacao,
  Pedido,
  PedidoItem,
  PedidoItemPersonalizacao,
  Fornecedor,
  PedidoCompra,
  PedidoCompraItem,
  PedidoItemCompra,
};
