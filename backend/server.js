require('dotenv').config();
const app = require('./src/app');
const { sequelize } = require('./src/models');
const { aplicarAjustesIniciais } = require('./src/config/ajustesIniciais');
const { rotinaCobranca } = require('./src/services/mensalidadeService');
const { sincronizarOrigens } = require('./src/services/financeiroService');
const { enviarLembretes: enviarLembretesAulaExperimental } = require('./src/services/leadService');
const { cancelarNaoPagos: cancelarPedidosLojaNaoPagos } = require('./src/services/lojaService');
const { logErro } = require('./src/utils/logger');

const PORT = process.env.PORT || 4000;

// sequelize.sync() sincroniza as tabelas em ordem de dependência (FK), mas para no primeiro erro —
// uma tabela com problema (ex.: índice único conflitante) travava a sincronização de TODAS as
// tabelas seguintes na ordem, mesmo sem relação nenhuma com o problema. Aqui, se o sync em lote
// falhar, cai pra sincronizar tabela por tabela (mesma ordem seguraque o sync() usa por baixo dos
// panos) e segue adiante mesmo se uma falhar, em vez de abortar tudo.
async function sincronizarBanco(options) {
  try {
    await sequelize.sync(options);
  } catch (erroEmLote) {
    logErro('sequelize.sync() em lote falhou, tentando tabela por tabela:', erroEmLote);

    const modelosOrdenados = sequelize.modelManager.getModelsTopoSortedByForeignKey();
    const ordemSegura = modelosOrdenados ? [...modelosOrdenados].reverse() : sequelize.modelManager.models;

    for (const model of ordemSegura) {
      try {
        await model.sync(options);
      } catch (erroModelo) {
        logErro(`Falha ao sincronizar a tabela "${model.name}":`, erroModelo);
      }
    }
  }
}

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Servidor San·Ryu Dojo rodando em http://0.0.0.0:${PORT}`);

  try {
    await sequelize.authenticate();
    // alter:true reconstrói tabelas via backup-table no SQLite (dialeto sem ALTER TABLE
    // completo), o que corrompe índices únicos compostos — mantém sync() simples ali e
    // só usa alter no MySQL (ALTER TABLE nativo, seguro para esse tipo de mudança aditiva).
    await sincronizarBanco({ alter: sequelize.getDialect() !== 'sqlite' });
    await aplicarAjustesIniciais();
    console.log('Banco de dados conectado.');
    agendarRotinaCobranca();
  } catch (error) {
    logErro('Erro ao conectar/sincronizar o banco de dados:', error);
  }
});

// Mensalidades: gera as cobranças que faltam, confere Pix pendentes (reserva do webhook) e manda os
// e-mails do dia. Roda 1 min depois de subir e depois de hora em hora — tudo idempotente, então
// rodar a mais (ou o servidor reiniciar) não duplica nada. Desligável com ROTINA_COBRANCA=off.
function agendarRotinaCobranca() {
  if (process.env.ROTINA_COBRANCA === 'off') return;

  // Depois da cobrança, sincroniza o financeiro (mensalidades pagas, vendas, compras, recorrências).
  const executar = () =>
    rotinaCobranca()
      .then((resultado) => {
        if (resultado && (resultado.geradas || resultado.baixadas || resultado.avisos)) {
          console.log('Rotina de cobrança:', resultado);
        }
      })
      .then(() => sincronizarOrigens())
      .then(() => enviarLembretesAulaExperimental())
      .then(() => cancelarPedidosLojaNaoPagos())
      .catch((err) => logErro('Erro na rotina horária:', err));

  setTimeout(executar, 60 * 1000);
  setInterval(executar, 60 * 60 * 1000);
}
