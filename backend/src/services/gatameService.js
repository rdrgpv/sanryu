const axios = require('axios');
const configService = require('./configService');
const { logErro } = require('../utils/logger');

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
    logErro('Configuração do Gatame incompleta (GATAME_URL/GATAME_EMAIL/GATAME_SENHA) em Configurações.');
    const erroConfig = new Error('Erro de configuração ao consultar API de carteirinha.');
    erroConfig.interno = true;
    throw erroConfig;
  }

  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa += 1) {
    try {
      const resposta = await axios.post(
        apiUrl,
        { email, senha, email_aluno: emailAluno },
        { timeout: 15000 }
      );

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
        logErro(`Credencial fixa do Gatame rejeitada pela API (status ${status}). Verifique GATAME_EMAIL/GATAME_SENHA em Configurações.`);
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

// Cadastra um aluno novo no Gatame (endpoint /aluno/cadastrar, irmão do endpoint de consulta —
// mesma base de URL). Precisa de um professor já cadastrado no Gatame como responsável
// (email_professor); é isso que liga ao "instrutor responsável" do Evento no lado do Sanryu.
async function cadastrarAluno({ emailProfessor, emailAluno, nome, faixa, tamanhoFaixa, dataNascimento, numeroCarteirinha, observacao }) {
  const [apiUrl, email, senha] = await Promise.all([
    configService.obterValor('GATAME_URL'),
    configService.obterValor('GATAME_EMAIL'),
    configService.obterValor('GATAME_SENHA'),
  ]);

  if (!apiUrl || !email || !senha) {
    logErro('Configuração do Gatame incompleta (GATAME_URL/GATAME_EMAIL/GATAME_SENHA) em Configurações.');
    const erroConfig = new Error('Erro de configuração ao cadastrar aluno no Gatame.');
    erroConfig.interno = true;
    throw erroConfig;
  }

  // Endpoint de cadastro é sempre a URL de consulta + "/cadastrar" (mesma base, documentado assim).
  const urlCadastro = `${apiUrl.replace(/\/$/, '')}/cadastrar`;

  try {
    const resposta = await axios.post(
      urlCadastro,
      {
        email,
        senha,
        email_professor: emailProfessor,
        email_aluno: emailAluno,
        nome,
        faixa,
        tamanho_faixa: tamanhoFaixa || undefined,
        data_nascimento: dataNascimento || undefined,
        numero_carteirinha: numeroCarteirinha || undefined,
        observacao: observacao || undefined,
      },
      { timeout: 15000 }
    );

    return resposta.data?.dados || null;
  } catch (err) {
    const status = err.response?.status;

    if (status === 401 || status === 403) {
      logErro(`Credencial fixa do Gatame rejeitada pela API (status ${status}) ao cadastrar aluno. Verifique GATAME_EMAIL/GATAME_SENHA em Configurações.`);
      const erroConfig = new Error('Erro de configuração ao cadastrar aluno no Gatame.');
      erroConfig.interno = true;
      throw erroConfig;
    }

    // Erros de validação do Gatame (professor não encontrado, aluno duplicado, faixa inválida etc.)
    // já vêm com uma mensagem pronta pra mostrar — repassa direto em vez de mascarar com genérico.
    const corpo = err.response?.data;
    if (corpo?.erro) {
      const erroValidacao = new Error(corpo.erro);
      erroValidacao.codigo = corpo.codigo;
      erroValidacao.status = status;
      throw erroValidacao;
    }

    throw err;
  }
}

module.exports = { consultarAluno, cadastrarAluno };
