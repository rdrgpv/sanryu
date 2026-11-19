import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CBadge, CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilSend } from '@coreui/icons';
import api from '../../services/api';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';
import { formatarData, labelForma } from '../../utils/financeiro.js';
import ItensDoPedido from '../../admin/components/ItensDoPedido.jsx';
import { linkWhatsapp, textoPagamentoCompra } from '../../utils/whatsappCompras.js';

// Comprovante do pagamento agrupado: pra imprimir/salvar em PDF ou mandar pelo WhatsApp ao fornecedor,
// mostrando quais pedidos e itens estão sendo pagos.
export default function PagamentoCompraVisualizar() {
  const { id } = useParams();
  const [pagamento, setPagamento] = useState(null);
  const [emissor, setEmissor] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get(`/admin/pagamentos-compra/${id}`)
      .then((res) => setPagamento(res.data))
      .catch(() => setErro('Pagamento agrupado não encontrado.'));
    api
      .get('/admin/configuracao-academia')
      .then((res) => setEmissor(res.data))
      .catch(() => setEmissor(null));
  }, [id]);

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!pagamento) return <p>Carregando...</p>;

  const fornecedor = pagamento.fornecedor || {};
  const lancamento = pagamento.lancamento;
  const pago = lancamento?.status === 'pago';
  const ativos = pagamento.pedidos.filter((pedido) => pedido.situacao !== 'E');
  const cancelados = pagamento.pedidos.filter((pedido) => pedido.situacao === 'E');
  const total = pago ? lancamento.valorPago ?? lancamento.valor : lancamento?.valor ?? ativos.reduce((soma, pedido) => soma + Number(pedido.valorTotal), 0);

  return (
    <div>
      <div className="d-print-none d-flex flex-wrap gap-2 align-items-center mb-3">
        <Link to="/admin/pedidos-compra" className="text-body-secondary text-decoration-none me-auto">
          &larr; Pedidos de compra
        </Link>
        <CButton
          color="success"
          variant="outline"
          href={linkWhatsapp(fornecedor.telefone, textoPagamentoCompra(pagamento, emissor))}
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

      <div className="pagamento-compra-documento">
        <div className="d-flex justify-content-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="h4 mb-1">{pago ? 'Comprovante de pagamento' : 'Pagamento a fornecedor'}</h1>
            <div className="text-body-secondary small">
              Pagamento agrupado #{pagamento.id} ·{' '}
              {pago ? <CBadge color="success">Pago</CBadge> : lancamento?.status === 'cancelado' ? <CBadge color="secondary">Cancelado</CBadge> : <CBadge color="warning">A pagar</CBadge>}
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
            <div className="text-body-secondary text-uppercase" style={{ fontSize: '0.7rem' }}>Pagamento</div>
            <div>Vencimento: {formatarData(lancamento?.vencimento || pagamento.vencimento)}</div>
            {pago && <div>Pago em: {formatarData(lancamento.dataPagamento)}</div>}
            {pago && lancamento.formaPagamento && <div>Forma: {labelForma(lancamento.formaPagamento)}</div>}
            <div>
              Pedidos: {ativos.map((pedido) => `#${pedido.id}`).join(', ')}
            </div>
          </div>
        </div>

        {ativos.map((pedido) => (
          <div key={pedido.id} className="mb-3" style={{ breakInside: 'avoid' }}>
            <div className="fw-semibold small mb-1">
              Pedido de compra #{pedido.id} · {formatarDataHora(pedido.dataPedido)} · {formatarMoeda(pedido.valorTotal)}
            </div>
            <ItensDoPedido itens={pedido.itens} tipo="compra" mostrarRecebido={false} mostrarCodigo={false} />
          </div>
        ))}

        <div className="d-flex justify-content-end border-top pt-2 mt-2">
          <div className="text-end">
            <div className="small text-body-secondary">{pago ? 'Total pago' : 'Total a pagar'}</div>
            <div className="fs-4 fw-bold">{formatarMoeda(total)}</div>
          </div>
        </div>

        {cancelados.length > 0 && (
          <p className="small text-body-secondary mt-2">
            Pedidos cancelados no grupo (fora do total): {cancelados.map((pedido) => `#${pedido.id}`).join(', ')}.
          </p>
        )}
        {pagamento.observacao && (
          <div className="small mt-3">
            <strong>Observações:</strong>
            <div style={{ whiteSpace: 'pre-line' }}>{pagamento.observacao}</div>
          </div>
        )}
      </div>
    </div>
  );
}
