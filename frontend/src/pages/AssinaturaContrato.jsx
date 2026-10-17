import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import AssinaturaCanvas from '../components/AssinaturaCanvas.jsx';

const PERIODICIDADES = { mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual' };

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

// Link público do contrato (/contratos/:token) — o responsável lê e assina no celular. O token
// aleatório é a única "senha": quem tem o link consegue assinar, então ele só é mandado pra pessoa.
export default function AssinaturaContrato() {
  const { token } = useParams();
  const assinaturaRef = useRef(null);
  const [contrato, setContrato] = useState(null);
  const [erroCarregar, setErroCarregar] = useState(null);
  const [nomeAssinante, setNomeAssinante] = useState('');
  const [assinou, setAssinou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get(`/contratos/${token}`)
      .then((res) => {
        setContrato(res.data);
        setNomeAssinante(res.data.nomeAssinante || '');
      })
      .catch(() => setErroCarregar('Contrato não encontrado. Confira o link recebido.'));
  }, [token]);

  async function handleAssinar(event) {
    event.preventDefault();
    setErro(null);

    if (!assinou || assinaturaRef.current.estaVazio()) {
      setErro('Assine no quadro antes de enviar.');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.post(`/contratos/${token}/assinatura`, { nomeAssinante, assinatura: assinaturaRef.current.paraDataUrl() });
      setContrato((prev) => ({ ...prev, assinado: true, assinadoEm: res.data.assinadoEm, nomeAssinante: res.data.nomeAssinante }));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível enviar a assinatura. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  if (erroCarregar) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{erroCarregar}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-header page-header--compacto">
        <div className="container">
          <p className="hero__kicker">Contrato de matrícula</p>
          <h1>{contrato?.aluno || 'Carregando...'}</h1>
          {contrato && (
            <p className="tile__meta" style={{ marginTop: '0.5rem' }}>
              {contrato.plano} · {PERIODICIDADES[contrato.periodicidade] || contrato.periodicidade} · {formatarMoeda(contrato.valorFinal)} ·
              vence dia {contrato.diaVencimento}
              {contrato.unidade ? ` · ${contrato.unidade}` : ''}
            </p>
          )}
        </div>
      </section>

      {contrato && (
        <section className="section section--compacta">
          <div className="container narrow">
            {contrato.assinado && (
              <p className="alert alert--success" style={{ marginTop: 0 }}>
                Contrato assinado por {contrato.nomeAssinante} em {new Date(contrato.assinadoEm).toLocaleString('pt-BR')}. Obrigado!
              </p>
            )}
            {!contrato.assinado && contrato.situacao !== 'ativo' && (
              <p className="alert alert--error" style={{ marginTop: 0 }}>
                Este contrato não está mais ativo.
              </p>
            )}

            <div className="termo-autorizacao" style={{ marginBottom: '1.25rem' }}>
              {contrato.termo}
            </div>

            {!contrato.assinado && contrato.situacao === 'ativo' && (
              <form className="form form--autorizacao" onSubmit={handleAssinar}>
                <label className="form__field">
                  <span>Nome completo de quem assina</span>
                  <input value={nomeAssinante} onChange={(event) => setNomeAssinante(event.target.value)} autoComplete="name" required />
                </label>

                <div className="form__field">
                  <span>Assinatura</span>
                  <AssinaturaCanvas ref={assinaturaRef} onChange={setAssinou} disabled={enviando} />
                  <div className="assinatura-rodape">
                    <small className="tile__meta">Assine com o dedo dentro do quadro.</small>
                    <button
                      type="button"
                      className="btn btn--ghost btn--small"
                      onClick={() => assinaturaRef.current.limpar()}
                      disabled={enviando || !assinou}
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {erro && <p className="alert alert--error">{erro}</p>}

                <button type="submit" className="btn btn--primary btn--bloco" disabled={enviando}>
                  {enviando ? 'Enviando...' : 'Li e concordo — assinar contrato'}
                </button>
              </form>
            )}
          </div>
        </section>
      )}
    </>
  );
}
