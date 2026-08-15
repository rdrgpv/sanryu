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

export default function Fornecedores() {
  const navigate = useNavigate();
  const [fornecedores, setFornecedores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarFornecedores() {
    const res = await api.get('/admin/fornecedores');
    setFornecedores(res.data);
  }

  useEffect(() => {
    carregarFornecedores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor?')) return;
    try {
      await api.delete(`/admin/fornecedores/${selecionadoId}`);
      setSelecionadoId(null);
      carregarFornecedores();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o fornecedor.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Fornecedores</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/fornecedores/novo')}
        onEditar={() => navigate(`/admin/fornecedores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarFornecedores}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>CNPJ/CPF</CTableHeaderCell>
            <CTableHeaderCell>Telefone</CTableHeaderCell>
            <CTableHeaderCell>Email</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {fornecedores.map((fornecedor) => (
            <CTableRow
              key={fornecedor.id}
              active={selecionadoId === fornecedor.id}
              onClick={() => selecionarLinha(fornecedor.id)}
            >
              <CTableDataCell>{fornecedor.nome}</CTableDataCell>
              <CTableDataCell>{fornecedor.cnpjCpf || '-'}</CTableDataCell>
              <CTableDataCell>{fornecedor.telefone || '-'}</CTableDataCell>
              <CTableDataCell>{fornecedor.email || '-'}</CTableDataCell>
              <CTableDataCell>{fornecedor.ativo ? 'Ativo' : 'Inativo'}</CTableDataCell>
            </CTableRow>
          ))}
          {fornecedores.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={5} className="text-body-secondary">
                Nenhum fornecedor cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
