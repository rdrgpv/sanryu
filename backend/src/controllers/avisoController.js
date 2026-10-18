const { Aviso } = require('../models');
const avisoService = require('../services/avisoService');
const { logErro } = require('../utils/logger');

const PRECISA_ALVO = ['unidade', 'turma', 'evento'];

function validarPublico(publico, alvoId) {
  if (!Aviso.PUBLICOS.includes(publico)) return 'Escolha para quem é o aviso.';
  if (PRECISA_ALVO.includes(publico) && !alvoId) return 'Escolha a unidade, turma ou evento.';
  return null;
}

async function listar(req, res) {
  res.json(await Aviso.findAll({ order: [['createdAt', 'DESC']], limit: 100 }));
}

// Quantos vão receber (antes de enviar): evita mandar pro público errado.
async function previa(req, res) {
  const { publico } = req.body;
  const alvoId = req.body.alvoId || null;
  const erro = validarPublico(publico, alvoId);
  if (erro) return res.status(400).json({ error: erro });

  const { destinatarios, semEmail } = await avisoService.destinatariosDo(publico, alvoId);
  res.json({
    total: destinatarios.length,
    semEmail,
    exemplos: destinatarios.slice(0, 8).map((destinatario) => destinatario.nome),
    descricao: await avisoService.descreverPublico(publico, alvoId),
  });
}

async function criar(req, res) {
  const titulo = (req.body.titulo || '').trim();
  const mensagem = (req.body.mensagem || '').trim();
  const { publico } = req.body;
  const alvoId = req.body.alvoId || null;
  const enviarEmail = req.body.enviarEmail !== false;
  const mostrarNoPortal = Boolean(req.body.mostrarNoPortal);

  if (!titulo || !mensagem) return res.status(400).json({ error: 'Informe o título e a mensagem.' });
  const erro = validarPublico(publico, alvoId);
  if (erro) return res.status(400).json({ error: erro });
  if (!enviarEmail && !mostrarNoPortal) return res.status(400).json({ error: 'Marque enviar por e-mail e/ou mostrar na área do aluno.' });
  if (mostrarNoPortal && !['todos', 'unidade', 'turma'].includes(publico)) {
    return res.status(400).json({ error: 'Na área do aluno só aparecem avisos para todos, uma unidade ou uma turma.' });
  }

  const aviso = await Aviso.create({
    titulo,
    mensagem,
    publico,
    alvoId,
    descricaoPublico: await avisoService.descreverPublico(publico, alvoId),
    enviarEmail,
    mostrarNoPortal,
    status: enviarEmail ? 'enviando' : 'concluido',
    criadoPorId: req.admin.id,
  });

  // Responde na hora; o envio segue em segundo plano (a tela acompanha os contadores).
  if (enviarEmail) {
    avisoService.enviar(aviso).catch((err) => {
      logErro(`Erro no envio do aviso ${aviso.id}:`, err);
      aviso.update({ status: 'concluido' }).catch(() => {});
    });
  }

  res.status(201).json(aviso);
}

// Apaga o registro (some da área do aluno). E-mail já enviado não tem como "desenviar".
async function remover(req, res) {
  await Aviso.destroy({ where: { id: req.params.id } });
  res.status(204).send();
}

module.exports = { listar, previa, criar, remover };
