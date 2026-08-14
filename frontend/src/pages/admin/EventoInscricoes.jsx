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
import { cilCopy, cilCheckCircle, cilCloudDownload, cilPrint } from '@coreui/icons';
import api from '../../services/api';

const COLUNAS_EXPORTACAO = [
  'Nome',
  'Email',
  'Telefone',
  'Faixa',
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

  function exportarCSV() {
    const linhas = inscricoes.map((inscricao) => [
      inscricao.nome || '',
      inscricao.email || '',
      inscricao.telefone || '',
      inscricao.faixa || '',
      formatarData(inscricao.dataNascimento),
      inscricao.responsavel || '',
      inscricao.numeroCarteirinha || '',
      formatarData(inscricao.validadeCarteirinha),
      inscricao.origemDados || '',
      inscricao.apto ? 'Sim' : 'Não',
      inscricao.valorCobrado != null ? Number(inscricao.valorCobrado).toFixed(2).replace('.', ',') : '',
      inscricao.statusPagamento || '',
      new Date(inscricao.createdAt).toLocaleString('pt-BR'),
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
      <div className="d-flex justify-content-between align-items-center mb-3">
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
        </div>
      </div>

      <div style={{ overflowX: 'auto', maxWidth: '100%' }} className="bg-white rounded">
        <CTable hover className="text-nowrap mb-0" style={{ width: 'max-content', minWidth: '100%' }}>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Nome</CTableHeaderCell>
              <CTableHeaderCell>Email</CTableHeaderCell>
              <CTableHeaderCell>Telefone</CTableHeaderCell>
              <CTableHeaderCell>Faixa</CTableHeaderCell>
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
                <CTableDataCell>{new Date(inscricao.createdAt).toLocaleString('pt-BR')}</CTableDataCell>
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
                <CTableDataCell colSpan={15} className="text-body-secondary">
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
