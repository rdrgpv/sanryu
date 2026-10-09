import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import AssinaturaCanvas from '../components/AssinaturaCanvas.jsx';

const DADOS_INICIAIS = { nomeAluno: '', faixa: '', idade: '', turmaId: '', nomeResponsavel: '' };

// Página avulsa (link por evento) pro responsável preencher e assinar no celular — não depende de
// inscrição. Feita mobile-first: uma coluna, campos grandes e o quadro de assinatura em largura total.
export default function AutorizacaoEvento() {
  const { id } = useParams();
  const assinaturaRef = useRef(null);

  const [evento, setEvento] = useState(null);
  const [termo, setTermo] = useState('');
  const [turmas, setTurmas] = useState([]);
  const [eventoErro, setEventoErro] = useState(null);
  const [faixas, setFaixas] = useState([]);

  const [dados, setDados] = useState(DADOS_INICIAIS);
  const [assinou, setAssinou] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [enviada, setEnviada] = useState(null);

  useEffect(() => {
    api
      .get(`/eventos/${id}/autorizacao`)
      .then((res) => {
        setEvento(res.data.evento);
        setTermo(res.data.termo);
        setTurmas(res.data.turmas || []);
      })
      .catch(() => setEventoErro('Evento não encontrado ou não está disponível.'));

    api
      .get('/faixas')
      .then((res) => setFaixas(res.data))
      .catch(() => setFaixas([]));
  }, [id]);

  function atualizar(campo, valor) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleEnviar(event) {
    event.preventDefault();
    setErro(null);

    if (!assinou || assinaturaRef.current.estaVazio()) {
      setErro('Assine no quadro antes de enviar.');
      return;
    }

    setEnviando(true);

    try {
      const res = await api.post(`/eventos/${id}/autorizacoes`, {
        ...dados,
        idade: Number(dados.idade),
        turmaId: Number(dados.turmaId),
        assinatura: assinaturaRef.current.paraDataUrl(),
      });
      setEnviada(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível enviar a autorização. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  // Irmãos no mesmo evento: o responsável preenche outra autorização sem redigitar o próprio nome.
  function handleNovaAutorizacao() {
    setDados({ ...DADOS_INICIAIS, nomeResponsavel: dados.nomeResponsavel });
    setAssinou(false);
    setEnviada(null);
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
      <section className="page-header page-header--compacto">
        <div className="container">
          <p className="hero__kicker">Autorização do responsável</p>
          <h1>{evento?.nome || 'Carregando...'}</h1>
          {evento && (
            <p className="tile__meta" style={{ marginTop: '0.5rem' }}>
              {new Date(evento.data).toLocaleDateString('pt-BR')}
              {evento.local ? ` · ${evento.local}` : ''}
            </p>
          )}
        </div>
      </section>

      <section className="section section--compacta">
        <div className="container narrow">
          {enviada ? (
            <div className="tile">
              <p className="alert alert--success" style={{ marginTop: 0 }}>
                Autorização enviada com sucesso.
              </p>
              <p>
                <strong>Aluno:</strong> {enviada.nomeAluno}
              </p>
              <p>
                <strong>Faixa:</strong> {enviada.faixa}
              </p>
              <p>
                <strong>Idade:</strong> {enviada.idade} anos
              </p>
              <p>
                <strong>Turma:</strong> {enviada.turma}
              </p>
              <p>
                <strong>Responsável:</strong> {enviada.nomeResponsavel}
              </p>
              <button type="button" className="btn btn--ghost btn--bloco" onClick={handleNovaAutorizacao}>
                Preencher para outro aluno
              </button>
            </div>
          ) : (
            evento && (
              <form className="form form--autorizacao" onSubmit={handleEnviar}>
                <label className="form__field">
                  <span>Nome completo do aluno</span>
                  <input
                    value={dados.nomeAluno}
                    onChange={(event) => atualizar('nomeAluno', event.target.value)}
                    autoComplete="off"
                    autoCapitalize="words"
                    required
                  />
                </label>

                <div className="form__linha">
                  <label className="form__field">
                    <span>Faixa</span>
                    <select value={dados.faixa} onChange={(event) => atualizar('faixa', event.target.value)} required>
                      <option value="">Selecione</option>
                      {faixas.map((faixa) => (
                        <option key={faixa.id} value={faixa.nome}>
                          {faixa.nome}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form__field">
                    <span>Idade</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="1"
                      max="120"
                      value={dados.idade}
                      onChange={(event) => atualizar('idade', event.target.value)}
                      required
                    />
                  </label>
                </div>

                <label className="form__field">
                  <span>Turma</span>
                  <select value={dados.turmaId} onChange={(event) => atualizar('turmaId', event.target.value)} required>
                    <option value="">Selecione</option>
                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.descricao}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="form__field">
                  <span>Nome completo do responsável</span>
                  <input
                    value={dados.nomeResponsavel}
                    onChange={(event) => atualizar('nomeResponsavel', event.target.value)}
                    autoComplete="name"
                    autoCapitalize="words"
                    required
                  />
                </label>

                <div className="termo-autorizacao">{termo}</div>

                <div className="form__field">
                  <span>Assinatura do responsável</span>
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
                  {enviando ? 'Enviando...' : 'Li e concordo — enviar autorização'}
                </button>
              </form>
            )
          )}
        </div>
      </section>
    </>
  );
}
