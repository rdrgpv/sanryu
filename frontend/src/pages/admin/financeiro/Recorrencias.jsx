import { useEffect, useState } from 'react';
import {
  CButton,
  CButtonGroup,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CInputGroup,
  CInputGroupText,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload } from '@coreui/icons';
import api from '../../../services/api';
import AdminDataTable from '../../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../../utils/formato.js';
import { formatarData, hoje } from '../../../utils/financeiro.js';

const DIAS = Array.from({ length: 28 }, (_, indice) => indice + 1);

// Despesas (ou receitas) fixas mensais. Cada uma gera o lançamento do mês sozinha, com a mesma
// antecedência das mensalidades; o valor de um mês específico se ajusta no próprio lançamento.
export default function Recorrencias() {
  const [recorrencias, setRecorrencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  async function carregar() {
    const res = await api.get('/admin/financeiro/recorrencias');
    setRecorrencias(res.data);
  }

  useEffect(() => {
    carregar();
    api.get('/admin/financeiro/categorias').then((res) => setCategorias(res.data));
    api.get('/admin/financeiro/contas').then((res) => setContas(res.data.contas.filter((conta) => conta.ativo)));
    api.get('/admin/fornecedores').then((res) => setFornecedores(res.data)).catch(() => setFornecedores([]));
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
  }, []);

  const selecionada = recorrencias.find((item) => item.id === selecionadoId) || null;

  function abrir(item) {
    setErro(null);
    setFormulario(
      item
        ? {
            id: item.id,
            tipo: item.tipo,
            descricao: item.descricao,
            valor: String(item.valor),
            diaVencimento: String(item.diaVencimento),
            dataInicio: item.dataInicio,
            dataFim: item.dataFim || '',
            categoriaId: item.categoriaId ? String(item.categoriaId) : '',
            contaFinanceiraId: item.contaFinanceiraId ? String(item.contaFinanceiraId) : '',
            fornecedorId: item.fornecedorId ? String(item.fornecedorId) : '',
            unidadeId: item.unidadeId ? String(item.unidadeId) : '',
            ativo: item.ativo,
          }
        : {
            tipo: 'despesa',
            descricao: '',
            valor: '',
            diaVencimento: '5',
            dataInicio: `${hoje().slice(0, 7)}-01`,
            dataFim: '',
            categoriaId: '',
            contaFinanceiraId: '',
            fornecedorId: '',
            unidadeId: '',
            ativo: true,
          }
    );
  }

  async function salvar() {
    setErro(null);
    try {
      const payload = { ...formulario, valor: Number(formulario.valor), diaVencimento: Number(formulario.diaVencimento) };
      const res = formulario.id
        ? await api.put(`/admin/financeiro/recorrencias/${formulario.id}`, payload)
        : await api.post('/admin/financeiro/recorrencias', payload);
      setFormulario(null);
      setMensagem(res.data.gerados ? `Salvo. ${res.data.gerados} lançamento(s) gerado(s).` : 'Salvo.');
      setTimeout(() => setMensagem(null), 4000);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  async function excluir() {
    if (!window.confirm('Excluir esta recorrência? Os lançamentos já gerados ficam; só os futuros em aberto saem.')) return;
    await api.delete(`/admin/financeiro/recorrencias/${selecionadoId}`);
    setSelecionadoId(null);
    carregar();
  }

  const categoriasDoTipo = categorias.filter((categoria) => categoria.tipo === formulario?.tipo && categoria.ativo);

  return (
    <div>
      <h1 className="h3 mb-3">Despesas e receitas recorrentes</h1>
      <p className="text-body-secondary small">
        Aluguel, salários, luz, internet... Lance uma vez: o lançamento de cada mês aparece em Contas a pagar sozinho. Se um mês vier diferente,
        edite o valor direto no lançamento daquele mês.
      </p>

      <div className="d-flex gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={() => abrir(null)} title="Nova">
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!selecionada} onClick={() => abrir(selecionada)} title="Editar">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton color="danger" variant="outline" disabled={!selecionada} onClick={excluir} title="Excluir">
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
      </div>

      {mensagem && <div className="alert alert-success py-2">{mensagem}</div>}

      <AdminDataTable
        rows={recorrencias}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhuma recorrência cadastrada."
        columns={[
          { key: 'descricao', label: 'Descrição', sortable: true, render: (item) => <>{item.descricao}{item.fornecedor && <small className="text-body-secondary d-block">{item.fornecedor.nome}</small>}</> },
          { key: 'tipo', label: 'Tipo', sortable: true, render: (item) => (item.tipo === 'despesa' ? 'Despesa' : 'Receita') },
          { key: 'categoria', label: 'Categoria', render: (item) => item.categoria?.nome || '-' },
          { key: 'valor', label: 'Valor', align: 'end', sortable: true, sortValue: (item) => Number(item.valor), render: (item) => formatarMoeda(item.valor) },
          { key: 'diaVencimento', label: 'Vence dia', align: 'center', sortable: true },
          { key: 'periodo', label: 'Período', render: (item) => `${formatarData(item.dataInicio)} → ${item.dataFim ? formatarData(item.dataFim) : 'sem fim'}` },
          {
            key: 'ativo',
            label: 'Situação',
            render: (item) => <span className={`badge ${item.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>{item.ativo ? 'Ativa' : 'Pausada'}</span>,
          },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)} size="lg">
        <CModalHeader>
          <CModalTitle>{formulario?.id ? 'Editar recorrência' : 'Nova recorrência'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect value={formulario.tipo} onChange={(event) => setFormulario((prev) => ({ ...prev, tipo: event.target.value, categoriaId: '' }))}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormInput value={formulario.descricao} placeholder="Ex.: Aluguel do salão" onChange={(event) => setFormulario((prev) => ({ ...prev, descricao: event.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Valor por mês</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" min="0" value={formulario.valor} onChange={(event) => setFormulario((prev) => ({ ...prev, valor: event.target.value }))} />
                </CInputGroup>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Vence todo dia</CFormLabel>
                <CFormSelect value={formulario.diaVencimento} onChange={(event) => setFormulario((prev) => ({ ...prev, diaVencimento: event.target.value }))}>
                  {DIAS.map((dia) => (
                    <option key={dia} value={dia}>
                      {dia}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>A partir de</CFormLabel>
                <CFormInput type="date" value={formulario.dataInicio} onChange={(event) => setFormulario((prev) => ({ ...prev, dataInicio: event.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Até (opcional)</CFormLabel>
                <CFormInput type="date" value={formulario.dataFim} onChange={(event) => setFormulario((prev) => ({ ...prev, dataFim: event.target.value }))} />
              </CCol>
              <CCol md={3} className="d-flex align-items-end">
                <CFormCheck id="recorrenciaAtiva" label="Ativa" checked={formulario.ativo} onChange={(event) => setFormulario((prev) => ({ ...prev, ativo: event.target.checked }))} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect value={formulario.categoriaId} onChange={(event) => setFormulario((prev) => ({ ...prev, categoriaId: event.target.value }))}>
                  <option value="">Sem categoria</option>
                  {categoriasDoTipo.map((categoria) => (
                    <option key={categoria.id} value={categoria.id}>
                      {categoria.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Conta</CFormLabel>
                <CFormSelect value={formulario.contaFinanceiraId} onChange={(event) => setFormulario((prev) => ({ ...prev, contaFinanceiraId: event.target.value }))}>
                  <option value="">Definir no pagamento</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              {formulario.tipo === 'despesa' && (
                <CCol md={4}>
                  <CFormLabel>Fornecedor</CFormLabel>
                  <CFormSelect value={formulario.fornecedorId} onChange={(event) => setFormulario((prev) => ({ ...prev, fornecedorId: event.target.value }))}>
                    <option value="">Nenhum</option>
                    {fornecedores.map((fornecedor) => (
                      <option key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
              {unidades.length > 1 && (
                <CCol md={4}>
                  <CFormLabel>Unidade</CFormLabel>
                  <CFormSelect value={formulario.unidadeId} onChange={(event) => setFormulario((prev) => ({ ...prev, unidadeId: event.target.value }))}>
                    <option value="">Academia toda</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setFormulario(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvar}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
