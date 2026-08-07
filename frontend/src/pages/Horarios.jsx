import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export default function Horarios() {
  const [turmas, setTurmas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/turmas')
      .then((res) => setTurmas(res.data))
      .catch(() => setErro('Não foi possível carregar a grade de horários no momento.'))
      .finally(() => setLoading(false));
  }, []);

  const faixasHorario = useMemo(() => {
    const unicas = new Set(turmas.map((turma) => `${turma.horaInicio}-${turma.horaFim}`));
    return Array.from(unicas).sort();
  }, [turmas]);

  function turmasNoSlot(dia, faixa) {
    return turmas.filter(
      (turma) => turma.diaSemana.split(',').includes(dia) && `${turma.horaInicio}-${turma.horaFim}` === faixa
    );
  }

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Horários</p>
          <h1>Grade semanal</h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <p>Carregando horários...</p>}
          {erro && <p className="alert alert--error">{erro}</p>}

          {!loading && !erro && (
            <div className="table-scroll">
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
                      <td className="schedule__hora">{faixa.replace('-', ' — ')}</td>
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
                  {faixasHorario.length === 0 && (
                    <tr>
                      <td colSpan={DIAS.length + 1}>Nenhuma turma cadastrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
