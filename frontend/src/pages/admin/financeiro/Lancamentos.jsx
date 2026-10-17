import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CButton,
  CButtonGroup,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
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
import { cilPlus, cilPencil, cilTrash, cilReload, cilCash, cilActionUndo, cilBan } from '@coreui/icons';
import api from '../../../services/api';
import AdminDataTable from '../../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../../utils/formato.js';
import { FORMAS_PAGAMENTO, ORIGENS, labelForma, formatarData, hoje } from '../../../utils/financeiro.js';

const TEXTOS = {
  despesa: { titulo: 'Contas a pagar', novo: 'Nova conta a pagar', baixa: 'Registrar pagamento', pago: 'Pagas' },
  receita: { titulo: 'Contas a receber', novo: 'Nova conta a receber', baixa: 'Registrar recebimento', pago: 'Recebidas' },
};

function badgeStatus(linha) {
  if (linha.status === 'pago') return <span className="badge text-bg-success">Pago</span>;
  if (linha.status === 'cancelado') return <span className="badge text-bg-secondary">Cancelado</span>;
  if (linha.vencido) return <span className="badge text-bg-danger">Vencido</span>;
  return <span className="badge text-bg-warning">Em aberto</span>;
}

// Contas a pagar (tipo="despesa") e a receber (tipo="receita") — mesma tela. Lançamentos que vêm de
// outro cadastro (mensalidade, venda, compra) mostram a origem e só permitem o que faz sentido.
export default function Lancamentos({ tipo }) {
  const textos = TEXTOS[tipo];
  const [linhas, setLinhas] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [contas, setContas] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [filtros, setFiltros] = useState({ status: 'pendente', inicio: '', fim: '', categoriaId: '', busca: '' });
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [baixa, setBaixa] = useState(null);
  const [erroModal, setErroModal] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  const selecionado = linhas.find((linha) => linha.id === selecionadoId) || null;
  const manual = selecionado && ['manual', 'recorrencia'].includes(selecionado.origem);

  async function carregar() {
    const params = { tipo };
    Object.entries(filtros).forEach(([chave, valor]) => {
      if (valor) params[chave] = valor;
    });
    const res = await api.get('/admin/financeiro/lancamentos', { params });
    setLinhas(res.data);
  }

  useEffect(() => {
    api.get('/admin/financeiro/categorias').then((res) => setCategorias(res.data.filter((categoria) => categoria.tipo === tipo)));
    api.get('/admin/financeiro/contas').then((res) => setContas(res.data.contas.filter((conta) => conta.ativo)));
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
    api.get('/admin/fornecedores').then((res) => setFornecedores(res.data)).catch(() => setFornecedores([]));
  }, [tipo]);

  useEffect(() => {
    const timeout = setTimeout(carregar, 250);
    setSelecionadoId(null);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros, tipo]);

  function avisar(texto, cor = 'success') {
    setMensagem({ texto, cor });
    setTimeout(() => setMensagem(null), 4000);
  }

  async function acao(funcao, sucesso) {
    try {
      await funcao();
      if (sucesso) avisar(sucesso);
      await carregar();
    } catch (err) {
      avisar(err.response?.data?.error || 'Não foi possível concluir.', 'danger');
    }
  }

  function abrirNovo() {
    setErroModal(null);
    setFormulario({
      novo: true,
      descricao: '',
      valor: '',
      vencimento: hoje(),
      categoriaId: '',
      unidadeId: unidades.length === 1 ? String(unidades[0].id) : '',
      fornecedorId: '',
      contaFinanceiraId: '',
      observacoes: '',
      parcelas: '1',
      pago: false,
      formaPagamento: '',
    });
  }

  function abrirEdicao() {
    setErroModal(null);
    setFormulario({
      novo: false,
      origem: selecionado.origem,
      descricao: selecionado.descricao,
      valor: String(selecionado.valor),
      vencimento: selecionado.vencimento,
      categoriaId: selecionado.categoriaId ? String(selecionado.categoriaId) : '',
      unidadeId: selecionado.unidadeId ? String(selecionado.unidadeId) : '',
      fornecedorId: selecionado.fornecedorId ? String(selecionado.fornecedorId) : '',
      contaFinanceiraId: selecionado.contaFinanceiraId ? String(selecionado.contaFinanceiraId) : '',
      observacoes: selecionado.observacoes || '',
    });
  }

  async function salvarFormulario() {
    setErroModal(null);
    try {
      if (formulario.novo) {
        await api.post('/admin/financeiro/lancamentos', { ...formulario, tipo, valor: Number(formulario.valor) });
      } else {
        await api.put(`/admin/financeiro/lancamentos/${selecionadoId}`, { ...formulario, valor: Number(formulario.valor) });
      }
      setFormulario(null);
      avisar(formulario.novo ? 'Lançamento criado.' : 'Lançamento atualizado.');
      carregar();
    } catch (err) {
      setErroModal(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  function abrirBaixa() {
    setErroModal(null);
    setBaixa({
      valorPago: String(selecionado.valor),
      dataPagamento: hoje(),
      formaPagamento: '',
      contaFinanceiraId: selecionado.contaFinanceiraId ? String(selecionado.contaFinanceiraId) : '',
    });
  }

  async function confirmarBaixa() {
    setErroModal(null);
    try {
      await api.post(`/admin/financeiro/lancamentos/${selecionadoId}/baixar`, { ...baixa, valorPago: Number(baixa.valorPago) });
      setBaixa(null);
      avisar(tipo === 'despesa' ? 'Pagamento registrado.' : 'Recebimento registrado.');
      carregar();
    } catch (err) {
      setErroModal(err.response?.data?.error || 'Não foi possível registrar.');
    }
  }

  function atualizarFiltro(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  const emAberto = linhas.filter((linha) => linha.status === 'pendente');
  const totalAberto = emAberto.reduce((total, linha) => total + Number(linha.valor), 0);
  const totalVencido = emAberto.filter((linha) => linha.vencido).reduce((total, linha) => total + Number(linha.valor), 0);
  const totalPago = linhas.filter((linha) => linha.status === 'pago').reduce((total, linha) => total + Number(linha.valorPago ?? linha.valor), 0);
  const automatico = formulario && !formulario.novo && !['manual', 'recorrencia'].includes(formulario.origem);

  return (
    <div>
      <h1 className="h3 mb-3">{textos.titulo}</h1>

      <CRow className="g-3 mb-3">
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">Em aberto na lista ({emAberto.length})</div>
            <div className="fs-5 fw-semibold">{formatarMoeda(totalAberto)}</div>
          </div>
        </CCol>
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">Vencido</div>
            <div className={`fs-5 fw-semibold ${totalVencido > 0 ? 'text-danger' : ''}`}>{formatarMoeda(totalVencido)}</div>
          </div>
        </CCol>
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">{textos.pago} na lista</div>
            <div className="fs-5 fw-semibold text-success">{formatarMoeda(totalPago)}</div>
          </div>
        </CCol>
      </CRow>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={abrirNovo} title={textos.novo}>
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={abrirEdicao} disabled={!selecionado || selecionado.virtual || selecionado.origem === 'mensalidade'} title="Editar">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton
            color="danger"
            variant="outline"
            disabled={!selecionado || selecionado.origem !== 'manual' || selecionado.status === 'pago'}
            onClick={() => window.confirm('Excluir este lançamento?') && acao(() => api.delete(`/admin/financeiro/lancamentos/${selecionadoId}`), 'Lançamento excluído.')}
            title="Excluir (só manual, não pago)"
          >
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
        <CButtonGroup>
          <CButton color="success" variant="outline" disabled={!selecionado || selecionado.virtual || selecionado.status !== 'pendente'} onClick={abrirBaixa} title={textos.baixa}>
            <CIcon icon={cilCash} className="me-1" />
            {tipo === 'despesa' ? 'Pagar' : 'Receber'}
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionado || selecionado.status !== 'pago' || selecionado.origem === 'mensalidade'}
            onClick={() => window.confirm('Desfazer o pagamento e deixar em aberto?') && acao(() => api.post(`/admin/financeiro/lancamentos/${selecionadoId}/estornar`), 'Pagamento estornado.')}
            title="Estornar (desfazer pagamento)"
          >
            <CIcon icon={cilActionUndo} />
          </CButton>
          <CButton
            color="danger"
            variant="outline"
            disabled={!manual || selecionado.status !== 'pendente'}
            onClick={() => {
              const motivo = window.prompt('Motivo do cancelamento:');
              if (motivo !== null) acao(() => api.post(`/admin/financeiro/lancamentos/${selecionadoId}/cancelar`, { motivo }), 'Lançamento cancelado.');
            }}
            title="Cancelar"
          >
            <CIcon icon={cilBan} />
          </CButton>
        </CButtonGroup>
        {selecionado?.virtual && (
          <CButton as={Link} to="/admin/mensalidades" color="link" size="sm">
            Mensalidade: cobre e dê baixa na tela de Mensalidades →
          </CButton>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CFormSelect style={{ maxWidth: 180 }} value={filtros.status} onChange={(event) => atualizarFiltro('status', event.target.value)}>
          <option value="pendente">Em aberto</option>
          <option value="vencido">Vencidos</option>
          <option value="pago">{textos.pago}</option>
          <option value="cancelado">Cancelados</option>
          <option value="">Todos</option>
        </CFormSelect>
        <CFormInput type="date" style={{ maxWidth: 165 }} value={filtros.inicio} onChange={(event) => atualizarFiltro('inicio', event.target.value)} title="De" />
        <CFormInput type="date" style={{ maxWidth: 165 }} value={filtros.fim} onChange={(event) => atualizarFiltro('fim', event.target.value)} title="Até" />
        <CFormSelect style={{ maxWidth: 230 }} value={filtros.categoriaId} onChange={(event) => atualizarFiltro('categoriaId', event.target.value)}>
          <option value="">Todas as categorias</option>
          {categorias.map((categoria) => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nome}
            </option>
          ))}
        </CFormSelect>
        <CFormInput style={{ maxWidth: 220 }} placeholder="Buscar descrição..." value={filtros.busca} onChange={(event) => atualizarFiltro('busca', event.target.value)} />
      </div>

      {mensagem && <div className={`alert alert-${mensagem.cor} py-2`}>{mensagem.texto}</div>}

      <AdminDataTable
        rows={linhas}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nada por aqui."
        columns={[
          {
            key: 'vencimento',
            label: filtros.status === 'pago' ? 'Pago em' : 'Vencimento',
            sortable: true,
            render: (linha) => formatarData(filtros.status === 'pago' ? linha.dataPagamento : linha.vencimento),
          },
          {
            key: 'descricao',
            label: 'Descrição',
            sortable: true,
            render: (linha) => (
              <>
                {linha.descricao}
                <small className="text-body-secondary d-block">
                  {[ORIGENS[linha.origem], linha.fornecedor?.nome, linha.unidade && unidades.length > 1 ? linha.unidade.nome : null].filter(Boolean).join(' · ')}
                </small>
              </>
            ),
          },
          { key: 'categoria', label: 'Categoria', sortable: true, sortValue: (linha) => linha.categoria?.nome || '', render: (linha) => linha.categoria?.nome || '-' },
          {
            key: 'valor',
            label: 'Valor',
            align: 'end',
            sortable: true,
            sortValue: (linha) => Number(linha.valor),
            render: (linha) => (
              <>
                {formatarMoeda(linha.status === 'pago' ? linha.valorPago ?? linha.valor : linha.valor)}
                {linha.status === 'pago' && Number(linha.valorPago) !== Number(linha.valor) && (
                  <small className="text-body-secondary d-block">previsto {formatarMoeda(linha.valor)}</small>
                )}
              </>
            ),
          },
          {
            key: 'status',
            label: 'Situação',
            sortable: true,
            render: (linha) => (
              <>
                {badgeStatus(linha)}
                {linha.status === 'pago' && (
                  <small className="text-body-secondary d-block">
                    {[labelForma(linha.formaPagamento), linha.conta?.nome].filter((texto) => texto && texto !== '-').join(' · ')}
                  </small>
                )}
              </>
            ),
          },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)} size="lg">
        <CModalHeader>
          <CModalTitle>{formulario?.novo ? textos.novo : 'Editar lançamento'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            {automatico && (
              <p className="small text-body-secondary">
                Lançamento automático ({ORIGENS[formulario.origem]}): valor e descrição vêm do cadastro de origem. Aqui dá para ajustar vencimento,
                categoria, conta e observações.
              </p>
            )}
            <CRow className="g-3">
              <CCol md={8}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormInput value={formulario.descricao} disabled={automatico} onChange={(event) => setFormulario((prev) => ({ ...prev, descricao: event.target.value }))} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>{formulario.novo && Number(formulario.parcelas) > 1 ? 'Valor total' : 'Valor'}</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" min="0" value={formulario.valor} disabled={automatico} onChange={(event) => setFormulario((prev) => ({ ...prev, valor: event.target.value }))} />
                </CInputGroup>
              </CCol>
              <CCol md={4}>
                <CFormLabel>{formulario.novo && Number(formulario.parcelas) > 1 ? '1º vencimento' : 'Vencimento'}</CFormLabel>
                <CFormInput type="date" value={formulario.vencimento} onChange={(event) => setFormulario((prev) => ({ ...prev, vencimento: event.target.value }))} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Categoria</CFormLabel>
                <CFormSelect value={formulario.categoriaId} onChange={(event) => setFormulario((prev) => ({ ...prev, categoriaId: event.target.value }))}>
                  <option value="">Sem categoria</option>
                  {categorias
                    .filter((categoria) => categoria.ativo || String(categoria.id) === formulario.categoriaId)
                    .map((categoria) => (
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
              {tipo === 'despesa' && (
                <CCol md={6}>
                  <CFormLabel>Fornecedor</CFormLabel>
                  <CFormSelect value={formulario.fornecedorId} disabled={automatico} onChange={(event) => setFormulario((prev) => ({ ...prev, fornecedorId: event.target.value }))}>
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
                <CCol md={6}>
                  <CFormLabel>Unidade</CFormLabel>
                  <CFormSelect value={formulario.unidadeId} disabled={automatico} onChange={(event) => setFormulario((prev) => ({ ...prev, unidadeId: event.target.value }))}>
                    <option value="">Academia toda</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
              <CCol md={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} value={formulario.observacoes} onChange={(event) => setFormulario((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </CCol>
              {formulario.novo && (
                <>
                  <CCol md={3}>
                    <CFormLabel>Parcelas</CFormLabel>
                    <CFormInput type="number" min="1" max="48" value={formulario.parcelas} disabled={formulario.pago} onChange={(event) => setFormulario((prev) => ({ ...prev, parcelas: event.target.value }))} />
                  </CCol>
                  <CCol md={9} className="d-flex flex-column justify-content-end">
                    <CFormCheck
                      id="pagoNaHora"
                      label={tipo === 'despesa' ? 'Já foi paga (lança como realizada)' : 'Já foi recebida (lança como realizada)'}
                      checked={formulario.pago}
                      onChange={(event) => setFormulario((prev) => ({ ...prev, pago: event.target.checked, parcelas: '1' }))}
                    />
                    {formulario.pago && (
                      <CFormSelect className="mt-2" value={formulario.formaPagamento} onChange={(event) => setFormulario((prev) => ({ ...prev, formaPagamento: event.target.value }))}>
                        <option value="">Forma de pagamento</option>
                        {FORMAS_PAGAMENTO.map((forma) => (
                          <option key={forma.valor} value={forma.valor}>
                            {forma.label}
                          </option>
                        ))}
                      </CFormSelect>
                    )}
                  </CCol>
                </>
              )}
            </CRow>
            {erroModal && <div className="alert alert-danger mt-3 mb-0">{erroModal}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setFormulario(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarFormulario}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={!!baixa} onClose={() => setBaixa(null)}>
        <CModalHeader>
          <CModalTitle>{textos.baixa}</CModalTitle>
        </CModalHeader>
        {baixa && selecionado && (
          <CModalBody>
            <p className="small text-body-secondary">
              {selecionado.descricao} — vence {formatarData(selecionado.vencimento)}
            </p>
            <CRow className="g-3">
              <CCol sm={6}>
                <CFormLabel>Valor {tipo === 'despesa' ? 'pago' : 'recebido'}</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" min="0" value={baixa.valorPago} onChange={(event) => setBaixa((prev) => ({ ...prev, valorPago: event.target.value }))} />
                </CInputGroup>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Data</CFormLabel>
                <CFormInput type="date" value={baixa.dataPagamento} onChange={(event) => setBaixa((prev) => ({ ...prev, dataPagamento: event.target.value }))} />
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Forma</CFormLabel>
                <CFormSelect value={baixa.formaPagamento} onChange={(event) => setBaixa((prev) => ({ ...prev, formaPagamento: event.target.value }))}>
                  <option value="">Selecione</option>
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <option key={forma.valor} value={forma.valor}>
                      {forma.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Conta</CFormLabel>
                <CFormSelect value={baixa.contaFinanceiraId} onChange={(event) => setBaixa((prev) => ({ ...prev, contaFinanceiraId: event.target.value }))}>
                  <option value="">Padrão da forma de pagamento</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            {erroModal && <div className="alert alert-danger mt-3 mb-0">{erroModal}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setBaixa(null)}>
            Cancelar
          </CButton>
          <CButton color="success" onClick={confirmarBaixa}>
            Confirmar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
