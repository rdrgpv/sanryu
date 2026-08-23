import { CCard, CCardBody, CCardHeader } from '@coreui/react';

export default function DashboardSection({ title, action, children, className = '' }) {
  return (
    <CCard className={`h-100 ${className}`}>
      <CCardHeader className="bg-white d-flex align-items-center justify-content-between">
        <h2 className="h6 mb-0">{title}</h2>
        {action}
      </CCardHeader>
      <CCardBody>{children}</CCardBody>
    </CCard>
  );
}
