import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CButton, CCard, CCardBody, CFormSelect, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';

async function baixarPlanilha(tipo, params = {}) {
  const resposta = await api.get(`/admin/relatorios/${tipo}`, { params, responseType: 'blob' });
  const nome = /filename="([^"]+)"/.exec(resposta.headers['content-disposition'] || '')?.[1] || `sanryu-${tipo}.csv`;
  const url = URL.createObjectURL(resposta.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

function hoje() {
  return new Date().toLocaleDateString('sv-SE');
}

// Visão geral do estoque: quanto dinheiro está parado, o que vende e o que não sai.
export default function PainelEstoque() {
  const [dias, setDias] = useState('90');
  const [painel, setPainel] = useState(null);

  useEffect(() => {
    api.get('/admin/estoque/painel', { params: { dias } }).then((res) => setPainel(res.data));
  }, [dias]);

  if (!painel) return <p>Carregando...</p>;

  const inicioPeriodo = new Date(Date.now() - Number(dias) * 86400000).toLocaleDateString('sv-SE');

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Painel do estoque</h1>
        <div className="d-flex gap-2">
          <CButton color="secondary" variant="outline" onClick={() => baixarPlanilha('estoque')}>
            <CIcon icon={cilCloudDownload} className="me-1" />
            Estoque valorizado
          </CButton>
          <CButton color="secondary" variant="outline" onClick={() => baixarPlanilha('vendas-produtos', { inicio: inicioPeriodo, fim: hoje() })}>
            <CIcon icon={cilCloudDownload} className="me-1" />
            Vendas por produto
          </CButton>
        </div>
      </div>

      <CRow className="g-3 mb-3">
        <CCol sm={6} lg={3}>
          <div className="border rounded p-3 bg-body h-100">
            <div className="text-body-secondary small">Parado em estoque (custo)</div>
            <div className="fs-4 fw-semibold">{formatarMoeda(painel.valorCusto)}</div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="border rounded p-3 bg-body h-100">
            <div className="text-body-secondary small">Se vender tudo (preço de venda)</div>
            <div className="fs-4 fw-semibold">{formatarMoeda(painel.valorVenda)}</div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <div className="border rounded p-3 bg-body h-100">
            <div className="text-body-secondary small">Unidades em estoque</div>
            <div className="fs-4 fw-semibold">{painel.unidades}</div>
          </div>
        </CCol>
        <CCol sm={6} lg={3}>
          <Link to="/admin/estoque/reposicao" className="text-decoration-none">
            <div className="border rounded p-3 bg-body h-100">
              <div className="text-body-secondary small">No mínimo ou abaixo</div>
              <div className={`fs-4 fw-semibold ${painel.abaixoDoMinimo ? 'text-danger' : ''}`}>{painel.abaixoDoMinimo} item(s)</div>
            </div>
          </Link>
        </CCol>
      </CRow>

      <div className="d-flex align-items-center gap-2 mb-2">
        <span className="small text-body-secondary">Vendas dos últimos</span>
        <CFormSelect size="sm" style={{ maxWidth: 120 }} value={dias} onChange={(event) => setDias(event.target.value)}>
          <option value="30">30 dias</option>
          <option value="90">90 dias</option>
          <option value="180">180 dias</option>
          <option value="365">12 meses</option>
        </CFormSelect>
      </div>

      <CRow className="g-3">
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardBody>
              <h2 className="h6">Mais vendidos</h2>
              {painel.maisVendidos.length === 0 && <p className="small text-body-secondary mb-0">Nenhuma venda no período.</p>}
              <table className="table table-sm small mb-0">
                <tbody>
                  {painel.maisVendidos.map((linha) => (
                    <tr key={linha.id}>
                      <td>{linha.descricao}</td>
                      <td className="text-end">{linha.vendidos} vendido(s)</td>
                      <td className="text-end text-body-secondary">{linha.margem === null ? '-' : `margem ${linha.margem}%`}</td>
                      <td className="text-end">{linha.estoque} em estoque</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol lg={6}>
          <CCard className="h-100">
            <CCardBody>
              <h2 className="h6">Parados (sem venda no período)</h2>
              {painel.parados.length === 0 && <p className="small text-body-secondary mb-0">Tudo que tem estoque vendeu no período.</p>}
              <table className="table table-sm small mb-0">
                <tbody>
                  {painel.parados.map((linha) => (
                    <tr key={linha.id}>
                      <td>{linha.descricao}</td>
                      <td className="text-end">{linha.estoque} un.</td>
                      <td className="text-end">{formatarMoeda(linha.valorParado)} parado</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
}
