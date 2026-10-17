import { useParams, Link } from 'react-router-dom';
import Chamada from '../../components/Chamada.jsx';

// A mesma chamada do sensei, dentro do admin (pra lançar ou corrigir a chamada de qualquer turma).
export default function TurmaChamada() {
  const { id } = useParams();

  return (
    <div>
      <Link to="/admin/turmas" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <div style={{ maxWidth: 640 }}>
        <Chamada turmaId={id} />
      </div>
    </div>
  );
}
