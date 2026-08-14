const fs = require('fs');
const path = require('path');

// Pasta fixa dentro do próprio backend (fácil de achar pelo Gerenciador de Arquivos da Hostinger,
// sem depender de descobrir onde o painel guarda o stdout/stderr do processo Node).
const PASTA_LOGS = path.join(__dirname, '..', '..', 'logs');

function arquivoDoDia() {
  const data = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(PASTA_LOGS, `erros-${data}.log`);
}

// Erros do Sequelize (principalmente MySQL) embrulham o erro de verdade do driver em
// `.parent`/`.original` (com sqlMessage/code/sql) e erros de validação em `.errors` — sem isso, só
// sobra "Error" genérico no log, sem nenhuma pista do que realmente aconteceu no banco.
function detalharErro(err) {
  if (!err) return '';

  const partes = [err.stack || err.message || String(err)];

  const causaOriginal = err.parent || err.original;
  if (causaOriginal) {
    partes.push(
      `[causa original] code=${causaOriginal.code || '?'} errno=${causaOriginal.errno || '?'} sqlMessage=${causaOriginal.sqlMessage || causaOriginal.message || '?'}${causaOriginal.sql ? ` sql=${causaOriginal.sql}` : ''}`
    );
  }

  if (Array.isArray(err.errors) && err.errors.length) {
    partes.push(`[detalhes] ${err.errors.map((e) => e.message).join(' | ')}`);
  }

  return partes.join('\n');
}

// Sempre loga no console também (não muda o comportamento atual) e, além disso, grava em arquivo.
// Nunca lança — uma falha ao gravar o log não pode derrubar quem chamou.
function logErro(contexto, err) {
  console.error(contexto, err ?? '');

  try {
    if (!fs.existsSync(PASTA_LOGS)) {
      fs.mkdirSync(PASTA_LOGS, { recursive: true });
    }

    const detalhe = detalharErro(err);
    const linha = `[${new Date().toISOString()}] ${contexto}${detalhe ? ' ' + detalhe : ''}\n`;
    fs.appendFileSync(arquivoDoDia(), linha);
  } catch (erroAoGravar) {
    console.error('Falha ao gravar log de erro em arquivo:', erroAoGravar.message);
  }
}

module.exports = { logErro };
