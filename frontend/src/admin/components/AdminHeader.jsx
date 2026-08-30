import { Link } from 'react-router-dom';
import {
  CHeader,
  CContainer,
  CHeaderToggler,
  CHeaderNav,
  CBreadcrumb,
  CAvatar,
  CButton,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownHeader,
  CDropdownDivider,
  CDropdownItem,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMenu, cilHome, cilAccountLogout } from '@coreui/icons';

function iniciaisDoNome(nome) {
  if (!nome) return 'A';

  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

// `trilha`: [{ label, to? }] — itens depois do "Início". Item sem `to` é o atual (não é link).
export default function AdminHeader({ trilha, admin, onLogout, onToggleMobile }) {
  const naDashboard = trilha.length === 0;

  return (
    <CHeader position="sticky" className="admin-header mb-0">
      <CContainer fluid className="px-3 px-lg-4">
        <CHeaderToggler className="d-lg-none me-2" onClick={onToggleMobile}>
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <CBreadcrumb className="admin-header__breadcrumb mb-0 flex-grow-1">
          {naDashboard ? (
            <li className="breadcrumb-item active" aria-current="page">
              <CIcon icon={cilHome} size="sm" className="me-1" />
              Início
            </li>
          ) : (
            <li className="breadcrumb-item">
              <Link to="/admin">
                <CIcon icon={cilHome} size="sm" className="me-1" />
                Início
              </Link>
            </li>
          )}
          {trilha.map((item, indice) =>
            item.to ? (
              <li className="breadcrumb-item" key={indice}>
                <Link to={item.to}>{item.label}</Link>
              </li>
            ) : (
              <li className="breadcrumb-item active" aria-current="page" key={indice}>
                {item.label}
              </li>
            )
          )}
        </CBreadcrumb>

        <CHeaderNav className="ms-auto align-items-center gap-1">
          <CDropdown alignment="end">
            <CDropdownToggle as="button" caret={false} className="admin-header__user">
              <CAvatar color="primary" textColor="white" size="sm">
                {iniciaisDoNome(admin?.nome)}
              </CAvatar>
              <span className="admin-header__user-name d-none d-md-inline">{admin?.nome}</span>
            </CDropdownToggle>
            <CDropdownMenu>
              <CDropdownHeader>{admin?.nome || 'Administrador'}</CDropdownHeader>
              <CDropdownDivider />
              <CDropdownItem role="button" onClick={onLogout}>
                <CIcon icon={cilAccountLogout} className="me-2" />
                Sair
              </CDropdownItem>
            </CDropdownMenu>
          </CDropdown>
          <CButton color="link" className="admin-header__logout" onClick={onLogout} title="Sair">
            <CIcon icon={cilAccountLogout} size="lg" />
          </CButton>
        </CHeaderNav>
      </CContainer>
    </CHeader>
  );
}
