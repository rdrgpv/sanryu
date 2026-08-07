import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const links = [
  { to: '/admin', label: 'Dashboard' },
  { to: '/admin/alunos', label: 'Alunos' },
  { to: '/admin/turmas', label: 'Turmas' },
  { to: '/admin/instrutores', label: 'Instrutores' },
];

export default function AdminLayout({ children }) {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <div className="admin">
      <aside className="admin__sidebar">
        <p className="admin__brand">道場 Sanryu</p>
        <nav className="admin__nav">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin'}
              className={({ isActive }) => `admin__nav-link ${isActive ? 'is-active' : ''}`}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin__user">
          <p>{admin?.nome}</p>
          <button type="button" className="btn btn--ghost" onClick={handleLogout}>
            Sair
          </button>
        </div>
      </aside>
      <main className="admin__content">{children}</main>
    </div>
  );
}
