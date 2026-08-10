import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Card from '../../components/Card.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { IconAlunos, IconTurmas, IconInstrutores, IconMatriculas, IconPlus } from '../../components/icons.jsx';

const quicklinks = [
  { to: '/admin/alunos/novo', label: 'Novo aluno', icon: <IconAlunos /> },
  { to: '/admin/turmas/novo', label: 'Nova turma', icon: <IconTurmas /> },
  { to: '/admin/instrutores/novo', label: 'Novo instrutor', icon: <IconInstrutores /> },
  { to: '/admin/faixas/novo', label: 'Nova faixa', icon: <IconPlus /> },
];

export default function Dashboard() {
  const { admin } = useAuth();
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
      <p className="dashboard__welcome">Bem-vindo de volta, {admin?.nome}.</p>

      {erro && <p className="alert alert--error">{erro}</p>}

      {resumo && (
        <div className="grid grid--4">
          <Card icon={<IconAlunos />} title="Alunos ativos" value={resumo.alunosAtivos} />
          <Card icon={<IconTurmas />} title="Turmas" value={resumo.totalTurmas} />
          <Card icon={<IconInstrutores />} title="Instrutores" value={resumo.totalInstrutores} />
          <Card icon={<IconMatriculas />} title="Matrículas no mês" value={resumo.matriculasDoMes} />
        </div>
      )}

      <div className="dashboard__quicklinks">
        <h2>Ações rápidas</h2>
        <div className="quicklinks">
          {quicklinks.map((link) => (
            <Link key={link.to} to={link.to} className="quicklink">
              {link.icon}
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
