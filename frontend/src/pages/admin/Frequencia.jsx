import { useEffect, useState } from 'react';
import { CFormInput, CFormSelect } from '@coreui/react';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

function diasDesde(data) {
  if (!data) return null;
  return Math.round((Date.parse(`${new Date().toLocaleDateString('sv-SE')}T00:00:00Z`) - Date.parse(`${data}T00:00:00Z`)) / 86400000);
}

const DIAS_SUMIDO = 14;

export default function Frequencia() {
  const fim = new Date().toLocaleDateString('sv-SE');
  const [filtros, setFiltros] = useState({ inicio: `${fim.slice(0, 8)}01`, fim, turmaId: '' });
  const [turmas, setTurmas] = useState([]);
  const [linhas, setLinhas] = useState([]);

  useEffect(() => {
    api.get('/admin/turmas').then((res) => setTurmas(res.data));
  }, []);

  useEffect(() => {
    const params = { inicio: filtros.inicio, fim: filtros.fim };
    if (filtros.turmaId) params.turmaId = filtros.turmaId;
    api.get('/admin/frequencia', { params }).then((res) => setLinhas(res.data.alunos));
  }, [filtros]);

  function atualizar(campo, valor) {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  }

  const sumidos = linhas.filter((linha) => {
    const dias = diasDesde(linha.ultimaPresenca);
    return dias === null || dias >= DIAS_SUMIDO;
  }).length;

  return (
    <div>
      <h1 className="h3 mb-3">Frequência</h1>

      <div className="d-flex flex-wrap gap-2 mb-3 align-items-center">
        <CFormInput type="date" style={{ maxWidth: 170 }} value={filtros.inicio} onChange={(event) => atualizar('inicio', event.target.value)} />
        <span className="text-body-secondary">até</span>
        <CFormInput type="date" style={{ maxWidth: 170 }} value={filtros.fim} onChange={(event) => atualizar('fim', event.target.value)} />
        <CFormSelect style={{ maxWidth: 240 }} value={filtros.turmaId} onChange={(event) => atualizar('turmaId', event.target.value)}>
          <option value="">Todas as turmas</option>
          {turmas.map((turma) => (
            <option key={turma.id} value={turma.id}>
              {turma.nome}
            </option>
          ))}
        </CFormSelect>
      </div>

      {sumidos > 0 && (
        <div className="alert alert-warning py-2">
          {sumidos} aluno(s) ativo(s) sem treinar há {DIAS_SUMIDO} dias ou mais — vale um contato antes que cancelem.
        </div>
      )}

      <AdminDataTable
        rows={linhas}
        emptyMessage="Nenhum aluno ativo matriculado."
        columns={[
          { key: 'nome', label: 'Aluno', sortable: true },
          { key: 'turmas', label: 'Turmas', render: (linha) => linha.turmas.join(', ') },
          {
            key: 'presencas',
            label: 'Presenças',
            align: 'center',
            sortable: true,
            render: (linha) => `${linha.presencas} / ${linha.aulas}`,
          },
          {
            key: 'percentual',
            label: 'Frequência',
            align: 'center',
            sortable: true,
            sortValue: (linha) => linha.percentual ?? -1,
            render: (linha) =>
              linha.percentual === null ? (
                <span className="text-body-secondary small">sem aulas</span>
              ) : (
                <span className={linha.percentual >= 75 ? 'text-success' : linha.percentual >= 50 ? 'text-warning-emphasis' : 'text-danger'}>
                  {linha.percentual}%
                </span>
              ),
          },
          {
            key: 'ultimaPresenca',
            label: 'Última presença',
            sortable: true,
            sortValue: (linha) => linha.ultimaPresenca || '',
            render: (linha) => {
              const dias = diasDesde(linha.ultimaPresenca);
              if (dias === null) return <span className="text-danger small">nunca</span>;
              return (
                <span className={dias >= DIAS_SUMIDO ? 'text-danger' : ''}>
                  {formatarData(linha.ultimaPresenca)} <small className="text-body-secondary">({dias === 0 ? 'hoje' : `${dias}d`})</small>
                </span>
              );
            },
          },
        ]}
      />
    </div>
  );
}
