const { Op } = require('sequelize');
const { Contrato, Aluno, Plano, Unidade, Responsavel, ConfiguracaoAcademia } = require('../models');

const NOMES_PERIODICIDADE = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' };

function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

// "YYYY-MM-DD" -> "DD/MM/YYYY", lendo a string direto (new Date(string) volta um dia no fuso do Brasil).
function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

function idade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');
  if (!match) return null;
  const [, ano, mes, dia] = match.map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) anos -= 1;
  return anos;
}

async function obterConfiguracao() {
  return ConfiguracaoAcademia.findOne({ order: [['id', 'ASC']] });
}

// Desconto família: vale quando o responsável do aluno já tem OUTRO aluno com contrato ativo — o
// primeiro filho paga cheio, do segundo em diante entra o %. Aluno sem responsável nunca recebe.
async function calcularValores({ aluno, plano, bolsaPercentual = 0, contratoIdIgnorado = null }) {
  const configuracao = await obterConfiguracao();
  let descontoFamiliaPercentual = 0;

  if (aluno.responsavelId && Number(configuracao?.descontoFamiliaPercentual) > 0) {
    const irmaosComContrato = await Contrato.count({
      where: {
        situacao: 'ativo',
        alunoId: { [Op.ne]: aluno.id },
        ...(contratoIdIgnorado ? { id: { [Op.ne]: contratoIdIgnorado } } : {}),
      },
      include: { model: Aluno, as: 'aluno', where: { responsavelId: aluno.responsavelId }, attributes: [] },
    });

    if (irmaosComContrato > 0) {
      descontoFamiliaPercentual = Number(configuracao.descontoFamiliaPercentual);
    }
  }

  const bolsa = Math.min(100, Math.max(0, Number(bolsaPercentual) || 0));
  const valorPlano = Number(plano.valor);
  const valorFinal = arredondar(valorPlano * (1 - descontoFamiliaPercentual / 100) * (1 - bolsa / 100));

  return { valorPlano, descontoFamiliaPercentual, bolsaPercentual: bolsa, valorFinal };
}

// Quem assina: o responsável quando o aluno é menor (ou quando não há data de nascimento mas há
// responsável); senão o próprio aluno.
function contratante(aluno) {
  const anos = idade(aluno.dataNascimento);
  const menor = anos !== null ? anos < 18 : Boolean(aluno.responsavel);

  if (menor && aluno.responsavel) {
    return { nome: aluno.responsavel.nome, cpf: aluno.responsavel.cpf };
  }

  return { nome: aluno.nome, cpf: aluno.cpf };
}

async function carregarContratoCompleto(where) {
  return Contrato.findOne({
    where,
    include: [
      {
        model: Aluno,
        as: 'aluno',
        attributes: ['id', 'nome', 'cpf', 'dataNascimento', 'email', 'telefone', 'responsavelId', 'unidadeId'],
        include: [
          { model: Responsavel, as: 'responsavel', attributes: ['id', 'nome', 'cpf', 'telefone', 'email'] },
          { model: Unidade, as: 'unidade', attributes: ['id', 'nome'] },
        ],
      },
      { model: Plano, as: 'plano' },
    ],
  });
}

// Preenche os {{marcadores}} do modelo com os dados do contrato. Marcador desconhecido fica como está.
async function montarTermo(contrato) {
  const configuracao = await obterConfiguracao();
  const { aluno, plano } = contrato;
  const pessoa = contratante(aluno);

  const valores = {
    contratante: pessoa.nome,
    cpfContratante: pessoa.cpf || 'não informado',
    aluno: aluno.nome,
    cpfAluno: aluno.cpf || 'não informado',
    dataNascimentoAluno: formatarData(aluno.dataNascimento),
    unidade: aluno.unidade?.nome || '-',
    plano: plano.nome,
    periodicidade: NOMES_PERIODICIDADE[plano.periodicidade] || plano.periodicidade,
    valor: formatarMoeda(contrato.valorFinal),
    diaVencimento: String(contrato.diaVencimento),
    dataInicio: formatarData(contrato.dataInicio),
    data: new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
  };

  return (configuracao?.termoContrato || '').replace(/\{\{(\w+)\}\}/g, (marcador, chave) => valores[chave] ?? marcador);
}

module.exports = { calcularValores, contratante, carregarContratoCompleto, montarTermo, obterConfiguracao };
