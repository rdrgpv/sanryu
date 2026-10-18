import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext.jsx';
import ProtectedRoute from '../../components/ProtectedRoute.jsx';
import Chamada from '../../components/Chamada.jsx';

function Cabecalho() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sensei__cabecalho">
      <Link to="/sensei" className="sensei__marca">
        San·Ryu <span>chamada</span>
      </Link>
      <span className="sensei__usuario">
        {admin?.nome}
        <button
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          sair
        </button>
      </span>
    </header>
  );
}

function MinhasTurmas() {
  const [turmas, setTurmas] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/sensei/turmas')
      .then((res) => setTurmas(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Não foi possível carregar suas turmas.'));
  }, []);

  if (erro) return <p className="alert alert--error">{erro}</p>;
  if (!turmas) return <p>Carregando...</p>;

  const deHoje = turmas.filter((turma) => turma.temAulaHoje);
  const outras = turmas.filter((turma) => !turma.temAulaHoje);

  const cartao = (turma) => (
    <Link key={turma.id} to={`/sensei/turmas/${turma.id}`} className="sensei__turma">
      <span>
        <strong>{turma.nome}</strong>
        <small>
          {turma.diaSemana} · {turma.horaInicio}–{turma.horaFim}
          {turma.unidade ? ` · ${turma.unidade.nome}` : ''}
        </small>
      </span>
      {turma.temAulaHoje && (
        <span className={`sensei__selo${turma.chamadaFeitaHoje ? ' sensei__selo--ok' : ''}`}>
          {turma.chamadaFeitaHoje ? 'feita' : 'hoje'}
        </span>
      )}
    </Link>
  );

  return (
    <>
      {turmas.length === 0 && <p>Nenhuma turma ligada a você. Peça para a academia te vincular a uma turma.</p>}
      {deHoje.length > 0 && <h2 className="sensei__secao">Hoje</h2>}
      {deHoje.map(cartao)}
      {outras.length > 0 && <h2 className="sensei__secao">Outras turmas</h2>}
      {outras.map(cartao)}
    </>
  );
}

function ChamadaDaTurma() {
  const { turmaId } = useParams();
  return (
    <>
      <Link to="/sensei" className="sensei__voltar">
        ← turmas
      </Link>
      <Chamada turmaId={turmaId} />
    </>
  );
}

// Área do sensei: fora do layout do admin (sem menu de cadastros/financeiro), pensada pro celular.
export default function SenseiApp() {
  return (
    <ProtectedRoute perfis={['instrutor', 'admin', 'recepcao']}>
      <div className="sensei">
        <Cabecalho />
        <main className="sensei__conteudo">
          <Routes>
            <Route index element={<MinhasTurmas />} />
            <Route path="turmas/:turmaId" element={<ChamadaDaTurma />} />
          </Routes>
        </main>
      </div>
    </ProtectedRoute>
  );
}
