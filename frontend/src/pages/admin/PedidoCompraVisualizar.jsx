import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CBadge, CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilSend } from '@coreui/icons';
import api from '../../services/api';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';
import { formatarData } from '../../utils/financeiro.js';
import ItensDoPedido from '../../admin/components/ItensDoPedido.jsx';
import { linkWhatsapp, textoPedidoCompra } from '../../utils/whatsappCompras.js';

const SITUACOES = { P: 'Pendente', X: 'Encomendado', PG: 'Pago', R: 'Recebido', E: 'Cancelado' };

// Qualquer pedido de compra como documento: pra imprimir/salvar em PDF ou mandar pelo WhatsApp ao
// fornecedor. Depois de pago, vira o comprovante de pagamento.
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
  const pago = Boolean(pedido.dataPagamento);

  return (
    <div>
      <div className="d-print-none d-flex flex-wrap gap-2 align-items-center mb-3">
        <Link to="/admin/pedidos-compra" className="text-body-secondary text-decoration-none me-auto">
          &larr; Pedidos de compra
        </Link>
        <CButton color="secondary" variant="outline" as={Link} to={`/admin/pedidos-compra/${pedido.id}`}>
          Editar / receber
        </CButton>
        <CButton
          color="success"
          variant="outline"
          href={linkWhatsapp(fornecedor.telefone, textoPedidoCompra(pedido, emissor))}
          target="_blank"
          rel="noopener noreferrer"
          title={fornecedor.telefone ? `Enviar para ${fornecedor.telefone}` : 'Fornecedor sem telefone: o WhatsApp abre pra você escolher o contato'}
        >
          <CIcon icon={cilSend} className="me-1" />
          Enviar por WhatsApp
        </CButton>
        <CButton color="primary" onClick={() => window.print()}>
          <CIcon icon={cilPrint} className="me-1" />
          Imprimir / salvar PDF
        </CButton>
      </div>
      {!fornecedor.telefone && (
        <div className="d-print-none alert alert-warning py-2 small">
          O fornecedor não tem telefone cadastrado: o WhatsApp vai abrir pra você escolher o contato.
        </div>
      )}
      {pedido.pagamentoCompraId && (
        <div className="d-print-none alert alert-info py-2 small">
          Este pedido faz parte do <Link to={`/admin/pagamentos-compra/${pedido.pagamentoCompraId}`}>pagamento agrupado #{pedido.pagamentoCompraId}</Link>, que tem o
          comprovante com todos os pedidos pagos juntos.
        </div>
      )}

      <div className="pedido-compra-documento">
        <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h4 mb-1">{pago ? 'Comprovante de pagamento' : 'Pedido de compra'} #{pedido.id}</h1>
            <div className="text-body-secondary small">
              Emitido em {formatarDataHora(pedido.dataPedido)} ·{' '}
              <CBadge color={pedido.situacao === 'E' ? 'secondary' : pago ? 'success' : 'warning'}>{SITUACOES[pedido.situacao] || pedido.situacao}</CBadge>
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
            {pago && <div>Pago em: {new Date(pedido.dataPagamento).toLocaleDateString('pt-BR')}</div>}
            {pedido.dataRecebimento && <div>Recebido em: {new Date(pedido.dataRecebimento).toLocaleDateString('pt-BR')}</div>}
          </div>
        </div>

        <ItensDoPedido itens={pedido.itens} tipo="compra" mostrarRecebido={false} mostrarCodigo={false} />

        <div className="d-flex justify-content-end border-top pt-2 mt-2">
          <div className="text-end">
            <div className="small text-body-secondary">{pago ? 'Total pago' : 'Total'}</div>
            <div className="fs-4 fw-bold">{formatarMoeda(pedido.valorTotal)}</div>
          </div>
        </div>

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
