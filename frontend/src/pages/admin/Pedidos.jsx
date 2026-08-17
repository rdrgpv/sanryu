import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CBadge,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

const SITUACOES = {
  P: { label: 'Pendente', cor: 'secondary' },
  C: { label: 'Compra solicitada', cor: 'info' },
  F: { label: 'Entregue', cor: 'success' },
  E: { label: 'Cancelado', cor: 'danger' },
};

function rotuloVariacao(v) {
  if (!v) return '-';
  return [v.produto?.descricao, v.cor?.descricao, v.tamanho?.descricao].filter(Boolean).join(' — ');
}

export default function Pedidos() {
  const navigate = useNavigate();
  const [pedidos, setPedidos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [detalhe, setDetalhe] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  async function carregarPedidos() {
    const res = await api.get('/admin/pedidos');
    setPedidos(res.data);
  }

  useEffect(() => {
    carregarPedidos();
  }, []);

  const selecionado = pedidos.find((p) => p.id === selecionadoId) || null;

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este pedido?')) return;
    try {
      await api.delete(`/admin/pedidos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarPedidos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o pedido.');
    }
  }

  async function handleEntregar() {
    if (!selecionado) return;
    if (!window.confirm('Confirmar entrega deste pedido? Isso vai baixar o estoque.')) return;
    try {
      await api.post(`/admin/pedidos/${selecionado.id}/entregar`);
      carregarPedidos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível entregar o pedido.');
    }
  }

  async function abrirDetalhe() {
    if (!selecionadoId) return;
    setCarregandoDetalhe(true);
    try {
      const res = await api.get(`/admin/pedidos/${selecionadoId}`);
      setDetalhe(res.data);
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível carregar os detalhes do pedido.');
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Pedidos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        podeExcluir={selecionado?.situacao === 'P'}
        onNovo={() => navigate('/admin/pedidos/novo')}
        onEditar={() => navigate(`/admin/pedidos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarPedidos}
        extra={
          <>
            <CButton color="secondary" variant="outline" disabled={!selecionadoId} onClick={abrirDetalhe}>
              Detalhe
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={selecionado?.situacao !== 'P'}
              onClick={() => navigate(`/admin/pedidos/${selecionadoId}/gerar-pedido-compra`)}
            >
              Gerar pedido de compra
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionado || !['P', 'C'].includes(selecionado.situacao)}
              onClick={handleEntregar}
            >
              Entregar
            </CButton>
          </>
        }
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Cliente</CTableHeaderCell>
            <CTableHeaderCell>Telefone</CTableHeaderCell>
            <CTableHeaderCell>Data</CTableHeaderCell>
            <CTableHeaderCell>Situação</CTableHeaderCell>
            <CTableHeaderCell>Total</CTableHeaderCell>
            <CTableHeaderCell>Previsão de entrega</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {pedidos.map((pedido) => (
            <CTableRow key={pedido.id} active={selecionadoId === pedido.id} onClick={() => selecionarLinha(pedido.id)}>
              <CTableDataCell>{pedido.nomeCliente}</CTableDataCell>
              <CTableDataCell>{pedido.telefoneCliente || '-'}</CTableDataCell>
              <CTableDataCell>{formatarDataHora(pedido.dataPedido)}</CTableDataCell>
              <CTableDataCell>
                <CBadge color={SITUACOES[pedido.situacao]?.cor || 'secondary'}>
                  {SITUACOES[pedido.situacao]?.label || pedido.situacao}
                </CBadge>
              </CTableDataCell>
              <CTableDataCell>{formatarMoeda(pedido.valorTotal)}</CTableDataCell>
              <CTableDataCell>{pedido.dataPrevistaEntrega || '-'}</CTableDataCell>
            </CTableRow>
          ))}
          {pedidos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={6} className="text-body-secondary">
                Nenhum pedido cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>

      <CModal visible={!!detalhe || carregandoDetalhe} onClose={() => setDetalhe(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Pedido {detalhe ? `#${detalhe.id}` : ''}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          {!detalhe ? (
            <p className="text-body-secondary mb-0">Carregando...</p>
          ) : (
            <>
              <div className="d-flex align-items-center gap-2 mb-3">
                <CBadge color={SITUACOES[detalhe.situacao]?.cor || 'secondary'}>
                  {SITUACOES[detalhe.situacao]?.label || detalhe.situacao}
                </CBadge>
                <span className="text-body-secondary small">{formatarDataHora(detalhe.dataPedido)}</span>
              </div>

              <p className="mb-1">
                <strong>Cliente:</strong> {detalhe.nomeCliente}
              </p>
              {detalhe.telefoneCliente && (
                <p className="mb-1">
                  <strong>Telefone:</strong> {detalhe.telefoneCliente}
                </p>
              )}
              {detalhe.emailCliente && (
                <p className="mb-1">
                  <strong>Email:</strong> {detalhe.emailCliente}
                </p>
              )}
              {detalhe.dataPrevistaEntrega && (
                <p className="mb-1">
                  <strong>Previsão de entrega:</strong> {detalhe.dataPrevistaEntrega}
                </p>
              )}
              {detalhe.observacao && (
                <p className="mb-1">
                  <strong>Observação:</strong> {detalhe.observacao}
                </p>
              )}

              <hr className="my-3" />

              <CTable bordered small className="bg-white">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell>Variação</CTableHeaderCell>
                    <CTableHeaderCell>Qtd</CTableHeaderCell>
                    <CTableHeaderCell>Valor unit.</CTableHeaderCell>
                    <CTableHeaderCell>Valor total</CTableHeaderCell>
                    <CTableHeaderCell>Personalizações</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {(detalhe.itens || []).map((item) => (
                    <CTableRow key={item.id}>
                      <CTableDataCell>{rotuloVariacao(item.produtoVariacao)}</CTableDataCell>
                      <CTableDataCell>{item.quantidade}</CTableDataCell>
                      <CTableDataCell>{formatarMoeda(item.valorUnitario)}</CTableDataCell>
                      <CTableDataCell>{formatarMoeda(item.valorTotal)}</CTableDataCell>
                      <CTableDataCell>
                        {(item.personalizacoes || []).length === 0
                          ? '-'
                          : item.personalizacoes.map((p) => (
                              <div key={p.id} className="small">
                                {p.tipoPersonalizacao?.descricao || 'Personalização'}
                                {p.textoPersonalizado ? `: ${p.textoPersonalizado}` : ''} ({formatarMoeda(p.valor)})
                              </div>
                            ))}
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                  {(detalhe.itens || []).length === 0 && (
                    <CTableRow>
                      <CTableDataCell colSpan={5} className="text-body-secondary">
                        Nenhum item.
                      </CTableDataCell>
                    </CTableRow>
                  )}
                </CTableBody>
              </CTable>

              <div className="d-flex justify-content-end">
                <div style={{ minWidth: 240 }}>
                  <div className="d-flex justify-content-between">
                    <span>Produtos</span>
                    <span>{formatarMoeda(detalhe.valorProdutos)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Personalizações</span>
                    <span>{formatarMoeda(detalhe.valorPersonalizacoes)}</span>
                  </div>
                  <div className="d-flex justify-content-between">
                    <span>Desconto</span>
                    <span>-{formatarMoeda(detalhe.valorDesconto)}</span>
                  </div>
                  <div className="d-flex justify-content-between fw-bold">
                    <span>Total</span>
                    <span>{formatarMoeda(detalhe.valorTotal)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setDetalhe(null)}>
            Fechar
          </CButton>
          {detalhe && (
            <CButton color="primary" onClick={() => navigate(`/admin/pedidos/${detalhe.id}/editar`)}>
              Editar
            </CButton>
          )}
        </CModalFooter>
      </CModal>
    </div>
  );
}
