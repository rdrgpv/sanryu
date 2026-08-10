import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Toolbar from '../../components/Toolbar.jsx';

export default function Instrutores() {
  const navigate = useNavigate();
  const [instrutores, setInstrutores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarInstrutores() {
    const res = await api.get('/admin/instrutores');
    setInstrutores(res.data);
  }

  useEffect(() => {
    carregarInstrutores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este instrutor?')) return;
    await api.delete(`/admin/instrutores/${selecionadoId}`);
    setSelecionadoId(null);
    carregarInstrutores();
  }

  return (
    <div>
      <h1 className="admin__title">Instrutores</h1>

      <Toolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/instrutores/novo')}
        onEditar={() => navigate(`/admin/instrutores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarInstrutores}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Faixa</th>
              <th>Especialidade</th>
              <th>Bio</th>
            </tr>
          </thead>
          <tbody>
            {instrutores.map((instrutor) => (
              <tr
                key={instrutor.id}
                className={selecionadoId === instrutor.id ? 'is-selected' : ''}
                onClick={() => selecionarLinha(instrutor.id)}
              >
                <td>{instrutor.nome}</td>
                <td>{instrutor.faixa}</td>
                <td>{instrutor.especialidade || '-'}</td>
                <td className="data-table__bio">{instrutor.bio || '-'}</td>
              </tr>
            ))}
            {instrutores.length === 0 && (
              <tr>
                <td colSpan={4}>Nenhum instrutor cadastrado.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
