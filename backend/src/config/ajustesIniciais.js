const { DataTypes } = require('sequelize');
const { Op } = require('sequelize');
const { sequelize, Unidade, Aluno, Turma, ConfiguracaoAcademia, Admin, Academia, Matricula, Contrato, Aula, Lead, Pedido, Produto, ProdutoVariacao } = require('../models');
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

// Antes da gestão da academia, as "turmas" faziam o papel de academias de outros professores (e os
// alunos eram os alunos Morganti dos eventos). Roda UMA vez (marcado em turmasMigradasEm):
// - cada turma vira uma Academia externa (mesmo professor) e é removida das turmas — exceto turma
//   que já teve chamada, que é turma de verdade do dojo;
// - aluno sem contrato vira "externo" (ligado à academia da turma dele); com contrato continua sendo
//   da academia; sem contrato mas matriculado numa turma preservada também continua.
async function migrarTurmasParaAcademias() {
  const configuracao = await ConfiguracaoAcademia.findOne({ order: [['id', 'ASC']] });
  if (!configuracao || configuracao.turmasMigradasEm) return;

  const resultado = await sequelize.transaction(async (transaction) => {
    const turmas = await Turma.findAll({ transaction });
    const turmasComChamada = new Set((await Aula.findAll({ attributes: ['turmaId'], raw: true, transaction })).map((aula) => aula.turmaId));
    const alunosComContrato = new Set((await Contrato.findAll({ attributes: ['alunoId'], raw: true, transaction })).map((contrato) => contrato.alunoId));
    let academias = 0;

    for (const turma of turmas) {
      if (turmasComChamada.has(turma.id)) continue;

      const academia = await Academia.create(
        {
          nome: turma.nome,
          instrutorId: turma.instrutorId,
          turmaOrigemId: turma.id,
          observacoes: `Convertida da antiga turma "${turma.nome}" (${turma.diaSemana} ${turma.horaInicio}–${turma.horaFim}).`,
        },
        { transaction }
      );
      academias += 1;

      const matriculas = await Matricula.findAll({ where: { turmaId: turma.id }, transaction });
      for (const matricula of matriculas) {
        if (alunosComContrato.has(matricula.alunoId)) continue;
        await Aluno.update(
          { vinculo: 'externo', academiaId: academia.id, unidadeId: null },
          { where: { id: matricula.alunoId, academiaId: null }, transaction, hooks: false }
        );
      }

      await Matricula.destroy({ where: { turmaId: turma.id }, transaction });
      await Lead.update({ turmaId: null }, { where: { turmaId: turma.id }, transaction });
      await turma.destroy({ transaction });
    }

    // Quem sobrou sem contrato e sem turma (ex.: cadastrado a partir de inscrição de evento) também
    // é aluno Morganti externo.
    const matriculadosEmTurmaReal = new Set((await Matricula.findAll({ attributes: ['alunoId'], raw: true, transaction })).map((matricula) => matricula.alunoId));
    const manterNaAcademia = [...new Set([...alunosComContrato, ...matriculadosEmTurmaReal])];
    const [externos] = await Aluno.update(
      { vinculo: 'externo', unidadeId: null },
      { where: { vinculo: 'academia', ...(manterNaAcademia.length ? { id: { [Op.notIn]: manterNaAcademia } } : {}) }, transaction, hooks: false }
    );

    await configuracao.update({ turmasMigradasEm: new Date() }, { transaction });
    return { academias, externos };
  });

  if (resultado.academias || resultado.externos) {
    console.log(`Migração: ${resultado.academias} turma(s) viraram academias externas; ${resultado.externos} aluno(s) marcados como externos.`);
  }
}

// Ajustes de dados que rodam a cada subida do servidor, depois do sync. Todos são idempotentes:
// só mexem no que ainda está no estado antigo, então rodar de novo não muda nada.
async function aplicarAjustesIniciais() {
  try {
    await adicionarColunasFaltantes(Aluno);
    await adicionarColunasFaltantes(Turma);
    await adicionarColunasFaltantes(ConfiguracaoAcademia);
    await adicionarColunasFaltantes(Admin);
    await adicionarColunasFaltantes(Lead);
    await adicionarColunasFaltantes(Pedido);
    await adicionarColunasFaltantes(Produto);
    await adicionarColunasFaltantes(ProdutoVariacao);
    await removerEmailUnicoDoAluno();

    if ((await ConfiguracaoAcademia.count()) === 0) {
      await ConfiguracaoAcademia.create({ descontoFamiliaPercentual: 0, termoContrato: TERMO_CONTRATO_PADRAO });
      console.log('Configuração da academia criada com o contrato padrão.');
    }

    await garantirCategoriasPadrao();
    await migrarTurmasParaAcademias();

    if ((await Unidade.count()) === 0) {
      await Unidade.create({ nome: 'Sanryu' });
      console.log('Unidade padrão "Sanryu" criada.');
    }

    // Com uma unidade só, alunos (do dojo, não os externos) e turmas sem unidade só podem ser dela.
    const unidades = await Unidade.findAll({ attributes: ['id'] });

    if (unidades.length === 1) {
      const unidadeId = unidades[0].id;
      await Aluno.update({ unidadeId }, { where: { unidadeId: null, vinculo: 'academia' } });
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
