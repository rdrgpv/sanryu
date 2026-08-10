import { useEffect, useState } from 'react';
import api from '../../services/api';

const SISTEMA = 'SAN';

// Lista fixa dos parâmetros conhecidos do sistema — igual à ideia do configuracao-ade: a tela não
// edita linhas genéricas de "parametro/valor", e sim um formulário com campo próprio pra cada um.
const CAMPOS = [
  { parametro: 'GATAME_URL', label: 'URL da API do Gatame', tipo: 'text', sensivel: false },
  { parametro: 'GATAME_EMAIL', label: 'E-mail da credencial do Gatame', tipo: 'text', sensivel: false },
  { parametro: 'GATAME_SENHA', label: 'Senha da credencial do Gatame', tipo: 'text', sensivel: true },
  { parametro: 'MP_ACCESS_TOKEN', label: 'Access Token do Mercado Pago', tipo: 'text', sensivel: true },
];

const estadoInicial = CAMPOS.reduce((acc, campo) => ({ ...acc, [campo.parametro]: '' }), {});

export default function Configuracoes() {
  const [valores, setValores] = useState(estadoInicial);
  const [visiveis, setVisiveis] = useState({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState(null);
  const [sucesso, setSucesso] = useState(false);

  async function carregarValores() {
    setCarregando(true);
    const res = await api.get('/admin/configuracoes');
    const doSistema = res.data.filter((config) => config.sistema === SISTEMA);

    const novosValores = { ...estadoInicial };
    doSistema.forEach((config) => {
      if (config.parametro in novosValores) {
        novosValores[config.parametro] = config.valor || '';
      }
    });

    setValores(novosValores);
    setCarregando(false);
  }

  useEffect(() => {
    carregarValores();
  }, []);

  function handleChange(parametro, valor) {
    setValores((prev) => ({ ...prev, [parametro]: valor }));
    setSucesso(false);
  }

  function alternarVisibilidade(parametro) {
    setVisiveis((prev) => ({ ...prev, [parametro]: !prev[parametro] }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);
    setSalvando(true);

    const itens = CAMPOS.map((campo) => ({
      parametro: campo.parametro,
      valor: valores[campo.parametro],
      tipoParametro: 'S',
    }));

    try {
      await api.put('/admin/configuracoes/lote', { sistema: SISTEMA, itens });
      setSucesso(true);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar configurações.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="admin__header">
        <h1 className="admin__title">Configurações</h1>
      </div>

      <p className="tile__meta" style={{ marginBottom: '1.25rem' }}>
        Credenciais de integração do sistema. As alterações valem imediatamente, sem precisar
        reiniciar o servidor.
      </p>

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <form className="form form--inline" onSubmit={handleSubmit}>
          {CAMPOS.map((campo) => (
            <label key={campo.parametro} className="form__field form__field--wide">
              <span>{campo.label}</span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type={campo.sensivel && !visiveis[campo.parametro] ? 'password' : 'text'}
                  value={valores[campo.parametro]}
                  onChange={(event) => handleChange(campo.parametro, event.target.value)}
                  style={{ flex: 1 }}
                />
                {campo.sensivel && (
                  <button
                    type="button"
                    className="btn btn--ghost btn--small"
                    onClick={() => alternarVisibilidade(campo.parametro)}
                  >
                    {visiveis[campo.parametro] ? 'Ocultar' : 'Mostrar'}
                  </button>
                )}
              </div>
            </label>
          ))}

          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar configurações'}
            </button>
          </div>

          {sucesso && <p className="alert alert--success">Configurações salvas com sucesso.</p>}
          {erro && <p className="alert alert--error">{erro}</p>}
        </form>
      )}
    </div>
  );
}
