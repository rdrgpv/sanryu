import { NavLink, useNavigate } from 'react-router-dom';
import {
  CSidebar,
  CSidebarBrand,
  CSidebarHeader,
  CSidebarNav,
  CSidebarFooter,
  CNavItem,
  CNavLink,
  CNavTitle,
  CContainer,
  CButton,
} from '@coreui/react';
import { useAuth } from '../context/AuthContext.jsx';

const linksPrincipal = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/alunos', label: 'Alunos' },
  { to: '/admin/turmas', label: 'Turmas' },
  { to: '/admin/instrutores', label: 'Instrutores' },
  { to: '/admin/faixas', label: 'Faixas' },
];

const linksEventos = [
  { to: '/admin/tipos-evento', label: 'Tipos de Evento' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/bancos', label: 'Configuração Pix' },
];

const linksSistema = [{ to: '/admin/configuracoes', label: 'Configurações' }];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <CSidebar className="border-end" colorScheme="dark" position="fixed">
        <CSidebarHeader className="border-bottom">
          <CSidebarBrand>
            <img src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" style={{ filter: 'invert(1) brightness(2)' }} />
          </CSidebarBrand>
        </CSidebarHeader>
        <CSidebarNav>
          <CNavTitle>Gestão</CNavTitle>
          {linksPrincipal.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to} end={link.end}>
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
          <CNavTitle>Eventos</CNavTitle>
          {linksEventos.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to}>
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
          <CNavTitle>Sistema</CNavTitle>
          {linksSistema.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to}>
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CSidebarNav>
        <CSidebarFooter className="border-top d-flex flex-column gap-2 align-items-stretch">
          <div className="small text-white-50">{admin?.nome}</div>
          <CButton color="secondary" variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </CButton>
        </CSidebarFooter>
      </CSidebar>

      <div className="wrapper d-flex flex-column min-vh-100" style={{ marginLeft: 256 }}>
        <CContainer fluid className="px-4 py-4">
          {children}
        </CContainer>
      </div>
    </div>
  );
}
