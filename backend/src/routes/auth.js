const express = require('express');
const { login } = require('../controllers/authController');
const auth = require('../middleware/auth');
const { exigirPerfil } = require('../middleware/auth');
const { trocarMinhaSenha } = require('../controllers/usuarioController');

const router = express.Router();

router.post('/login', login);
router.put('/senha', auth, exigirPerfil('admin', 'recepcao', 'instrutor'), trocarMinhaSenha);

module.exports = router;
