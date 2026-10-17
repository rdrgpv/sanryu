import { useEffect, useState } from 'react';
import {
  CButton,
  CCard,
  CCardBody,
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
import api from '../../../services/api';
import { formatarMoeda } from '../../../utils/formato.js';
import { FORMAS_PAGAMENTO, TIPOS_CONTA, labelForma, formatarData, hoje } from '../../../utils/financeiro.js';

// Contas (caixa, banco, Mercado Pago) com saldo, transferências entre elas e categorias.
export default function CadastrosFinanceiros() {
  const [contas, setContas] = useState([]);
  const [transferencias, setTransferencias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [conta, setConta] = useState(null);
  const [transferencia, setTransferencia] = useState(null);
  const [novaCategoria, setNovaCategoria] = useState({ nome: '', tipo: 'despesa' });
  const [erro, setErro] = useState(null);

  async function carregar() {
    const [resContas, resTransferencias, resCategorias] = await Promise.all([
      api.get('/admin/financeiro/contas'),
      api.get('/admin/financeiro/transferencias'),
      api.get('/admin/financeiro/categorias'),
    ]);
    setContas(resContas.data.contas);
    setTransferencias(resTransferencias.data);
    setCategorias(resCategorias.data);
  }

  useEffect(() => {
    carregar();
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
  }, []);

  function abrirConta(item) {
    setErro(null);
    setConta(
      item
        ? { ...item, saldoInicial: String(item.saldoInicial), unidadeId: item.unidadeId ? String(item.unidadeId) : '', formasPadrao: (item.formasPadrao || '').split(',').filter(Boolean) }
        : { nome: '', tipo: 'banco', saldoInicial: '0', dataSaldoInicial: hoje(), unidadeId: '', formasPadrao: [], ativo: true }
    );
  }

  async function salvarConta() {
    setErro(null);
    try {
      const payload = { ...conta, saldoInicial: Number(conta.saldoInicial) };
      if (conta.id) await api.put(`/admin/financeiro/contas/${conta.id}`, payload);
      else await api.post('/admin/financeiro/contas', payload);
      setConta(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar a conta.');
    }
  }

  async function excluirConta(item) {
    if (!window.confirm(`Excluir a conta ${item.nome}?`)) return;
    try {
      await api.delete(`/admin/financeiro/contas/${item.id}`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir.');
    }
  }

  function alternarForma(forma) {
    setConta((prev) => ({
      ...prev,
      formasPadrao: prev.formasPadrao.includes(forma) ? prev.formasPadrao.filter((item) => item !== forma) : [...prev.formasPadrao, forma],
    }));
  }

  async function salvarTransferencia() {
    setErro(null);
    try {
      await api.post('/admin/financeiro/transferencias', { ...transferencia, valor: Number(transferencia.valor) });
      setTransferencia(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar a transferência.');
    }
  }

  async function excluirTransferencia(item) {
    if (!window.confirm('Excluir esta transferência?')) return;
    await api.delete(`/admin/financeiro/transferencias/${item.id}`);
    carregar();
  }

  async function adicionarCategoria(event) {
    event.preventDefault();
    if (!novaCategoria.nome.trim()) return;
    await api.post('/admin/financeiro/categorias', novaCategoria);
    setNovaCategoria((prev) => ({ ...prev, nome: '' }));
    carregar();
  }

  async function alternarCategoria(categoria) {
    await api.put(`/admin/financeiro/categorias/${categoria.id}`, { nome: categoria.nome, ativo: !categoria.ativo });
    carregar();
  }

  async function renomearCategoria(categoria) {
    const nome = window.prompt('Novo nome da categoria:', categoria.nome);
    if (!nome || nome.trim() === categoria.nome) return;
    await api.put(`/admin/financeiro/categorias/${categoria.id}`, { nome, ativo: categoria.ativo });
    carregar();
  }

  async function excluirCategoria(categoria) {
    if (!window.confirm(`Excluir a categoria ${categoria.nome}?`)) return;
    try {
      await api.delete(`/admin/financeiro/categorias/${categoria.id}`);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir.');
    }
  }

  const contasAtivas = contas.filter((item) => item.ativo);

  return (
    <div>
      <h1 className="h3 mb-3">Contas e categorias</h1>

      <CRow className="g-3">
        <CCol lg={7}>
          <CCard className="mb-3">
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 mb-0">Contas</h2>
                <CButton color="primary" size="sm" onClick={() => abrirConta(null)}>
                  Nova conta
                </CButton>
              </div>
              <p className="small text-body-secondary">
                Marque em cada conta as formas de pagamento que caem nela — é assim que mensalidades e vendas pagas entram no saldo certo
                (ex.: Pix no Mercado Pago, dinheiro no caixa).
              </p>
              {contas.length === 0 && <p className="small text-body-secondary mb-0">Nenhuma conta ainda.</p>}
              {contas.map((item) => (
                <div key={item.id} className={`d-flex justify-content-between align-items-center border-bottom py-2 ${item.ativo ? '' : 'opacity-50'}`}>
                  <div>
                    <strong>{item.nome}</strong> <small className="text-body-secondary">{TIPOS_CONTA.find((tipo) => tipo.valor === item.tipo)?.label}</small>
                    <small className="d-block text-body-secondary">
                      {item.formasPadrao ? `recebe: ${item.formasPadrao.split(',').map(labelForma).join(', ')}` : 'nenhuma forma padrão'}
                      {!item.ativo && ' · inativa'}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <span className={item.saldo < 0 ? 'text-danger' : ''}>{formatarMoeda(item.saldo)}</span>
                    <CButton color="secondary" variant="ghost" size="sm" onClick={() => abrirConta(item)}>
                      editar
                    </CButton>
                    <CButton color="danger" variant="ghost" size="sm" onClick={() => excluirConta(item)}>
                      excluir
                    </CButton>
                  </div>
                </div>
              ))}
            </CCardBody>
          </CCard>

          <CCard>
            <CCardBody>
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h2 className="h6 mb-0">Transferências entre contas</h2>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  disabled={contasAtivas.length < 2}
                  onClick={() => {
                    setErro(null);
                    setTransferencia({ contaOrigemId: '', contaDestinoId: '', valor: '', data: hoje(), descricao: '' });
                  }}
                >
                  Nova transferência
                </CButton>
              </div>
              <p className="small text-body-secondary">Ex.: depósito do caixa no banco, saque do Mercado Pago. Não conta como receita nem despesa.</p>
              {transferencias.length === 0 && <p className="small text-body-secondary mb-0">Nenhuma transferência.</p>}
              {transferencias.map((item) => (
                <div key={item.id} className="d-flex justify-content-between align-items-center border-bottom py-1 small">
                  <span>
                    {formatarData(item.data)} · {item.contaOrigem?.nome} → {item.contaDestino?.nome}
                    {item.descricao && <span className="text-body-secondary"> · {item.descricao}</span>}
                  </span>
                  <span>
                    {formatarMoeda(item.valor)}
                    <CButton color="danger" variant="ghost" size="sm" onClick={() => excluirTransferencia(item)}>
                      ×
                    </CButton>
                  </span>
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={5}>
          <CCard>
            <CCardBody>
              <h2 className="h6">Categorias</h2>
              <form className="d-flex gap-2 mb-3" onSubmit={adicionarCategoria}>
                <CFormSelect style={{ maxWidth: 130 }} value={novaCategoria.tipo} onChange={(event) => setNovaCategoria((prev) => ({ ...prev, tipo: event.target.value }))}>
                  <option value="despesa">Despesa</option>
                  <option value="receita">Receita</option>
                </CFormSelect>
                <CFormInput placeholder="Nova categoria" value={novaCategoria.nome} onChange={(event) => setNovaCategoria((prev) => ({ ...prev, nome: event.target.value }))} />
                <CButton type="submit" color="primary">
                  +
                </CButton>
              </form>
              {['receita', 'despesa'].map((tipo) => (
                <div key={tipo} className="mb-3">
                  <div className="small fw-semibold text-body-secondary text-uppercase mb-1">{tipo === 'receita' ? 'Receitas' : 'Despesas'}</div>
                  {categorias
                    .filter((categoria) => categoria.tipo === tipo)
                    .map((categoria) => (
                      <div key={categoria.id} className={`d-flex justify-content-between align-items-center small py-1 border-bottom ${categoria.ativo ? '' : 'opacity-50'}`}>
                        <span>{categoria.nome}</span>
                        <span className="d-flex gap-1">
                          <CButton color="secondary" variant="ghost" size="sm" onClick={() => renomearCategoria(categoria)}>
                            renomear
                          </CButton>
                          <CButton color="secondary" variant="ghost" size="sm" onClick={() => alternarCategoria(categoria)}>
                            {categoria.ativo ? 'desativar' : 'ativar'}
                          </CButton>
                          {!categoria.chave && (
                            <CButton color="danger" variant="ghost" size="sm" onClick={() => excluirCategoria(categoria)}>
                              ×
                            </CButton>
                          )}
                        </span>
                      </div>
                    ))}
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      <CModal visible={!!conta} onClose={() => setConta(null)}>
        <CModalHeader>
          <CModalTitle>{conta?.id ? 'Editar conta' : 'Nova conta'}</CModalTitle>
        </CModalHeader>
        {conta && (
          <CModalBody>
            <CRow className="g-3">
              <CCol sm={7}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput value={conta.nome} placeholder="Ex.: Caixa da recepção" onChange={(event) => setConta((prev) => ({ ...prev, nome: event.target.value }))} />
              </CCol>
              <CCol sm={5}>
                <CFormLabel>Tipo</CFormLabel>
                <CFormSelect value={conta.tipo} onChange={(event) => setConta((prev) => ({ ...prev, tipo: event.target.value }))}>
                  {TIPOS_CONTA.map((tipo) => (
                    <option key={tipo.valor} value={tipo.valor}>
                      {tipo.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Saldo inicial</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" value={conta.saldoInicial} onChange={(event) => setConta((prev) => ({ ...prev, saldoInicial: event.target.value }))} />
                </CInputGroup>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Saldo na data</CFormLabel>
                <CFormInput type="date" value={conta.dataSaldoInicial} onChange={(event) => setConta((prev) => ({ ...prev, dataSaldoInicial: event.target.value }))} />
              </CCol>
              {unidades.length > 1 && (
                <CCol sm={12}>
                  <CFormLabel>Unidade</CFormLabel>
                  <CFormSelect value={conta.unidadeId} onChange={(event) => setConta((prev) => ({ ...prev, unidadeId: event.target.value }))}>
                    <option value="">Academia toda</option>
                    {unidades.map((unidade) => (
                      <option key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              )}
              <CCol sm={12}>
                <CFormLabel>Formas de pagamento que caem nesta conta</CFormLabel>
                <div className="d-flex flex-wrap gap-3">
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <CFormCheck key={forma.valor} id={`forma-${forma.valor}`} label={forma.label} checked={conta.formasPadrao.includes(forma.valor)} onChange={() => alternarForma(forma.valor)} />
                  ))}
                </div>
                <small className="text-body-secondary">Cada forma fica em uma conta só: marcar aqui tira das outras.</small>
              </CCol>
              <CCol sm={12}>
                <CFormCheck id="contaAtiva" label="Ativa" checked={conta.ativo} onChange={(event) => setConta((prev) => ({ ...prev, ativo: event.target.checked }))} />
              </CCol>
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setConta(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarConta}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>

      <CModal visible={!!transferencia} onClose={() => setTransferencia(null)}>
        <CModalHeader>
          <CModalTitle>Nova transferência</CModalTitle>
        </CModalHeader>
        {transferencia && (
          <CModalBody>
            <CRow className="g-3">
              <CCol sm={6}>
                <CFormLabel>De</CFormLabel>
                <CFormSelect value={transferencia.contaOrigemId} onChange={(event) => setTransferencia((prev) => ({ ...prev, contaOrigemId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {contasAtivas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Para</CFormLabel>
                <CFormSelect value={transferencia.contaDestinoId} onChange={(event) => setTransferencia((prev) => ({ ...prev, contaDestinoId: event.target.value }))}>
                  <option value="">Selecione</option>
                  {contasAtivas.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Valor</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" min="0" value={transferencia.valor} onChange={(event) => setTransferencia((prev) => ({ ...prev, valor: event.target.value }))} />
                </CInputGroup>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Data</CFormLabel>
                <CFormInput type="date" value={transferencia.data} onChange={(event) => setTransferencia((prev) => ({ ...prev, data: event.target.value }))} />
              </CCol>
              <CCol sm={12}>
                <CFormLabel>Descrição (opcional)</CFormLabel>
                <CFormInput value={transferencia.descricao} onChange={(event) => setTransferencia((prev) => ({ ...prev, descricao: event.target.value }))} />
              </CCol>
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setTransferencia(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarTransferencia}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
