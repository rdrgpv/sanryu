const express = require('express');
const auth = require('../middleware/auth');
const { exigirPerfil } = require('../middleware/auth');
const portalController = require('../controllers/portalController');
const lojaController = require('../controllers/lojaController');

// Área do aluno/responsável. Login por código no e-mail (rotas abertas); o resto exige o token do
// portal, que não vale em nenhuma rota do admin nem da chamada (e vice-versa).
const router = express.Router();

router.post('/codigo', portalController.pedirCodigo);
router.post('/entrar', portalController.entrar);

router.use(auth);
router.use(exigirPerfil('portal'));

router.get('/eu', portalController.eu);
router.get('/alunos/:alunoId', portalController.resumoAluno);
router.get('/eventos', portalController.eventos);
router.get('/avisos', portalController.avisos);
router.get('/loja', lojaController.vitrine);
router.post('/loja/pedidos', lojaController.comprar);
router.get('/loja/pedidos', lojaController.meusPedidos);

module.exports = router;
