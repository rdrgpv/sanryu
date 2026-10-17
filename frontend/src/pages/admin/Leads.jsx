import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CButton,
  CButtonGroup,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CNav,
  CNavItem,
  CNavLink,
  CBadge,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload, cilChatBubble, cilUserFollow } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarTelefone, calcularIdade, formatarDataHora } from '../../utils/formato.js';

const STATUS = [
  { valor: 'novo', label: 'Novos', singular: 'Novo', cor: 'info' },
  { valor: 'agendado', label: 'Agendados', singular: 'Agendado', cor: 'warning' },
  { valor: 'compareceu', label: 'Vieram', singular: 'Veio à aula', cor: 'primary' },
  { valor: 'matriculado', label: 'Matriculados', singular: 'Matriculado', cor: 'success' },
  { valor: 'desistiu', label: 'Desistiram', singular: 'Desistiu', cor: 'secondary' },
];

const ORIGENS = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  google: 'Google',
  indicacao: 'Indicação',
  passou_na_frente: 'Passou na frente',
  evento: 'Evento',
  outro: 'Outro',
};

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}` : '-';
}

const VAZIO = { nome: '', telefone: '', email: '', dataNascimento: '', nomeResponsavel: '', turmaId: '', dataAula: '', origem: '', observacoes: '', status: 'novo' };

export default function Leads() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [contagem, setContagem] = useState({});
  const [turmas, setTurmas] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('agendado');
  const [busca, setBusca] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState(null);
  const [mensagem, setMensagem] = useState(null);

  const selecionado = leads.find((lead) => lead.id === selecionadoId) || null;

  async function carregar() {
    const params = {};
    if (statusFiltro) params.status = statusFiltro;
    if (busca) params.busca = busca;
    const res = await api.get('/admin/leads', { params });
    setLeads(res.data.leads);
    setContagem(res.data.contagem);
  }

  useEffect(() => {
    api.get('/admin/turmas').then((res) => setTurmas(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(carregar, 250);
    setSelecionadoId(null);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro, busca]);

  function avisar(texto, cor = 'success') {
    setMensagem({ texto, cor });
    setTimeout(() => setMensagem(null), 4000);
  }

  async function mudarStatus(status) {
    let motivoDesistencia;
    if (status === 'desistiu') {
      motivoDesistencia = window.prompt('Motivo (opcional): preço, horário, distância...') ?? undefined;
      if (motivoDesistencia === undefined) return;
    }
    try {
      await api.put(`/admin/leads/${selecionadoId}`, { status, motivoDesistencia });
      avisar('Situação atualizada.');
      carregar();
    } catch (err) {
      avisar(err.response?.data?.error || 'Não foi possível atualizar.', 'danger');
    }
  }

  async function converter() {
    if (!window.confirm(`Criar o cadastro de ${selecionado.nome} como aluno${selecionado.turma ? ` e matricular em ${selecionado.turma.nome}` : ''}?`)) return;
    try {
      const res = await api.post(`/admin/leads/${selecionadoId}/converter`);
      // Leva direto pro cadastro completo (CPF, endereço, saúde) — o contrato vem depois.
      navigate(`/admin/alunos/${res.data.alunoId}/editar`);
    } catch (err) {
      avisar(err.response?.data?.error || 'Não foi possível converter.', 'danger');
    }
  }

  function abrirWhatsApp() {
    const digitos = selecionado.telefone.replace(/\D/g, '');
    const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
    const nome = (selecionado.nomeResponsavel || selecionado.nome).split(' ')[0];
    const texto =
      selecionado.status === 'agendado' && selecionado.dataAula
        ? `Olá, ${nome}! Aqui é do San·Ryu Dojo. Confirmando a aula experimental${selecionado.nomeResponsavel ? ` de ${selecionado.nome}` : ''} em ${formatarData(selecionado.dataAula)}${selecionado.turma ? `, ${selecionado.turma.horaInicio}` : ''}. Podemos contar com você?`
        : selecionado.status === 'compareceu'
          ? `Olá, ${nome}! Aqui é do San·Ryu Dojo. O que achou da aula experimental? Ficamos felizes com a visita e podemos te passar os planos para começar.`
          : `Olá, ${nome}! Aqui é do San·Ryu Dojo. Vimos seu interesse em uma aula experimental — qual o melhor dia e horário para você?`;
    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  function abrirFormulario(lead) {
    setErro(null);
    setFormulario(
      lead
        ? {
            id: lead.id,
            ...Object.fromEntries(Object.keys(VAZIO).map((campo) => [campo, lead[campo] ?? ''])),
            turmaId: lead.turmaId ? String(lead.turmaId) : '',
          }
        : { ...VAZIO }
    );
  }

  async function salvar() {
    setErro(null);
    try {
      if (formulario.id) await api.put(`/admin/leads/${formulario.id}`, formulario);
      else await api.post('/admin/leads', formulario);
      setFormulario(null);
      avisar('Salvo.');
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir os dados de ${selecionado.nome}? (use quando a pessoa pedir pela LGPD ou for cadastro errado)`)) return;
    await api.delete(`/admin/leads/${selecionadoId}`);
    carregar();
  }

  const total = Object.values(contagem).reduce((soma, valor) => soma + valor, 0);
  const conversao = total ? Math.round(((contagem.matriculado || 0) / total) * 100) : 0;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-baseline flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Interessados (aula experimental)</h1>
        <small className="text-body-secondary">
          {total} no total · {conversao}% viraram alunos · link público: <code>{window.location.origin}/aula-experimental</code>
        </small>
      </div>

      <CNav variant="underline-border" className="mb-3 flex-nowrap overflow-auto">
        {STATUS.map((status) => (
          <CNavItem key={status.valor}>
            <CNavLink as="button" type="button" active={statusFiltro === status.valor} onClick={() => setStatusFiltro(status.valor)} className="text-nowrap">
              {status.label} <CBadge color={status.cor}>{contagem[status.valor] || 0}</CBadge>
            </CNavLink>
          </CNavItem>
        ))}
        <CNavItem>
          <CNavLink as="button" type="button" active={statusFiltro === ''} onClick={() => setStatusFiltro('')}>
            Todos
          </CNavLink>
        </CNavItem>
      </CNav>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={() => abrirFormulario(null)} title="Novo interessado">
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!selecionado} onClick={() => abrirFormulario(selecionado)} title="Editar / remarcar">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton color="danger" variant="outline" disabled={!selecionado} onClick={excluir} title="Excluir dados">
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
        <CButton color="success" variant="outline" disabled={!selecionado} onClick={abrirWhatsApp} title="WhatsApp com mensagem pronta">
          <CIcon icon={cilChatBubble} className="me-1" />
          WhatsApp
        </CButton>
        <CFormSelect
          style={{ maxWidth: 200 }}
          disabled={!selecionado || selecionado.status === 'matriculado'}
          value=""
          onChange={(event) => event.target.value && mudarStatus(event.target.value)}
        >
          <option value="">Mudar situação...</option>
          {STATUS.filter((status) => status.valor !== 'matriculado' && status.valor !== selecionado?.status).map((status) => (
            <option key={status.valor} value={status.valor}>
              {status.singular}
            </option>
          ))}
        </CFormSelect>
        <CButton color="primary" disabled={!selecionado || selecionado.status === 'matriculado'} onClick={converter} title="Criar cadastro de aluno e matricular">
          <CIcon icon={cilUserFollow} className="me-1" />
          Converter em aluno
        </CButton>
        <CFormInput style={{ maxWidth: 240 }} placeholder="Buscar nome ou telefone..." value={busca} onChange={(event) => setBusca(event.target.value)} />
      </div>

      {mensagem && <div className={`alert alert-${mensagem.cor} py-2`}>{mensagem.texto}</div>}

      <AdminDataTable
        rows={leads}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Ninguém nesta situação."
        columns={[
          {
            key: 'nome',
            label: 'Nome',
            sortable: true,
            render: (lead) => {
              const idade = calcularIdade(lead.dataNascimento);
              return (
                <>
                  {lead.nome}
                  {idade !== null && <small className="text-body-secondary"> · {idade} anos</small>}
                  {lead.nomeResponsavel && <small className="text-body-secondary d-block">resp.: {lead.nomeResponsavel}</small>}
                </>
              );
            },
          },
          { key: 'telefone', label: 'WhatsApp', render: (lead) => lead.telefone },
          {
            key: 'aula',
            label: 'Aula',
            sortable: true,
            sortValue: (lead) => lead.dataAula || '',
            render: (lead) =>
              lead.turma ? (
                <>
                  {lead.turma.nome}
                  <small className="text-body-secondary d-block">{lead.dataAula ? `${formatarData(lead.dataAula)} · ${lead.turma.horaInicio}` : 'sem data'}</small>
                </>
              ) : (
                <span className="text-body-secondary small">a combinar</span>
              ),
          },
          { key: 'origem', label: 'Como conheceu', sortable: true, render: (lead) => ORIGENS[lead.origem] || '-' },
          {
            key: 'status',
            label: 'Situação',
            sortable: true,
            render: (lead) => {
              const status = STATUS.find((item) => item.valor === lead.status);
              return (
                <>
                  <CBadge color={status?.cor}>{status?.singular}</CBadge>
                  {lead.motivoDesistencia && <small className="text-body-secondary d-block">{lead.motivoDesistencia}</small>}
                </>
              );
            },
          },
          { key: 'createdAt', label: 'Chegou em', sortable: true, render: (lead) => formatarDataHora(lead.createdAt) },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)} size="lg">
        <CModalHeader>
          <CModalTitle>{formulario?.id ? 'Editar interessado' : 'Novo interessado'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput value={formulario.nome} onChange={(event) => setFormulario((prev) => ({ ...prev, nome: event.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Nascimento</CFormLabel>
                <CFormInput type="date" value={formulario.dataNascimento} onChange={(event) => setFormulario((prev) => ({ ...prev, dataNascimento: event.target.value }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>WhatsApp</CFormLabel>
                <CFormInput value={formulario.telefone} onChange={(event) => setFormulario((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }))} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Responsável (se criança)</CFormLabel>
                <CFormInput value={formulario.nomeResponsavel} onChange={(event) => setFormulario((prev) => ({ ...prev, nomeResponsavel: event.target.value }))} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>E-mail</CFormLabel>
                <CFormInput type="email" value={formulario.email} onChange={(event) => setFormulario((prev) => ({ ...prev, email: event.target.value }))} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Turma</CFormLabel>
                <CFormSelect value={formulario.turmaId} onChange={(event) => setFormulario((prev) => ({ ...prev, turmaId: event.target.value }))}>
                  <option value="">A combinar</option>
                  {turmas.map((turma) => (
                    <option key={turma.id} value={turma.id}>
                      {turma.nome} — {turma.diaSemana} {turma.horaInicio}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Dia da aula</CFormLabel>
                <CFormInput type="date" value={formulario.dataAula} onChange={(event) => setFormulario((prev) => ({ ...prev, dataAula: event.target.value, status: event.target.value && prev.status === 'novo' ? 'agendado' : prev.status }))} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Como conheceu</CFormLabel>
                <CFormSelect value={formulario.origem} onChange={(event) => setFormulario((prev) => ({ ...prev, origem: event.target.value }))}>
                  <option value="">-</option>
                  {Object.entries(ORIGENS).map(([valor, label]) => (
                    <option key={valor} value={valor}>
                      {label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} value={formulario.observacoes} onChange={(event) => setFormulario((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </CCol>
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setFormulario(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvar}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
