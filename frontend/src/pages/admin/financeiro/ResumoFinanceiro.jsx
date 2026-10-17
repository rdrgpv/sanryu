import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CCard, CCardBody, CFormInput, CRow, CCol } from '@coreui/react';
import api from '../../../services/api';
import { formatarMoeda } from '../../../utils/formato.js';
import { formatarMes, hoje } from '../../../utils/financeiro.js';

function classeValor(valor) {
  if (valor > 0) return 'text-success';
  if (valor < 0) return 'text-danger';
  return '';
}

export default function ResumoFinanceiro() {
  const ano = hoje().slice(0, 4);
  const [periodo, setPeriodo] = useState({ inicio: `${ano}-01-01`, fim: `${ano}-12-31` });
  const [resumo, setResumo] = useState(null);

  useEffect(() => {
    api.get('/admin/financeiro/resumo', { params: periodo }).then((res) => setResumo(res.data));
  }, [periodo]);

  if (!resumo) return <p>Carregando...</p>;

  const totalEntradas = resumo.meses.reduce((total, mes) => total + mes.entradas, 0);
  const totalSaidas = resumo.meses.reduce((total, mes) => total + mes.saidas, 0);
  const maiorCategoria = Math.max(1, ...resumo.porCategoria.map((linha) => linha.total));

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
        <h1 className="h3 mb-0">Financeiro</h1>
        <div className="d-flex gap-2 align-items-center">
          <CFormInput type="date" value={periodo.inicio} onChange={(event) => setPeriodo((prev) => ({ ...prev, inicio: event.target.value }))} />
          <span className="text-body-secondary">até</span>
          <CFormInput type="date" value={periodo.fim} onChange={(event) => setPeriodo((prev) => ({ ...prev, fim: event.target.value }))} />
        </div>
      </div>

      <CRow className="g-3 mb-3">
        <CCol md={3}>
          <div className="border rounded p-3 bg-body h-100">
            <div className="text-body-secondary small">Saldo em todas as contas</div>
            <div className={`fs-4 fw-semibold ${classeValor(resumo.saldoTotal)}`}>{formatarMoeda(resumo.saldoTotal)}</div>
          </div>
        </CCol>
        <CCol md={3}>
          <div className="border rounded p-3 bg-body h-100">
            <div className="text-body-secondary small">Resultado do período</div>
            <div className={`fs-4 fw-semibold ${classeValor(totalEntradas - totalSaidas)}`}>{formatarMoeda(totalEntradas - totalSaidas)}</div>
            <small className="text-body-secondary">
              {formatarMoeda(totalEntradas)} entradas · {formatarMoeda(totalSaidas)} saídas
            </small>
          </div>
        </CCol>
        <CCol md={3}>
          <Link to="/admin/financeiro/pagar" className="text-decoration-none">
            <div className="border rounded p-3 bg-body h-100">
              <div className="text-body-secondary small">Contas a pagar vencidas</div>
              <div className={`fs-4 fw-semibold ${resumo.vencidoAPagar > 0 ? 'text-danger' : ''}`}>{formatarMoeda(resumo.vencidoAPagar)}</div>
            </div>
          </Link>
        </CCol>
        <CCol md={3}>
          <Link to="/admin/financeiro/receber" className="text-decoration-none">
            <div className="border rounded p-3 bg-body h-100">
              <div className="text-body-secondary small">A receber vencido</div>
              <div className={`fs-4 fw-semibold ${resumo.vencidoAReceber > 0 ? 'text-warning-emphasis' : ''}`}>{formatarMoeda(resumo.vencidoAReceber)}</div>
              <small className="text-body-secondary">inclui mensalidades em atraso</small>
            </div>
          </Link>
        </CCol>
      </CRow>

      <CRow className="g-3">
        <CCol lg={4}>
          <CCard className="h-100">
            <CCardBody>
              <h2 className="h6">Saldo por conta</h2>
              {resumo.contas.length === 0 && (
                <p className="small text-body-secondary mb-0">
                  Nenhuma conta cadastrada. <Link to="/admin/financeiro/cadastros">Cadastre o caixa e as contas</Link>.
                </p>
              )}
              {resumo.contas
                .filter((conta) => conta.ativo)
                .map((conta) => (
                  <div key={conta.id} className="d-flex justify-content-between border-bottom py-2 small">
                    <span>{conta.nome}</span>
                    <span className={classeValor(conta.saldo)}>{formatarMoeda(conta.saldo)}</span>
                  </div>
                ))}
              {resumo.lancamentosPagosSemConta > 0 && (
                <p className="small text-warning-emphasis mt-2 mb-0">
                  {resumo.lancamentosPagosSemConta} pagamento(s) sem conta definida não entram nos saldos — marque, em Contas e categorias,
                  qual conta recebe cada forma de pagamento.
                </p>
              )}
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={8}>
          <CCard className="h-100">
            <CCardBody>
              <h2 className="h6">Fluxo de caixa por mês</h2>
              <div className="table-responsive">
                <table className="table table-sm small mb-0 align-middle">
                  <thead>
                    <tr>
                      <th>Mês</th>
                      <th className="text-end">Entradas</th>
                      <th className="text-end">Saídas</th>
                      <th className="text-end">Resultado</th>
                      <th className="text-end text-body-secondary">A receber</th>
                      <th className="text-end text-body-secondary">A pagar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumo.meses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-body-secondary">
                          Sem movimento no período.
                        </td>
                      </tr>
                    )}
                    {resumo.meses.map((mes) => (
                      <tr key={mes.mes}>
                        <td>{formatarMes(mes.mes)}</td>
                        <td className="text-end text-success">{formatarMoeda(mes.entradas)}</td>
                        <td className="text-end text-danger">{formatarMoeda(mes.saidas)}</td>
                        <td className={`text-end fw-semibold ${classeValor(mes.resultado)}`}>{formatarMoeda(mes.resultado)}</td>
                        <td className="text-end text-body-secondary">{mes.aReceber ? formatarMoeda(mes.aReceber) : '-'}</td>
                        <td className="text-end text-body-secondary">{mes.aPagar ? formatarMoeda(mes.aPagar) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <small className="text-body-secondary">
                Entradas e saídas = o que foi pago de fato (pela data do pagamento). A receber / a pagar = em aberto com vencimento no mês.
              </small>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol lg={12}>
          <CCard>
            <CCardBody>
              <h2 className="h6">Por categoria no período</h2>
              {resumo.porCategoria.length === 0 && <p className="small text-body-secondary mb-0">Sem movimento no período.</p>}
              {resumo.porCategoria.map((linha) => (
                <div key={`${linha.tipo}-${linha.categoria}`} className="d-flex align-items-center gap-2 small mb-1">
                  <span style={{ width: 240 }} className="text-truncate">
                    {linha.categoria}
                  </span>
                  <span className="flex-grow-1" style={{ background: 'var(--cui-tertiary-bg)', borderRadius: 3 }}>
                    <span
                      style={{
                        display: 'block',
                        height: 10,
                        borderRadius: 3,
                        width: `${(linha.total / maiorCategoria) * 100}%`,
                        background: linha.tipo === 'receita' ? 'var(--cui-success)' : 'var(--cui-danger)',
                      }}
                    />
                  </span>
                  <span style={{ width: 110 }} className={`text-end ${linha.tipo === 'receita' ? 'text-success' : 'text-danger'}`}>
                    {linha.tipo === 'receita' ? '' : '−'}
                    {formatarMoeda(linha.total)}
                  </span>
                </div>
              ))}
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </div>
  );
}
