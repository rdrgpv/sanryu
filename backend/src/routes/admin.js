const express = require('express');
const auth = require('../middleware/auth');
const { exigirPerfil } = require('../middleware/auth');
const { exigirPermissao } = require('../middleware/permissoes');
const alunoController = require('../controllers/alunoController');
const turmaController = require('../controllers/turmaController');
const instrutorController = require('../controllers/instrutorController');
const matriculaController = require('../controllers/matriculaController');
const dashboardController = require('../controllers/dashboardController');
const faixaController = require('../controllers/faixaController');
const tipoEventoController = require('../controllers/tipoEventoController');
const eventoController = require('../controllers/eventoController');
const bancoController = require('../controllers/bancoController');
const configuracaoController = require('../controllers/configuracaoController');
const produtoController = require('../controllers/produtoController');
const corController = require('../controllers/corController');
const tamanhoController = require('../controllers/tamanhoController');
const produtoVariacaoController = require('../controllers/produtoVariacaoController');
const tipoPersonalizacaoController = require('../controllers/tipoPersonalizacaoController');
const estoqueMovimentacaoController = require('../controllers/estoqueMovimentacaoController');
const pedidoController = require('../controllers/pedidoController');
const fornecedorController = require('../controllers/fornecedorController');
const pedidoCompraController = require('../controllers/pedidoCompraController');
const autorizacaoController = require('../controllers/autorizacaoController');
const unidadeController = require('../controllers/unidadeController');
const responsavelController = require('../controllers/responsavelController');
const planoController = require('../controllers/planoController');
const contratoController = require('../controllers/contratoController');
const configuracaoAcademiaController = require('../controllers/configuracaoAcademiaController');
const mensalidadeController = require('../controllers/mensalidadeController');
const chamadaController = require('../controllers/chamadaController');
const financeiroController = require('../controllers/financeiroController');
const leadController = require('../controllers/leadController');
const usuarioController = require('../controllers/usuarioController');

const router = express.Router();

router.use(auth);
router.use(exigirPerfil('admin', 'recepcao'));
// Admin passa direto; recepção só no que está liberado em middleware/permissoes.js.
router.use(exigirPermissao);

router.get('/dashboard', dashboardController.resumo);

router.get('/usuarios', usuarioController.listar);
router.post('/usuarios', usuarioController.criar);
router.put('/usuarios/:id', usuarioController.atualizar);
router.delete('/usuarios/:id', usuarioController.remover);

router.get('/alunos', alunoController.listar);
router.post('/alunos', alunoController.criar);
router.get('/alunos/:id', alunoController.buscarPorId);
router.put('/alunos/:id', alunoController.atualizar);
router.delete('/alunos/:id', alunoController.remover);
router.post('/alunos/:id/matricular', alunoController.matricular);
router.get('/alunos/:id/verificar-gatame', alunoController.verificarGatame);
router.post('/alunos/:id/cadastrar-gatame', alunoController.cadastrarNoGatame);

router.get('/unidades', unidadeController.listar);
router.post('/unidades', unidadeController.criar);
router.get('/unidades/:id', unidadeController.buscarPorId);
router.put('/unidades/:id', unidadeController.atualizar);
router.delete('/unidades/:id', unidadeController.remover);

router.get('/responsaveis', responsavelController.listar);
router.post('/responsaveis', responsavelController.criar);
router.get('/responsaveis/:id', responsavelController.buscarPorId);
router.put('/responsaveis/:id', responsavelController.atualizar);
router.delete('/responsaveis/:id', responsavelController.remover);

router.get('/planos', planoController.listar);
router.post('/planos', planoController.criar);
router.get('/planos/:id', planoController.buscarPorId);
router.put('/planos/:id', planoController.atualizar);
router.delete('/planos/:id', planoController.remover);

router.get('/contratos', contratoController.listar);
router.post('/contratos', contratoController.criar);
router.post('/contratos/simular', contratoController.simular);
router.get('/contratos/:id', contratoController.buscarPorId);
router.put('/contratos/:id', contratoController.atualizar);
router.delete('/contratos/:id', contratoController.remover);
router.post('/contratos/:id/encerrar', contratoController.encerrar);
router.post('/contratos/:id/assinar', contratoController.assinarRecepcao);

