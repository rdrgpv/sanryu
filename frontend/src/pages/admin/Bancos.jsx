import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Bancos() {
  const navigate = useNavigate();
  const [bancos, setBancos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarBancos() {
    const res = await api.get('/admin/bancos');
    setBancos(res.data);
  }

  useEffect(() => {
    carregarBancos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta configuração Pix?')) return;
    await api.delete(`/admin/bancos/${selecionadoId}`);
    setSelecionadoId(null);
    carregarBancos();
  }

  return (
    <div>
      <h1 className="h3 mb-2">Configuração Pix</h1>
      <p className="text-body-secondary mb-3">
        A conta Pix usada para gerar o QR code de pagamento dos eventos é a primeira desta lista.
      </p>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/bancos/novo')}
        onEditar={() => navigate(`/admin/bancos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarBancos}
      />

      {/* Sem ordenação por coluna aqui de propósito: a ordem da lista tem significado funcional
          (a primeira linha é a conta usada pro QR Pix dos eventos, conforme o aviso acima). */}
      <AdminDataTable
        rows={bancos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhuma configuração Pix cadastrada."
        pageSizeOptions={[25, 50]}
        columns={[
          { key: 'nome', label: 'Nome' },
          { key: 'titular', label: 'Titular' },
          { key: 'tipoChave', label: 'Tipo de chave' },
          { key: 'chavePix', label: 'Chave Pix' },
          { key: 'cidade', label: 'Cidade' },
        ]}
      />
    </div>
  );
}
