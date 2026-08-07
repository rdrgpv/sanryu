const express = require('express');
const auth = require('../middleware/auth');
const alunoController = require('../controllers/alunoController');
const turmaController = require('../controllers/turmaController');
const instrutorController = require('../controllers/instrutorController');
const matriculaController = require('../controllers/matriculaController');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.use(auth);

router.get('/dashboard', dashboardController.resumo);

router.get('/alunos', alunoController.listar);
router.post('/alunos', alunoController.criar);
router.get('/alunos/:id', alunoController.buscarPorId);
router.put('/alunos/:id', alunoController.atualizar);
router.delete('/alunos/:id', alunoController.remover);
router.post('/alunos/:id/matricular', alunoController.matricular);

router.get('/turmas', turmaController.listar);
router.post('/turmas', turmaController.criar);
router.get('/turmas/:id', turmaController.buscarPorId);
router.put('/turmas/:id', turmaController.atualizar);
router.delete('/turmas/:id', turmaController.remover);

router.get('/instrutores', instrutorController.listar);
router.post('/instrutores', instrutorController.criar);
router.get('/instrutores/:id', instrutorController.buscarPorId);
router.put('/instrutores/:id', instrutorController.atualizar);
router.delete('/instrutores/:id', instrutorController.remover);

router.get('/matriculas', matriculaController.listar);
router.post('/matriculas', matriculaController.criar);
router.delete('/matriculas/:id', matriculaController.remover);

module.exports = router;
