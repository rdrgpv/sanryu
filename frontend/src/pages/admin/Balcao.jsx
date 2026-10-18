import { useEffect, useRef, useState } from 'react';
import { CButton, CCard, CCardBody, CFormInput, CInputGroup, CInputGroupText, CRow, CCol } from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';

const FORMAS = [
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'pix', label: 'Pix' },
  { valor: 'cartao', label: 'Cartão' },
  { valor: 'transferencia', label: 'Transferência' },
];

// Venda rápida no balcão: busca (o leitor de código de barras digita o código e dá Enter — se bater
// exato, já entra no carrinho), carrinho, desconto, forma de pagamento. Ao finalizar o estoque baixa
// e a entrada cai no financeiro na conta da forma de pagamento.
export default function Balcao() {
  const buscaRef = useRef(null);
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState([]);
  const [carrinho, setCarrinho] = useState([]);
  const [desconto, setDesconto] = useState('');
  const [forma, setForma] = useState('dinheiro');
  const [cliente, setCliente] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [dia, setDia] = useState(null);

  async function carregarDia() {
    setDia((await api.get('/admin/balcao/vendas-do-dia')).data);
  }

  useEffect(() => {
    carregarDia();
    buscaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (busca.trim().length < 2) {
      setResultados([]);
      return undefined;
    }
    const timeout = setTimeout(() => {
      api.get('/admin/balcao/produtos', { params: { busca } }).then((res) => setResultados(res.data));
    }, 200);
    return () => clearTimeout(timeout);
  }, [busca]);

  function noCarrinho(id) {
    return carrinho.find((item) => item.id === id)?.quantidade || 0;
  }

  function adicionar(produto) {
    setMensagem(null);
    if (produto.controlaEstoque && noCarrinho(produto.id) + 1 > produto.disponivel) {
      setMensagem({ cor: 'warning', texto: `Sem estoque disponível de ${produto.descricao} (disponível ${produto.disponivel}).` });
      return;
    }
    setCarrinho((prev) => (prev.some((item) => item.id === produto.id) ? prev.map((item) => (item.id === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item)) : [...prev, { ...produto, quantidade: 1 }]));
    setBusca('');
    setResultados([]);
    buscaRef.current?.focus();
  }

  function mudarQuantidade(id, quantidade) {
    setCarrinho((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          const limite = item.controlaEstoque ? item.disponivel : Infinity;
          return { ...item, quantidade: Math.max(0, Math.min(quantidade, limite)) };
        })
        .filter((item) => item.quantidade > 0)
    );
  }

  // Enter na busca: código exato (leitor) entra direto; senão, se houver um resultado só, também.
  async function aoTeclar(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    const texto = busca.trim();
    if (!texto) return;
    const lista = (await api.get('/admin/balcao/produtos', { params: { busca: texto } })).data;
    const exato = lista.find((produto) => produto.exato);
    if (exato || lista.length === 1) adicionar(exato || lista[0]);
    else setResultados(lista);
  }

  const subtotal = carrinho.reduce((total, item) => total + item.valorVenda * item.quantidade, 0);
  const valorDesconto = Math.min(subtotal, Math.max(0, Number(desconto) || 0));
  const total = subtotal - valorDesconto;

  async function finalizar() {
    setMensagem(null);
    setFinalizando(true);
    try {
      const res = await api.post('/admin/balcao/vendas', {
        itens: carrinho.map((item) => ({ produtoVariacaoId: item.id, quantidade: item.quantidade })),
        valorDesconto,
        formaPagamento: forma,
        nomeCliente: cliente,
      });
      setMensagem({ cor: 'success', texto: `Venda #${res.data.id} registrada: ${formatarMoeda(res.data.valorTotal)} (${FORMAS.find((item) => item.valor === forma)?.label}).` });
      setCarrinho([]);
      setDesconto('');
      setCliente('');
      carregarDia();
      buscaRef.current?.focus();
    } catch (err) {
      setMensagem({ cor: 'danger', texto: err.response?.data?.error || 'Não foi possível finalizar a venda.' });
    } finally {
      setFinalizando(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Venda no balcão</h1>

      <CRow className="g-3">
        <CCol lg={7}>
          <CCard className="mb-3">
            <CCardBody>
              <CFormInput
                ref={buscaRef}
                size="lg"
                placeholder="Bipe o código de barras ou digite o produto..."
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                onKeyDown={aoTeclar}
                autoComplete="off"
              />
              {resultados.length > 0 && (
                <div className="list-group mt-2">
                  {resultados.map((produto) => {
                    const semEstoque = produto.controlaEstoque && produto.disponivel - noCarrinho(produto.id) <= 0;
                    return (
                      <button
                        key={produto.id}
                        type="button"
                        className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                        onClick={() => adicionar(produto)}
                        disabled={semEstoque}
                      >
                        <span>
                          {produto.descricao}
                          <small className="text-body-secondary d-block">
                            {produto.codigo} · {produto.controlaEstoque ? `${produto.disponivel} disponível` : 'sem controle de estoque'}
                          </small>
                        </span>
                        <strong>{formatarMoeda(produto.valorVenda)}</strong>
                      </button>
                    );
                  })}
                </div>
              )}
            </CCardBody>
          </CCard>

          <CCard>
            <CCardBody>
              <h2 className="h6">Carrinho</h2>
              {carrinho.length === 0 && <p className="text-body-secondary small mb-0">Vazio — bipe ou busque um produto.</p>}
              {carrinho.map((item) => (
                <div key={item.id} className="d-flex align-items-center gap-2 border-bottom py-2">
                  <span className="flex-grow-1">
                    {item.descricao}
                    <small className="text-body-secondary d-block">{formatarMoeda(item.valorVenda)} cada</small>
                  </span>
                  <CButton color="secondary" variant="outline" size="sm" onClick={() => mudarQuantidade(item.id, item.quantidade - 1)}>
                    −
                  </CButton>
                  <span style={{ minWidth: 28, textAlign: 'center' }}>{item.quantidade}</span>
                  <CButton color="secondary" variant="outline" size="sm" onClick={() => mudarQuantidade(item.id, item.quantidade + 1)} disabled={item.controlaEstoque && item.quantidade >= item.disponivel}>
                    +
                  </CButton>
                  <strong style={{ minWidth: 90, textAlign: 'right' }}>{formatarMoeda(item.valorVenda * item.quantidade)}</strong>
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={5}>
          <CCard className="mb-3">
            <CCardBody>
              <div className="d-flex justify-content-between small">
                <span>Subtotal</span>
                <span>{formatarMoeda(subtotal)}</span>
              </div>
              <CInputGroup size="sm" className="my-2">
                <CInputGroupText>Desconto R$</CInputGroupText>
                <CFormInput type="number" min="0" step="0.01" value={desconto} onChange={(event) => setDesconto(event.target.value)} />
              </CInputGroup>
              <div className="d-flex justify-content-between fs-4 fw-semibold border-top pt-2">
                <span>Total</span>
                <span>{formatarMoeda(total)}</span>
              </div>

              <div className="d-flex flex-wrap gap-2 my-3">
                {FORMAS.map((item) => (
                  <CButton key={item.valor} color={forma === item.valor ? 'primary' : 'secondary'} variant={forma === item.valor ? undefined : 'outline'} onClick={() => setForma(item.valor)}>
                    {item.label}
                  </CButton>
                ))}
              </div>
              <CFormInput className="mb-3" placeholder="Nome do cliente (opcional)" value={cliente} onChange={(event) => setCliente(event.target.value)} />
              <CButton color="success" size="lg" className="w-100" onClick={finalizar} disabled={!carrinho.length || finalizando}>
                {finalizando ? 'Finalizando...' : `Finalizar venda ${carrinho.length ? formatarMoeda(total) : ''}`}
              </CButton>
              {mensagem && <div className={`alert alert-${mensagem.cor} mt-3 mb-0 py-2`}>{mensagem.texto}</div>}
            </CCardBody>
          </CCard>

          {dia && (
            <CCard>
              <CCardBody>
                <h2 className="h6">Vendas de hoje — {formatarMoeda(dia.total)}</h2>
                <div className="d-flex flex-wrap gap-3 small mb-2">
                  {Object.entries(dia.porForma).map(([chave, valor]) => (
                    <span key={chave}>
                      {FORMAS.find((item) => item.valor === chave)?.label || chave}: <strong>{formatarMoeda(valor)}</strong>
                    </span>
                  ))}
                </div>
                {dia.vendas.slice(0, 8).map((venda) => (
                  <div key={venda.id} className="d-flex justify-content-between small border-bottom py-1">
                    <span>
                      #{venda.id} · {new Date(venda.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {venda.itens} item(s)
                    </span>
                    <span>{formatarMoeda(venda.total)}</span>
                  </div>
                ))}
              </CCardBody>
            </CCard>
          )}
        </CCol>
      </CRow>
    </div>
  );
}
