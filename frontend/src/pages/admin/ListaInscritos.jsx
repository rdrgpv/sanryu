import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CButton, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint } from '@coreui/icons';
import api from '../../services/api';

export default function ListaInscritos() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api.get(`/admin/eventos/${id}/inscricoes`).then((res) => {
      const ordenadas = [...res.data].sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
      setInscricoes(ordenadas);
    });
  }, [id]);

  return (
    <div>
      <div className="d-print-none">
        <Link to={`/admin/eventos/${id}/inscricoes`} className="text-body-secondary text-decoration-none d-inline-block mb-2">
          &larr; Voltar
        </Link>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 mb-0">Lista de inscritos{evento ? ` — ${evento.nome}` : ''}</h1>
          <CButton color="primary" onClick={() => window.print()} disabled={inscricoes.length === 0}>
            <CIcon icon={cilPrint} className="me-1" />
            Imprimir
          </CButton>
        </div>
        {inscricoes.length === 0 && <p className="text-body-secondary">Nenhuma inscrição para este evento.</p>}
      </div>

      <CTable bordered className="bg-white">
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell>Nome</CTableHeaderCell>
            <CTableHeaderCell>Faixa</CTableHeaderCell>
            <CTableHeaderCell>Telefone</CTableHeaderCell>
            <CTableHeaderCell>Pago</CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {inscricoes.map((inscricao) => (
            <CTableRow key={inscricao.id}>
              <CTableDataCell>{inscricao.nome || '-'}</CTableDataCell>
              <CTableDataCell>{inscricao.faixa || '-'}</CTableDataCell>
              <CTableDataCell>{inscricao.telefone || '-'}</CTableDataCell>
              <CTableDataCell>{inscricao.statusPagamento === 'pago' ? 'Sim' : 'Não'}</CTableDataCell>
            </CTableRow>
          ))}
        </CTableBody>
      </CTable>
    </div>
  );
}