router.get('/mensalidades', mensalidadeController.listar);
router.post('/mensalidades/gerar', mensalidadeController.gerar);
router.post('/mensalidades/:id/pagamento', mensalidadeController.registrarPagamento);
router.post('/mensalidades/:id/reabrir', mensalidadeController.reabrir);
router.post('/mensalidades/:id/cancelar', mensalidadeController.cancelar);
router.post('/mensalidades/:id/verificar-pagamento', mensalidadeController.verificarPagamento);
router.post('/mensalidades/:id/enviar-email', mensalidadeController.enviarEmail);

router.get('/frequencia', chamadaController.frequencia);

router.get('/leads', leadController.listar);
router.post('/leads', leadController.criar);
router.put('/leads/:id', leadController.atualizar);
router.delete('/leads/:id', leadController.remover);
router.post('/leads/:id/converter', leadController.converter);
router.post('/instrutores/:id/acesso', instrutorController.salvarAcesso);
router.delete('/instrutores/:id/acesso', instrutorController.removerAcesso);

router.get('/financeiro/resumo', financeiroController.resumo);
router.get('/financeiro/contas', financeiroController.listarContas);
router.post('/financeiro/contas', financeiroController.criarConta);
router.put('/financeiro/contas/:id', financeiroController.atualizarConta);
router.delete('/financeiro/contas/:id', financeiroController.removerConta);
router.get('/financeiro/categorias', financeiroController.listarCategorias);
router.post('/financeiro/categorias', financeiroController.criarCategoria);
router.put('/financeiro/categorias/:id', financeiroController.atualizarCategoria);
router.delete('/financeiro/categorias/:id', financeiroController.removerCategoria);
router.get('/financeiro/lancamentos', financeiroController.listarLancamentos);
router.post('/financeiro/lancamentos', financeiroController.criarLancamento);
router.put('/financeiro/lancamentos/:id', financeiroController.atualizarLancamento);
router.delete('/financeiro/lancamentos/:id', financeiroController.removerLancamento);
router.post('/financeiro/lancamentos/:id/baixar', financeiroController.baixarLancamento);
router.post('/financeiro/lancamentos/:id/estornar', financeiroController.estornarLancamento);
router.post('/financeiro/lancamentos/:id/cancelar', financeiroController.cancelarLancamento);
router.get('/financeiro/recorrencias', financeiroController.listarRecorrencias);
router.post('/financeiro/recorrencias', financeiroController.salvarRecorrencia);
router.put('/financeiro/recorrencias/:id', financeiroController.salvarRecorrencia);
router.delete('/financeiro/recorrencias/:id', financeiroController.removerRecorrencia);
router.get('/financeiro/transferencias', financeiroController.listarTransferencias);
router.post('/financeiro/transferencias', financeiroController.criarTransferencia);
router.delete('/financeiro/transferencias/:id', financeiroController.removerTransferencia);

router.get('/configuracao-academia', configuracaoAcademiaController.buscar);
router.put('/configuracao-academia', configuracaoAcademiaController.atualizar);

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

router.get('/faixas', faixaController.listar);
router.post('/faixas', faixaController.criar);
router.get('/faixas/:id', faixaController.buscarPorId);
router.put('/faixas/:id', faixaController.atualizar);
router.delete('/faixas/:id', faixaController.remover);

router.get('/tipos-evento', tipoEventoController.listar);
router.post('/tipos-evento', tipoEventoController.criar);
router.get('/tipos-evento/:id', tipoEventoController.buscarPorId);
router.put('/tipos-evento/:id', tipoEventoController.atualizar);
router.delete('/tipos-evento/:id', tipoEventoController.remover);

router.get('/eventos', eventoController.listar);
router.post('/eventos', eventoController.criar);
router.get('/eventos/:id', eventoController.buscarPorId);
router.put('/eventos/:id', eventoController.atualizar);
router.delete('/eventos/:id', eventoController.remover);
router.get('/eventos/:id/inscricoes', eventoController.listarInscricoes);
router.put('/inscricoes/:id', eventoController.atualizarInscricao);
router.post('/eventos/:id/notificar-pendentes', eventoController.notificarPendentes);
router.post('/inscricoes/:id/verificar-pagamento', eventoController.verificarPagamento);
router.post('/inscricoes/:id/cancelar-pagamento', eventoController.cancelarPagamento);
router.post('/inscricoes/:id/cadastrar-aluno', eventoController.cadastrarComoAluno);
router.post('/inscricoes/:id/cadastrar-gatame', eventoController.cadastrarNoGatame);
router.get('/eventos/:id/autorizacoes', autorizacaoController.listar);
router.delete('/autorizacoes/:id', autorizacaoController.remover);

