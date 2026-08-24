import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CButton,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CFormLabel,
  CFormSelect,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCopy, cilCheckCircle, cilCloudDownload, cilPrint, cilSend, cilPeople } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarDataHora, formatarMoeda } from '../../utils/formato.js';

const COLUNAS_EXPORTACAO = [
  'Nome',
  'Email',
  'Telefone',
  'Faixa',
  'Tamanho Faixa',
  'Nascimento',
  'Responsável',
  'Nº Carteirinha',
  'Validade Carteirinha',
  'Origem',
  'Apto',
  'Valor',
  'Pagamento',
  'Inscrito em',
];

// Taxa cobrada pelo Mercado Pago sobre pagamentos Pix recebidos por ele — só se aplica a
// inscrições pagas via Mercado Pago de verdade (mpPaymentId setado); o QR estático de /admin/bancos
// (fallback quando o MP não está configurado) não passa por essa taxa.
const TAXA_MERCADO_PAGO = 0.0099;

// Datas de nascimento/validade de carteirinha são strings "YYYY-MM-DD" sem horário — evita
// `new Date(string)`, que interpreta como meia-noite UTC e "volta" um dia em fusos negativos (Brasil).
function formatarData(valor) {
  if (!valor) return '-';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!match) return valor;
  const [, ano, mes, dia] = match;
  return `${dia}/${mes}/${ano}`;
}

