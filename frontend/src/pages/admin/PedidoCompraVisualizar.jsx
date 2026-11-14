import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint } from '@coreui/icons';
import api from '../../services/api';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';
import { formatarData } from '../../utils/financeiro.js';

const SITUACOES = { P: 'Pendente', X: 'Encomendado', PG: 'Pago', R: 'Recebido', E: 'Cancelado' };

function descricaoDoItem(item) {
  const variacao = item.produtoVariacao;
  return [variacao?.produto?.descricao, variacao?.cor?.descricao, variacao?.tamanho?.descricao].filter(Boolean).join(' — ');
}

// O pedido de compra como documento: pra conferir, imprimir ou salvar em PDF e mandar ao fornecedor.
export default function PedidoCompraVisualizar() {
  const { id } = useParams();
  const [pedido, setPedido] = useState(null);
  const [emissor, setEmissor] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/pedidos-compra/${id}`)
      .then((res) => setPedido(res.data))
      .catch(() => setErro('Pedido de compra não encontrado.'));
    api
      .get('/admin/configuracao-academia')
      .then((res) => setEmissor(res.data))
      .catch(() => setEmissor(null));
  }, [id]);

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!pedido) return <p>Carregando...</p>;

  const fornecedor = pedido.fornecedor || {};

  return (
    <div>
      <div className="d-print-none d-flex flex-wrap gap-2 align-items-center mb-3">
        <Link to="/admin/pedidos-compra" className="text-body-secondary text-decoration-none me-auto">
          &larr; Pedidos de compra
        </Link>
        <CButton color="secondary" variant="outline" as={Link} to={`/admin/pedidos-compra/${pedido.id}`}>
          Editar / receber
        </CButton>
        <CButton color="primary" onClick={() => window.print()}>
          <CIcon icon={cilPrint} className="me-1" />
          Imprimir / salvar PDF
        </CButton>
      </div>

      <div className="pedido-compra-documento">
        <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h4 mb-1">Pedido de compra #{pedido.id}</h1>
            <div className="text-body-secondary small">
              Emitido em {formatarDataHora(pedido.dataPedido)} · {SITUACOES[pedido.situacao] || pedido.situacao}
            </div>
          </div>
          <div className="text-end small">
            <strong>{emissor?.reciboNome || 'San·Ryu Dojo'}</strong>
            {emissor?.reciboDocumento && <div>{emissor.reciboDocumento}</div>}
            {(emissor?.reciboEndereco || emissor?.siteEndereco) && <div>{emissor.reciboEndereco || emissor.siteEndereco}</div>}
            {emissor?.siteTelefone && <div>{emissor.siteTelefone}</div>}
          </div>
        </div>

        <div className="row g-3 mb-4 small">
          <div className="col-sm-6">
            <div className="text-body-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Fornecedor</div>
            <strong>{fornecedor.nome}</strong>
            {fornecedor.cnpjCpf && <div>{fornecedor.cnpjCpf}</div>}
            {fornecedor.telefone && <div>{fornecedor.telefone}</div>}
            {fornecedor.email && <div>{fornecedor.email}</div>}
          </div>
          <div className="col-sm-6">
            <div className="text-body-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Entrega e pagamento</div>
            <div>Previsão de entrega: {formatarData(pedido.dataPrevistaEntrega)}</div>
            {pedido.dataPagamento && <div>Pago em: {new Date(pedido.dataPagamento).toLocaleDateString('pt-BR')}</div>}
            {pedido.dataRecebimento && <div>Recebido em: {new Date(pedido.dataRecebimento).toLocaleDateString('pt-BR')}</div>}
            {pedido.pagamentoCompraId && <div>Pagamento agrupado #{pedido.pagamentoCompraId}</div>}
          </div>
        </div>

        <table className="table table-sm align-middle">
          <thead>
            <tr>
              <th>Código</th>
              <th>Item</th>
              <th className="text-end">Qtd.</th>
              <th className="text-end">Valor unit.</th>
              <th className="text-end">Total</th>
            </tr>
          </thead>
          <tbody>
            {(pedido.itens || []).map((item) => (
              <tr key={item.id}>
                <td className="text-nowrap">{item.produtoVariacao?.codigo}</td>
                <td>{descricaoDoItem(item)}</td>
                <td className="text-end">{item.quantidade}</td>
                <td className="text-end text-nowrap">{formatarMoeda(item.valorUnitario)}</td>
                <td className="text-end text-nowrap">{formatarMoeda(item.valorTotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={2}>Total</th>
              <th className="text-end">{(pedido.itens || []).reduce((soma, item) => soma + item.quantidade, 0)}</th>
              <th />
              <th className="text-end text-nowrap">{formatarMoeda(pedido.valorTotal)}</th>
            </tr>
          </tfoot>
        </table>

        {pedido.observacao && (
          <div className="small mt-3">
            <strong>Observações:</strong>
            <div style={{ whiteSpace: 'pre-line' }}>{pedido.observacao}</div>
          </div>
        )}
      </div>
    </div>
  );
}
