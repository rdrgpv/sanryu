import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

export default function InscricaoEvento() {
  const { id } = useParams();

  const [evento, setEvento] = useState(null);
  const [eventoErro, setEventoErro] = useState(null);

  const [email, setEmail] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [candidatos, setCandidatos] = useState(null);
  const [naoApto, setNaoApto] = useState(false);
  const [erro, setErro] = useState(null);

  const [inscrevendo, setInscrevendo] = useState(false);
  const [resultado, setResultado] = useState(null);

  useEffect(() => {
    api
      .get(`/eventos/${id}/publico`)
      .then((res) => setEvento(res.data))
      .catch(() => setEventoErro('Evento não encontrado ou não está disponível para inscrição.'));
  }, [id]);

  async function handleConsultar(event) {
    event.preventDefault();
    setErro(null);
    setNaoApto(false);
    setCandidatos(null);
    setConsultando(true);

    try {
      const res = await api.post(`/eventos/${id}/consulta`, { email });

      if (!res.data.apto) {
        setNaoApto(true);
      } else {
        setCandidatos(res.data.candidatos);
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível consultar seus dados. Tente novamente.');
    } finally {
      setConsultando(false);
    }
  }

  async function handleConfirmar(indice) {
    setErro(null);
    setInscrevendo(true);

    try {
      const res = await api.post(`/eventos/${id}/inscricoes`, { email, indice });
      setResultado(res.data);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível concluir sua inscrição. Tente novamente.');
    } finally {
      setInscrevendo(false);
    }
  }

  if (eventoErro) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{eventoErro}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Inscrição</p>
          <h1>{evento?.nome || 'Carregando...'}</h1>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          {evento && (
            <div className="tile" style={{ marginBottom: '2rem' }}>
              {evento.descricao && <p>{evento.descricao}</p>}
              <p className="tile__meta">{new Date(evento.data).toLocaleString('pt-BR')}</p>
              {evento.local && <p className="tile__meta">{evento.local}</p>}
            </div>
          )}

          {!resultado && (
            <form className="form" onSubmit={handleConsultar}>
              <label className="form__field">
                <span>Seu email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={consultando || Boolean(candidatos)}
                />
              </label>
              {!candidatos && (
                <button type="submit" className="btn btn--primary" disabled={consultando}>
                  {consultando ? 'Consultando...' : 'Consultar'}
                </button>
              )}
              {erro && <p className="alert alert--error">{erro}</p>}
            </form>
          )}

          {naoApto && (
            <p className="alert alert--error">
              Não localizamos seus dados de carteirinha para o e-mail informado. Verifique o e-mail digitado ou
              entre em contato com o dojo.
            </p>
          )}

          {candidatos && !resultado && (
            <div style={{ marginTop: '1.5rem' }}>
              {candidatos.length > 1 && <p>Encontramos mais de um cadastro para este e-mail. Selecione o seu:</p>}

              <div className="grid grid--2">
                {candidatos.map((candidato, indice) => (
                  <div key={indice} className="tile">
                    <p className="tile__tag">{candidato.origem}</p>
                    <h3>{candidato.nome}</h3>
                    {candidato.faixa && <p>Faixa: {candidato.faixa}</p>}
                    {candidato.numeroCarteirinha && <p className="tile__meta">Carteirinha: {candidato.numeroCarteirinha}</p>}
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => handleConfirmar(indice)}
                      disabled={inscrevendo}
                      style={{ marginTop: '1rem' }}
                    >
                      {inscrevendo ? 'Confirmando...' : 'Confirmar inscrição'}
                    </button>
                  </div>
                ))}
              </div>

              {erro && <p className="alert alert--error">{erro}</p>}
            </div>
          )}

          {resultado && (
            <div className="tile">
              <h3>Inscrição confirmada</h3>
              <p>{resultado.nome}</p>

              {resultado.valorCobrado != null ? (
                <>
                  <p>Valor: R$ {Number(resultado.valorCobrado).toFixed(2)}</p>
                  {resultado.qrcodePix ? (
                    <>
                      <p>Escaneie o QR code abaixo para pagar via Pix:</p>
                      <img src={resultado.qrcodePix} alt="QR code Pix" style={{ maxWidth: 260 }} />
                    </>
                  ) : (
                    <p className="alert alert--error">
                      Não foi possível gerar o QR code de pagamento agora. Nossa equipe entrará em contato.
                    </p>
                  )}
                </>
              ) : (
                <p className="alert alert--success">Inscrição gratuita, sem pagamento necessário.</p>
              )}

              {resultado.aviso && <p className="alert alert--error">{resultado.aviso}</p>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
