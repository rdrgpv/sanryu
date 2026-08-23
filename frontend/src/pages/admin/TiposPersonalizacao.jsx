import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../utils/formato.js';

export default function TiposPersonalizacao() {
  const navigate = useNavigate();
  const [tipos, setTipos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTipos() {
    const res = await api.get('/admin/tipos-personalizacao');
    setTipos(res.data);
  }

  useEffect(() => {
    carregarTipos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este tipo de personalização?')) return;
    try {
      await api.delete(`/admin/tipos-personalizacao/${selecionadoId}`);
      setSelecionadoId(null);
      carregarTipos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o tipo de personalização.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Tipos de Personalização</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/tipos-personalizacao/novo')}
        onEditar={() => navigate(`/admin/tipos-personalizacao/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTipos}
      />

      <AdminDataTable
        rows={tipos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum tipo de personalização cadastrado."
        columns={[
          { key: 'descricao', label: 'Descrição', sortable: true },
          {
            key: 'valorPadrao',
            label: 'Valor padrão',
            align: 'end',
            sortable: true,
            render: (tipo) => formatarMoeda(tipo.valorPadrao),
          },
          { key: 'exigeTexto', label: 'Exige texto', sortable: true, render: (tipo) => (tipo.exigeTexto ? 'Sim' : 'Não') },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (tipo) => (
              <span className={`badge ${tipo.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {tipo.ativo ? 'Ativo' : 'Inativo'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
