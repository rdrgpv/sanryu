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

const linksLoja = [
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/produto-variacoes', label: 'Variações (SKUs)' },
  { to: '/admin/cores', label: 'Cores' },
  { to: '/admin/tamanhos', label: 'Tamanhos' },
  { to: '/admin/tipos-personalizacao', label: 'Tipos de Personalização' },
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
            <div
              style={{
                background: '#fff',
                borderRadius: 6,
                padding: '0.5rem 0.9rem',
                display: 'inline-flex',
              }}
            >
              <img src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" style={{ height: 32, width: 'auto' }} />
            </div>
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
          <CNavTitle>Loja</CNavTitle>
          {linksLoja.map((link) => (
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
