import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const INTERVALO_STATUS_MS = 8000;

// Pagamento do pedido da loja (/loja/pedidos/:token): Pix e confirmação automática quando cai.
export default function PagamentoPedidoLoja() {
  const { token } = useParams();
  const [pedido, setPedido] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api
      .get(`/loja/pedidos/${token}`)
      .then((res) => setPedido(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Pedido não encontrado.'));
  }, [token]);

  const aguardando = pedido?.situacao === 'aguardando' && pedido.baixaAutomatica;
  useEffect(() => {
    if (!aguardando) return undefined;
    const intervalo = setInterval(() => {
      api.get(`/loja/pedidos/${token}/status`).then((res) => {
        if (res.data.situacao !== 'aguardando') setPedido((prev) => ({ ...prev, situacao: res.data.situacao }));
      }).catch(() => {});
    }, INTERVALO_STATUS_MS);
    return () => clearInterval(intervalo);
  }, [aguardando, token]);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(pedido.pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      window.prompt('Copie o código Pix:', pedido.pixCopiaCola);
    }
  }

  if (erro) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{erro}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-header page-header--compacto">
        <div className="container">
          <p className="hero__kicker">Loja</p>
          <h1>{pedido ? `Pedido #${pedido.id}` : 'Carregando...'}</h1>
        </div>
      </section>

      {pedido && (
        <section className="section section--compacta">
          <div className="container narrow">
            <div className="tile pagamento-mensalidade">
              <div className="pagamento-mensalidade__valores">
                {pedido.itens.map((item, indice) => (
                  <div key={indice}>
                    <span>
                      {item.quantidade}× {item.descricao}
                    </span>
                    <span>{formatarMoeda(item.valor)}</span>
                  </div>
                ))}
                <div className="pagamento-mensalidade__total">
                  <span>Total</span>
                  <span>{formatarMoeda(pedido.total)}</span>
                </div>
              </div>

              {pedido.situacao === 'pago' && <p className="alert alert--success">Pagamento confirmado! É só retirar na recepção da academia.</p>}
              {pedido.situacao === 'entregue' && <p className="alert alert--success">Pedido entregue. Obrigado!</p>}
              {pedido.situacao === 'cancelado' && <p className="alert alert--error">Este pedido foi cancelado (não foi pago no prazo). Faça um novo pela loja.</p>}

              {pedido.situacao === 'aguardando' &&
                (pedido.pixCopiaCola ? (
                  <>
                    {pedido.qrcodePix && <img src={pedido.qrcodePix} alt="QR code Pix" className="pagamento-mensalidade__qr" />}
                    <button type="button" className="btn btn--primary btn--bloco" onClick={copiar}>
                      {copiado ? 'Código copiado!' : 'Copiar código Pix (copia e cola)'}
                    </button>
                    <p className="tile__meta" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      {pedido.baixaAutomatica ? 'Assim que o pagamento cair, esta página mostra a confirmação.' : 'Depois de pagar, a academia confirma o recebimento.'} Pague até{' '}
                      {new Date(pedido.prazo).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
                    </p>
                  </>
                ) : (
                  <p className="alert alert--error">Não foi possível gerar o Pix agora. Fale com a academia.</p>
                ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
