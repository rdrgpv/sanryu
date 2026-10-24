import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { usePagina } from '../utils/site.js';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

function diasDaTurma(turma) {
  return (turma.diaSemana || '').split(',').map((dia) => dia.trim()).filter(Boolean);
}

function faixaDeHorario(turma) {
  return `${turma.horaInicio} — ${turma.horaFim}`;
}

// Aulas e horários numa página só: a grade semanal (no celular vira uma lista por dia) e, embaixo,
// os cartões de cada turma. As duas partes respeitam o filtro de modalidade.
export default function Aulas() {
  const [turmas, setTurmas] = useState([]);
  const [modalidade, setModalidade] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  usePagina('Aulas e horários', 'Turmas de Morganti Ju-Jitsu do San·Ryu Dojo: modalidades, níveis e a grade semanal de horários.');

  useEffect(() => {
    api
      .get('/turmas')
      .then((res) => setTurmas(res.data))
      .catch(() => setErro('Não foi possível carregar as turmas no momento.'))
      .finally(() => setLoading(false));
  }, []);

  const modalidades = useMemo(() => ['Todas', ...new Set(turmas.map((turma) => turma.modalidade).filter(Boolean))], [turmas]);

  const filtradas = modalidade === 'Todas' ? turmas : turmas.filter((turma) => turma.modalidade === modalidade);

  const faixasHorario = useMemo(() => [...new Set(filtradas.map(faixaDeHorario))].sort(), [filtradas]);

  function turmasNoSlot(dia, faixa) {
    return filtradas.filter((turma) => diasDaTurma(turma).includes(dia) && faixaDeHorario(turma) === faixa);
  }

  const porDia = DIAS.map((dia) => ({
    dia,
    turmas: filtradas
      .filter((turma) => diasDaTurma(turma).includes(dia))
      .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
  })).filter((item) => item.turmas.length > 0);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Aulas e horários</p>
          <h1>Turmas e grade semanal</h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {modalidades.length > 2 && (
            <div className="filters">
              {modalidades.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`filter-chip ${modalidade === item ? 'is-active' : ''}`}
                  onClick={() => setModalidade(item)}
                >
                  {item}
                </button>
              ))}
            </div>
          )}

          {loading && <p>Carregando turmas...</p>}
          {erro && <p className="alert alert--error">{erro}</p>}

          {!loading && !erro && filtradas.length === 0 && <p>Nenhuma turma cadastrada no momento.</p>}

          {!loading && !erro && filtradas.length > 0 && (
            <>
              <h2 className="section__title" id="horarios">Grade semanal</h2>

              <div className="table-scroll grade--tabela">
                <table className="schedule">
                  <thead>
                    <tr>
                      <th>Horário</th>
                      {DIAS.map((dia) => (
                        <th key={dia}>{dia}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {faixasHorario.map((faixa) => (
                      <tr key={faixa}>
                        <td className="schedule__hora">{faixa}</td>
                        {DIAS.map((dia) => (
                          <td key={dia}>
                            {turmasNoSlot(dia, faixa).map((turma) => (
                              <span key={turma.id} className="schedule__pill">
                                {turma.nome}
                              </span>
                            ))}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grade--lista">
                {porDia.map(({ dia, turmas: doDia }) => (
                  <div key={dia} className="grade-dia">
                    <h3 className="grade-dia__titulo">{dia}</h3>
                    {doDia.map((turma) => (
                      <div key={turma.id} className="grade-dia__item">
                        <span className="grade-dia__hora">{faixaDeHorario(turma)}</span>
                        <span>{turma.nome}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <h2 className="section__title" style={{ marginTop: '3.5rem' }}>
                As turmas
              </h2>
              <div className="grid grid--3">
                {filtradas.map((turma) => (
                  <div key={turma.id} className="tile">
                    {turma.modalidade && <p className="tile__tag">{turma.modalidade}</p>}
                    <h3>{turma.nome}</h3>
                    {turma.nivel && <p>Nível: {turma.nivel}</p>}
                    <p>
                      {diasDaTurma(turma).join(', ')}
                      <br />
                      {faixaDeHorario(turma)}
                    </p>
                    {turma.instrutor && <p className="tile__meta">Instrutor: {turma.instrutor.nome}</p>}
                    <Link to={`/aula-experimental?turma=${turma.id}`} className="btn btn--ghost btn--small" style={{ marginTop: '0.75rem' }}>
                      Quero experimentar esta turma
                    </Link>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="chamada-final">
            <p>Não sabe qual turma escolher? A primeira aula é por nossa conta.</p>
            <Link to="/aula-experimental" className="btn btn--primary">
              Agendar aula experimental
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
