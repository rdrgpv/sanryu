import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CFormCheck } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilList, cilClone } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../utils/formato.js';

export default function ProdutoVariacoes() {
  const navigate = useNavigate();
  const [variacoes, setVariacoes] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [comEstoque, setComEstoque] = useState(false);

  async function carregarVariacoes() {
    const res = await api.get('/admin/produto-variacoes', { params: comEstoque ? { comEstoque: true } : {} });
    setVariacoes(res.data);
  }

  useEffect(() => {
    carregarVariacoes();
    setSelecionadoId(null);
  }, [comEstoque]);

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
          <>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionadoId}
              onClick={() => navigate(`/admin/produto-variacoes/novo?duplicarDe=${selecionadoId}`)}
            >
              <CIcon icon={cilClone} className="me-1" />
              Duplicar
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              disabled={!selecionadoId}
              onClick={() => navigate(`/admin/produto-variacoes/${selecionadoId}/movimentacoes`)}
            >
              <CIcon icon={cilList} className="me-1" />
              Movimentações
            </CButton>
          </>
        }
      />

      <CFormCheck
        className="mb-3"
        id="comEstoque"
        label="Mostrar só com estoque"
        checked={comEstoque}
        onChange={(event) => setComEstoque(event.target.checked)}
      />

      <AdminDataTable
        rows={variacoes}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhuma variação cadastrada."
        columns={[
          {
            key: 'produto',
            label: 'Produto',
            sortable: true,
            sortValue: (variacao) => variacao.produto?.descricao || '',
            render: (variacao) => variacao.produto?.descricao || '-',
          },
          {
            key: 'cor',
            label: 'Cor',
            sortable: true,
            sortValue: (variacao) => variacao.cor?.descricao || '',
            render: (variacao) =>
              variacao.cor ? (
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
              ),
          },
          {
            key: 'tamanho',
            label: 'Tamanho',
            sortable: true,
            sortValue: (variacao) => variacao.tamanho?.descricao || '',
            render: (variacao) => variacao.tamanho?.descricao || '-',
          },
          { key: 'codigo', label: 'Código', sortable: true },
          { key: 'valorCusto', label: 'Custo', align: 'end', sortable: true, render: (v) => formatarMoeda(v.valorCusto) },
          { key: 'valorVenda', label: 'Venda', align: 'end', sortable: true, render: (v) => formatarMoeda(v.valorVenda) },
          { key: 'quantidadeEstoque', label: 'Estoque', align: 'center', sortable: true },
          {
            key: 'quantidadeReservada',
            label: 'Reservado',
            align: 'center',
            sortable: true,
            render: (v) => v.quantidadeReservada ?? 0,
          },
          {
            key: 'saldoDisponivel',
            label: 'Disponível',
            align: 'center',
            sortable: true,
            render: (v) => v.saldoDisponivel ?? v.quantidadeEstoque,
          },
          {
            key: 'ativo',
            label: 'Status',
            sortable: true,
            render: (v) => (
              <span className={`badge ${v.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>
                {v.ativo ? 'Ativa' : 'Inativa'}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
