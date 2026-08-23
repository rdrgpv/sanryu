import { CCard, CCardBody, CSpinner } from '@coreui/react';
import CIcon from '@coreui/icons-react';

export default function DashboardStatCard({ title, value, icon, subtitle, loading }) {
  return (
    <CCard className="h-100">
      <CCardBody className="d-flex align-items-start gap-3">
        {icon && (
          <div
            className="d-flex align-items-center justify-content-center flex-shrink-0"
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: 'rgba(178, 58, 47, 0.1)',
              color: 'var(--sanryu-primary)',
            }}
          >
            <CIcon icon={icon} size="lg" />
          </div>
        )}
        <div className="flex-grow-1">
          <p className="text-body-secondary text-uppercase small mb-1" style={{ letterSpacing: '0.04em', fontSize: '0.72rem' }}>
            {title}
          </p>
          {loading ? (
            <CSpinner size="sm" />
          ) : (
            <p className="h3 mb-0">{value ?? 0}</p>
          )}
          {subtitle && <p className="text-body-secondary small mb-0 mt-1">{subtitle}</p>}
        </div>
      </CCardBody>
    </CCard>
  );
}
