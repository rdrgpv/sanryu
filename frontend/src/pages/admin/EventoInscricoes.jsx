import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCopy, cilCheckCircle, cilCloudDownload, cilPrint, cilSend } from '@coreui/icons';
import api from '../../services/api';
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

  const pendentes = inscricoes.filter((inscricao) => inscricao.statusPagamento === 'pendente');
  const pagas = inscricoes.filter((inscricao) => inscricao.statusPagamento === 'pago');
  const totalRecebido = pagas.reduce((soma, inscricao) => soma + Number(inscricao.valorCobrado || 0), 0);
  const totalTaxas = pagas
    .filter((inscricao) => inscricao.mpPaymentId)
    .reduce((soma, inscricao) => soma + Number(inscricao.valorCobrado || 0) * TAXA_MERCADO_PAGO, 0);
  const totalLiquido = totalRecebido - totalTaxas;

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api.get(`/admin/eventos/${id}/inscricoes`).then((res) => setInscricoes(res.data));
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

      <div style={{ overflowX: 'auto', maxWidth: '100%' }} className="bg-white rounded">
        <CTable hover className="text-nowrap mb-0" style={{ width: 'max-content', minWidth: '100%' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Nome</CTableHeaderCell>
              <CTableHeaderCell>Email</CTableHeaderCell>
              <CTableHeaderCell>Telefone</CTableHeaderCell>
              <CTableHeaderCell>Faixa</CTableHeaderCell>
              <CTableHeaderCell>Tamanho Faixa</CTableHeaderCell>
              <CTableHeaderCell>Nascimento</CTableHeaderCell>
              <CTableHeaderCell>Responsável</CTableHeaderCell>
              <CTableHeaderCell>Nº Carteirinha</CTableHeaderCell>
              <CTableHeaderCell>Validade Carteirinha</CTableHeaderCell>
              <CTableHeaderCell>Origem</CTableHeaderCell>
              <CTableHeaderCell>Apto</CTableHeaderCell>
              <CTableHeaderCell>Valor</CTableHeaderCell>
              <CTableHeaderCell>Pagamento</CTableHeaderCell>
              <CTableHeaderCell>QR Pix</CTableHeaderCell>
              <CTableHeaderCell>Inscrito em</CTableHeaderCell>
              <CTableHeaderCell>Ações</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {inscricoes.map((inscricao) => (
              <CTableRow key={inscricao.id}>
                <CTableDataCell>{inscricao.nome || '-'}</CTableDataCell>
                <CTableDataCell>{inscricao.email}</CTableDataCell>
                <CTableDataCell>{inscricao.telefone || '-'}</CTableDataCell>
                <CTableDataCell>{inscricao.faixa || '-'}</CTableDataCell>
                <CTableDataCell>{inscricao.tamanhoFaixa || '-'}</CTableDataCell>
                <CTableDataCell>{formatarData(inscricao.dataNascimento)}</CTableDataCell>
                <CTableDataCell>{inscricao.responsavel || '-'}</CTableDataCell>
                <CTableDataCell>{inscricao.numeroCarteirinha || '-'}</CTableDataCell>
                <CTableDataCell>
                  {formatarData(inscricao.validadeCarteirinha)}
                  {inscricao.carteirinhaValida === false && (
                    <div className="text-danger small">Aluno sem carteirinha válida</div>
                  )}
                </CTableDataCell>
                <CTableDataCell>{inscricao.origemDados || '-'}</CTableDataCell>
                <CTableDataCell>{inscricao.apto ? 'Sim' : 'Não'}</CTableDataCell>
                <CTableDataCell>
                  {inscricao.valorCobrado != null ? `R$ ${Number(inscricao.valorCobrado).toFixed(2)}` : '-'}
                </CTableDataCell>
                <CTableDataCell>{inscricao.statusPagamento}</CTableDataCell>
                <CTableDataCell>
                  {inscricao.qrcodePix ? (
                    <div className="d-flex align-items-center gap-2">
                      <img src={inscricao.qrcodePix} alt="QR Pix" style={{ width: 40, height: 40 }} />
                      {inscricao.pixCopiaCola && (
                        <CButton color="secondary" variant="outline" size="sm" onClick={() => copiarPix(inscricao.pixCopiaCola)}>
                          <CIcon icon={cilCopy} />
                        </CButton>
                      )}
                    </div>
                  ) : (
                    '-'
                  )}
                </CTableDataCell>
                <CTableDataCell>{formatarDataHora(inscricao.createdAt)}</CTableDataCell>
                <CTableDataCell>
                  {inscricao.mpPaymentId ? (
                    <CButton color="secondary" variant="outline" size="sm" onClick={() => verificarPagamento(inscricao.id)}>
                      <CIcon icon={cilCheckCircle} className="me-1" />
                      Verificar
                    </CButton>
                  ) : (
                    '-'
                  )}
                </CTableDataCell>
              </CTableRow>
            ))}
            {inscricoes.length === 0 && (
              <CTableRow>
                <CTableDataCell colSpan={16} className="text-body-secondary">
                  Nenhuma inscrição registrada.
                </CTableDataCell>
              </CTableRow>
            )}
          </CTableBody>
        </CTable>
      </div>
    </div>
  );
}
