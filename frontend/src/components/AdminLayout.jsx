import { useState } from 'react';
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
  CHeader,
  CHeaderToggler,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilMenu } from '@coreui/icons';
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
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/fornecedores', label: 'Fornecedores' },
  { to: '/admin/pedidos-compra', label: 'Pedidos de Compra' },
];

const linksSistema = [{ to: '/admin/configuracoes', label: 'Configurações' }];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  // Abaixo do breakpoint lg (992px) o CSidebar do CoreUI já entra em modo off-canvas sozinho —
  // só falta a gente controlar quando ele fica visível (não tem toggle nenhum por padrão).
  const [sidebarVisible, setSidebarVisible] = useState(() => window.innerWidth >= 992);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      <CSidebar
        className="border-end"
        colorScheme="dark"
        position="fixed"
        visible={sidebarVisible}
        onVisibleChange={setSidebarVisible}
      >
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

      <div className="wrapper d-flex flex-column min-vh-100">
        <CHeader position="sticky" className="mb-0 d-lg-none">
          <CContainer fluid className="px-3">
            <CHeaderToggler onClick={() => setSidebarVisible((visible) => !visible)}>
              <CIcon icon={cilMenu} size="lg" />
            </CHeaderToggler>
          </CContainer>
        </CHeader>
        <CContainer fluid className="px-4 py-4">
          {children}
        </CContainer>
      </div>
    </div>
  );
}
