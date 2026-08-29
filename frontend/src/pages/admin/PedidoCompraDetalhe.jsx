import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CRow,
  CCol,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CBadge,
} from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

const SITUACOES = {
  P: { label: 'Pendente', cor: 'secondary' },
  X: { label: 'Encomendado', cor: 'info' },
  PG: { label: 'Pago', cor: 'warning' },
  R: { label: 'Recebido', cor: 'success' },
  E: { label: 'Cancelado', cor: 'danger' },
};

function rotuloVariacao(v) {
  return [v.produto?.descricao, v.cor?.descricao, v.tamanho?.descricao].filter(Boolean).join(' — ');
}

export default function PedidoCompraDetalhe() {
  const { id } = useParams();
  const [pedidoCompra, setPedidoCompra] = useState(null);
  const [camposCabecalho, setCamposCabecalho] = useState({ observacao: '', dataPrevistaEntrega: '' });
  const [recebimentos, setRecebimentos] = useState({});
  const [valoresUnitarios, setValoresUnitarios] = useState({});
  const [salvandoValores, setSalvandoValores] = useState(false);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  async function carregar() {
    const res = await api.get(`/admin/pedidos-compra/${id}`);
    setPedidoCompra(res.data);
    setCamposCabecalho({
      observacao: res.data.observacao || '',
      dataPrevistaEntrega: res.data.dataPrevistaEntrega || '',
    });
    const iniciais = {};
    const valores = {};
    (res.data.itens || []).forEach((item) => {
      const pendente = item.quantidade - item.quantidadeRecebida;
      if (pendente > 0) iniciais[item.id] = pendente;
      valores[item.id] = item.valorUnitario;
    });
    setRecebimentos(iniciais);
    setValoresUnitarios(valores);
  }

  useEffect(() => {
    carregar();
  }, [id]);

  function handleCabecalhoChange(event) {
    const { name, value } = event.target;
    setCamposCabecalho((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSalvarCabecalho(event) {
    event.preventDefault();
    setErro(null);
    setMensagem(null);
    try {
      await api.put(`/admin/pedidos-compra/${id}`, camposCabecalho);
      setMensagem('Dados salvos.');
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar.');
    }
  }

  function handleRecebimentoChange(itemId, valor) {
    setRecebimentos((prev) => ({ ...prev, [itemId]: valor }));
  }

  function handleValorUnitarioChange(itemId, valor) {
    setValoresUnitarios((prev) => ({ ...prev, [itemId]: valor }));
  }

  // Ajusta o preço negociado com o fornecedor — o valor gravado na geração do pedido é só uma
  // cópia inicial do custo cadastrado na variação. Não muda o custo cadastrado no produto, só o
  // valor deste pedido de compra.
  async function handleSalvarValores() {
    const itens = (pedidoCompra.itens || []).map((item) => ({
      id: item.id,
      valorUnitario: Number(valoresUnitarios[item.id]),
    }));

    if (itens.some((item) => !(item.valorUnitario >= 0))) {
      setErro('Informe um valor unitário válido para todos os itens.');
      return;
    }

    setSalvandoValores(true);
    setErro(null);
    setMensagem(null);
    try {
      await api.put(`/admin/pedidos-compra/${id}/itens-valores`, { itens });
      setMensagem('Valores atualizados.');
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar os valores.');
    } finally {
      setSalvandoValores(false);
    }
  }

  async function handleConfirmarRecebimento() {
    const itens = Object.entries(recebimentos)
      .map(([pedidoCompraItemId, quantidade]) => ({ pedidoCompraItemId: Number(pedidoCompraItemId), quantidade: Number(quantidade) }))
      .filter((item) => item.quantidade > 0);

    if (itens.length === 0) {
      setErro('Informe ao menos uma quantidade para receber.');
      return;
    }

    setErro(null);
    setMensagem(null);
    try {
      await api.post(`/admin/pedidos-compra/${id}/receber-itens`, { itens });
      setMensagem('Recebimento confirmado.');
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao confirmar recebimento.');
    }
  }

  if (!pedidoCompra) return null;

  // Itens ainda podem ser recebidos mesmo depois de pago (PG) — pagamento e recebimento físico são
  // coisas diferentes. Já o valor unitário trava assim que marcado como pago: mudar o preço depois
  // de já ter pago não faz sentido, então o backend só aceita edição em P/X (sem PG).
  const podeReceber = ['P', 'X', 'PG'].includes(pedidoCompra.situacao);
  const podeEditarValores = ['P', 'X'].includes(pedidoCompra.situacao);

  return (
    <div>
      <Link to="/admin/pedidos-compra" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <div className="d-flex align-items-center gap-3 mb-3">
        <h1 className="h3 mb-0">Pedido de compra #{pedidoCompra.id}</h1>
        <CBadge color={SITUACOES[pedidoCompra.situacao]?.cor || 'secondary'}>
          {SITUACOES[pedidoCompra.situacao]?.label || pedidoCompra.situacao}
        </CBadge>
      </div>

      <CCard className="mb-3">
        <CCardBody>
          <CForm onSubmit={handleSalvarCabecalho}>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Fornecedor</CFormLabel>
                <CFormInput value={pedidoCompra.fornecedor?.nome || ''} disabled readOnly />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Valor total</CFormLabel>
                <CFormInput value={formatarMoeda(pedidoCompra.valorTotal)} disabled readOnly />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Previsão de entrega</CFormLabel>
                <CFormInput
                  type="date"
                  name="dataPrevistaEntrega"
                  value={camposCabecalho.dataPrevistaEntrega}
                  onChange={handleCabecalhoChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Pago em</CFormLabel>
                <CFormInput value={formatarDataHora(pedidoCompra.dataPagamento)} disabled readOnly />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Recebido em</CFormLabel>
                <CFormInput
                  value={formatarDataHora(pedidoCompra.dataRecebimento)}
                  disabled
                  readOnly
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Observação</CFormLabel>
                <CFormTextarea name="observacao" rows={2} value={camposCabecalho.observacao} onChange={handleCabecalhoChange} />
              </CCol>
            </CRow>
            <div className="mt-3">
              <CButton type="submit" color="primary" size="sm">
                Salvar
              </CButton>
            </div>
            {mensagem && <div className="alert alert-success mt-3 mb-0">{mensagem}</div>}
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CForm>
        </CCardBody>
      </CCard>

      <h2 className="h5 mb-3">Itens</h2>
      <CTable bordered responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Variação</CTableHeaderCell>
            <CTableHeaderCell>Pedido</CTableHeaderCell>
            <CTableHeaderCell>Recebido</CTableHeaderCell>
            <CTableHeaderCell>Pendente</CTableHeaderCell>
            <CTableHeaderCell>Valor unit.</CTableHeaderCell>
            <CTableHeaderCell>Valor total</CTableHeaderCell>
            {podeReceber && <CTableHeaderCell>Receber agora</CTableHeaderCell>}
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {(pedidoCompra.itens || []).map((item) => {
            const pendente = item.quantidade - item.quantidadeRecebida;
            return (
              <CTableRow key={item.id}>
                <CTableDataCell>{rotuloVariacao(item.produtoVariacao)}</CTableDataCell>
                <CTableDataCell>{item.quantidade}</CTableDataCell>
                <CTableDataCell>{item.quantidadeRecebida}</CTableDataCell>
                <CTableDataCell>{pendente}</CTableDataCell>
                <CTableDataCell>
                  {podeEditarValores ? (
                    <CFormInput
                      type="number"
                      min="0"
                      step="0.01"
                      style={{ width: 120 }}
                      value={valoresUnitarios[item.id] ?? ''}
                      onChange={(e) => handleValorUnitarioChange(item.id, e.target.value)}
                    />
                  ) : (
                    formatarMoeda(item.valorUnitario)
                  )}
                </CTableDataCell>
                <CTableDataCell>{formatarMoeda(item.valorTotal)}</CTableDataCell>
                {podeReceber && (
                  <CTableDataCell>
                    {pendente > 0 && (
                      <CFormInput
                        type="number"
                        min="0"
                        style={{ width: 100 }}
                        value={recebimentos[item.id] ?? ''}
                        onChange={(e) => handleRecebimentoChange(item.id, e.target.value)}
                      />
                    )}
                  </CTableDataCell>
                )}
              </CTableRow>
            );
          })}
        </CTableBody>
      </CTable>

      {(podeEditarValores || podeReceber) && (
        <div className="d-flex gap-2 mt-3">
          {podeEditarValores && (
            <CButton color="secondary" variant="outline" disabled={salvandoValores} onClick={handleSalvarValores}>
              {salvandoValores ? 'Salvando...' : 'Salvar valores'}
            </CButton>
          )}
          {podeReceber && (
            <CButton color="primary" onClick={handleConfirmarRecebimento}>
              Confirmar recebimento
            </CButton>
          )}
        </div>
      )}
    </div>
  );
}
