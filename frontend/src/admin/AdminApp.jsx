import { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Dashboard from '../pages/admin/Dashboard.jsx';
import Alunos from '../pages/admin/Alunos.jsx';
import AlunoForm from '../pages/admin/AlunoForm.jsx';
import Turmas from '../pages/admin/Turmas.jsx';
import TurmaForm from '../pages/admin/TurmaForm.jsx';
import Instrutores from '../pages/admin/Instrutores.jsx';
import InstrutorForm from '../pages/admin/InstrutorForm.jsx';
import Faixas from '../pages/admin/Faixas.jsx';
import FaixaForm from '../pages/admin/FaixaForm.jsx';
import TiposEvento from '../pages/admin/TiposEvento.jsx';
import TipoEventoForm from '../pages/admin/TipoEventoForm.jsx';
import EventosAdmin from '../pages/admin/Eventos.jsx';
import EventoForm from '../pages/admin/EventoForm.jsx';
import EventoInscricoes from '../pages/admin/EventoInscricoes.jsx';
import RelatorioExame from '../pages/admin/RelatorioExame.jsx';
import Bancos from '../pages/admin/Bancos.jsx';
import BancoForm from '../pages/admin/BancoForm.jsx';
import Configuracoes from '../pages/admin/Configuracoes.jsx';
import Produtos from '../pages/admin/Produtos.jsx';
import ProdutoForm from '../pages/admin/ProdutoForm.jsx';
import Cores from '../pages/admin/Cores.jsx';
import CorForm from '../pages/admin/CorForm.jsx';
import Tamanhos from '../pages/admin/Tamanhos.jsx';
import TamanhoForm from '../pages/admin/TamanhoForm.jsx';
import TiposPersonalizacao from '../pages/admin/TiposPersonalizacao.jsx';
import TipoPersonalizacaoForm from '../pages/admin/TipoPersonalizacaoForm.jsx';
import ProdutoVariacoes from '../pages/admin/ProdutoVariacoes.jsx';
import ProdutoVariacaoForm from '../pages/admin/ProdutoVariacaoForm.jsx';
import ProdutoVariacaoMovimentacoes from '../pages/admin/ProdutoVariacaoMovimentacoes.jsx';
import Pedidos from '../pages/admin/Pedidos.jsx';
import PedidoForm from '../pages/admin/PedidoForm.jsx';
import Fornecedores from '../pages/admin/Fornecedores.jsx';
import FornecedorForm from '../pages/admin/FornecedorForm.jsx';
import PedidosCompra from '../pages/admin/PedidosCompra.jsx';
import PedidoCompraDetalhe from '../pages/admin/PedidoCompraDetalhe.jsx';
import GerarPedidoCompra from '../pages/admin/GerarPedidoCompra.jsx';
import AdminRoute from '../components/AdminRoute.jsx';
import coreuiCssUrl from '@coreui/coreui/dist/css/coreui.min.css?url';
import adminCssUrl from './admin.css?url';

export default function AdminApp() {
  // O CSS do admin (CoreUI/Bootstrap) só pode existir enquanto o painel está montado — importado
  // estaticamente, o <link> injetado pelo Vite nunca sai do <head>, e um redirecionamento pra
  // /login (sessão expirada) herda os estilos do Bootstrap por cima dos da página pública.
  useEffect(() => {
    const links = [coreuiCssUrl, adminCssUrl].map((href) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      document.head.appendChild(link);
      return link;
    });

    return () => links.forEach((link) => link.remove());
  }, []);

  return (
    <Routes>
      <Route index element={<AdminRoute><Dashboard /></AdminRoute>} />

      <Route path="alunos" element={<AdminRoute><Alunos /></AdminRoute>} />
      <Route path="alunos/novo" element={<AdminRoute><AlunoForm /></AdminRoute>} />
      <Route path="alunos/:id/editar" element={<AdminRoute><AlunoForm /></AdminRoute>} />

      <Route path="turmas" element={<AdminRoute><Turmas /></AdminRoute>} />
      <Route path="turmas/novo" element={<AdminRoute><TurmaForm /></AdminRoute>} />
      <Route path="turmas/:id/editar" element={<AdminRoute><TurmaForm /></AdminRoute>} />

      <Route path="instrutores" element={<AdminRoute><Instrutores /></AdminRoute>} />
      <Route path="instrutores/novo" element={<AdminRoute><InstrutorForm /></AdminRoute>} />
      <Route path="instrutores/:id/editar" element={<AdminRoute><InstrutorForm /></AdminRoute>} />

      <Route path="faixas" element={<AdminRoute><Faixas /></AdminRoute>} />
      <Route path="faixas/novo" element={<AdminRoute><FaixaForm /></AdminRoute>} />
      <Route path="faixas/:id/editar" element={<AdminRoute><FaixaForm /></AdminRoute>} />

      <Route path="tipos-evento" element={<AdminRoute><TiposEvento /></AdminRoute>} />
      <Route path="tipos-evento/novo" element={<AdminRoute><TipoEventoForm /></AdminRoute>} />
      <Route path="tipos-evento/:id/editar" element={<AdminRoute><TipoEventoForm /></AdminRoute>} />

      <Route path="eventos" element={<AdminRoute><EventosAdmin /></AdminRoute>} />
      <Route path="eventos/novo" element={<AdminRoute><EventoForm /></AdminRoute>} />
      <Route path="eventos/:id/editar" element={<AdminRoute><EventoForm /></AdminRoute>} />
      <Route path="eventos/:id/inscricoes" element={<AdminRoute><EventoInscricoes /></AdminRoute>} />
      <Route path="eventos/:id/relatorio-exame" element={<AdminRoute><RelatorioExame /></AdminRoute>} />

      <Route path="bancos" element={<AdminRoute><Bancos /></AdminRoute>} />
      <Route path="bancos/novo" element={<AdminRoute><BancoForm /></AdminRoute>} />
      <Route path="bancos/:id/editar" element={<AdminRoute><BancoForm /></AdminRoute>} />

      <Route path="configuracoes" element={<AdminRoute><Configuracoes /></AdminRoute>} />

      <Route path="produtos" element={<AdminRoute><Produtos /></AdminRoute>} />
      <Route path="produtos/novo" element={<AdminRoute><ProdutoForm /></AdminRoute>} />
      <Route path="produtos/:id/editar" element={<AdminRoute><ProdutoForm /></AdminRoute>} />

      <Route path="cores" element={<AdminRoute><Cores /></AdminRoute>} />
      <Route path="cores/novo" element={<AdminRoute><CorForm /></AdminRoute>} />
      <Route path="cores/:id/editar" element={<AdminRoute><CorForm /></AdminRoute>} />

      <Route path="tamanhos" element={<AdminRoute><Tamanhos /></AdminRoute>} />
      <Route path="tamanhos/novo" element={<AdminRoute><TamanhoForm /></AdminRoute>} />
      <Route path="tamanhos/:id/editar" element={<AdminRoute><TamanhoForm /></AdminRoute>} />

      <Route path="tipos-personalizacao" element={<AdminRoute><TiposPersonalizacao /></AdminRoute>} />
      <Route path="tipos-personalizacao/novo" element={<AdminRoute><TipoPersonalizacaoForm /></AdminRoute>} />
      <Route path="tipos-personalizacao/:id/editar" element={<AdminRoute><TipoPersonalizacaoForm /></AdminRoute>} />

      <Route path="produto-variacoes" element={<AdminRoute><ProdutoVariacoes /></AdminRoute>} />
      <Route path="produto-variacoes/novo" element={<AdminRoute><ProdutoVariacaoForm /></AdminRoute>} />
      <Route path="produto-variacoes/:id/editar" element={<AdminRoute><ProdutoVariacaoForm /></AdminRoute>} />
      <Route path="produto-variacoes/:id/movimentacoes" element={<AdminRoute><ProdutoVariacaoMovimentacoes /></AdminRoute>} />

      <Route path="pedidos" element={<AdminRoute><Pedidos /></AdminRoute>} />
      <Route path="pedidos/novo" element={<AdminRoute><PedidoForm /></AdminRoute>} />
      <Route path="pedidos/:id/editar" element={<AdminRoute><PedidoForm /></AdminRoute>} />
      <Route path="pedidos/:id/gerar-pedido-compra" element={<AdminRoute><GerarPedidoCompra /></AdminRoute>} />

      <Route path="fornecedores" element={<AdminRoute><Fornecedores /></AdminRoute>} />
      <Route path="fornecedores/novo" element={<AdminRoute><FornecedorForm /></AdminRoute>} />
      <Route path="fornecedores/:id/editar" element={<AdminRoute><FornecedorForm /></AdminRoute>} />

      <Route path="pedidos-compra" element={<AdminRoute><PedidosCompra /></AdminRoute>} />
      <Route path="pedidos-compra/:id" element={<AdminRoute><PedidoCompraDetalhe /></AdminRoute>} />
    </Routes>
  );
}
