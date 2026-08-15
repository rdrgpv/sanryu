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

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Descrição</CTableHeaderCell>
            <CTableHeaderCell>Valor padrão</CTableHeaderCell>
            <CTableHeaderCell>Exige texto</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {tipos.map((tipo) => (
            <CTableRow key={tipo.id} active={selecionadoId === tipo.id} onClick={() => selecionarLinha(tipo.id)}>
              <CTableDataCell>{tipo.descricao}</CTableDataCell>
              <CTableDataCell>{formatarMoeda(tipo.valorPadrao)}</CTableDataCell>
              <CTableDataCell>{tipo.exigeTexto ? 'Sim' : 'Não'}</CTableDataCell>
              <CTableDataCell>{tipo.ativo ? 'Ativo' : 'Inativo'}</CTableDataCell>
            </CTableRow>
          ))}
          {tipos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={4} className="text-body-secondary">
                Nenhum tipo de personalização cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
