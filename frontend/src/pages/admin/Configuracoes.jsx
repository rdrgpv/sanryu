import { useEffect, useState } from 'react';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CInputGroup, CButton } from '@coreui/react';
import api from '../../services/api';

const SISTEMA = 'SAN';

// Lista fixa dos parâmetros conhecidos do sistema — igual à ideia do configuracao-ade: a tela não
// edita linhas genéricas de "parametro/valor", e sim um formulário com campo próprio pra cada um.
const CAMPOS = [
  { parametro: 'GATAME_URL', label: 'URL da API do Gatame', tipo: 'text', sensivel: false },
  { parametro: 'GATAME_EMAIL', label: 'E-mail da credencial do Gatame', tipo: 'text', sensivel: false },
  { parametro: 'GATAME_SENHA', label: 'Senha da credencial do Gatame', tipo: 'text', sensivel: true },
  { parametro: 'MP_ACCESS_TOKEN', label: 'Access Token do Mercado Pago', tipo: 'text', sensivel: true },
  { parametro: 'SMTP_HOST', label: 'Servidor SMTP (host)', tipo: 'text', sensivel: false },
  { parametro: 'SMTP_PORT', label: 'Porta SMTP', tipo: 'text', sensivel: false },
  { parametro: 'SMTP_USER', label: 'Usuário SMTP', tipo: 'text', sensivel: false },
  { parametro: 'SMTP_SENHA', label: 'Senha SMTP', tipo: 'text', sensivel: true },
  { parametro: 'SMTP_FROM', label: 'Remetente dos e-mails (ex.: San·Ryu Dojo <contato@sanryu.com.br>)', tipo: 'text', sensivel: false },
  { parametro: 'SMTP_BCC', label: 'Cópia oculta dos e-mails enviados (opcional)', tipo: 'text', sensivel: false },
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
      <h1 className="h3 mb-2">Configurações</h1>
      <p className="text-body-secondary mb-3">
        Credenciais de integração do sistema. As alterações valem imediatamente, sem precisar
        reiniciar o servidor.
      </p>

      {carregando ? (
        <p>Carregando...</p>
      ) : (
        <CCard style={{ maxWidth: 640 }}>
          <CCardBody>
            <CForm onSubmit={handleSubmit}>
              {CAMPOS.map((campo) => (
                <div key={campo.parametro} className="mb-3">
                  <CFormLabel>{campo.label}</CFormLabel>
                  {campo.sensivel ? (
                    <CInputGroup>
                      <CFormInput
                        type={visiveis[campo.parametro] ? 'text' : 'password'}
                        value={valores[campo.parametro]}
                        onChange={(event) => handleChange(campo.parametro, event.target.value)}
                      />
                      <CButton color="secondary" variant="outline" onClick={() => alternarVisibilidade(campo.parametro)}>
                        {visiveis[campo.parametro] ? 'Ocultar' : 'Mostrar'}
                      </CButton>
                    </CInputGroup>
                  ) : (
                    <CFormInput
                      value={valores[campo.parametro]}
                      onChange={(event) => handleChange(campo.parametro, event.target.value)}
                    />
                  )}
                </div>
              ))}

              <CButton type="submit" color="primary" disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar configurações'}
              </CButton>

              {sucesso && <div className="alert alert-success mt-3">Configurações salvas com sucesso.</div>}
              {erro && <div className="alert alert-danger mt-3">{erro}</div>}
            </CForm>
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}
