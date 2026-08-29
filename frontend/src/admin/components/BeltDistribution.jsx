import { CProgress, CProgressBar, CSpinner } from '@coreui/react';

// Distribuição de alunos ativos por faixa — os dados (nome, cor, grau, total) vêm inteiramente de
// `GET /admin/dashboard` (resumo.distribuicaoFaixas), que por sua vez lê a entidade Faixa. Nenhum
// nome/cor de faixa é fixado aqui: o componente só sabe desenhar o que a API mandar.
export default function BeltDistribution({ faixas, loading }) {
  if (loading) {
    return <CSpinner size="sm" />;
  }

  if (!faixas || faixas.length === 0) {
    return <p className="admin-empty-state mb-0">Nenhum aluno com faixa cadastrada.</p>;
  }

  const total = faixas.reduce((soma, faixa) => soma + faixa.total, 0);

  return (
    <div className="d-flex flex-column gap-3">
      {faixas.map((faixa) => {
        const percentual = total > 0 ? Math.round((faixa.total / total) * 100) : 0;

        return (
          <div key={faixa.id}>
            <div className="d-flex align-items-center justify-content-between mb-1">
              <span className="d-flex align-items-center gap-2 small fw-semibold">
                <span
                  style={{
                    display: 'inline-block',
                    width: '0.9rem',
                    height: '0.9rem',
                    borderRadius: '50%',
                    background: faixa.cor,
                    border: '1px solid rgba(0,0,0,0.15)',
                    flexShrink: 0,
                  }}
                />
                {faixa.nome}
                {faixa.grau ? ` — ${faixa.grau}º Dan` : ''}
              </span>
              <span className="text-body-secondary small">{faixa.total}</span>
            </div>
            <CProgress thin>
              <CProgressBar value={percentual} style={{ backgroundColor: faixa.cor }} />
            </CProgress>
          </div>
        );
      })}
    </div>
  );
}
