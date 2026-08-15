import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
} from '@coreui/react';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';

export default function Tamanhos() {
  const navigate = useNavigate();
  const [tamanhos, setTamanhos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarTamanhos() {
    const res = await api.get('/admin/tamanhos');
    setTamanhos(res.data);
  }

  useEffect(() => {
    carregarTamanhos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este tamanho?')) return;
    try {
      await api.delete(`/admin/tamanhos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarTamanhos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o tamanho.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Tamanhos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/tamanhos/novo')}
        onEditar={() => navigate(`/admin/tamanhos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarTamanhos}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Descrição</CTableHeaderCell>
            <CTableHeaderCell>Ordem</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {tamanhos.map((tamanho) => (
            <CTableRow
              key={tamanho.id}
              active={selecionadoId === tamanho.id}
              onClick={() => selecionarLinha(tamanho.id)}
            >
              <CTableDataCell>{tamanho.descricao}</CTableDataCell>
              <CTableDataCell>{tamanho.ordem ?? '-'}</CTableDataCell>
              <CTableDataCell>{tamanho.ativo ? 'Ativo' : 'Inativo'}</CTableDataCell>
            </CTableRow>
          ))}
          {tamanhos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={3} className="text-body-secondary">
                Nenhum tamanho cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
