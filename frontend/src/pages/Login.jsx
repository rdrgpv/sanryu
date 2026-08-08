import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState(null);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      await login(username, password);
      navigate('/admin');
    } catch (err) {
      setErro('Usuário ou senha inválidos.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login">
      <form className="login__card form" onSubmit={handleSubmit}>
        <img className="login__logo" src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" />
        <h1>Área administrativa</h1>

        <label className="form__field">
          <span>Usuário</span>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            autoFocus
          />
        </label>

        <label className="form__field">
          <span>Senha</span>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {erro && <p className="alert alert--error">{erro}</p>}
      </form>
    </div>
  );
}
