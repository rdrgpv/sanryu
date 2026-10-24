import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { usePagina } from '../utils/site.js';
import { formatarTelefone, calcularIdade } from '../utils/formato.js';

const ORIGENS = [
  { valor: 'instagram', label: 'Instagram' },
  { valor: 'facebook', label: 'Facebook' },
  { valor: 'google', label: 'Google' },
  { valor: 'indicacao', label: 'Indicação de alguém' },
  { valor: 'passou_na_frente', label: 'Passei na frente' },
  { valor: 'evento', label: 'Evento' },
  { valor: 'outro', label: 'Outro' },
];

const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function rotuloData(data) {
  const [ano, mes, dia] = data.split('-');
  const semana = SEMANA[new Date(`${data}T12:00:00Z`).getUTCDay()];
  return { semana, dia: `${dia}/${mes}`, ano };
}

const INICIAL = {
  nome: '',
  dataNascimento: '',
  nomeResponsavel: '',
  telefone: '',
  email: '',
  turmaId: '',
  dataAula: '',
  origem: '',
  observacoes: '',
  aceiteContato: false,
  site: '',
};

// Agendamento público de aula experimental — escolhe a turma e um dos próximos dias dela.
export default function AulaExperimental() {
  const [parametros] = useSearchParams();
  const [turmas, setTurmas] = useState(null);
  // Vindo de "Quero experimentar esta turma" (página de aulas), a turma já chega escolhida.
  const [dados, setDados] = useState(() => ({ ...INICIAL, turmaId: parametros.get('turma') || '' }));
  usePagina('Aula experimental gratuita', 'Agende sua aula experimental gratuita de Morganti Ju-Jitsu no San·Ryu Dojo, no Tatuapé.');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [concluido, setConcluido] = useState(null);

  useEffect(() => {
    api
      .get('/aula-experimental/opcoes')
      .then((res) => {
        setTurmas(res.data);
        // Turma do link que não aceita experimental (ou não existe mais): volta pra "ainda não sei".
        setDados((prev) => (prev.turmaId && !res.data.some((turma) => String(turma.id) === String(prev.turmaId)) ? { ...prev, turmaId: '' } : prev));
      })
      .catch(() => setTurmas([]));
  }, []);

  const idade = calcularIdade(dados.dataNascimento);
  const menor = idade !== null && idade < 18;
  const turmaEscolhida = turmas?.find((turma) => String(turma.id) === String(dados.turmaId));

  function atualizar(campo, valor) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
  }

  async function enviar(event) {
    event.preventDefault();
    setErro(null);

    if (turmaEscolhida && !dados.dataAula) {
      setErro('Escolha o dia da aula.');
      return;
    }

    setEnviando(true);
    try {
      const res = await api.post('/aula-experimental', dados);
      setConcluido(res.data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível agendar agora. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="page-header page-header--compacto">
        <div className="container">
          <p className="hero__kicker">Aula experimental</p>
          <h1>Venha conhecer o tatame</h1>
        </div>
      </section>

      <section className="section section--compacta">
        <div className="container narrow">
          {concluido ? (
            <div className="tile">
              <p className="alert alert--success" style={{ marginTop: 0 }}>
                {concluido.agendado ? `Aula experimental agendada para ${concluido.data}!` : 'Recebemos seu interesse!'}
              </p>
              <p>
                {concluido.agendado
                  ? 'Venha com roupa confortável e chegue uns 10 minutos antes. Se informou e-mail, você recebe a confirmação e um lembrete na véspera.'
                  : 'Vamos entrar em contato pelo WhatsApp para combinar o melhor dia.'}
              </p>
            </div>
          ) : (
            <form className="form form--autorizacao" onSubmit={enviar}>
              {/* Armadilha pra robôs: invisível pra pessoas. */}
              <input type="text" name="site" value={dados.site} onChange={(event) => atualizar('site', event.target.value)} tabIndex={-1} autoComplete="off" className="campo-armadilha" aria-hidden="true" />

              <label className="form__field">
                <span>Nome de quem vai fazer a aula</span>
                <input value={dados.nome} onChange={(event) => atualizar('nome', event.target.value)} autoCapitalize="words" required />
              </label>

              <label className="form__field">
                <span>Data de nascimento</span>
                <input type="date" value={dados.dataNascimento} onChange={(event) => atualizar('dataNascimento', event.target.value)} />
              </label>

              {menor && (
                <label className="form__field">
                  <span>Nome do responsável</span>
                  <input value={dados.nomeResponsavel} onChange={(event) => atualizar('nomeResponsavel', event.target.value)} autoCapitalize="words" required />
                </label>
              )}

              <label className="form__field">
                <span>WhatsApp{menor ? ' do responsável' : ''}</span>
                <input type="tel" inputMode="numeric" placeholder="(11) 99999-9999" value={dados.telefone} onChange={(event) => atualizar('telefone', formatarTelefone(event.target.value))} required />
              </label>

              <label className="form__field">
                <span>E-mail (opcional, para confirmação e lembrete)</span>
                <input type="email" value={dados.email} onChange={(event) => atualizar('email', event.target.value)} autoComplete="email" />
              </label>

              <label className="form__field">
                <span>Turma</span>
                <select value={dados.turmaId} onChange={(event) => setDados((prev) => ({ ...prev, turmaId: event.target.value, dataAula: '' }))}>
                  <option value="">{turmas === null ? 'Carregando...' : 'Ainda não sei — me ajudem a escolher'}</option>
                  {(turmas || []).map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} — {turma.diaSemana} {turma.horario}
                      {turma.unidade && turmas.some((outra) => outra.unidade?.nome !== turma.unidade.nome) ? ` (${turma.unidade.nome})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              {turmaEscolhida && (
                <div className="form__field">
                  <span>Dia da aula</span>
                  <div className="aula-dias">
                    {turmaEscolhida.datas.map((data) => {
                      const rotulo = rotuloData(data);
                      return (
                        <button
                          key={data}
                          type="button"
                          className={`aula-dias__opcao${dados.dataAula === data ? ' aula-dias__opcao--ativa' : ''}`}
                          onClick={() => atualizar('dataAula', data)}
                          aria-pressed={dados.dataAula === data}
                        >
                          <small>{rotulo.semana}</small>
                          {rotulo.dia}
                        </button>
                      );
                    })}
                  </div>
                  <small className="tile__meta">
                    {turmaEscolhida.horario}
                    {turmaEscolhida.instrutor ? ` · com ${turmaEscolhida.instrutor}` : ''}
                    {turmaEscolhida.unidade?.endereco ? ` · ${turmaEscolhida.unidade.endereco}` : ''}
                  </small>
                </div>
              )}

              <label className="form__field">
                <span>Como conheceu a academia?</span>
                <select value={dados.origem} onChange={(event) => atualizar('origem', event.target.value)}>
                  <option value="">Selecione</option>
                  {ORIGENS.map((origem) => (
                    <option key={origem.valor} value={origem.valor}>
                      {origem.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="form__field">
                <span>Alguma observação? (experiência, lesão, dúvida)</span>
                <textarea rows={2} value={dados.observacoes} onChange={(event) => atualizar('observacoes', event.target.value)} />
              </label>

              <label className="consentimento">
                <input type="checkbox" checked={dados.aceiteContato} onChange={(event) => atualizar('aceiteContato', event.target.checked)} />
                <span>Autorizo a academia a entrar em contato pelo WhatsApp e e-mail informados sobre esta aula experimental.</span>
              </label>

              {erro && <p className="alert alert--error">{erro}</p>}

              <button type="submit" className="btn btn--primary btn--bloco" disabled={enviando || !dados.aceiteContato}>
                {enviando ? 'Enviando...' : turmaEscolhida ? 'Agendar aula experimental' : 'Quero fazer uma aula experimental'}
              </button>
            </form>
          )}
        </div>
      </section>
    </>
  );
}
