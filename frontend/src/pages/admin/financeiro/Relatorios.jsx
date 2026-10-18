import { useState } from 'react';
import { CButton, CCard, CCardBody, CFormInput, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';
import api from '../../../services/api';
import { hoje } from '../../../utils/financeiro.js';

const RELATORIOS = [
  { tipo: 'recebimentos', titulo: 'Recebimentos', descricao: 'Tudo que entrou no período, pela data do pagamento (mensalidades, vendas, outras receitas).' },
  { tipo: 'despesas', titulo: 'Despesas pagas', descricao: 'Tudo que saiu no período, pela data do pagamento, com categoria e fornecedor.' },
  { tipo: 'por-categoria', titulo: 'Resumo por categoria', descricao: 'Total pago no período em cada categoria de receita e despesa.' },
  { tipo: 'lancamentos', titulo: 'Todos os lançamentos', descricao: 'Tudo que venceu ou foi pago no período, inclusive em aberto e cancelado — para conferência.' },
  { tipo: 'mensalidades', titulo: 'Mensalidades', descricao: 'Mensalidades com vencimento no período: aluno, responsável, CPF, plano e situação.' },
  { tipo: 'inadimplencia', titulo: 'Inadimplência (hoje)', descricao: 'Todas as mensalidades vencidas em aberto, com multa e juros do dia. Ignora o período.' },
];

function primeiroDiaMesPassado() {
  const [ano, mes] = hoje().split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 2, 1)).toISOString().slice(0, 10);
}

function ultimoDiaMesPassado() {
  const [ano, mes] = hoje().split('-').map(Number);
  return new Date(Date.UTC(ano, mes - 1, 0)).toISOString().slice(0, 10);
}

// Planilhas para o contador (CSV que o Excel abre direto, com acentos, ";" e vírgula decimal).
// Começa no mês passado — o fechamento que normalmente vai pro contador.
export default function Relatorios() {
  const [periodo, setPeriodo] = useState({ inicio: primeiroDiaMesPassado(), fim: ultimoDiaMesPassado() });
  const [baixando, setBaixando] = useState(null);
  const [erro, setErro] = useState(null);

  // Download via API (precisa do token): recebe o arquivo e salva com o nome que o servidor mandou.
  async function baixar(tipo) {
    setErro(null);
    setBaixando(tipo);
    try {
      const resposta = await api.get(`/admin/relatorios/${tipo}`, { params: periodo, responseType: 'blob' });
      const nome = /filename="([^"]+)"/.exec(resposta.headers['content-disposition'] || '')?.[1] || `sanryu-${tipo}.csv`;
      const url = URL.createObjectURL(resposta.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro('Não foi possível gerar o relatório. Confira o período.');
    } finally {
      setBaixando(null);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Relatórios para o contador</h1>
      <p className="text-body-secondary small mb-3">Planilhas que abrem direto no Excel. Recebimentos e despesas seguem a data do pagamento (regime de caixa).</p>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3">
        <CFormInput type="date" style={{ maxWidth: 170 }} value={periodo.inicio} onChange={(event) => setPeriodo((prev) => ({ ...prev, inicio: event.target.value }))} />
        <span className="text-body-secondary">até</span>
        <CFormInput type="date" style={{ maxWidth: 170 }} value={periodo.fim} onChange={(event) => setPeriodo((prev) => ({ ...prev, fim: event.target.value }))} />
      </div>

      {erro && <div className="alert alert-danger py-2">{erro}</div>}

      <CRow className="g-3">
        {RELATORIOS.map((relatorio) => (
          <CCol md={6} lg={4} key={relatorio.tipo}>
            <CCard className="h-100">
              <CCardBody className="d-flex flex-column">
                <h2 className="h6">{relatorio.titulo}</h2>
                <p className="small text-body-secondary flex-grow-1">{relatorio.descricao}</p>
                <CButton color="primary" variant="outline" onClick={() => baixar(relatorio.tipo)} disabled={baixando !== null}>
                  <CIcon icon={cilCloudDownload} className="me-1" />
                  {baixando === relatorio.tipo ? 'Gerando...' : 'Baixar planilha'}
                </CButton>
              </CCardBody>
            </CCard>
          </CCol>
        ))}
      </CRow>
    </div>
  );
}
