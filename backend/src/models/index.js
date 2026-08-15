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
