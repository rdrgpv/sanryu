import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const TIPO_EXAME_DE_FAIXA_ID = 1;
const OPCOES_FAIXA_BRANCA = ['Cinza', 'Amarela'];

function faixaEfetiva(candidato) {
  return candidato.origem === 'gatame' && candidato.faixa ? candidato.faixa : 'Branca';
}

function formatarData(valor) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? valor : data.toLocaleDateString('pt-BR');
}

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
  const [copiado, setCopiado] = useState(false);
  const [mostrarQrCode, setMostrarQrCode] = useState(false);

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

  async function handleConfirmar(indice, faixaEscolhida) {
    setErro(null);
    setInscrevendo(true);

    try {
      const res = await api.post(`/eventos/${id}/inscricoes`, { email, indice, faixaEscolhida });
      setResultado(res.data);
      setMostrarQrCode(!res.data.jaInscrito);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível concluir sua inscrição. Tente novamente.');
    } finally {
      setInscrevendo(false);
    }
  }

  async function handleCopiarPix() {
    try {
      await navigator.clipboard.writeText(resultado.pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      setErro('Não foi possível copiar o código. Copie manualmente o QR code exibido.');
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
              {evento.banner && (
                <img
                  src={evento.banner}
                  alt=""
                  style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 'var(--raio)', marginBottom: '1rem' }}
                />
              )}
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
                {candidatos.map((candidato, indice) => {
                  const precisaEscolherFaixa =
                    evento?.tipoEvento?.id === TIPO_EXAME_DE_FAIXA_ID &&
                    faixaEfetiva(candidato).toLowerCase() === 'branca';

                  return (
                    <div key={indice} className="tile">
                      <p className="tile__tag">{candidato.origem}</p>
                      <h3>{candidato.nome}</h3>
                      {candidato.email && <p className="tile__meta">Email: {candidato.email}</p>}
                      {candidato.faixa && <p>Faixa: {candidato.faixa}</p>}
                      {formatarData(candidato.dataNascimento) && (
                        <p className="tile__meta">Nascimento: {formatarData(candidato.dataNascimento)}</p>
                      )}
                      {candidato.numeroCarteirinha && (
                        <p className="tile__meta">Carteirinha: {candidato.numeroCarteirinha}</p>
                      )}
                      {formatarData(candidato.validadeCarteirinha) && (
                        <p className="tile__meta">Validade da carteirinha: {formatarData(candidato.validadeCarteirinha)}</p>
                      )}

                      {precisaEscolherFaixa ? (
                        <div style={{ marginTop: '1rem' }}>
                          <p>Para qual faixa você vai fazer o exame?</p>
                          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                            {OPCOES_FAIXA_BRANCA.map((opcao) => (
                              <button
                                key={opcao}
                                type="button"
                                className="btn btn--primary"
                                onClick={() => handleConfirmar(indice, opcao)}
                                disabled={inscrevendo}
                              >
                                {inscrevendo ? 'Confirmando...' : opcao}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleConfirmar(indice)}
                          disabled={inscrevendo}
                          style={{ marginTop: '1rem' }}
                        >
                          {inscrevendo ? 'Confirmando...' : 'Confirmar inscrição'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {erro && <p className="alert alert--error">{erro}</p>}
            </div>
          )}

          {resultado && (
            <div className="tile">
              <h3>{resultado.jaInscrito ? 'Você já está inscrito' : 'Inscrição confirmada'}</h3>
              <p>{resultado.nome}</p>
              {resultado.jaInscrito && (
                <p className="tile__meta">Encontramos uma inscrição sua para este evento com esse e-mail.</p>
              )}

              {resultado.valorCobrado != null ? (
                <>
                  <p>Valor: R$ {Number(resultado.valorCobrado).toFixed(2)}</p>
                  {resultado.qrcodePix ? (
                    <div style={{ marginTop: '1rem' }}>
                      <button type="button" className="btn btn--ghost" onClick={() => setMostrarQrCode((v) => !v)}>
                        {mostrarQrCode ? 'Ocultar QR Code' : 'Ver QR Code'}
                      </button>

                      {mostrarQrCode && (
                        <div style={{ marginTop: '1rem' }}>
                          <p>Escaneie o QR code abaixo para pagar via Pix:</p>
                          <img src={resultado.qrcodePix} alt="QR code Pix" style={{ maxWidth: 260 }} />
                          {resultado.pixCopiaCola && (
                            <div style={{ marginTop: '1rem' }}>
                              <button type="button" className="btn btn--ghost" onClick={handleCopiarPix}>
                                {copiado ? 'Código copiado!' : 'Copiar código Pix'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="alert alert--error">
                      Não foi possível gerar o QR code de pagamento agora. Nossa equipe entrará em contato.
                    </p>
                  )}
                </>
              ) : resultado.statusPagamento === 'pago' ? (
                <p className="alert alert--success">Inscrição gratuita, sem pagamento necessário.</p>
              ) : (
                <p className="alert alert--error">
                  Ainda não foi possível calcular o valor da sua inscrição. Nossa equipe entrará em contato.
                </p>
              )}

              {resultado.aviso && <p className="alert alert--error">{resultado.aviso}</p>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
