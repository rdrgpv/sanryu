import { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CSidebar,
  CSidebarBrand,
  CSidebarHeader,
  CSidebarNav,
  CSidebarFooter,
  CSidebarToggler,
  CNavItem,
  CNavLink,
  CNavTitle,
  CContainer,
  CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import {
  cilSpeedometer,
  cilPeople,
  cilSchool,
  cilContact,
  cilLayers,
  cilTags,
  cilCalendar,
  cilBank,
  cilCart,
  cilBarcode,
  cilColorPalette,
  cilResizeBoth,
  cilBrush,
  cilList,
  cilTruck,
  cilBriefcase,
  cilSettings,
} from '@coreui/icons';
import { useAuth } from '../context/AuthContext.jsx';
import AdminHeader from '../admin/components/AdminHeader.jsx';
import AdminFooter from '../admin/components/AdminFooter.jsx';

const linksPrincipal = [
  { to: '/admin', label: 'Dashboard', end: true, icon: cilSpeedometer },
  { to: '/admin/alunos', label: 'Alunos', icon: cilPeople },
  { to: '/admin/turmas', label: 'Turmas', icon: cilSchool },
  { to: '/admin/instrutores', label: 'Instrutores', icon: cilContact },
  { to: '/admin/faixas', label: 'Faixas', icon: cilLayers },
];

const linksEventos = [
  { to: '/admin/tipos-evento', label: 'Tipos de Evento', icon: cilTags },
  { to: '/admin/eventos', label: 'Eventos', icon: cilCalendar },
  { to: '/admin/bancos', label: 'Configuração Pix', icon: cilBank },
];

const linksLoja = [
  { to: '/admin/produtos', label: 'Produtos', icon: cilCart },
  { to: '/admin/produto-variacoes', label: 'Variações (SKUs)', icon: cilBarcode },
  { to: '/admin/cores', label: 'Cores', icon: cilColorPalette },
  { to: '/admin/tamanhos', label: 'Tamanhos', icon: cilResizeBoth },
  { to: '/admin/tipos-personalizacao', label: 'Tipos de Personalização', icon: cilBrush },
  { to: '/admin/pedidos', label: 'Pedidos', icon: cilList },
  { to: '/admin/fornecedores', label: 'Fornecedores', icon: cilTruck },
  { to: '/admin/pedidos-compra', label: 'Pedidos de Compra', icon: cilBriefcase },
];

const linksSistema = [{ to: '/admin/configuracoes', label: 'Configurações', icon: cilSettings }];

const TODOS_OS_LINKS = [...linksPrincipal, ...linksEventos, ...linksLoja, ...linksSistema];

// Sufixo da rota -> complemento do título mostrado no header (ex.: "Alunos — Novo").
const SUFIXOS_DE_ROTA = {
  novo: 'Novo',
  editar: 'Editar',
  inscricoes: 'Inscrições',
  'relatorio-exame': 'Relatório de Exame',
  'lista-inscritos': 'Lista de Inscritos',
  movimentacoes: 'Movimentações',
  'gerar-pedido-compra': 'Gerar Pedido de Compra',
};

// Deriva o título da aba e a trilha do breadcrumb a partir da própria URL — puramente visual (não
// afeta rotas nem contratos de API), então não precisa vir de um estado por página.
function useTituloDaPagina(pathname) {
  return useMemo(() => {
    const segmentos = pathname.replace(/^\/admin\/?/, '').split('/').filter(Boolean);

    if (segmentos.length === 0) {
      return { titulo: 'Dashboard', trilha: [] };
    }

    const base = `/admin/${segmentos[0]}`;
    const link = TODOS_OS_LINKS.find((item) => item.to === base);
    const tituloSecao = link?.label || 'Painel';
    const ultimoSegmento = segmentos[segmentos.length - 1];
    const sufixo = SUFIXOS_DE_ROTA[ultimoSegmento];

    return {
      titulo: sufixo ? `${tituloSecao} — ${sufixo}` : tituloSecao,
      trilha: sufixo ? [{ label: tituloSecao, to: base }, { label: sufixo }] : [{ label: tituloSecao }],
    };
  }, [pathname]);
}

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Abaixo do breakpoint lg (992px) o CSidebar do CoreUI já entra em modo off-canvas sozinho —
  // só falta a gente controlar quando ele fica visível (não tem toggle nenhum por padrão).
  const [sidebarVisible, setSidebarVisible] = useState(() => window.innerWidth >= 992);
  // Sidebar recolhível em desktop: `unfoldable` usa o próprio modo "narrow" do CoreUI (ícones só,
  // expande no hover) — sem CSS/JS extra pra controlar largura ou tooltip manualmente.
  const [unfoldable, setUnfoldable] = useState(false);
  const { titulo, trilha } = useTituloDaPagina(location.pathname);

  useEffect(() => {
    document.title = `${titulo} · San·Ryu Dojo`;
  }, [titulo]);

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
        unfoldable={unfoldable}
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
              <CNavLink as={NavLink} to={link.to} end={link.end} title={link.label}>
                <CIcon customClassName="nav-icon" icon={link.icon} />
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
          <CNavTitle>Eventos</CNavTitle>
          {linksEventos.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to} title={link.label}>
                <CIcon customClassName="nav-icon" icon={link.icon} />
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
          <CNavTitle>Loja</CNavTitle>
          {linksLoja.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to} title={link.label}>
                <CIcon customClassName="nav-icon" icon={link.icon} />
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
          <CNavTitle>Sistema</CNavTitle>
          {linksSistema.map((link) => (
            <CNavItem key={link.to}>
              <CNavLink as={NavLink} to={link.to} title={link.label}>
                <CIcon customClassName="nav-icon" icon={link.icon} />
                {link.label}
              </CNavLink>
            </CNavItem>
          ))}
        </CSidebarNav>
        <CSidebarFooter className="border-top d-flex flex-column gap-2 align-items-stretch">
          <div className="small text-white-50 text-truncate">{admin?.nome}</div>
          <CButton color="secondary" variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </CButton>
          <CSidebarToggler className="d-none d-lg-flex" onClick={() => setUnfoldable((valor) => !valor)} />
        </CSidebarFooter>
      </CSidebar>

      <div className="wrapper d-flex flex-column min-vh-100">
        <AdminHeader
          trilha={trilha}
          admin={admin}
          onLogout={handleLogout}
          onToggleMobile={() => setSidebarVisible((visible) => !visible)}
        />
        <CContainer fluid className="px-4 py-4 flex-grow-1">
          {children}
        </CContainer>
        <AdminFooter />
      </div>
    </div>
  );
}
