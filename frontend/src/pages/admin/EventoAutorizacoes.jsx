import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilLink, cilTrash } from '@coreui/icons';
import api from '../../services/api';
import { formatarDataHora } from '../../utils/formato.js';

// Autorizações do responsável assinadas pela página pública (/eventos/:slug/autorizacao). Na tela
// mostra a listagem; na impressão, cada autorização sai completa (dados, termo aceito e assinatura).
export default function EventoAutorizacoes() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [autorizacoes, setAutorizacoes] = useState([]);
  const [linkCopiado, setLinkCopiado] = useState(false);

  async function carregarAutorizacoes() {
    const res = await api.get(`/admin/eventos/${id}/autorizacoes`);
    setAutorizacoes(res.data);
  }

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    carregarAutorizacoes();
  }, [id]);

  const linkPublico = evento ? `${window.location.origin}/eventos/${evento.slug || evento.id}/autorizacao` : '';

  async function handleCopiarLink() {
    try {
      await navigator.clipboard.writeText(linkPublico);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (err) {
      window.prompt('Copie o link:', linkPublico);
    }
  }

  async function handleExcluir(autorizacao) {
    if (!window.confirm(`Excluir a autorização de ${autorizacao.nomeAluno}?`)) return;
    await api.delete(`/admin/autorizacoes/${autorizacao.id}`);
    carregarAutorizacoes();
  }

  return (
    <div>
      <div className="d-print-none">
        <Link to={`/admin/eventos/${id}/inscricoes`} className="text-body-secondary text-decoration-none d-inline-block mb-2">
          &larr; Voltar
        </Link>
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
          <h1 className="h3 mb-0">Autorizações{evento ? ` — ${evento.nome}` : ''}</h1>
          <div className="d-flex gap-2">
            <CButton color="secondary" variant="outline" onClick={handleCopiarLink} disabled={!evento} title="Copiar link para o responsável">
              <CIcon icon={cilLink} className="me-1" />
              {linkCopiado ? 'Link copiado!' : 'Copiar link'}
            </CButton>
            <CButton color="primary" onClick={() => window.print()} disabled={autorizacoes.length === 0}>
              <CIcon icon={cilPrint} className="me-1" />
              Imprimir
            </CButton>
          </div>
        </div>
        {evento && !evento.publicado && (
          <p className="text-danger small">Este evento não está publicado — o link só funciona depois de publicá-lo.</p>
        )}
        {autorizacoes.length === 0 && <p className="text-body-secondary">Nenhuma autorização enviada para este evento.</p>}

        {autorizacoes.length > 0 && (
          <CTable bordered hover className="bg-white align-middle">
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell>Aluno</CTableHeaderCell>
                <CTableHeaderCell>Faixa</CTableHeaderCell>
                <CTableHeaderCell>Idade</CTableHeaderCell>
                <CTableHeaderCell>Responsável</CTableHeaderCell>
                <CTableHeaderCell>Assinatura</CTableHeaderCell>
                <CTableHeaderCell>Enviada em</CTableHeaderCell>
                <CTableHeaderCell />
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {autorizacoes.map((autorizacao) => (
                <CTableRow key={autorizacao.id}>
                  <CTableDataCell>{autorizacao.nomeAluno}</CTableDataCell>
                  <CTableDataCell>{autorizacao.faixa}</CTableDataCell>
                  <CTableDataCell>{autorizacao.idade}</CTableDataCell>
                  <CTableDataCell>{autorizacao.nomeResponsavel}</CTableDataCell>
                  <CTableDataCell>
                    <img src={autorizacao.assinatura} alt="Assinatura" style={{ height: 40 }} />
                  </CTableDataCell>
                  <CTableDataCell>{formatarDataHora(autorizacao.createdAt)}</CTableDataCell>
                  <CTableDataCell className="text-end">
                    <CButton color="danger" variant="ghost" size="sm" onClick={() => handleExcluir(autorizacao)} title="Excluir">
                      <CIcon icon={cilTrash} />
                    </CButton>
                  </CTableDataCell>
                </CTableRow>
              ))}
            </CTableBody>
          </CTable>
        )}
      </div>

      <div className="d-none d-print-block">
        {autorizacoes.map((autorizacao) => (
          <div key={autorizacao.id} className="autorizacao-impressa">
            <h2 className="autorizacao-impressa__titulo">Autorização do responsável — {evento?.nome}</h2>
            <p>
              <strong>Aluno:</strong> {autorizacao.nomeAluno} &nbsp; <strong>Faixa:</strong> {autorizacao.faixa} &nbsp;{' '}
              <strong>Idade:</strong> {autorizacao.idade} anos
            </p>
            <p>
              <strong>Responsável:</strong> {autorizacao.nomeResponsavel}
            </p>
            <p className="autorizacao-impressa__termo">{autorizacao.termo}</p>
            <div className="autorizacao-impressa__assinatura">
              <img src={autorizacao.assinatura} alt="" />
              <div>
                {autorizacao.nomeResponsavel} — assinado em {formatarDataHora(autorizacao.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
