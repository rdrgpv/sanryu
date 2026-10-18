import { useEffect, useState } from 'react';
import { CButton, CFormCheck, CFormInput, CFormLabel, CFormSelect, CFormTextarea, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilTrash, cilReload } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarDataHora } from '../../utils/formato.js';

const PUBLICOS = [
  { valor: 'todos', label: 'Todos os alunos ativos' },
  { valor: 'unidade', label: 'Uma unidade' },
  { valor: 'turma', label: 'Uma turma' },
  { valor: 'inadimplentes', label: 'Com mensalidade em atraso' },
  { valor: 'evento', label: 'Inscritos de um evento' },
];
const NO_PORTAL = ['todos', 'unidade', 'turma'];

const VAZIO = { titulo: '', mensagem: '', publico: 'todos', alvoId: '', enviarEmail: true, mostrarNoPortal: false };

// Comunicados em massa: e-mail (pro responsável, se o aluno é menor; um por e-mail) e/ou aviso na
// área do aluno. O envio corre em segundo plano — a lista acompanha os contadores.
export default function Avisos() {
  const [avisos, setAvisos] = useState([]);
  const [opcoes, setOpcoes] = useState({ unidades: [], turmas: [], eventos: [] });
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [previa, setPrevia] = useState(null);
  const [erro, setErro] = useState(null);
  const [enviando, setEnviando] = useState(false);

  async function carregar() {
    setAvisos((await api.get('/admin/avisos')).data);
  }

  useEffect(() => {
    carregar();
    Promise.all([api.get('/admin/unidades'), api.get('/admin/turmas'), api.get('/admin/eventos')]).then(([unidades, turmas, eventos]) =>
      setOpcoes({ unidades: unidades.data, turmas: turmas.data, eventos: eventos.data })
    );
  }, []);

  // Enquanto algum aviso está sendo enviado, atualiza a lista pra mostrar o progresso.
  const algumEnviando = avisos.some((aviso) => aviso.status === 'enviando');
  useEffect(() => {
    if (!algumEnviando) return undefined;
    const intervalo = setInterval(carregar, 3000);
    return () => clearInterval(intervalo);
  }, [algumEnviando]);

  // Prévia de quantos recebem, sempre que o público muda.
  useEffect(() => {
    setPrevia(null);
    if (!formulario) return undefined;
    const precisaAlvo = ['unidade', 'turma', 'evento'].includes(formulario.publico);
    if (precisaAlvo && !formulario.alvoId) return undefined;
    const timeout = setTimeout(() => {
      api
        .post('/admin/avisos/previa', { publico: formulario.publico, alvoId: formulario.alvoId || null })
        .then((res) => setPrevia(res.data))
        .catch(() => setPrevia(null));
    }, 250);
    return () => clearTimeout(timeout);
  }, [formulario?.publico, formulario?.alvoId]);

  function atualizar(campo, valor) {
    setFormulario((prev) => {
      const proximo = { ...prev, [campo]: valor };
      if (campo === 'publico') {
        proximo.alvoId = '';
        if (!NO_PORTAL.includes(valor)) proximo.mostrarNoPortal = false;
      }
      return proximo;
    });
  }

  async function enviar() {
    setErro(null);
    if (formulario.enviarEmail && previa && !window.confirm(`Enviar "${formulario.titulo}" por e-mail para ${previa.total} pessoa(s)?`)) return;
    setEnviando(true);
    try {
      await api.post('/admin/avisos', { ...formulario, alvoId: formulario.alvoId || null });
      setFormulario(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível enviar.');
    } finally {
      setEnviando(false);
    }
  }

  async function excluir() {
    if (!window.confirm('Excluir este aviso? Ele some da área do aluno. E-mails já enviados não voltam.')) return;
    await api.delete(`/admin/avisos/${selecionadoId}`);
    setSelecionadoId(null);
    carregar();
  }

  const alvos =
    formulario?.publico === 'unidade'
      ? opcoes.unidades.map((item) => ({ id: item.id, nome: item.nome }))
      : formulario?.publico === 'turma'
        ? opcoes.turmas.map((item) => ({ id: item.id, nome: `${item.nome} — ${item.diaSemana} ${item.horaInicio}` }))
        : formulario?.publico === 'evento'
          ? opcoes.eventos.map((item) => ({ id: item.id, nome: `${item.nome} — ${new Date(item.data).toLocaleDateString('pt-BR')}` }))
          : [];

  return (
    <div>
      <h1 className="h3 mb-1">Avisos</h1>
      <p className="text-body-secondary small mb-3">Comunicados por e-mail e na área do aluno — ex.: “não haverá aula no feriado”.</p>

      <div className="d-flex gap-2 mb-3">
        <CButton
          color="primary"
          onClick={() => {
            setErro(null);
            setFormulario({ ...VAZIO });
          }}
        >
          <CIcon icon={cilPlus} className="me-1" />
          Novo aviso
        </CButton>
        <CButton color="danger" variant="outline" disabled={!selecionadoId} onClick={excluir} title="Excluir">
          <CIcon icon={cilTrash} />
        </CButton>
        <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
          <CIcon icon={cilReload} />
        </CButton>
      </div>

      <AdminDataTable
        rows={avisos}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhum aviso enviado."
        columns={[
          { key: 'createdAt', label: 'Data', sortable: true, render: (aviso) => formatarDataHora(aviso.createdAt) },
          {
            key: 'titulo',
            label: 'Aviso',
            render: (aviso) => (
              <>
                {aviso.titulo}
                <small className="text-body-secondary d-block text-truncate" style={{ maxWidth: 420 }}>
                  {aviso.mensagem}
                </small>
              </>
            ),
          },
          { key: 'descricaoPublico', label: 'Para', render: (aviso) => aviso.descricaoPublico },
          {
            key: 'envio',
            label: 'E-mail',
            render: (aviso) =>
              !aviso.enviarEmail ? (
                <span className="text-body-secondary small">não</span>
              ) : aviso.status === 'enviando' ? (
                <span className="text-warning-emphasis small">
                  enviando {aviso.enviados}/{aviso.totalDestinatarios}...
                </span>
              ) : (
                <span className="small">
                  {aviso.enviados} enviado(s)
                  {aviso.falhas > 0 && <span className="text-danger"> · {aviso.falhas} falha(s)</span>}
                </span>
              ),
          },
          { key: 'mostrarNoPortal', label: 'Área do aluno', render: (aviso) => (aviso.mostrarNoPortal ? 'sim' : '-') },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)} size="lg">
        <CModalHeader>
          <CModalTitle>Novo aviso</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Para quem</CFormLabel>
                <CFormSelect value={formulario.publico} onChange={(event) => atualizar('publico', event.target.value)}>
                  {PUBLICOS.map((publico) => (
                    <option key={publico.valor} value={publico.valor}>
                      {publico.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              {alvos.length > 0 || ['unidade', 'turma', 'evento'].includes(formulario.publico) ? (
                <CCol md={6}>
                  <CFormLabel>{formulario.publico === 'unidade' ? 'Unidade' : formulario.publico === 'turma' ? 'Turma' : 'Evento'}</CFormLabel>
                  <CFormSelect value={formulario.alvoId} onChange={(event) => atualizar('alvoId', event.target.value)}>
                    <option value="">Selecione</option>
                    {alvos.map((alvo) => (
                      <option key={alvo.id} value={alvo.id}>
                        {alvo.nome}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              ) : (
                <CCol md={6} />
              )}
              <CCol md={12}>
                {previa ? (
                  <div className="small border rounded p-2 bg-body-tertiary">
                    <strong>{previa.total}</strong> pessoa(s) recebem por e-mail
                    {previa.semEmail > 0 && <span className="text-warning-emphasis"> · {previa.semEmail} sem e-mail no cadastro (ficam de fora)</span>}
                    {previa.exemplos.length > 0 && (
                      <span className="text-body-secondary d-block">
                        Ex.: {previa.exemplos.join(', ')}
                        {previa.total > previa.exemplos.length ? '...' : ''}
                      </span>
                    )}
                  </div>
                ) : (
                  <small className="text-body-secondary">Escolha o público para ver quantos recebem.</small>
                )}
              </CCol>
              <CCol md={12}>
                <CFormLabel>Título (assunto do e-mail)</CFormLabel>
                <CFormInput value={formulario.titulo} maxLength={150} onChange={(event) => atualizar('titulo', event.target.value)} placeholder="Ex.: Feriado — não haverá aula na segunda" />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Mensagem</CFormLabel>
                <CFormTextarea rows={6} value={formulario.mensagem} onChange={(event) => atualizar('mensagem', event.target.value)} />
                <small className="text-body-secondary">O e-mail começa com "Olá, [nome do responsável ou aluno]!" e termina com "San·Ryu Dojo".</small>
              </CCol>
              <CCol md={12} className="d-flex flex-wrap gap-4">
                <CFormCheck id="avisoEmail" label="Enviar por e-mail" checked={formulario.enviarEmail} onChange={(event) => atualizar('enviarEmail', event.target.checked)} />
                <CFormCheck
                  id="avisoPortal"
                  label="Mostrar na área do aluno (90 dias)"
                  checked={formulario.mostrarNoPortal}
                  disabled={!NO_PORTAL.includes(formulario.publico)}
                  onChange={(event) => atualizar('mostrarNoPortal', event.target.checked)}
                />
              </CCol>
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setFormulario(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={enviar} disabled={enviando}>
            {enviando ? 'Enviando...' : 'Enviar aviso'}
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
