import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CFormSelect } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilDescription } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarMoeda } from '../../utils/formato.js';
import { labelPeriodicidade, SITUACOES_CONTRATO } from '../../utils/planos.js';

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

export default function Contratos() {
  const navigate = useNavigate();
  const [contratos, setContratos] = useState([]);
  const [situacaoFiltro, setSituacaoFiltro] = useState('ativo');
  const [selecionadoId, setSelecionadoId] = useState(null);

  const selecionado = contratos.find((contrato) => contrato.id === selecionadoId) || null;

  async function carregarContratos() {
    const res = await api.get('/admin/contratos', { params: situacaoFiltro ? { situacao: situacaoFiltro } : {} });
    setContratos(res.data);
  }

  useEffect(() => {
    carregarContratos();
    setSelecionadoId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situacaoFiltro]);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Excluir este contrato? Só é possível enquanto ele não foi assinado.')) return;

    try {
      await api.delete(`/admin/contratos/${selecionadoId}`);
      setSelecionadoId(null);
      carregarContratos();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir o contrato.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-3">Contratos</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId && !selecionado?.assinadoEm && selecionado?.situacao === 'ativo'}
        onNovo={() => navigate('/admin/contratos/novo')}
        onEditar={() => navigate(`/admin/contratos/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarContratos}
        extra={
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionadoId}
            onClick={() => navigate(`/admin/contratos/${selecionadoId}`)}
            title="Ver contrato, assinar, imprimir"
          >
            <CIcon icon={cilDescription} />
          </CButton>
        }
      />

      <CFormSelect className="mb-3" style={{ maxWidth: 220 }} value={situacaoFiltro} onChange={(event) => setSituacaoFiltro(event.target.value)}>
        <option value="ativo">Ativos</option>
        <option value="encerrado">Encerrados</option>
        <option value="cancelado">Cancelados</option>
        <option value="">Todos</option>
      </CFormSelect>

      <AdminDataTable
        rows={contratos}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum contrato."
        columns={[
          {
            key: 'aluno',
            label: 'Aluno',
            sortable: true,
            sortValue: (contrato) => contrato.aluno?.nome || '',
            render: (contrato) => contrato.aluno?.nome || '-',
          },
          {
            key: 'plano',
            label: 'Plano',
            sortable: true,
            sortValue: (contrato) => contrato.plano?.nome || '',
            render: (contrato) => `${contrato.plano?.nome || '-'} (${labelPeriodicidade(contrato.plano?.periodicidade)})`,
          },
          {
            key: 'valorFinal',
            label: 'Valor',
            align: 'end',
            sortable: true,
            sortValue: (contrato) => Number(contrato.valorFinal),
            render: (contrato) => (
              <>
                {formatarMoeda(contrato.valorFinal)}
                {(Number(contrato.descontoFamiliaPercentual) > 0 || Number(contrato.bolsaPercentual) > 0) && (
                  <small className="text-body-secondary d-block">
                    {[
                      Number(contrato.descontoFamiliaPercentual) > 0 && `família ${Number(contrato.descontoFamiliaPercentual)}%`,
                      Number(contrato.bolsaPercentual) > 0 && `bolsa ${Number(contrato.bolsaPercentual)}%`,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                )}
              </>
            ),
          },
          { key: 'diaVencimento', label: 'Vence dia', align: 'center', sortable: true },
          { key: 'dataInicio', label: 'Início', sortable: true, render: (contrato) => formatarData(contrato.dataInicio) },
          {
            key: 'assinadoEm',
            label: 'Assinatura',
            sortable: true,
            render: (contrato) =>
              contrato.assinadoEm ? (
                <span className="text-success small">Assinado</span>
              ) : (
                <span className="text-warning-emphasis small">Pendente</span>
              ),
          },
          {
            key: 'situacao',
            label: 'Situação',
            sortable: true,
            render: (contrato) => (
              <span className={`badge ${SITUACOES_CONTRATO[contrato.situacao]?.classe}`}>
                {SITUACOES_CONTRATO[contrato.situacao]?.label}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
