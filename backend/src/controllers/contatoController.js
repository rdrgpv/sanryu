async function enviar(req, res) {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ error: 'Nome, email e mensagem são obrigatórios.' });
  }

  console.log('[Contato] Nova mensagem recebida:', { nome, email, mensagem });

  res.status(201).json({ message: 'Mensagem recebida com sucesso.' });
}

module.exports = { enviar };
