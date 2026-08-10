import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import Toolbar from '../../components/Toolbar.jsx';

export default function Faixas() {
  const navigate = useNavigate();
  const [faixas, setFaixas] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarFaixas() {
    const res = await api.get('/admin/faixas');
    setFaixas(res.data);
  }

  useEffect(() => {
    carregarFaixas();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta faixa?')) return;
    await api.delete(`/admin/faixas/${selecionadoId}`);
    setSelecionadoId(null);
    carregarFaixas();
  }

  return (
    <div>
      <h1 className="admin__title">Faixas</h1>

      <Toolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/faixas/novo')}
        onEditar={() => navigate(`/admin/faixas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFaixas}
      />

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Cor</th>
              <th>Nome</th>
              <th>Grau</th>
              <th>Ordem</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((faixa) => (
              <tr
                key={faixa.id}
                className={selecionadoId === faixa.id ? 'is-selected' : ''}
                onClick={() => selecionarLinha(faixa.id)}
              >
                <td>
                  <span className="cor-swatch cor-swatch--sm" style={{ background: faixa.cor }} />
                </td>
                <td>{faixa.nome}</td>
                <td>{faixa.grau ?? '-'}</td>
                <td>{faixa.ordem}</td>
                <td>{faixa.ativo ? 'Ativa' : 'Inativa'}</td>
              </tr>
            ))}
            {faixas.length === 0 && (
              <tr>
                <td colSpan={5}>Nenhuma faixa cadastrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
