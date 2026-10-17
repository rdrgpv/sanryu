const { DataTypes } = require('sequelize');
const { sequelize, Unidade, Aluno, Turma, ConfiguracaoAcademia, Admin } = require('../models');
const { TERMO_CONTRATO_PADRAO } = require('../utils/termoContrato');
const { garantirCategoriasPadrao } = require('../services/financeiroService');
const { logErro } = require('../utils/logger');

// O sync do server.js não adiciona colunas novas no SQLite (roda sem alter lá, ver server.js) —
// aqui adiciona só as que faltam, com ADD COLUMN, que é seguro nos dois bancos. No MySQL o alter já
// criou tudo, então isso não faz nada.
async function adicionarColunasFaltantes(model) {
  const queryInterface = sequelize.getQueryInterface();
  const tabela = model.getTableName();
  const existentes = await queryInterface.describeTable(tabela);

  for (const [nome, atributo] of Object.entries(model.rawAttributes)) {
    const coluna = atributo.field || nome;
    if (existentes[coluna]) continue;

    await queryInterface.addColumn(tabela, coluna, {
      type: atributo.type,
      allowNull: atributo.allowNull !== false,
      defaultValue: atributo.defaultValue,
    });
    console.log(`Coluna ${tabela}.${coluna} adicionada.`);
  }
}

// O email do aluno deixou de ser único (irmãos podem usar o dos pais), mas o sync/alter não remove
// restrição de unicidade já criada. MySQL: é um índice ("email", às vezes "email_2"...), dá pra
// remover direto. SQLite: o UNIQUE fica na definição da coluna, então recria a coluna sem ele.
async function removerEmailUnicoDoAluno() {
  const queryInterface = sequelize.getQueryInterface();
  const tabela = Aluno.getTableName();
  const indices = await queryInterface.showIndex(tabela);
  const unicosDeEmail = indices.filter(
    (indice) => indice.unique && !indice.primary && indice.fields.length === 1 && indice.fields[0].attribute === 'email'
  );

  if (unicosDeEmail.length === 0) return;

  if (sequelize.getDialect() === 'sqlite') {
    await queryInterface.changeColumn(tabela, 'email', { type: DataTypes.STRING, allowNull: true, unique: false });
  } else {
    for (const indice of unicosDeEmail) {
      await queryInterface.removeIndex(tabela, indice.name);
    }
  }

  console.log('Restrição de email único removida da tabela de alunos.');
}

// Ajustes de dados que rodam a cada subida do servidor, depois do sync. Todos são idempotentes:
// só mexem no que ainda está no estado antigo, então rodar de novo não muda nada.
async function aplicarAjustesIniciais() {
  try {
    await adicionarColunasFaltantes(Aluno);
    await adicionarColunasFaltantes(Turma);
    await adicionarColunasFaltantes(ConfiguracaoAcademia);
    await adicionarColunasFaltantes(Admin);
    await removerEmailUnicoDoAluno();

    if ((await ConfiguracaoAcademia.count()) === 0) {
      await ConfiguracaoAcademia.create({ descontoFamiliaPercentual: 0, termoContrato: TERMO_CONTRATO_PADRAO });
      console.log('Configuração da academia criada com o contrato padrão.');
    }

    await garantirCategoriasPadrao();

    if ((await Unidade.count()) === 0) {
      await Unidade.create({ nome: 'Sanryu' });
      console.log('Unidade padrão "Sanryu" criada.');
    }

    // Com uma unidade só, alunos e turmas sem unidade (cadastros de antes das unidades existirem, ou
    // criados a partir de inscrição de evento) só podem ser dela.
    const unidades = await Unidade.findAll({ attributes: ['id'] });

    if (unidades.length === 1) {
      const unidadeId = unidades[0].id;
      await Aluno.update({ unidadeId }, { where: { unidadeId: null } });
      await Turma.update({ unidadeId }, { where: { unidadeId: null } });
    }

    // A coluna "situacao" entrou com default 'ativo' — alunos que já estavam marcados como inativos
    // (checkbox antigo) viram 'cancelado' em vez de reaparecer como ativos.
    await Aluno.update({ situacao: 'cancelado' }, { where: { ativo: false, situacao: 'ativo' }, hooks: false });
  } catch (err) {
    logErro('Erro ao aplicar ajustes iniciais de dados:', err);
  }
}

module.exports = { aplicarAjustesIniciais };