router.get('/bancos', bancoController.listar);
router.post('/bancos', bancoController.criar);
router.get('/bancos/:id', bancoController.buscarPorId);
router.put('/bancos/:id', bancoController.atualizar);
router.delete('/bancos/:id', bancoController.remover);

router.get('/configuracoes', configuracaoController.listar);
router.post('/configuracoes', configuracaoController.criar);
router.put('/configuracoes/lote', configuracaoController.salvarLote);
router.get('/configuracoes/:id', configuracaoController.buscarPorId);
router.put('/configuracoes/:id', configuracaoController.atualizar);
router.delete('/configuracoes/:id', configuracaoController.remover);

router.get('/produtos', produtoController.listar);
router.post('/produtos', produtoController.criar);
router.get('/produtos/:id', produtoController.buscarPorId);
router.put('/produtos/:id', produtoController.atualizar);
router.delete('/produtos/:id', produtoController.remover);

router.get('/cores', corController.listar);
router.post('/cores', corController.criar);
router.get('/cores/:id', corController.buscarPorId);
router.put('/cores/:id', corController.atualizar);
router.delete('/cores/:id', corController.remover);

router.get('/tamanhos', tamanhoController.listar);
router.post('/tamanhos', tamanhoController.criar);
router.get('/tamanhos/:id', tamanhoController.buscarPorId);
router.put('/tamanhos/:id', tamanhoController.atualizar);
router.delete('/tamanhos/:id', tamanhoController.remover);

router.get('/produto-variacoes', produtoVariacaoController.listar);
router.post('/produto-variacoes', produtoVariacaoController.criar);
router.get('/produto-variacoes/:id', produtoVariacaoController.buscarPorId);
router.put('/produto-variacoes/:id', produtoVariacaoController.atualizar);
router.delete('/produto-variacoes/:id', produtoVariacaoController.remover);

router.get('/tipos-personalizacao', tipoPersonalizacaoController.listar);
router.post('/tipos-personalizacao', tipoPersonalizacaoController.criar);
router.get('/tipos-personalizacao/:id', tipoPersonalizacaoController.buscarPorId);
router.put('/tipos-personalizacao/:id', tipoPersonalizacaoController.atualizar);
router.delete('/tipos-personalizacao/:id', tipoPersonalizacaoController.remover);

router.get('/estoque-movimentacoes', estoqueMovimentacaoController.listar);
router.post('/estoque-movimentacoes', estoqueMovimentacaoController.criar);
router.put('/estoque-movimentacoes/:id', estoqueMovimentacaoController.atualizar);
router.delete('/estoque-movimentacoes/:id', estoqueMovimentacaoController.remover);

router.get('/pedidos', pedidoController.listar);
router.post('/pedidos', pedidoController.criar);
router.get('/pedidos/:id', pedidoController.buscarPorId);
router.put('/pedidos/:id', pedidoController.atualizar);
router.delete('/pedidos/:id', pedidoController.remover);
router.post('/pedidos/:id/entregar', pedidoController.entregar);
router.get('/pedidos/:id/itens-pendentes-compra', pedidoController.itensPendentesCompra);

router.get('/fornecedores', fornecedorController.listar);
router.post('/fornecedores', fornecedorController.criar);
router.get('/fornecedores/:id', fornecedorController.buscarPorId);
router.put('/fornecedores/:id', fornecedorController.atualizar);
router.delete('/fornecedores/:id', fornecedorController.remover);

router.get('/pedidos-compra', pedidoCompraController.listar);
router.get('/pedidos-compra/:id', pedidoCompraController.buscarPorId);
router.put('/pedidos-compra/:id', pedidoCompraController.atualizar);
router.delete('/pedidos-compra/:id', pedidoCompraController.remover);
router.post('/pedidos/:id/gerar-pedido-compra', pedidoCompraController.gerar);
router.post('/pedidos-compra/:id/receber-itens', pedidoCompraController.receberItens);
router.put('/pedidos-compra/:id/itens-valores', pedidoCompraController.atualizarValoresItens);
router.post('/pedidos-compra/:id/marcar-encomendado', pedidoCompraController.marcarComoEncomendado);
router.post('/pedidos-compra/:id/marcar-pago', pedidoCompraController.marcarComoPago);

module.exports = router;
