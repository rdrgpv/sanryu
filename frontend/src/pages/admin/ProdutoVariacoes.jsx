import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilList } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import { formatarMoeda } from '../../utils/formato.js';

export default function ProdutoVariacoes() {
  const navigate = useNavigate();
  const [variacoes, setVariacoes] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);

  async function carregarVariacoes() {
    const res = await api.get('/admin/produto-variacoes');
    setVariacoes(res.data);
  }

  useEffect(() => {
    carregarVariacoes();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir esta variação?')) return;
    try {
      await api.delete(`/admin/produto-variacoes/${selecionadoId}`);
      setSelecionadoId(null);
      carregarVariacoes();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir a variação.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Variações (SKUs)</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/produto-variacoes/novo')}
        onEditar={() => navigate(`/admin/produto-variacoes/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarVariacoes}
        extra={
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionadoId}
            onClick={() => navigate(`/admin/produto-variacoes/${selecionadoId}/movimentacoes`)}
          >
            <CIcon icon={cilList} className="me-1" />
            Movimentações
          </CButton>
        }
      />

      <CTable hover responsive className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Produto</CTableHeaderCell>
            <CTableHeaderCell>Cor</CTableHeaderCell>
            <CTableHeaderCell>Tamanho</CTableHeaderCell>
            <CTableHeaderCell>Código</CTableHeaderCell>
            <CTableHeaderCell>Custo</CTableHeaderCell>
            <CTableHeaderCell>Venda</CTableHeaderCell>
            <CTableHeaderCell>Estoque</CTableHeaderCell>
            <CTableHeaderCell>Reservado</CTableHeaderCell>
            <CTableHeaderCell>Disponível</CTableHeaderCell>
            <CTableHeaderCell>Status</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {variacoes.map((variacao) => (
            <CTableRow
              key={variacao.id}
              active={selecionadoId === variacao.id}
              onClick={() => selecionarLinha(variacao.id)}
            >
              <CTableDataCell>{variacao.produto?.descricao || '-'}</CTableDataCell>
              <CTableDataCell>
                {variacao.cor ? (
                  <span className="d-flex align-items-center gap-2">
                    <span
                      style={{
                        display: 'inline-block',
                        width: '1rem',
                        height: '1rem',
                        borderRadius: '50%',
                        background: variacao.cor.corHex || '#ccc',
                        border: '1px solid rgba(0,0,0,0.15)',
                      }}
                    />
                    {variacao.cor.descricao}
                  </span>
                ) : (
                  '-'
                )}
              </CTableDataCell>
              <CTableDataCell>{variacao.tamanho?.descricao || '-'}</CTableDataCell>
              <CTableDataCell>{variacao.codigo}</CTableDataCell>
              <CTableDataCell>{formatarMoeda(variacao.valorCusto)}</CTableDataCell>
              <CTableDataCell>{formatarMoeda(variacao.valorVenda)}</CTableDataCell>
              <CTableDataCell>{variacao.quantidadeEstoque}</CTableDataCell>
              <CTableDataCell>{variacao.quantidadeReservada ?? 0}</CTableDataCell>
              <CTableDataCell>{variacao.saldoDisponivel ?? variacao.quantidadeEstoque}</CTableDataCell>
              <CTableDataCell>{variacao.ativo ? 'Ativa' : 'Inativa'}</CTableDataCell>
            </CTableRow>
          ))}
          {variacoes.length === 0 && (
            <CTableRow>
              <CTableDataCell colSpan={10} className="text-body-secondary">
                Nenhuma variação cadastrada.
              </CTableDataCell>
            </CTableRow>
          )}
        </CTableBody>
      </CTable>
    </div>
  );
}
