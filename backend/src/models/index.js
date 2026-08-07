const sequelize = require('../config/database');
const Admin = require('./Admin');
const Instrutor = require('./Instrutor');
const Turma = require('./Turma');
const Aluno = require('./Aluno');
const Matricula = require('./Matricula');

Instrutor.hasMany(Turma, { foreignKey: 'instrutorId', as: 'turmas' });
Turma.belongsTo(Instrutor, { foreignKey: 'instrutorId', as: 'instrutor' });

Aluno.belongsToMany(Turma, { through: Matricula, foreignKey: 'alunoId', otherKey: 'turmaId', as: 'turmas' });
Turma.belongsToMany(Aluno, { through: Matricula, foreignKey: 'turmaId', otherKey: 'alunoId', as: 'alunos' });

Matricula.belongsTo(Aluno, { foreignKey: 'alunoId', as: 'aluno' });
Matricula.belongsTo(Turma, { foreignKey: 'turmaId', as: 'turma' });
Aluno.hasMany(Matricula, { foreignKey: 'alunoId', as: 'matriculas' });
Turma.hasMany(Matricula, { foreignKey: 'turmaId', as: 'matriculas' });

module.exports = {
  sequelize,
  Admin,
  Instrutor,
  Turma,
  Aluno,
  Matricula,
};
