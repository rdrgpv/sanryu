import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
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
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
} from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda, formatarTelefone } from '../../utils/formato.js';

const estadoInicial = {
  nomeCliente: '',
  telefoneCliente: '',
  emailCliente: '',
  dataPrevistaEntrega: '',
  valorDesconto: '',
  observacao: '',
  situacao: 'P',
};

const itemInicial = { produtoId: '', produtoVariacaoId: '', quantidade: 1, valorUnitario: '', observacao: '', personalizacoes: [] };
const personalizacaoInicial = { tipoPersonalizacaoId: '', textoPersonalizado: '', corPersonalizacao: '', posicao: '', valor: '', observacao: '' };

function rotuloVariacao(v) {
  const partes = [v.produto?.descricao, v.cor?.descricao, v.tamanho?.descricao].filter(Boolean);
  return `${partes.join(' — ')} (${v.codigo})`;
}

export default function PedidoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const contador = useRef(0);
  function proximaKey() {
    contador.current += 1;
    return contador.current;
  }

  const [form, setForm] = useState(estadoInicial);
  const [itens, setItens] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [variacoes, setVariacoes] = useState([]);
  const [tiposPersonalizacao, setTiposPersonalizacao] = useState([]);
  const [erro, setErro] = useState(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [itemEditado, setItemEditado] = useState(itemInicial);
  const [indiceEmEdicao, setIndiceEmEdicao] = useState(null);
  const [erroModal, setErroModal] = useState(null);

  useEffect(() => {
    api.get('/admin/produtos?ativo=true').then((res) => setProdutos(res.data));
    api.get('/admin/produto-variacoes?ativo=true').then((res) => setVariacoes(res.data));
    api.get('/admin/tipos-personalizacao?ativo=true').then((res) => setTiposPersonalizacao(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/pedidos/${id}`).then((res) => {
      const pedido = res.data;
      setForm({
        nomeCliente: pedido.nomeCliente,
        telefoneCliente: formatarTelefone(pedido.telefoneCliente),
        emailCliente: pedido.emailCliente || '',
        dataPrevistaEntrega: pedido.dataPrevistaEntrega || '',
        valorDesconto: pedido.valorDesconto || '',
        observacao: pedido.observacao || '',
        situacao: pedido.situacao,
      });
      setItens(
        (pedido.itens || []).map((item) => ({
          _key: proximaKey(),
          produtoVariacaoId: item.produtoVariacaoId,
          produtoVariacaoLabel: item.produtoVariacao ? rotuloVariacao(item.produtoVariacao) : '',
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: item.valorTotal,
          observacao: item.observacao || '',
          personalizacoes: (item.personalizacoes || []).map((p) => ({
            _key: proximaKey(),
            tipoPersonalizacaoId: p.tipoPersonalizacaoId,
            tipoPersonalizacaoLabel: p.tipoPersonalizacao?.descricao || '',
            textoPersonalizado: p.textoPersonalizado || '',
            corPersonalizacao: p.corPersonalizacao || '',
            posicao: p.posicao || '',
            valor: p.valor,
            observacao: p.observacao || '',
          })),
        }))
      );
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleTelefoneChange(event) {
    setForm((prev) => ({ ...prev, telefoneCliente: formatarTelefone(event.target.value) }));
  }

  const variacoesDoProduto = itemEditado.produtoId
    ? variacoes.filter((v) => v.produtoId === Number(itemEditado.produtoId))
    : [];

  const valorProdutos = itens.reduce((soma, item) => soma + Number(item.valorTotal || 0), 0);
  const valorPersonalizacoes = itens.reduce(
    (soma, item) => soma + item.personalizacoes.reduce((s, p) => s + Number(p.valor || 0), 0),
    0
  );
  const valorTotal = valorProdutos + valorPersonalizacoes - Number(form.valorDesconto || 0);

  function abrirNovoItem() {
    setItemEditado(itemInicial);
    setIndiceEmEdicao(null);
    setErroModal(null);
    setModalAberto(true);
  }

  function abrirEdicaoItem(indice) {
    const item = itens[indice];
    const variacaoAtual = variacoes.find((v) => v.id === item.produtoVariacaoId);
    setItemEditado({ ...item, produtoId: variacaoAtual?.produtoId || '' });
    setIndiceEmEdicao(indice);
    setErroModal(null);
    setModalAberto(true);
  }

  function removerItem(indice) {
    if (!window.confirm('Remover este item do pedido?')) return;
    setItens((prev) => prev.filter((_, i) => i !== indice));
  }

  function handleItemChange(event) {
    const { name, value } = event.target;
    setItemEditado((prev) => {
      const atualizado = { ...prev, [name]: value };
      // Trocar o produto invalida a variação escolhida antes (era de outro produto).
      if (name === 'produtoId') {
        atualizado.produtoVariacaoId = '';
        atualizado.produtoVariacaoLabel = '';
      }
      return atualizado;
    });
  }

  function selecionarVariacao(variacao) {
    setItemEditado((prev) => ({
      ...prev,
      produtoVariacaoId: variacao.id,
      produtoVariacaoLabel: rotuloVariacao(variacao),
      valorUnitario: prev.valorUnitario || variacao.valorVenda,
    }));
  }

  function adicionarPersonalizacao() {
    setItemEditado((prev) => ({
      ...prev,
      personalizacoes: [...prev.personalizacoes, { ...personalizacaoInicial, _key: proximaKey() }],
    }));
  }

  function removerPersonalizacao(indice) {
    setItemEditado((prev) => ({ ...prev, personalizacoes: prev.personalizacoes.filter((_, i) => i !== indice) }));
  }

  function handlePersonalizacaoChange(indice, event) {
    const { name, value } = event.target;
    setItemEditado((prev) => {
      const personalizacoes = [...prev.personalizacoes];
      const atual = { ...personalizacoes[indice], [name]: value };
      if (name === 'tipoPersonalizacaoId') {
        const tipo = tiposPersonalizacao.find((t) => t.id === Number(value));
        if (tipo) {
          atual.tipoPersonalizacaoLabel = tipo.descricao;
          if (!personalizacoes[indice].valor) atual.valor = tipo.valorPadrao ?? '';
        }
      }
      personalizacoes[indice] = atual;
      return { ...prev, personalizacoes };
    });
  }

  function salvarItem() {
    setErroModal(null);

    if (!itemEditado.produtoVariacaoId) {
      setErroModal('Selecione uma variação de produto.');
      return;
    }
    const quantidade = Number(itemEditado.quantidade);
    const valorUnitario = Number(itemEditado.valorUnitario);
    if (!(quantidade > 0)) {
      setErroModal('Quantidade deve ser maior que zero.');
      return;
    }

    for (const p of itemEditado.personalizacoes) {
      if (!p.tipoPersonalizacaoId) {
        setErroModal('Selecione o tipo em todas as personalizações adicionadas.');
        return;
      }
      const tipo = tiposPersonalizacao.find((t) => t.id === Number(p.tipoPersonalizacaoId));
      if (tipo?.exigeTexto && !p.textoPersonalizado.trim()) {
        setErroModal(`O tipo de personalização "${tipo.descricao}" exige um texto.`);
        return;
      }
    }

    const itemPronto = {
      _key: itemEditado._key || proximaKey(),
      produtoVariacaoId: Number(itemEditado.produtoVariacaoId),
      produtoVariacaoLabel: itemEditado.produtoVariacaoLabel,
      quantidade,
      valorUnitario,
      valorTotal: quantidade * valorUnitario,
      observacao: itemEditado.observacao,
      personalizacoes: itemEditado.personalizacoes.map((p) => ({ ...p, valor: Number(p.valor) || 0 })),
    };

    setItens((prev) => {
      if (indiceEmEdicao === null) return [...prev, itemPronto];
      const copia = [...prev];
      copia[indiceEmEdicao] = itemPronto;
      return copia;
    });
    setModalAberto(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    if (itens.length === 0) {
      setErro('Adicione ao menos um item ao pedido.');
      return;
    }

    const payload = {
      nomeCliente: form.nomeCliente,
      telefoneCliente: form.telefoneCliente || null,
      emailCliente: form.emailCliente || null,
      dataPrevistaEntrega: form.dataPrevistaEntrega || null,
      valorDesconto: form.valorDesconto !== '' ? Number(form.valorDesconto) : 0,
      observacao: form.observacao || null,
      situacao: editando ? form.situacao : undefined,
      itens: itens.map(({ _key, produtoVariacaoLabel, personalizacoes, ...item }) => ({
        ...item,
        personalizacoes: personalizacoes.map(({ _key, tipoPersonalizacaoLabel, ...p }) => p),
      })),
    };

    try {
      if (editando) {
        await api.put(`/admin/pedidos/${id}`, payload);
      } else {
        await api.post('/admin/pedidos', payload);
      }
      navigate('/admin/pedidos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar pedido.');
    }
  }

  return (
    <div>
      <Link to="/admin/pedidos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar pedido' : 'Novo pedido'}</h1>

      <CCard className="mb-3">
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome do cliente</CFormLabel>
                <CFormInput name="nomeCliente" value={form.nomeCliente} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput name="telefoneCliente" value={form.telefoneCliente} onChange={handleTelefoneChange} placeholder="(11) 98888-7777" />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" name="emailCliente" value={form.emailCliente} onChange={handleChange} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Previsão de entrega</CFormLabel>
                <CFormInput type="date" name="dataPrevistaEntrega" value={form.dataPrevistaEntrega} onChange={handleChange} />
              </CCol>

              {editando && (
                <CCol md={3}>
                  <CFormLabel>Situação</CFormLabel>
                  <CFormSelect name="situacao" value={form.situacao} onChange={handleChange}>
                    <option value="P">Pendente</option>
                    <option value="E">Cancelado</option>
                  </CFormSelect>
                </CCol>
              )}
              <CCol md={2}>
                <CFormLabel>Desconto</CFormLabel>
                <CFormInput type="number" step="0.01" min="0" name="valorDesconto" value={form.valorDesconto} onChange={handleChange} />
              </CCol>
              <CCol md={editando ? 7 : 10}>
                <CFormLabel>Observação</CFormLabel>
                <CFormTextarea name="observacao" rows={1} value={form.observacao} onChange={handleChange} />
              </CCol>
            </CRow>

            <hr className="my-4" />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <h2 className="h5 mb-0">Itens</h2>
              <CButton color="primary" type="button" onClick={abrirNovoItem}>
                Adicionar item
              </CButton>
            </div>

            <CTable bordered responsive className="bg-white">
              <CTableHead>
                <CTableRow>
                  <CTableHeaderCell>Variação</CTableHeaderCell>
                  <CTableHeaderCell>Qtd</CTableHeaderCell>
                  <CTableHeaderCell>Valor unit.</CTableHeaderCell>
                  <CTableHeaderCell>Valor total</CTableHeaderCell>
                  <CTableHeaderCell>Personalizações</CTableHeaderCell>
                  <CTableHeaderCell>Ações</CTableHeaderCell>
                </CTableRow>
              </CTableHead>
              <CTableBody>
                {itens.map((item, indice) => (
                  <CTableRow key={item._key}>
                    <CTableDataCell>{item.produtoVariacaoLabel}</CTableDataCell>
                    <CTableDataCell>{item.quantidade}</CTableDataCell>
                    <CTableDataCell>{formatarMoeda(item.valorUnitario)}</CTableDataCell>
                    <CTableDataCell>{formatarMoeda(item.valorTotal)}</CTableDataCell>
                    <CTableDataCell>{item.personalizacoes.length}</CTableDataCell>
                    <CTableDataCell>
                      <CButton size="sm" color="secondary" variant="outline" className="me-2" onClick={() => abrirEdicaoItem(indice)}>
                        Editar
                      </CButton>
                      <CButton size="sm" color="danger" variant="outline" onClick={() => removerItem(indice)}>
                        Remover
                      </CButton>
                    </CTableDataCell>
                  </CTableRow>
                ))}
                {itens.length === 0 && (
                  <CTableRow>
                    <CTableDataCell colSpan={6} className="text-body-secondary">
                      Nenhum item adicionado.
                    </CTableDataCell>
                  </CTableRow>
                )}
              </CTableBody>
            </CTable>

            <div className="d-flex justify-content-end">
              <div style={{ minWidth: 260 }}>
                <div className="d-flex justify-content-between">
                  <span>Produtos</span>
                  <span>{formatarMoeda(valorProdutos)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Personalizações</span>
                  <span>{formatarMoeda(valorPersonalizacoes)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Desconto</span>
                  <span>-{formatarMoeda(form.valorDesconto || 0)}</span>
                </div>
                <div className="d-flex justify-content-between fw-bold">
                  <span>Total</span>
                  <span>{formatarMoeda(valorTotal)}</span>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Criar pedido'}
              </CButton>
              <CButton as={Link} to="/admin/pedidos" color="secondary" variant="outline">
                Cancelar
              </CButton>
            </div>
            {erro && <div className="alert alert-danger mt-3">{erro}</div>}
          </CForm>
        </CCardBody>
      </CCard>

      <CModal visible={modalAberto} onClose={() => setModalAberto(false)} size="lg">
        <CModalHeader>
          <CModalTitle>{indiceEmEdicao === null ? 'Adicionar item' : 'Editar item'}</CModalTitle>
        </CModalHeader>
        <CModalBody>
          <CRow className="g-3">
            <CCol md={5}>
              <CFormLabel>Produto</CFormLabel>
              <CFormSelect name="produtoId" value={itemEditado.produtoId} onChange={handleItemChange}>
                <option value="">Selecione</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.descricao}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol md={2}>
              <CFormLabel>Quantidade</CFormLabel>
              <CFormInput type="number" min="1" name="quantidade" value={itemEditado.quantidade} onChange={handleItemChange} />
            </CCol>
            <CCol md={2}>
              <CFormLabel>Valor unitário</CFormLabel>
              <CFormInput type="number" step="0.01" min="0" name="valorUnitario" value={itemEditado.valorUnitario} onChange={handleItemChange} />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Observação</CFormLabel>
              <CFormInput name="observacao" value={itemEditado.observacao} onChange={handleItemChange} />
            </CCol>

            {itemEditado.produtoId && (
              <CCol xs={12}>
                <CFormLabel className="d-block">Variação (cor / tamanho)</CFormLabel>
                {variacoesDoProduto.length === 0 ? (
                  <p className="text-body-secondary small mb-0">Nenhuma variação ativa cadastrada para este produto.</p>
                ) : (
                  <div className="d-flex flex-wrap gap-2">
                    {variacoesDoProduto.map((v) => {
                      const disponivel = v.saldoDisponivel ?? v.quantidadeEstoque;
                      const selecionada = itemEditado.produtoVariacaoId === v.id;
                      const rotulo = [v.cor?.descricao, v.tamanho?.descricao].filter(Boolean).join(' / ') || v.codigo;
                      return (
                        <CButton
                          key={v.id}
                          type="button"
                          size="sm"
                          color={selecionada ? 'primary' : 'secondary'}
                          variant={selecionada ? undefined : 'outline'}
                          onClick={() => selecionarVariacao(v)}
                          className="d-flex align-items-center gap-2"
                        >
                          {v.cor?.corHex && (
                            <span
                              style={{
                                display: 'inline-block',
                                width: '0.9rem',
                                height: '0.9rem',
                                borderRadius: '50%',
                                background: v.cor.corHex,
                                border: '1px solid rgba(0,0,0,0.25)',
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <span>
                            {rotulo}
                            <span className={disponivel > 0 ? 'opacity-75' : 'text-danger'}> ({disponivel > 0 ? `${disponivel} disp.` : 'sem estoque'})</span>
                          </span>
                        </CButton>
                      );
                    })}
                  </div>
                )}
              </CCol>
            )}

            {itemEditado.produtoVariacaoId && (
              <CCol xs={12}>
                <p className="text-body-secondary small mb-0">Selecionado: {itemEditado.produtoVariacaoLabel}</p>
              </CCol>
            )}
          </CRow>

          <hr className="my-3" />
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h3 className="h6 mb-0">Personalizações</h3>
            <CButton size="sm" color="secondary" variant="outline" type="button" onClick={adicionarPersonalizacao}>
              Adicionar personalização
            </CButton>
          </div>

          {itemEditado.personalizacoes.map((p, indice) => {
            const tipo = tiposPersonalizacao.find((t) => t.id === Number(p.tipoPersonalizacaoId));
            return (
              <CRow className="g-2 mb-2 align-items-end" key={p._key || indice}>
                <CCol md={3}>
                  <CFormLabel className="small mb-1">Tipo</CFormLabel>
                  <CFormSelect name="tipoPersonalizacaoId" value={p.tipoPersonalizacaoId} onChange={(e) => handlePersonalizacaoChange(indice, e)}>
                    <option value="">Selecione</option>
                    {tiposPersonalizacao.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.descricao}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol md={3}>
                  <CFormLabel className="small mb-1">
                    Texto {tipo?.exigeTexto ? '(obrigatório)' : '(opcional)'}
                  </CFormLabel>
                  <CFormInput name="textoPersonalizado" value={p.textoPersonalizado} onChange={(e) => handlePersonalizacaoChange(indice, e)} />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">Cor</CFormLabel>
                  <CFormInput name="corPersonalizacao" value={p.corPersonalizacao} onChange={(e) => handlePersonalizacaoChange(indice, e)} />
                </CCol>
                <CCol md={2}>
                  <CFormLabel className="small mb-1">Posição</CFormLabel>
                  <CFormInput name="posicao" value={p.posicao} onChange={(e) => handlePersonalizacaoChange(indice, e)} />
                </CCol>
                <CCol md={1}>
                  <CFormLabel className="small mb-1">Valor</CFormLabel>
                  <CFormInput type="number" step="0.01" min="0" name="valor" value={p.valor} onChange={(e) => handlePersonalizacaoChange(indice, e)} />
                </CCol>
                <CCol md={1}>
                  <CButton size="sm" color="danger" variant="outline" type="button" onClick={() => removerPersonalizacao(indice)}>
                    X
                  </CButton>
                </CCol>
              </CRow>
            );
          })}

          {erroModal && <div className="alert alert-danger mt-3 mb-0">{erroModal}</div>}
        </CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setModalAberto(false)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarItem}>
            Salvar item
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
