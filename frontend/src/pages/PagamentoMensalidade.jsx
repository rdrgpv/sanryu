import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

function formatarCompetencia(valor) {
  const [ano, mes] = (valor || '').split('-');
  return mes ? `${mes}/${ano}` : valor;
}

const INTERVALO_STATUS_MS = 8000;

// Link de pagamento da mensalidade (/mensalidades/:token). O backend gera o Pix na hora (com multa/
// juros do dia, se atrasada). Com Mercado Pago, a página fica conferindo o status e mostra a
// confirmação sozinha assim que o pagamento cai.
export default function PagamentoMensalidade() {
  const { token } = useParams();
  const [cobranca, setCobranca] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api
      .get(`/mensalidades/${token}`)
      .then((res) => setCobranca(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Cobrança não encontrada. Confira o link recebido.'));
  }, [token]);

  const aguardandoPix = cobranca?.status === 'pendente' && cobranca.baixaAutomatica;

  useEffect(() => {
    if (!aguardandoPix) return undefined;

    const intervalo = setInterval(() => {
      api
        .get(`/mensalidades/${token}/status`)
        .then((res) => {
          if (res.data.status !== 'pendente') setCobranca((prev) => ({ ...prev, ...res.data }));
        })
        .catch(() => {});
    }, INTERVALO_STATUS_MS);

    return () => clearInterval(intervalo);
  }, [aguardandoPix, token]);

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(cobranca.pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      window.prompt('Copie o código Pix:', cobranca.pixCopiaCola);
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
          <p className="hero__kicker">Mensalidade</p>
          <h1>{cobranca?.aluno || 'Carregando...'}</h1>
          {cobranca && (
            <p className="tile__meta" style={{ marginTop: '0.5rem' }}>
              {cobranca.plano ? `${cobranca.plano} · ` : ''}Referente a {formatarCompetencia(cobranca.competencia)} · vence {formatarData(cobranca.vencimento)}
            </p>
          )}
        </div>
      </section>

      {cobranca && (
        <section className="section section--compacta">
          <div className="container narrow">
            {cobranca.status === 'pago' ? (
              <div className="tile">
                <p className="alert alert--success" style={{ marginTop: 0 }}>
                  Pagamento confirmado{cobranca.pagoEm ? ` em ${new Date(cobranca.pagoEm).toLocaleDateString('pt-BR')}` : ''}. Obrigado!
                </p>
              </div>
            ) : (
              <div className="tile pagamento-mensalidade">
                <div className="pagamento-mensalidade__valores">
                  <div>
                    <span>Mensalidade</span>
                    <span>{formatarMoeda(cobranca.valor)}</span>
                  </div>
                  {cobranca.multa > 0 && (
                    <div>
                      <span>Multa por atraso</span>
                      <span>{formatarMoeda(cobranca.multa)}</span>
                    </div>
                  )}
                  {cobranca.juros > 0 && (
                    <div>
                      <span>Juros ({cobranca.diasAtraso} dia{cobranca.diasAtraso > 1 ? 's' : ''})</span>
                      <span>{formatarMoeda(cobranca.juros)}</span>
                    </div>
                  )}
                  <div className="pagamento-mensalidade__total">
                    <span>Total a pagar hoje</span>
                    <span>{formatarMoeda(cobranca.total)}</span>
                  </div>
                </div>

                {cobranca.pixCopiaCola ? (
                  <>
                    {cobranca.qrcodePix && <img src={cobranca.qrcodePix} alt="QR code Pix" className="pagamento-mensalidade__qr" />}
                    <button type="button" className="btn btn--primary btn--bloco" onClick={copiarPix}>
                      {copiado ? 'Código copiado!' : 'Copiar código Pix (copia e cola)'}
                    </button>
                    <p className="tile__meta" style={{ marginTop: '0.75rem', textAlign: 'center' }}>
                      {cobranca.baixaAutomatica
                        ? 'Assim que o pagamento cair, esta página mostra a confirmação.'
                        : 'Depois de pagar, a academia confirma o recebimento.'}
                      {cobranca.pixExpiraEm && ` Este Pix vale até ${new Date(cobranca.pixExpiraEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.`}
                    </p>
                  </>
                ) : (
                  <p className="alert alert--error">Não foi possível gerar o Pix agora. Fale com a academia.</p>
                )}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
