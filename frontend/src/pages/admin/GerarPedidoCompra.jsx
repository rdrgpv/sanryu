import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
  CButton,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react';
import api from '../../services/api';

function rotuloVariacao(v) {
  if (!v) return '-';
  return `${[v.produto?.descricao, v.cor?.descricao, v.tamanho?.descricao].filter(Boolean).join(' — ')} (${v.codigo})`;
}

export default function GerarPedidoCompra() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [pedido, setPedido] = useState(null);
  const [linhas, setLinhas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/fornecedores?ativo=true').then((res) => setFornecedores(res.data));
  }, []);

  useEffect(() => {
    Promise.all([api.get(`/admin/pedidos/${id}`), api.get(`/admin/pedidos/${id}/itens-pendentes-compra`)]).then(
      ([resPedido, resPendentes]) => {
        setPedido(resPedido.data);
        const pendentesPorItem = Object.fromEntries(resPendentes.data.map((p) => [p.pedidoItemId, p]));
        const itensComPendencia = (resPedido.data.itens || [])
          .map((item) => {
            const pendencia = pendentesPorItem[item.id];
            return {
              pedidoItemId: item.id,
              produtoVariacao: item.produtoVariacao,
              quantidadePedida: item.quantidade,
              quantidadeAlocada: pendencia ? item.quantidade - pendencia.pendente : 0,
              pendente: pendencia ? pendencia.pendente : 0,
              quantidadeComprar: pendencia ? String(pendencia.pendente) : '0',
            };
          })
          .filter((item) => item.pendente > 0);
        setLinhas(itensComPendencia);
      }
    );
  }, [id]);

  function handleQuantidadeChange(pedidoItemId, valor) {
    setLinhas((prev) => prev.map((l) => (l.pedidoItemId === pedidoItemId ? { ...l, quantidadeComprar: valor } : l)));
  }

  async function handleGerar() {
    setErro(null);

    if (!fornecedorId) {
      setErro('Selecione um fornecedor.');
      return;
    }

    const selecoes = linhas
      .map((l) => ({ pedidoItemId: l.pedidoItemId, quantidade: Number(l.quantidadeComprar) || 0 }))
      .filter((s) => s.quantidade > 0);

    if (selecoes.length === 0) {
      setErro('Informe ao menos uma quantidade a comprar.');
      return;
    }

    try {
      const res = await api.post(`/admin/pedidos/${id}/gerar-pedido-compra`, { fornecedorId: Number(fornecedorId), selecoes });
      navigate(`/admin/pedidos-compra/${res.data.id}`);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao gerar pedido de compra.');
    }
  }

  if (!pedido) return null;

  return (
    <div>
      <Link to="/admin/pedidos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-1">Gerar pedido de compra</h1>
      <p className="text-body-secondary mb-3">Pedido #{pedido.id} — {pedido.nomeCliente}</p>

      {linhas.length === 0 ? (
        <div className="alert alert-info">Todos os itens deste pedido já estão totalmente alocados a pedidos de compra.</div>
      ) : (
        <CCard>
          <CCardBody>
            <CForm>
              <CRow className="g-3 mb-3">
                <CCol md={4}>
                  <CFormLabel>Fornecedor</CFormLabel>
                  <CFormSelect value={fornecedorId} onChange={(e) => setFornecedorId(e.target.value)}>
                    <option value="">Selecione</option>
                    {fornecedores.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              <CTable bordered responsive className="bg-white">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Variação</CTableHeaderCell>
                    <CTableHeaderCell>Quantidade pedida</CTableHeaderCell>
                    <CTableHeaderCell>Já alocado</CTableHeaderCell>
                    <CTableHeaderCell>Pendente</CTableHeaderCell>
                    <CTableHeaderCell>Quantidade a comprar</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {linhas.map((linha) => (
                    <CTableRow key={linha.pedidoItemId}>
                      <CTableDataCell>{rotuloVariacao(linha.produtoVariacao)}</CTableDataCell>
                      <CTableDataCell>{linha.quantidadePedida}</CTableDataCell>
                      <CTableDataCell>{linha.quantidadeAlocada}</CTableDataCell>
                      <CTableDataCell>{linha.pendente}</CTableDataCell>
                      <CTableDataCell>
                        <CFormInput
                          type="number"
                          min="0"
                          max={linha.pendente}
                          style={{ width: 100 }}
                          value={linha.quantidadeComprar}
                          onChange={(e) => handleQuantidadeChange(linha.pedidoItemId, e.target.value)}
                        />
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>

              <div className="d-flex gap-2 mt-3">
                <CButton color="primary" type="button" onClick={handleGerar}>
                  Gerar pedido de compra
                </CButton>
                <CButton as={Link} to="/admin/pedidos" color="secondary" variant="outline">
                  Cancelar
                </CButton>
              </div>
              {erro && <div className="alert alert-danger mt-3">{erro}</div>}
            </CForm>
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}