export default function EventoInscricoes() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);
  const [notificando, setNotificando] = useState(false);
  const [cadastrandoGatameId, setCadastrandoGatameId] = useState(null);
  const [turmas, setTurmas] = useState([]);
  const [cadastrandoAlunoId, setCadastrandoAlunoId] = useState(null);
  const [modalTurma, setModalTurma] = useState(null); // { inscricao, turmasDoInstrutor, turmaId }

  // "expirado" (pagamento rejeitado/cancelado no Mercado Pago) também entra aqui — o backend gera
  // um Pix novo pra esses antes de notificar, já que o anterior morreu.
  const pendentes = inscricoes.filter(
    (inscricao) => inscricao.statusPagamento === 'pendente' || inscricao.statusPagamento === 'expirado'
  );
  const pagas = inscricoes.filter((inscricao) => inscricao.statusPagamento === 'pago');
  const totalRecebido = pagas.reduce((soma, inscricao) => soma + Number(inscricao.valorCobrado || 0), 0);
  const totalTaxas = pagas
    .filter((inscricao) => inscricao.mpPaymentId)
    .reduce((soma, inscricao) => soma + Number(inscricao.valorCobrado || 0) * TAXA_MERCADO_PAGO, 0);
  const totalLiquido = totalRecebido - totalTaxas;

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api.get(`/admin/eventos/${id}/inscricoes`).then((res) => setInscricoes(res.data));
    api.get('/admin/turmas').then((res) => setTurmas(res.data));
  }, [id]);

  async function copiarPix(texto) {
    try {
      await navigator.clipboard.writeText(texto);
    } catch (err) {
      window.alert('Não foi possível copiar o código Pix.');
    }
  }

  async function verificarPagamento(inscricaoId) {
    try {
      const res = await api.post(`/admin/inscricoes/${inscricaoId}/verificar-pagamento`);
      setInscricoes((prev) => prev.map((inscricao) => (inscricao.id === inscricaoId ? res.data : inscricao)));
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível verificar o pagamento agora.');
    }
  }

  async function cadastrarNoGatame(inscricao) {
    if (!window.confirm(`Cadastrar ${inscricao.nome || inscricao.email} como aluno novo no Gatame?`)) return;

    setCadastrandoGatameId(inscricao.id);
    try {
      const res = await api.post(`/admin/inscricoes/${inscricao.id}/cadastrar-gatame`);
      setInscricoes((prev) => prev.map((item) => (item.id === inscricao.id ? res.data : item)));
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível cadastrar o aluno no Gatame agora.');
    } finally {
      setCadastrandoGatameId(null);
    }
  }

  async function enviarCadastroAluno(inscricao, turmaId) {
    setCadastrandoAlunoId(inscricao.id);
    try {
      const res = await api.post(`/admin/inscricoes/${inscricao.id}/cadastrar-aluno`, { turmaId: turmaId || undefined });
      setInscricoes((prev) => prev.map((item) => (item.id === inscricao.id ? res.data.inscricao : item)));
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível cadastrar o aluno no Sanryu agora.');
    } finally {
      setCadastrandoAlunoId(null);
    }
  }

  // Se o instrutor responsável do evento tiver mais de uma turma, pergunta em qual matricular; com
  // 0 ou 1 turma não há escolha real a fazer, então só confirma e já manda direto.
  function cadastrarComoAluno(inscricao) {
    const turmasDoInstrutor = evento?.instrutorId ? turmas.filter((turma) => turma.instrutorId === evento.instrutorId) : [];

    if (turmasDoInstrutor.length > 1) {
      setModalTurma({ inscricao, turmasDoInstrutor, turmaId: turmasDoInstrutor[0].id });
      return;
    }

    const turma = turmasDoInstrutor[0];
    const mensagem = turma
      ? `Cadastrar ${inscricao.nome || inscricao.email} como aluno e matricular na turma "${turma.nome}"?`
      : `Cadastrar ${inscricao.nome || inscricao.email} como aluno no Sanryu?`;

    if (!window.confirm(mensagem)) return;
    enviarCadastroAluno(inscricao, turma?.id);
  }

  function confirmarCadastroComTurma() {
    const { inscricao, turmaId } = modalTurma;
    setModalTurma(null);
    enviarCadastroAluno(inscricao, turmaId || undefined);
  }

  async function handleNotificarPendentes() {
    if (pendentes.length === 0) return;
    if (!window.confirm(`Enviar lembrete de pagamento pendente para ${pendentes.length} inscrito(s)?`)) return;

    setNotificando(true);
    try {
      const res = await api.post(`/admin/eventos/${id}/notificar-pendentes`);
      window.alert(`${res.data.enviados} lembrete(s) enviado(s).`);
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível enviar os lembretes agora.');
    } finally {
      setNotificando(false);
    }
  }

  function exportarCSV() {
    const linhas = inscricoes.map((inscricao) => [
      inscricao.nome || '',
      inscricao.email || '',
      inscricao.telefone || '',
      inscricao.faixa || '',
      inscricao.tamanhoFaixa || '',
      formatarData(inscricao.dataNascimento),
      inscricao.responsavel || '',
      inscricao.numeroCarteirinha || '',
      formatarData(inscricao.validadeCarteirinha),
      inscricao.origemDados || '',
      inscricao.apto ? 'Sim' : 'Não',
      inscricao.valorCobrado != null ? Number(inscricao.valorCobrado).toFixed(2).replace('.', ',') : '',
      inscricao.statusPagamento || '',
      formatarDataHora(inscricao.createdAt),
    ]);

    const escapar = (valor) => `"${String(valor).replace(/"/g, '""')}"`;
    // Separador ; e BOM de UTF-8: é o que o Excel em pt-BR espera pra abrir direto com
    // acentuação certa (o padrão americano usa , como separador, que conflita com decimal).
    const csv = [COLUNAS_EXPORTACAO, ...linhas].map((linha) => linha.map(escapar).join(';')).join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const nomeArquivo = `inscricoes-${(evento?.nome || id).toString().replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = nomeArquivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <Link to="/admin/eventos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <div className="d-flex justify-content-between align-items-center mb-1">
        <h1 className="h3 mb-0">Inscrições{evento ? ` — ${evento.nome}` : ''}</h1>
        <div className="d-flex gap-2">
          <CButton
            as={Link}
            to={`/admin/eventos/${id}/relatorio-exame`}
            color="secondary"
            variant="outline"
            disabled={inscricoes.length === 0}
          >
            <CIcon icon={cilPrint} className="me-1" />
            Fichas de exame
          </CButton>
          <CButton
            as={Link}
            to={`/admin/eventos/${id}/lista-inscritos`}
            color="secondary"
            variant="outline"
            disabled={inscricoes.length === 0}
          >
            <CIcon icon={cilPrint} className="me-1" />
            Lista de inscritos
          </CButton>
          <CButton color="primary" onClick={exportarCSV} disabled={inscricoes.length === 0}>
            <CIcon icon={cilCloudDownload} className="me-1" />
            Exportar CSV
          </CButton>
          <CButton color="secondary" variant="outline" onClick={handleNotificarPendentes} disabled={pendentes.length === 0 || notificando}>
            <CIcon icon={cilSend} className="me-1" />
            {notificando ? 'Enviando...' : `Notificar pendentes (${pendentes.length})`}
          </CButton>
        </div>
      </div>
      <p className="text-body-secondary mb-3">
        Total recebido: <strong>{formatarMoeda(totalRecebido)}</strong>
        <span className="mx-2">·</span>
        Total líquido (descontada a taxa de 0,99% do Mercado Pago): <strong>{formatarMoeda(totalLiquido)}</strong>
      </p>

      <AdminDataTable
        rows={inscricoes}
        emptyMessage="Nenhuma inscrição registrada."
        tableClassName="text-nowrap"
        tableStyle={{ width: 'max-content', minWidth: '100%' }}
        pageSize={25}
        pageSizeOptions={[25, 50, 100]}
        columns={[
          { key: 'nome', label: 'Nome', sortable: true, render: (i) => i.nome || '-' },
          { key: 'email', label: 'Email', sortable: true },
          { key: 'telefone', label: 'Telefone', render: (i) => i.telefone || '-' },
          { key: 'faixa', label: 'Faixa', sortable: true, render: (i) => i.faixa || '-' },
          { key: 'tamanhoFaixa', label: 'Tamanho Faixa', render: (i) => i.tamanhoFaixa || '-' },
          {
            key: 'dataNascimento',
            label: 'Nascimento',
            sortable: true,
            render: (i) => formatarData(i.dataNascimento),
          },
          { key: 'responsavel', label: 'Responsável', render: (i) => i.responsavel || '-' },
          { key: 'numeroCarteirinha', label: 'Nº Carteirinha', render: (i) => i.numeroCarteirinha || '-' },
          {
            key: 'validadeCarteirinha',
            label: 'Validade Carteirinha',
            sortable: true,
            render: (i) => (
              <>
                {formatarData(i.validadeCarteirinha)}
                {i.carteirinhaValida === false && <div className="text-danger small">Aluno sem carteirinha válida</div>}
              </>
            ),
          },
          { key: 'origemDados', label: 'Origem', sortable: true, render: (i) => i.origemDados || '-' },
          { key: 'apto', label: 'Apto', sortable: true, sortValue: (i) => (i.apto ? 1 : 0), render: (i) => (i.apto ? 'Sim' : 'Não') },
          {
            key: 'valorCobrado',
            label: 'Valor',
            align: 'end',
            sortable: true,
            sortValue: (i) => (i.valorCobrado != null ? Number(i.valorCobrado) : null),
            render: (i) => (i.valorCobrado != null ? `R$ ${Number(i.valorCobrado).toFixed(2)}` : '-'),
          },
          { key: 'statusPagamento', label: 'Pagamento', sortable: true },
          {
            key: 'qrcodePix',
            label: 'QR Pix',
            render: (i) =>
              i.qrcodePix ? (
                <div className="d-flex align-items-center gap-2">
                  <img src={i.qrcodePix} alt="QR Pix" style={{ width: 40, height: 40 }} />
                  {i.pixCopiaCola && (
                    <CButton color="secondary" variant="outline" size="sm" onClick={() => copiarPix(i.pixCopiaCola)}>
                      <CIcon icon={cilCopy} />
                    </CButton>
                  )}
                </div>
              ) : (
                '-'
              ),
          },
          {
            key: 'createdAt',
            label: 'Inscrito em',
            sortable: true,
            sortValue: (i) => (i.createdAt ? new Date(i.createdAt).getTime() : null),
            render: (i) => formatarDataHora(i.createdAt),
          },
          {
            key: 'acoes',
            label: 'Ações',
            render: (inscricao) => (
              <div className="d-flex flex-column gap-1 align-items-start">
                {inscricao.mpPaymentId && (
                  <CButton color="secondary" variant="outline" size="sm" onClick={() => verificarPagamento(inscricao.id)}>
                    <CIcon icon={cilCheckCircle} className="me-1" />
                    Verificar
                  </CButton>
                )}
                {inscricao.alunoId ? (
                  <span className="text-success small">Aluno cadastrado</span>
                ) : (
                  <CButton
                    color="secondary"
                    variant="outline"
                    size="sm"
                    disabled={cadastrandoAlunoId === inscricao.id}
                    onClick={() => cadastrarComoAluno(inscricao)}
                  >
                    <CIcon icon={cilPeople} className="me-1" />
                    {cadastrandoAlunoId === inscricao.id ? 'Cadastrando...' : 'Cadastrar como Aluno'}
                  </CButton>
                )}
                {inscricao.origemDados !== 'gatame' &&
                  (inscricao.cadastradoNoGatame ? (
                    <span className="text-success small">Cadastrado no Gatame</span>
                  ) : (
                    <CButton
                      color="secondary"
                      variant="outline"
                      size="sm"
                      disabled={cadastrandoGatameId === inscricao.id}
                      onClick={() => cadastrarNoGatame(inscricao)}
                    >
                      <CIcon icon={cilPeople} className="me-1" />
                      {cadastrandoGatameId === inscricao.id ? 'Cadastrando...' : 'Cadastrar no Gatame'}
                    </CButton>
                  ))}
              </div>
            ),
          },
        ]}
      />

      <CModal visible={!!modalTurma} onClose={() => setModalTurma(null)}>
        <CModalHeader>
          <CModalTitle>Cadastrar como Aluno</CModalTitle>
        </CModalHeader>
        {modalTurma && (
          <CModalBody>
            <p>
              O instrutor responsável tem mais de uma turma. Escolha em qual matricular{' '}
              <strong>{modalTurma.inscricao.nome || modalTurma.inscricao.email}</strong>, ou deixe sem turma.
            </p>
            <CFormLabel>Turma</CFormLabel>
            <CFormSelect
              value={modalTurma.turmaId}
              onChange={(event) => setModalTurma((prev) => ({ ...prev, turmaId: event.target.value }))}
            >
              <option value="">Sem turma (só cadastrar o aluno)</option>
              {modalTurma.turmasDoInstrutor.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </CFormSelect>
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setModalTurma(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={confirmarCadastroComTurma}>
            Cadastrar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
