import { useEffect, useState } from 'react';
import api from '../../services/api';
import Card from '../../components/Card.jsx';

export default function Dashboard() {
  const [resumo, setResumo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setResumo(res.data))
      .catch(() => setErro('Não foi possível carregar o resumo.'));
  }, []);

  return (
    <div>
      <h1 className="admin__title">Dashboard</h1>

      {erro && <p className="alert alert--error">{erro}</p>}

      {resumo && (
        <div className="grid grid--4">
          <Card title="Alunos ativos" value={resumo.alunosAtivos} />
          <Card title="Turmas" value={resumo.totalTurmas} />
          <Card title="Instrutores" value={resumo.totalInstrutores} />
          <Card title="Matrículas no mês" value={resumo.matriculasDoMes} />
        </div>
      )}
    </div>
  );
}
