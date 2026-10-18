import { useEffect, useState } from 'react';
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
  CInputGroup,
  CInputGroupText,
  CRow,
  CCol,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilReload, cilCash, cilLink, cilEnvelopeClosed, cilChatBubble, cilSync, cilBan, cilActionUndo, cilCalculator, cilDescription } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

const FORMAS = [
  { valor: 'dinheiro', label: 'Dinheiro' },
  { valor: 'cartao', label: 'Cartão (maquininha)' },
  { valor: 'transferencia', label: 'Transferência' },
  { valor: 'pix', label: 'Pix (fora do sistema)' },
  { valor: 'outro', label: 'Outro' },
];

const LABEL_FORMA = { ...Object.fromEntries(FORMAS.map((forma) => [forma.valor, forma.label])), pix: 'Pix', isento: 'Isento' };

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

function formatarCompetencia(valor) {
  const [ano, mes] = (valor || '').split('-');
  return mes ? `${mes}/${ano}` : valor;
}

function hoje() {
  return new Date().toLocaleDateString('sv-SE');
}

// Sem a URL pública configurada o backend devolve só o caminho — completa com o endereço atual.
function linkCompleto(link) {
  return link?.startsWith('/') ? `${window.location.origin}${link}` : link;
}

function badgeStatus(mensalidade) {
  if (mensalidade.status === 'pago') return <span className="badge text-bg-success">Paga</span>;
  if (mensalidade.status === 'cancelado') return <span className="badge text-bg-secondary">Cancelada</span>;
  if (mensalidade.vencida) return <span className="badge text-bg-danger">Vencida ({mensalidade.diasAtraso}d)</span>;
  return <span className="badge text-bg-warning">A vencer</span>;
}

