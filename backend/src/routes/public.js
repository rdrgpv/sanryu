const express = require('express');
const turmaController = require('../controllers/turmaController');
const instrutorController = require('../controllers/instrutorController');
const contatoController = require('../controllers/contatoController');

const router = express.Router();

router.get('/turmas', turmaController.listar);
router.get('/instrutores', instrutorController.listar);
router.post('/contato', contatoController.enviar);

module.exports = router;
