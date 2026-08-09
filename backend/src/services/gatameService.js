const axios = require('axios');

const API_URL = process.env.GATAME_API_URL || 'https://SEU-SITE.com.br/wp-json/mjj/v1/aluno';
const MAX_TENTATIVAS = 3;
const ESPERA_BASE_MS = 1000;

function aguardar(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Consulta a API do Gatame usando a credencial fixa do sistema (nunca a do usuário final).
async function consultarAluno(emailAluno) {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      const resposta = await axios.post(API_URL, {
        email: process.env.GATAME_EMAIL,
        senha: process.env.GATAME_SENHA,
        email_aluno: emailAluno,
      });

      if (resposta.data?.sucesso) {
        return { apto: true, candidatos: resposta.data.dados || [] };
      }

      return { apto: false };
    } catch (err) {
      const status = err.response?.status;

      if (status === 404) {
        return { apto: false };
      }

      if (status === 401 || status === 403) {
        console.error(`Credencial fixa do Gatame rejeitada pela API (status ${status}). Verifique GATAME_EMAIL/GATAME_SENHA.`);
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
