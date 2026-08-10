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
};
