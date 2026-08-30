import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilList } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarDataHora } from '../../utils/formato.js';

export default function Eventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarEventos() {
    const res = await api.get('/admin/eventos');
    setEventos(res.data);
  }

  useEffect(() => {
    carregarEventos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este evento?')) return;
    await api.delete(`/admin/eventos/${selecionadoId}`);
    setSelecionadoId(null);
    carregarEventos();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Eventos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/eventos/novo')}
        onEditar={() => navigate(`/admin/eventos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarEventos}
        extra={
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionadoId}
            onClick={() => navigate(`/admin/eventos/${selecionadoId}/inscricoes`)}
            title="Inscrições"
          >
            <CIcon icon={cilList} />
          </CButton>
        }
      />

      <AdminDataTable
        rows={eventos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum evento cadastrado."
        columns={[
          {
            key: 'banner',
            label: 'Banner',
            render: (evento) =>
              evento.banner ? (
                <img src={evento.banner} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
              ) : (
                '-'
              ),
          },
          { key: 'nome', label: 'Nome', sortable: true },
          {
            key: 'tipoEvento',
            label: 'Tipo',
            sortable: true,
            sortValue: (evento) => evento.tipoEvento?.nome || '',
            render: (evento) => evento.tipoEvento?.nome || '-',
          },
          {
            key: 'data',
            label: 'Data',
            sortable: true,
            render: (evento) => formatarDataHora(evento.data),
          },
          { key: 'local', label: 'Local', render: (evento) => evento.local || '-' },
          { key: 'status', label: 'Status', sortable: true },
          {
            key: 'valor',
            label: 'Valor',
            align: 'end',
            sortable: true,
            render: (evento) => (evento.valor != null ? `R$ ${Number(evento.valor).toFixed(2)}` : '-'),
          },
          {
            key: 'publicado',
            label: 'Publicado',
            sortable: true,
            render: (evento) => (evento.publicado ? 'Sim' : 'Não'),
          },
        ]}
      />
    </div>
  );
}