export default function Mensalidades() {
  // Desfazer baixa e cancelar cobrança são só do admin (a recepção recebe e cobra).
  const { perfil } = useAuth();
  const ehAdmin = perfil === 'admin';
  const [mensalidades, setMensalidades] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [statusFiltro, setStatusFiltro] = useState('pendente');
  const [competenciaFiltro, setCompetenciaFiltro] = useState('');
  const [unidadeFiltro, setUnidadeFiltro] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [pagamento, setPagamento] = useState(null);

  const selecionada = mensalidades.find((mensalidade) => mensalidade.id === selecionadoId) || null;
  const pendente = selecionada?.status === 'pendente';

  async function carregar() {
    const params = {};
    if (statusFiltro) params.status = statusFiltro;
    if (competenciaFiltro) params.competencia = competenciaFiltro;
    if (unidadeFiltro) params.unidadeId = unidadeFiltro;
    const res = await api.get('/admin/mensalidades', { params });
    setMensalidades(res.data);
  }

  useEffect(() => {
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
  }, []);

  useEffect(() => {
    carregar();
    setSelecionadoId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFiltro, competenciaFiltro, unidadeFiltro]);

  function avisar(texto, tipo = 'success') {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 4000);
  }

  // Executa uma ação de linha, mostra o erro do backend se houver, e recarrega a lista.
  async function acao(funcao, sucesso) {
    setOcupado(true);
    try {
      await funcao();
      if (sucesso) avisar(sucesso);
      await carregar();
    } catch (err) {
      avisar(err.response?.data?.error || 'Não foi possível concluir a ação.', 'danger');
    } finally {
      setOcupado(false);
    }
  }

  function gerarAgora() {
    acao(async () => {
      const res = await api.post('/admin/mensalidades/gerar');
      avisar(res.data.geradas ? `${res.data.geradas} mensalidade(s) gerada(s).` : 'Nenhuma mensalidade nova para gerar.');
    });
  }

  function abrirPagamento() {
    setPagamento({
      formaPagamento: 'dinheiro',
      valorPago: String(selecionada.valorAtualizado ?? selecionada.valor),
      pagoEm: hoje(),
      observacoes: '',
    });
  }

  function confirmarPagamento() {
    acao(async () => {
      await api.post(`/admin/mensalidades/${selecionadoId}/pagamento`, { ...pagamento, valorPago: Number(pagamento.valorPago) });
      setPagamento(null);
    }, 'Pagamento registrado.');
  }

  async function copiarLink() {
    const link = linkCompleto(selecionada.link);
    try {
      await navigator.clipboard.writeText(link);
      avisar('Link de pagamento copiado.');
    } catch (err) {
      window.prompt('Copie o link:', link);
    }
  }

  // Abre o WhatsApp com a mensagem pronta — o envio continua sendo do admin (sem API paga).
  function abrirWhatsApp() {
    const contato = selecionada.aluno.responsavel || selecionada.aluno;
    const digitos = (contato.telefone || selecionada.aluno.telefone || '').replace(/\D/g, '');

    if (!digitos) {
      avisar('Sem telefone do responsável/aluno no cadastro.', 'danger');
      return;
    }

    const numero = digitos.length <= 11 ? `55${digitos}` : digitos;
    const valor = formatarMoeda(selecionada.valorAtualizado ?? selecionada.valor);
    const texto = selecionada.vencida
      ? `Olá, ${contato.nome}! A mensalidade de ${selecionada.aluno.nome} (${formatarCompetencia(selecionada.competencia)}) venceu em ${formatarData(selecionada.vencimento)} e ainda consta em aberto. Valor atualizado: ${valor}. Para pagar com Pix: ${linkCompleto(selecionada.link)}`
      : `Olá, ${contato.nome}! A mensalidade de ${selecionada.aluno.nome} (${formatarCompetencia(selecionada.competencia)}) vence em ${formatarData(selecionada.vencimento)}. Valor: ${valor}. Para pagar com Pix: ${linkCompleto(selecionada.link)}`;

    window.open(`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`, '_blank', 'noopener');
  }

  const pendentes = mensalidades.filter((mensalidade) => mensalidade.status === 'pendente');
  const vencidas = pendentes.filter((mensalidade) => mensalidade.vencida);
  const somar = (lista, campo) => lista.reduce((total, item) => total + Number(item[campo] ?? item.valor ?? 0), 0);

  return (
    <div>
      <h1 className="h3 mb-3">Mensalidades</h1>

      <CRow className="g-3 mb-3">
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">Em atraso ({vencidas.length})</div>
            <div className="fs-5 fw-semibold text-danger">{formatarMoeda(somar(vencidas, 'valorAtualizado'))}</div>
          </div>
        </CCol>
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">A vencer ({pendentes.length - vencidas.length})</div>
            <div className="fs-5 fw-semibold">{formatarMoeda(somar(pendentes.filter((m) => !m.vencida), 'valor'))}</div>
          </div>
        </CCol>
        <CCol sm={4}>
          <div className="border rounded p-3 bg-body">
            <div className="text-body-secondary small">Recebido na lista</div>
            <div className="fs-5 fw-semibold text-success">
              {formatarMoeda(somar(mensalidades.filter((m) => m.status === 'pago'), 'valorPago'))}
            </div>
          </div>
        </CCol>
      </CRow>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CButtonGroup role="group">
          <CButton color="primary" onClick={gerarAgora} disabled={ocupado} title="Gerar mensalidades que faltam agora">
            <CIcon icon={cilCalculator} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
        <CButtonGroup role="group">
          <CButton color="success" variant="outline" disabled={!pendente || ocupado} onClick={abrirPagamento} title="Registrar pagamento manual">
            <CIcon icon={cilCash} />
          </CButton>
          <CButton
            color="info"
            variant="outline"
            disabled={!pendente || ocupado || !selecionada?.mpPaymentId}
            onClick={() => acao(() => api.post(`/admin/mensalidades/${selecionadoId}/verificar-pagamento`), 'Pix verificado no Mercado Pago.')}
            title="Verificar Pix no Mercado Pago"
          >
            <CIcon icon={cilSync} />
          </CButton>
        </CButtonGroup>
        <CButtonGroup role="group">
          <CButton
            color="secondary"
            variant="outline"
            disabled={selecionada?.status !== 'pago' || !(Number(selecionada?.valorPago) > 0)}
            onClick={() => window.open(`${linkCompleto(selecionada.link)}/recibo`, '_blank', 'noopener')}
            title="Recibo (mensalidade paga)"
          >
            <CIcon icon={cilDescription} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!pendente} onClick={copiarLink} title="Copiar link de pagamento">
            <CIcon icon={cilLink} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!pendente} onClick={abrirWhatsApp} title="Cobrar pelo WhatsApp">
            <CIcon icon={cilChatBubble} />
          </CButton>
          <CButton
            color="secondary"
            variant="outline"
            disabled={!pendente || ocupado}
            onClick={() => acao(() => api.post(`/admin/mensalidades/${selecionadoId}/enviar-email`), 'E-mail de cobrança enviado.')}
            title="Enviar e-mail de cobrança agora"
          >
            <CIcon icon={cilEnvelopeClosed} />
          </CButton>
        </CButtonGroup>
        {ehAdmin && (
        <CButtonGroup role="group">
          <CButton
            color="secondary"
            variant="outline"
            disabled={!selecionada || selecionada.status === 'pendente' || ocupado}
            onClick={() => window.confirm('Desfazer a baixa e deixar em aberto de novo?') && acao(() => api.post(`/admin/mensalidades/${selecionadoId}/reabrir`), 'Mensalidade reaberta.')}
            title="Desfazer baixa / reabrir"
          >
            <CIcon icon={cilActionUndo} />
          </CButton>
          <CButton
            color="danger"
            variant="outline"
            disabled={!pendente || ocupado}
            onClick={() => {
              const motivo = window.prompt('Motivo do cancelamento desta mensalidade:');
              if (motivo !== null) acao(() => api.post(`/admin/mensalidades/${selecionadoId}/cancelar`, { motivo }), 'Mensalidade cancelada.');
            }}
            title="Cancelar mensalidade"
          >
            <CIcon icon={cilBan} />
          </CButton>
        </CButtonGroup>
        )}
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CFormSelect style={{ maxWidth: 200 }} value={statusFiltro} onChange={(event) => setStatusFiltro(event.target.value)}>
          <option value="pendente">Em aberto</option>
          <option value="vencida">Vencidas</option>
          <option value="a_vencer">A vencer</option>
          <option value="pago">Pagas</option>
          <option value="cancelado">Canceladas</option>
          <option value="">Todas</option>
        </CFormSelect>
        <CFormInput
          type="month"
          style={{ maxWidth: 200 }}
          value={competenciaFiltro}
          onChange={(event) => setCompetenciaFiltro(event.target.value)}
          title="Competência"
        />
        {unidades.length > 1 && (
          <CFormSelect style={{ maxWidth: 220 }} value={unidadeFiltro} onChange={(event) => setUnidadeFiltro(event.target.value)}>
            <option value="">Todas as unidades</option>
            {unidades.map((unidade) => (
              <option key={unidade.id} value={unidade.id}>
                {unidade.nome}
              </option>
            ))}
          </CFormSelect>
        )}
      </div>

      {mensagem && <div className={`alert alert-${mensagem.tipo} py-2`}>{mensagem.texto}</div>}

      <AdminDataTable
        rows={mensalidades}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhuma mensalidade."
        columns={[
          {
            key: 'aluno',
            label: 'Aluno',
            sortable: true,
            sortValue: (mensalidade) => mensalidade.aluno?.nome || '',
            render: (mensalidade) => (
              <>
                {mensalidade.aluno?.nome}
                {mensalidade.aluno?.responsavel && <small className="text-body-secondary d-block">resp.: {mensalidade.aluno.responsavel.nome}</small>}
              </>
            ),
          },
          {
            key: 'competencia',
            label: 'Competência',
            sortable: true,
            render: (mensalidade) => (
              <>
                {formatarCompetencia(mensalidade.competencia)}
                <small className="text-body-secondary d-block">{mensalidade.contrato?.plano?.nome}</small>
              </>
            ),
          },
          { key: 'vencimento', label: 'Vencimento', sortable: true, render: (mensalidade) => formatarData(mensalidade.vencimento) },
          {
            key: 'valor',
            label: 'Valor',
            align: 'end',
            sortable: true,
            sortValue: (mensalidade) => Number(mensalidade.valorAtualizado ?? mensalidade.valor),
            render: (mensalidade) => (
              <>
                {formatarMoeda(mensalidade.status === 'pago' ? mensalidade.valorPago : mensalidade.valorAtualizado ?? mensalidade.valor)}
                {mensalidade.vencida && Number(mensalidade.valorAtualizado) !== Number(mensalidade.valor) && (
                  <small className="text-body-secondary d-block">original {formatarMoeda(mensalidade.valor)}</small>
                )}
              </>
            ),
          },
          {
            key: 'status',
            label: 'Situação',
            sortable: true,
            sortValue: (mensalidade) => (mensalidade.vencida ? 'a' : mensalidade.status),
            render: (mensalidade) => (
              <>
                {badgeStatus(mensalidade)}
                {mensalidade.status === 'pago' && (
                  <small className="text-body-secondary d-block">
                    {LABEL_FORMA[mensalidade.formaPagamento] || mensalidade.formaPagamento} · {formatarDataHora(mensalidade.pagoEm)}
                  </small>
                )}
              </>
            ),
          },
          {
            key: 'avisos',
            label: 'Avisos',
            render: (mensalidade) =>
              [mensalidade.emailCobrancaEm && 'cobrança', mensalidade.emailVencimentoEm && 'vencimento', mensalidade.emailAtrasoEm && 'atraso']
                .filter(Boolean)
                .join(', ') || '-',
          },
        ]}
      />

      <CModal visible={!!pagamento} onClose={() => setPagamento(null)}>
        <CModalHeader>
          <CModalTitle>Registrar pagamento</CModalTitle>
        </CModalHeader>
        {pagamento && selecionada && (
          <CModalBody>
            <p className="small text-body-secondary">
              {selecionada.aluno.nome} — {formatarCompetencia(selecionada.competencia)}
              {selecionada.vencida && ` · vencida há ${selecionada.diasAtraso} dia(s), valor com multa/juros já preenchido`}
            </p>
            <CRow className="g-3">
              <CCol sm={6}>
                <CFormLabel>Forma</CFormLabel>
                <CFormSelect value={pagamento.formaPagamento} onChange={(event) => setPagamento((prev) => ({ ...prev, formaPagamento: event.target.value }))}>
                  {FORMAS.map((forma) => (
                    <option key={forma.valor} value={forma.valor}>
                      {forma.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Valor recebido</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={pagamento.valorPago}
                    onChange={(event) => setPagamento((prev) => ({ ...prev, valorPago: event.target.value }))}
                  />
                </CInputGroup>
              </CCol>
              <CCol sm={6}>
                <CFormLabel>Data do pagamento</CFormLabel>
                <CFormInput type="date" value={pagamento.pagoEm} onChange={(event) => setPagamento((prev) => ({ ...prev, pagoEm: event.target.value }))} />
              </CCol>
              <CCol sm={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} value={pagamento.observacoes} onChange={(event) => setPagamento((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </CCol>
            </CRow>
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setPagamento(null)}>
            Cancelar
          </CButton>
          <CButton color="success" onClick={confirmarPagamento} disabled={ocupado}>
            Confirmar pagamento
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
