import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

function formatarValor(valor) {
  return valor != null ? `R$ ${Number(valor).toFixed(2)}` : '-';
}

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
      <h1 className="h3 mb-3">Faixas</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/faixas/novo')}
        onEditar={() => navigate(`/admin/faixas/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFaixas}
      />

      <AdminDataTable
        rows={faixas}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhuma faixa cadastrada."
        pageSize={25}
        columns={[
          {
            key: 'cor',
            label: 'Cor',
            render: (faixa) => (
              <span
                style={{
                  display: 'inline-block',
                  width: '1.4rem',
                  height: '1.4rem',
                  borderRadius: '50%',
                  background: faixa.cor,
                  border: '1px solid rgba(0,0,0,0.15)',
                }}
              />
            ),
          },
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'grau', label: 'Dan', align: 'center', sortable: true, render: (faixa) => faixa.grau ?? '-' },
          { key: 'ordem', label: 'Ordem', align: 'center', sortable: true },
          {
            key: 'valorComCarteirinha',
            label: 'Valor c/ carteirinha',
            align: 'end',
            sortable: true,
            render: (faixa) => formatarValor(faixa.valorComCarteirinha),
          },
          {
            key: 'valorSemCarteirinha',
            label: 'Valor s/ carteirinha',
            align: 'end',
            sortable: true,
            render: (faixa) => formatarValor(faixa.valorSemCarteirinha),
          },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (faixa) => (
              <span className={`badge ${faixa.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {faixa.ativo ? 'Ativa' : 'Inativa'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
