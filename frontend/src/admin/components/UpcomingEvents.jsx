import { Link } from 'react-router-dom';
import { CSpinner } from '@coreui/react';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// Próximos eventos agendados — vem de `GET /admin/dashboard` (resumo.proximosEventos), que já
// filtra por status "agendado" e data futura no backend. Nada aqui é mockado.
export default function UpcomingEvents({ eventos, loading }) {
  if (loading) {
    return <CSpinner size="sm" />;
  }

  if (!eventos || eventos.length === 0) {
    return <p className="admin-empty-state mb-0">Nenhum evento agendado.</p>;
  }

  return (
    <div className="d-flex flex-column gap-3">
      {eventos.map((evento) => {
        const data = new Date(evento.data);

        return (
          <Link
            key={evento.id}
            to={`/admin/eventos/${evento.id}/inscricoes`}
            className="d-flex align-items-center gap-3 text-decoration-none text-body"
          >
            <div
              className="text-center flex-shrink-0"
              style={{
                width: 52,
                borderRadius: 8,
                background: 'var(--sanryu-background)',
                border: '1px solid var(--sanryu-border)',
                padding: '0.35rem 0',
              }}
            >
              <div className="fw-bold" style={{ fontSize: '1.1rem', lineHeight: 1 }}>
                {String(data.getDate()).padStart(2, '0')}
              </div>
              <div className="small text-body-secondary" style={{ fontSize: '0.65rem' }}>
                {MESES[data.getMonth()]}
              </div>
            </div>
            <div className="flex-grow-1">
              <div className="fw-semibold small">{evento.nome}</div>
              <div className="text-body-secondary" style={{ fontSize: '0.78rem' }}>
                {evento.tipoEvento?.nome || 'Evento'}
                {evento.local ? ` · ${evento.local}` : ''}
              </div>
            </div>
            <span className="badge bg-secondary-subtle text-secondary-emphasis flex-shrink-0">
              {evento.totalInscritos} inscrito{evento.totalInscritos === 1 ? '' : 's'}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
