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

export default function Produtos() {
  const navigate = useNavigate();
  const [produtos, setProdutos] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarProdutos() {
    const res = await api.get('/admin/produtos');
    setProdutos(res.data);
  }

  useEffect(() => {
    carregarProdutos();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este produto?')) return;
    try {
      await api.delete(`/admin/produtos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarProdutos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o produto.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Produtos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/produtos/novo')}
        onEditar={() => navigate(`/admin/produtos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarProdutos}
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Descrição</CTableHeaderCell>
            <CTableHeaderCell>Tipo</CTableHeaderCell>
            <CTableHeaderCell>Controla estoque</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {produtos.map((produto) => (
            <CTableRow
              key={produto.id}
              active={selecionadoId === produto.id}
              onClick={() => selecionarLinha(produto.id)}
            >
              <CTableDataCell>{produto.descricao}</CTableDataCell>
              <CTableDataCell>{produto.tipoProduto || '-'}</CTableDataCell>
              <CTableDataCell>{produto.controlaEstoque ? 'Sim' : 'Não'}</CTableDataCell>
              <CTableDataCell>{produto.ativo ? 'Ativo' : 'Inativo'}</CTableDataCell>
            </CTableRow>
          ))}
          {produtos.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={4} className="text-body-secondary">
                Nenhum produto cadastrado.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
