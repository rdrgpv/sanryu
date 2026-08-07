import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

export default function Aulas() {
  const [turmas, setTurmas] = useState([]);
  const [modalidade, setModalidade] = useState('Todas');
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/turmas')
      .then((res) => setTurmas(res.data))
      .catch(() => setErro('Não foi possível carregar as turmas no momento.'))
      .finally(() => setLoading(false));
  }, []);

  const modalidades = useMemo(() => {
    const unicas = new Set(turmas.map((turma) => turma.modalidade));
    return ['Todas', ...unicas];
  }, [turmas]);

  const turmasFiltradas =
    modalidade === 'Todas' ? turmas : turmas.filter((turma) => turma.modalidade === modalidade);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Aulas</p>
          <h1>Modalidades e turmas</h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
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

          {loading && <p>Carregando turmas...</p>}
          {erro && <p className="alert alert--error">{erro}</p>}

          {!loading && !erro && (
            <div className="grid grid--3">
              {turmasFiltradas.map((turma) => (
                <div key={turma.id} className="tile">
                  <p className="tile__tag">{turma.modalidade}</p>
                  <h3>{turma.nome}</h3>
                  <p>Nível: {turma.nivel}</p>
                  <p>{turma.diaSemana}</p>
                  <p>
                    {turma.horaInicio} — {turma.horaFim}
                  </p>
                  {turma.instrutor && <p className="tile__meta">Instrutor: {turma.instrutor.nome}</p>}
                  <p className="tile__meta">Vagas: {turma.vagas}</p>
                </div>
              ))}
              {turmasFiltradas.length === 0 && <p>Nenhuma turma encontrada para este filtro.</p>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
