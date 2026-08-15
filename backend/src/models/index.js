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
};
