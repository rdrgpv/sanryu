const express = require('express');
const turmaController = require('../controllers/turmaController');
const instrutorController = require('../controllers/instrutorController');
const contatoController = require('../controllers/contatoController');
const inscricaoController = require('../controllers/inscricaoController');
const faixaController = require('../controllers/faixaController');
const autorizacaoController = require('../controllers/autorizacaoController');

const router = express.Router();

router.get('/turmas', turmaController.listar);
router.get('/instrutores', instrutorController.listar);
router.post('/contato', contatoController.enviar);
router.get('/faixas', faixaController.listarPublico);

router.get('/eventos', inscricaoController.listarPublicados);
router.get('/eventos/:id/publico', inscricaoController.buscarPublico);
router.post('/eventos/:id/consulta', inscricaoController.consultarCarteirinha);
router.post('/eventos/:id/inscricoes', inscricaoController.inscrever);
router.get('/eventos/:id/autorizacao', autorizacaoController.buscarPublico);
router.post('/eventos/:id/autorizacoes', autorizacaoController.criar);

module.exports = router;
