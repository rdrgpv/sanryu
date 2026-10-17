const express = require('express');
const auth = require('../middleware/auth');
const { exigirPerfil } = require('../middleware/auth');
const chamadaController = require('../controllers/chamadaController');

// Rotas da chamada no celular. Instrutor só enxerga as próprias turmas (checado no controller);
// admin também pode usar, pra fazer chamada de qualquer turma.
const router = express.Router();

router.use(auth);
router.use(exigirPerfil('instrutor', 'admin'));

router.get('/turmas', chamadaController.listarTurmas);
router.get('/turmas/:turmaId/chamada', chamadaController.buscarChamada);
router.put('/turmas/:turmaId/chamada', chamadaController.salvarChamada);

module.exports = router;
