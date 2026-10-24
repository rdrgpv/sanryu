const { Plano } = require('../models');
const { obterConfiguracao } = require('../services/contratoService');

// Dados públicos do site: contato da academia (rodapé, contato, WhatsApp) e planos à venda.
async function dados(req, res) {
  const [configuracao, planos] = await Promise.all([
    obterConfiguracao(),
    Plano.findAll({ where: { ativo: true, exibirNoSite: true }, order: [['valor', 'ASC']] }),
  ]);

  res.json({
    contato: {
      telefone: configuracao?.siteTelefone || null,
      whatsapp: configuracao?.siteWhatsapp || null,
      email: configuracao?.siteEmail || null,
      instagram: configuracao?.siteInstagram || null,
      endereco: configuracao?.siteEndereco || null,
      horarioFuncionamento: configuracao?.siteHorarioFuncionamento || null,
    },
    descontoFamiliaPercentual: Number(configuracao?.descontoFamiliaPercentual || 0),
    planos: planos.map((plano) => {
      const meses = Plano.MESES_POR_PERIODICIDADE[plano.periodicidade] || 1;
      return {
        id: plano.id,
        nome: plano.nome,
        descricao: plano.descricao,
        periodicidade: plano.periodicidade,
        valor: Number(plano.valor),
        valorMensal: Math.round((Number(plano.valor) / meses) * 100) / 100,
      };
    }),
  });
}

module.exports = { dados };
