const { fn, col, where } = require('sequelize');
const { Faixa } = require('../models');

const TIPO_EXAME_DE_FAIXA_ID = 1;
const OPCOES_FAIXA_BRANCA = ['Cinza', 'Amarela'];

function calcularPagamento(valor) {
  return valor && Number(valor) > 0 ? 'pendente' : 'pago';
}

async function buscarFaixaPorNome(nome) {
  return Faixa.findOne({ where: where(fn('LOWER', col('nome')), nome.trim().toLowerCase()) });
}

// "Tem carteirinha" pra fins de valor exige número E validade em dia — sem data de validade (ou já
// vencida) conta como sem carteirinha. Datas "YYYY-MM-DD" sem horário: evita `new Date(string)`, que
// interpreta como meia-noite UTC e pode "voltar" um dia em fusos negativos como o do Brasil.
function carteirinhaValida(candidato) {
  if (!candidato.numeroCarteirinha || !candidato.validadeCarteirinha) {
    return false;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(candidato.validadeCarteirinha);

  if (!match) {
    return false;
  }

  const [, anoStr, mesStr, diaStr] = match;
  const fimDoDia = new Date(Number(anoStr), Number(mesStr) - 1, Number(diaStr), 23, 59, 59, 999);

  return fimDoDia.getTime() >= Date.now();
}

// Mesma lógica de progressão usada na tela pública (por "ordem", só faixas ativas) — repetida aqui
// porque o cálculo de valor precisa da faixa de destino de forma confiável no servidor, sem depender
// do que o navegador mandar (evita tanto bug de exibição quanto manipulação do valor pelo cliente).
async function proximaFaixa(nomeAtual) {
  const faixas = await Faixa.findAll({ where: { ativo: true }, order: [['ordem', 'ASC']] });
  const indice = faixas.findIndex((faixa) => faixa.nome.toLowerCase() === (nomeAtual || '').trim().toLowerCase());

  if (indice === -1 || indice === faixas.length - 1) {
    return null;
  }

  return faixas[indice + 1];
}

// Regra de valor (item 2 do módulo): tipo não cobrável -> sem valor; tipo cobrável comum -> valor do evento;
// Exame de Faixa -> valor vem do cadastro da faixa QUE A PESSOA VAI FAZER (não a atual), com/sem
// carteirinha, nunca do campo valor do evento. Só a origem "gatame" traz faixa confiável; sem ela (ou
// origem "morganti"), assume-se Branca — e, sendo Branca, a pessoa escolhe entre Cinza ou Amarela;
// nas demais faixas, a faixa de destino é a próxima da progressão (cadastro de Faixas, por "ordem").
async function calcularValorInscricao({ evento, tipoEvento, candidato, faixaEscolhida }) {
  if (!tipoEvento.cobravel) {
    return { valor: null, statusPagamento: 'pago', faixaAtual: null, faixaUsada: null };
  }

  if (tipoEvento.id !== TIPO_EXAME_DE_FAIXA_ID) {
    const valor = evento.valor;
    return { valor, statusPagamento: calcularPagamento(valor), faixaAtual: null, faixaUsada: null };
  }

  const origemConfiavel = candidato.origem === 'gatame';
  const faixaAtual = origemConfiavel && candidato.faixa ? candidato.faixa : 'Branca';

  let nomeFaixaParaValor = null;

  if (faixaAtual.trim().toLowerCase() === 'branca') {
    const escolhaValida = OPCOES_FAIXA_BRANCA.find(
      (opcao) => opcao.toLowerCase() === (faixaEscolhida || '').trim().toLowerCase()
    );

    if (!escolhaValida) {
      return {
        erroValidacao: 'Selecione para qual faixa você vai fazer o exame.',
        opcoesFaixa: OPCOES_FAIXA_BRANCA,
      };
    }

    nomeFaixaParaValor = escolhaValida;
  } else {
    const proxima = await proximaFaixa(faixaAtual);
    nomeFaixaParaValor = proxima ? proxima.nome : null;
  }

  const faixaCadastrada = nomeFaixaParaValor ? await buscarFaixaPorNome(nomeFaixaParaValor) : null;

  if (!faixaCadastrada) {
    return {
      valor: null,
      statusPagamento: 'pendente',
      faixaAtual,
      faixaUsada: nomeFaixaParaValor,
      aviso: nomeFaixaParaValor
        ? `Faixa "${nomeFaixaParaValor}" não encontrada no cadastro. Nossa equipe entrará em contato para confirmar o valor do exame.`
        : `Não encontramos a próxima faixa cadastrada depois de "${faixaAtual}". Nossa equipe entrará em contato para confirmar o valor do exame.`,
    };
  }

  const temCarteirinha = carteirinhaValida(candidato);
  const valor = temCarteirinha ? faixaCadastrada.valorComCarteirinha : faixaCadastrada.valorSemCarteirinha;

  return { valor, statusPagamento: calcularPagamento(valor), faixaAtual, faixaUsada: nomeFaixaParaValor };
}

module.exports = { calcularValorInscricao, TIPO_EXAME_DE_FAIXA_ID, OPCOES_FAIXA_BRANCA };
