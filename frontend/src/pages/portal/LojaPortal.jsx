import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiPortal from '../../services/apiPortal';

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const SITUACOES = {
  aguardando: { texto: 'Aguardando pagamento', classe: 'chamada__aviso' },
  pago: { texto: 'Pago — retire na recepção', classe: 'chamada__pela-foto' },
  entregue: { texto: 'Entregue', classe: 'chamada__pela-foto' },
  cancelado: { texto: 'Cancelado', classe: 'chamada__aviso' },
};

// Loja da área do aluno: escolhe cor/tamanho, monta o carrinho, paga por Pix e retira na academia.
export default function LojaPortal() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState(null);
  const [escolhas, setEscolhas] = useState({});
  const [carrinho, setCarrinho] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    apiPortal.get('/loja').then((res) => setProdutos(res.data)).catch(() => setProdutos([]));
    apiPortal.get('/loja/pedidos').then((res) => setPedidos(res.data)).catch(() => setPedidos([]));
  }, []);

  function quantidadeNoCarrinho(variacaoId) {
    return carrinho.find((item) => item.variacaoId === variacaoId)?.quantidade || 0;
  }

  function adicionar(produto) {
    setErro(null);
    const variacaoId = Number(escolhas[produto.id] || produto.variacoes[0].id);
    const variacao = produto.variacoes.find((item) => item.id === variacaoId);
    if (variacao.disponivel !== null && quantidadeNoCarrinho(variacaoId) + 1 > variacao.disponivel) {
      setErro(`Só há ${variacao.disponivel} disponível de ${produto.descricao} ${variacao.descricao}.`);
      return;
    }
    setCarrinho((prev) =>
      prev.some((item) => item.variacaoId === variacaoId)
        ? prev.map((item) => (item.variacaoId === variacaoId ? { ...item, quantidade: item.quantidade + 1 } : item))
        : [...prev, { variacaoId, nome: `${produto.descricao} — ${variacao.descricao}`, valor: variacao.valor, quantidade: 1 }]
    );
  }

  function remover(variacaoId) {
    setCarrinho((prev) => prev.map((item) => (item.variacaoId === variacaoId ? { ...item, quantidade: item.quantidade - 1 } : item)).filter((item) => item.quantidade > 0));
  }

  async function finalizar() {
    setErro(null);
    setEnviando(true);
    try {
      const res = await apiPortal.post('/loja/pedidos', { itens: carrinho.map((item) => ({ produtoVariacaoId: item.variacaoId, quantidade: item.quantidade })) });
      navigate(res.data.link);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível criar o pedido.');
    } finally {
      setEnviando(false);
    }
  }

  const total = carrinho.reduce((soma, item) => soma + item.valor * item.quantidade, 0);

  return (
    <>
      <Link to="/portal" className="sensei__voltar">
        ← início
      </Link>
      <h1 className="portal__titulo">Loja</h1>
      <p className="tile__meta">Pague por Pix e retire na recepção da academia.</p>

      {produtos === null && <p>Carregando...</p>}
      {produtos?.length === 0 && <p>Nenhum produto disponível na loja no momento.</p>}

      <div className="loja__grade">
        {(produtos || []).map((produto) => {
          const variacaoId = Number(escolhas[produto.id] || produto.variacoes[0].id);
          const variacao = produto.variacoes.find((item) => item.id === variacaoId);
          return (
            <div key={produto.id} className="loja__produto">
              {produto.foto ? <img src={produto.foto} alt="" className="loja__foto" /> : <div className="loja__foto loja__foto--vazia">{produto.descricao.slice(0, 1)}</div>}
              <strong>{produto.descricao}</strong>
              {produto.variacoes.length > 1 && (
                <select value={variacaoId} onChange={(event) => setEscolhas((prev) => ({ ...prev, [produto.id]: event.target.value }))}>
                  {produto.variacoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.descricao}
                    </option>
                  ))}
                </select>
              )}
              <span className="loja__preco">{formatarMoeda(variacao.valor)}</span>
              <button type="button" className="btn btn--primary btn--small" onClick={() => adicionar(produto)}>
                Adicionar
              </button>
            </div>
          );
        })}
      </div>

      {carrinho.length > 0 && (
        <div className="loja__carrinho">
          <h2 className="sensei__secao">Seu pedido</h2>
          {carrinho.map((item) => (
            <div key={item.variacaoId} className="portal__historico-linha">
              <span>
                {item.quantidade}× {item.nome}
              </span>
              <span>
                {formatarMoeda(item.valor * item.quantidade)}{' '}
                <button type="button" className="portal__link-texto" onClick={() => remover(item.variacaoId)}>
                  tirar
                </button>
              </span>
            </div>
          ))}
          <div className="pagamento-mensalidade__total" style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total</span>
            <span>{formatarMoeda(total)}</span>
          </div>
          {erro && <p className="alert alert--error">{erro}</p>}
          <button type="button" className="btn btn--primary btn--bloco" style={{ marginTop: '0.75rem' }} onClick={finalizar} disabled={enviando}>
            {enviando ? 'Criando pedido...' : 'Pagar com Pix'}
          </button>
          <p className="tile__meta" style={{ textAlign: 'center' }}>
            O pedido fica reservado por 48 horas aguardando o pagamento.
          </p>
        </div>
      )}
      {erro && carrinho.length === 0 && <p className="alert alert--error">{erro}</p>}

      {pedidos.length > 0 && (
        <>
          <h2 className="sensei__secao">Meus pedidos</h2>
          {pedidos.map((pedido) => (
            <div key={pedido.id} className="portal__cobranca">
              <div>
                <strong>Pedido #{pedido.id}</strong>
                <small>{pedido.itens.map((item) => `${item.quantidade}× ${item.descricao}`).join(', ')}</small>
                <span className={SITUACOES[pedido.situacao]?.classe}>{SITUACOES[pedido.situacao]?.texto}</span>
              </div>
              <div className="portal__cobranca-acao">
                <strong>{formatarMoeda(pedido.total)}</strong>
                {pedido.situacao === 'aguardando' && (
                  <Link to={pedido.link} className="btn btn--primary btn--small">
                    Pagar
                  </Link>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </>
  );
}
