import { Fragment, useEffect, useMemo, useState } from 'react';
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
  cilBuilding,
  cilUser,
  cilWallet,
  cilNotes,
  cilDollar,
  cilChartLine,
  cilChartPie,
  cilArrowCircleTop,
  cilArrowCircleBottom,
  cilLoopCircular,
  cilUserFollow,
  cilLockLocked,
  cilInstitution,
  cilGroup,
  cilBullhorn,
  cilSpreadsheet,
} from '@coreui/icons';
import { useAuth } from '../context/AuthContext.jsx';
import AdminHeader from '../admin/components/AdminHeader.jsx';
import AdminFooter from '../admin/components/AdminFooter.jsx';
import TrocarSenhaModal from '../admin/components/TrocarSenhaModal.jsx';
import { podeVer } from '../utils/permissoes.js';

const linksPrincipal = [
  { to: '/admin', label: 'Dashboard', end: true, icon: cilSpeedometer },
  { to: '/admin/interessados', label: 'Interessados', icon: cilUserFollow },
  { to: '/admin/alunos', label: 'Alunos', icon: cilPeople },
  { to: '/admin/responsaveis', label: 'Responsáveis', icon: cilUser },
  { to: '/admin/contratos', label: 'Contratos', icon: cilNotes },
  { to: '/admin/mensalidades', label: 'Mensalidades', icon: cilDollar },
  { to: '/admin/planos', label: 'Planos', icon: cilWallet },
  { to: '/admin/turmas', label: 'Turmas', icon: cilSchool },
  { to: '/admin/frequencia', label: 'Frequência', icon: cilChartLine },
  { to: '/admin/avisos', label: 'Avisos', icon: cilBullhorn },
  { to: '/admin/instrutores', label: 'Instrutores', icon: cilContact },
  { to: '/admin/faixas', label: 'Faixas', icon: cilLayers },
  { to: '/admin/unidades', label: 'Unidades', icon: cilBuilding },
];

const linksEventos = [
  { to: '/admin/tipos-evento', label: 'Tipos de Evento', icon: cilTags },
  { to: '/admin/eventos', label: 'Eventos', icon: cilCalendar },
  { to: '/admin/academias', label: 'Academias Morganti', icon: cilInstitution },
  { to: '/admin/alunos-externos', label: 'Alunos Morganti', icon: cilGroup },
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

const linksFinanceiro = [
  { to: '/admin/financeiro', label: 'Financeiro', end: true, icon: cilChartPie },
  { to: '/admin/financeiro/pagar', label: 'Contas a pagar', icon: cilArrowCircleTop },
  { to: '/admin/financeiro/receber', label: 'Contas a receber', icon: cilArrowCircleBottom },
  { to: '/admin/financeiro/recorrencias', label: 'Recorrentes', icon: cilLoopCircular },
  { to: '/admin/financeiro/cadastros', label: 'Contas e categorias', icon: cilBank },
  { to: '/admin/financeiro/relatorios', label: 'Relatórios (contador)', icon: cilSpreadsheet },
];

const linksSistema = [
  { to: '/admin/usuarios', label: 'Usuários', icon: cilLockLocked },
  { to: '/admin/configuracao-academia', label: 'Config. da academia', icon: cilSettings },
  { to: '/admin/configuracoes', label: 'Configurações', icon: cilSettings },
];

const SECOES = [
  { titulo: 'Gestão', links: linksPrincipal },
  { titulo: 'Financeiro', links: linksFinanceiro },
  { titulo: 'Eventos', links: linksEventos },
  { titulo: 'Loja', links: linksLoja },
  { titulo: 'Sistema', links: linksSistema },
];

const TODOS_OS_LINKS = SECOES.flatMap((secao) => secao.links);

// Sufixo da rota -> complemento do título mostrado no header (ex.: "Alunos — Novo").
const SUFIXOS_DE_ROTA = {
  novo: 'Novo',
  editar: 'Editar',
  inscricoes: 'Inscrições',
  'relatorio-exame': 'Relatório de Exame',
  'lista-inscritos': 'Lista de Inscritos',
  movimentacoes: 'Movimentações',
  'gerar-pedido-compra': 'Gerar Pedido de Compra',
  chamada: 'Chamada',
  pagar: 'Contas a pagar',
  receber: 'Contas a receber',
  recorrencias: 'Recorrentes',
  cadastros: 'Contas e categorias',
  relatorios: 'Relatórios',
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
  const { admin, logout, perfil } = useAuth();
  const navigate = useNavigate();
  const [trocandoSenha, setTrocandoSenha] = useState(false);
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

  // Só reage quando o breakpoint é cruzado de verdade (não em todo resize) — preserva um toggle
  // manual feito em mobile (ex.: girar o celular não deve fechar o menu que o usuário abriu).
  useEffect(() => {
    let eraDesktop = window.innerWidth >= 992;

    function handleResize() {
      const agoraDesktop = window.innerWidth >= 992;
      if (agoraDesktop !== eraDesktop) {
        eraDesktop = agoraDesktop;
        setSidebarVisible(agoraDesktop);
      }
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div>
      {/* Sem onVisibleChange de propósito: o CSidebar mede internamente se o elemento está dentro
          da viewport e usa isso pra "confirmar" a visibilidade de volta pro pai — numa medição
          inicial (antes da posição assentar) isso pode achar que a sidebar "não está visível",
          escondê-la de verdade, e a partir daí a medição confirma a si mesma (loop que nunca se
          recupera sozinho). Controlamos a visibilidade só num sentido (React -> CoreUI, via
          `visible`), nunca deixando o próprio componente sobrescrever nosso estado. */}
      <CSidebar
        className="border-end"
        colorScheme="dark"
        position="fixed"
        unfoldable={unfoldable}
        visible={sidebarVisible}
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
          {SECOES.map((secao) => {
            const visiveis = secao.links.filter((link) => podeVer(perfil, link.to));
            if (visiveis.length === 0) return null;
            return (
              <Fragment key={secao.titulo}>
                <CNavTitle>{secao.titulo}</CNavTitle>
                {visiveis.map((link) => (
                  <CNavItem key={link.to}>
                    <CNavLink as={NavLink} to={link.to} end={link.end} title={link.label}>
                      <CIcon customClassName="nav-icon" icon={link.icon} />
                      {link.label}
                    </CNavLink>
                  </CNavItem>
                ))}
              </Fragment>
            );
          })}
        </CSidebarNav>
        <CSidebarFooter className="border-top d-flex flex-column gap-2 align-items-stretch">
          <div className="small text-white-50 text-truncate">
            {admin?.nome}
            {perfil === 'recepcao' && ' · recepção'}
          </div>
          <CButton color="secondary" variant="ghost" size="sm" className="text-white-50" onClick={() => setTrocandoSenha(true)}>
            Trocar minha senha
          </CButton>
          <CButton color="secondary" variant="outline" size="sm" onClick={handleLogout}>
            Sair
          </CButton>
          <CSidebarToggler className="d-none d-lg-flex" onClick={() => setUnfoldable((valor) => !valor)} />
        </CSidebarFooter>
      </CSidebar>
      <TrocarSenhaModal visivel={trocandoSenha} aoFechar={() => setTrocandoSenha(false)} />

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
