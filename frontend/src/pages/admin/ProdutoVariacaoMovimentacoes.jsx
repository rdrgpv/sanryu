import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
  CButtonGroup,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
  CCard,
  CCardBody,
} from '@coreui/react';
import api from '../../services/api';

const TIPOS = [
  { codigo: 'E', label: 'Entrada' },
  { codigo: 'S', label: 'Saída' },
  { codigo: 'A', label: 'Ajuste' },
];

// Movimentações não têm hora "pura" — dataMovimentacao é DATE de verdade (com hora), então
// new Date(iso) aqui é seguro (não é uma string "YYYY-MM-DD" bare).
function formatarDataHora(iso) {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '-';
}

const formularioInicial = { tipoMovimentacao: 'E', quantidade: '', documentoOrigem: '', observacao: '' };

export default function ProdutoVariacaoMovimentacoes() {
  const { id } = useParams();
  const [variacao, setVariacao] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState(formularioInicial);
  const [erro, setErro] = useState(null);

  async function carregarVariacao() {
    const res = await api.get(`/admin/produto-variacoes/${id}`);
    setVariacao(res.data);
  }

  async function carregarMovimentacoes() {
    const res = await api.get('/admin/estoque-movimentacoes', { params: { produtoVariacaoId: id } });
    setMovimentacoes(res.data);
  }

  useEffect(() => {
    carregarVariacao();
    carregarMovimentacoes();
  }, [id]);

  const selecionado = movimentacoes.find((m) => m.id === selecionadoId) || null;
  const selecionadoGeradoPeloSistema = !!(selecionado && (selecionado.pedidoCompraItemId || selecionado.pedidoItemId));

  function selecionarLinha(movId) {
    setSelecionadoId((atual) => (atual === movId ? null : movId));
  }

  function abrirNovo() {
    setForm(formularioInicial);
    setEditandoId(null);
    setErro(null);
    setMostrarForm(true);
  }

  function abrirEdicao() {
    if (!selecionado || selecionadoGeradoPeloSistema) return;
    setForm({
      tipoMovimentacao: selecionado.tipoMovimentacao,
      quantidade: selecionado.quantidade,
      documentoOrigem: selecionado.documentoOrigem || '',
      observacao: selecionado.observacao || '',
    });
    setEditandoId(selecionado.id);
    setErro(null);
    setMostrarForm(true);
  }

  async function handleExcluir() {
    if (!selecionado || selecionadoGeradoPeloSistema) return;
    if (!window.confirm('Tem certeza que deseja excluir esta movimentação?')) return;
    try {
      await api.delete(`/admin/estoque-movimentacoes/${selecionado.id}`);
      setSelecionadoId(null);
      carregarVariacao();
      carregarMovimentacoes();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir a movimentação.');
    }
  }

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = {
      produtoVariacaoId: Number(id),
      tipoMovimentacao: form.tipoMovimentacao,
      quantidade: Number(form.quantidade),
      documentoOrigem: form.documentoOrigem.trim() || null,
      observacao: form.observacao.trim() || null,
    };

    try {
      if (editandoId) {
        await api.put(`/admin/estoque-movimentacoes/${editandoId}`, payload);
      } else {
        await api.post('/admin/estoque-movimentacoes', payload);
      }
      setMostrarForm(false);
      setSelecionadoId(null);
      carregarVariacao();
      carregarMovimentacoes();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar movimentação.');
    }
  }

  if (!variacao) return null;

  const titulo = [variacao.produto?.descricao, variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' — ');

  return (
    <div>
      <Link to="/admin/produto-variacoes" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-1">Movimentações — {titulo}</h1>
      <p className="text-body-secondary mb-3">Código {variacao.codigo}</p>

      <CRow className="g-3 mb-3">
        <CCol md={4}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary small">Saldo atual</div>
              <div className="fs-4">{variacao.quantidadeEstoque}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary small">Reservado</div>
              <div className="fs-4">{variacao.quantidadeReservada ?? 0}</div>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol md={4}>
          <CCard>
            <CCardBody>
              <div className="text-body-secondary small">Disponível</div>
              <div className="fs-4">{variacao.saldoDisponivel ?? variacao.quantidadeEstoque}</div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CButtonGroup role="group" className="mb-3">
        <CButton color="primary" onClick={abrirNovo}>
          Adicionar movimentação
        </CButton>
        <CButton color="secondary" variant="outline" disabled={!selecionado || selecionadoGeradoPeloSistema} onClick={abrirEdicao}>
          Editar
        </CButton>
        <CButton color="danger" variant="outline" disabled={!selecionado || selecionadoGeradoPeloSistema} onClick={handleExcluir}>
          Excluir
        </CButton>
        <CButton color="secondary" variant="outline" onClick={carregarMovimentacoes}>
          Atualizar
        </CButton>
      </CButtonGroup>

      {mostrarForm && (
        <CCard className="mb-3">
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
              <CRow className="g-3 align-items-end">
                <CCol md={2}>
                  <CFormLabel>Tipo</CFormLabel>
                  <CFormSelect name="tipoMovimentacao" value={form.tipoMovimentacao} onChange={handleChange}>
                    {TIPOS.map((tipo) => (
                      <option key={tipo.codigo} value={tipo.codigo}>
                        {tipo.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Quantidade</CFormLabel>
                  <CFormInput type="number" min="1" name="quantidade" value={form.quantidade} onChange={handleChange} required />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Documento de origem</CFormLabel>
                  <CFormInput name="documentoOrigem" value={form.documentoOrigem} onChange={handleChange} />
                </CCol>
                <CCol md={3}>
                  <CFormLabel>Observação</CFormLabel>
                  <CFormInput name="observacao" value={form.observacao} onChange={handleChange} />
                </CCol>
                <CCol md={2} className="d-flex gap-2">
                  <CButton type="submit" color="primary">
                    Salvar
                  </CButton>
                  <CButton color="secondary" variant="outline" onClick={() => setMostrarForm(false)}>
                    Cancelar
                  </CButton>
                </CCol>
              </CRow>
              {erro && <div className="alert alert-danger mt-3">{erro}</div>}
            </CForm>
          </CCardBody>
        </CCard>
      )}

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Data</CTableHeaderCell>
            <CTableHeaderCell>Tipo</CTableHeaderCell>
            <CTableHeaderCell>Quantidade</CTableHeaderCell>
            <CTableHeaderCell>Documento</CTableHeaderCell>
            <CTableHeaderCell>Observação</CTableHeaderCell>
            <CTableHeaderCell>Origem</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {movimentacoes.map((mov) => (
            <CTableRow key={mov.id} active={selecionadoId === mov.id} onClick={() => selecionarLinha(mov.id)}>
              <CTableDataCell>{formatarDataHora(mov.dataMovimentacao)}</CTableDataCell>
              <CTableDataCell>{TIPOS.find((t) => t.codigo === mov.tipoMovimentacao)?.label || mov.tipoMovimentacao}</CTableDataCell>
              <CTableDataCell>{mov.quantidade}</CTableDataCell>
              <CTableDataCell>{mov.documentoOrigem || '-'}</CTableDataCell>
              <CTableDataCell>{mov.observacao || '-'}</CTableDataCell>
              <CTableDataCell>{mov.pedidoCompraItemId || mov.pedidoItemId ? 'Sistema' : 'Manual'}</CTableDataCell>
            </CTableRow>
          ))}
          {movimentacoes.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={6} className="text-body-secondary">
                Nenhuma movimentação registrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
