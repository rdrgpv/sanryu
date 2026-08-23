import {
  CHeader,
  CContainer,
  CHeaderToggler,
  CHeaderNav,
  CAvatar,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownHeader,
  CDropdownDivider,
  CDropdownItem,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMenu, cilAccountLogout } from '@coreui/icons';

function iniciaisDoNome(nome) {
  if (!nome) return 'A';

  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase())
    .join('');
}

export default function AdminHeader({ title, breadcrumb, admin, onLogout, onToggleMobile }) {
  return (
    <CHeader position="sticky" className="admin-header mb-0">
      <CContainer fluid className="px-3 px-lg-4">
        <CHeaderToggler className="d-lg-none me-2" onClick={onToggleMobile}>
          <CIcon icon={cilMenu} size="lg" />
        </CHeaderToggler>

        <div className="flex-grow-1">
          {breadcrumb && <p className="admin-header__breadcrumb">{breadcrumb}</p>}
          <h1 className="admin-header__title">{title}</h1>
        </div>

        <CHeaderNav className="ms-auto align-items-center">
          <CDropdown alignment="end">
            <CDropdownToggle as="button" caret={false} className="admin-header__user">
              <CAvatar color="primary" textColor="white" size="md">
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
        </CHeaderNav>
      </CContainer>
    </CHeader>
  );
}
