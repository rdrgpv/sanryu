const { obterConfiguracao } = require('../services/contratoService');

async function buscar(req, res) {
  res.json(await obterConfiguracao());
}

// Mudar o texto ou o desconto família não altera contratos já assinados (eles guardam o texto e os
// valores da época) — só vale para os próximos.
async function atualizar(req, res) {
  const configuracao = await obterConfiguracao();
  const desconto = Number(req.body.descontoFamiliaPercentual);

  if (!Number.isFinite(desconto) || desconto < 0 || desconto > 100) {
    return res.status(400).json({ error: 'O desconto família deve ser entre 0 e 100%.' });
  }

  if (!(req.body.termoContrato || '').trim()) {
    return res.status(400).json({ error: 'O texto do contrato não pode ficar vazio.' });
  }

  const multa = Number(req.body.multaPercentual ?? configuracao.multaPercentual);
  const juros = Number(req.body.jurosMensalPercentual ?? configuracao.jurosMensalPercentual);
  const antecedencia = Number(req.body.diasAntecedenciaCobranca ?? configuracao.diasAntecedenciaCobranca);

  // Tetos legais: multa até 2% (CDC, art. 52) e juros de mora até 1% ao mês (Código Civil, art. 406).
  if (!(multa >= 0 && multa <= 2) || !(juros >= 0 && juros <= 1)) {
    return res.status(400).json({ error: 'A multa vai até 2% (CDC) e os juros de mora até 1% ao mês.' });
  }

  if (!Number.isInteger(antecedencia) || antecedencia < 0 || antecedencia > 28) {
    return res.status(400).json({ error: 'A antecedência da cobrança deve ser de 0 a 28 dias.' });
  }

  await configuracao.update({
    descontoFamiliaPercentual: desconto,
    multaPercentual: multa,
    jurosMensalPercentual: juros,
    diasAntecedenciaCobranca: antecedencia,
    termoContrato: req.body.termoContrato,
  });
  res.json(configuracao);
}

module.exports = { buscar, atualizar };
