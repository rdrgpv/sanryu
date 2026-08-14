const fs = require('fs');
const path = require('path');

// Pasta fixa dentro do próprio backend (fácil de achar pelo Gerenciador de Arquivos da Hostinger,
// sem depender de descobrir onde o painel guarda o stdout/stderr do processo Node).
const PASTA_LOGS = path.join(__dirname, '..', '..', 'logs');

function arquivoDoDia() {
  const data = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(PASTA_LOGS, `erros-${data}.log`);
}

// Sempre loga no console também (não muda o comportamento atual) e, além disso, grava em arquivo.
// Nunca lança — uma falha ao gravar o log não pode derrubar quem chamou.
function logErro(contexto, err) {
  console.error(contexto, err ?? '');

  try {
    if (!fs.existsSync(PASTA_LOGS)) {
      fs.mkdirSync(PASTA_LOGS, { recursive: true });
    }

    const detalhe = err?.stack || err?.message || (err ? String(err) : '');
    const linha = `[${new Date().toISOString()}] ${contexto}${detalhe ? ' ' + detalhe : ''}\n`;
    fs.appendFileSync(arquivoDoDia(), linha);
  } catch (erroAoGravar) {
    console.error('Falha ao gravar log de erro em arquivo:', erroAoGravar.message);
  }
}

module.exports = { logErro };
