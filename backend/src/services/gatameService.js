const axios = require('axios');
const configService = require('./configService');

const MAX_TENTATIVAS = 3;
const ESPERA_BASE_MS = 1000;

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Consulta a API do Gatame usando a credencial fixa do sistema (nunca a do usuário final),
// lida da tabela de configurações (sistema SAN) para poder ser trocada sem reiniciar o servidor.
async function consultarAluno(emailAluno) {
  const [apiUrl, email, senha] = await Promise.all([
    configService.obterValor('GATAME_URL'),
    configService.obterValor('GATAME_EMAIL'),
    configService.obterValor('GATAME_SENHA'),
  ]);

  if (!apiUrl || !email || !senha) {
    console.error('Configuração do Gatame incompleta (GATAME_URL/GATAME_EMAIL/GATAME_SENHA) em Configurações.');
    const erroConfig = new Error('Erro de configuração ao consultar API de carteirinha.');
    erroConfig.interno = true;
    throw erroConfig;
  }

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      const resposta = await axios.post(apiUrl, {
        email,
        senha,
        email_aluno: emailAluno,
      });

      if (resposta.data?.sucesso) {
        // "origem" vem no nível raiz da resposta (não por item de "dados"), então é replicada em cada candidato.
        const origem = resposta.data.origem;
        const candidatos = (resposta.data.dados || []).map((item) => ({ ...item, origem: item.origem || origem }));
        return { apto: true, candidatos };
      }

      return { apto: false };
    } catch (err) {
      const status = err.response?.status;

      if (status === 404) {
        return { apto: false };
      }

      if (status === 401 || status === 403) {
        console.error(`Credencial fixa do Gatame rejeitada pela API (status ${status}). Verifique GATAME_EMAIL/GATAME_SENHA em Configurações.`);
        const erroConfig = new Error('Erro de configuração ao consultar API de carteirinha.');
        erroConfig.interno = true;
        throw erroConfig;
      }

      if (status === 429 && tentativa < MAX_TENTATIVAS) {
        await aguardar(ESPERA_BASE_MS * tentativa);
        continue;
      }

      throw err;
    }
  }

  throw new Error('Não foi possível consultar a API de carteirinha após múltiplas tentativas.');
}

module.exports = { consultarAluno };
