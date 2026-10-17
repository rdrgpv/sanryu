import { useEffect, useRef, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CButton, CCard, CCardBody, CFormInput, CFormLabel } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilLink, cilPen, cilPencil, cilBan } from '@coreui/icons';
import api from '../../services/api';
import AssinaturaCanvas from '../../components/AssinaturaCanvas.jsx';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';
import { labelPeriodicidade, SITUACOES_CONTRATO } from '../../utils/planos.js';

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

export default function ContratoDetalhe() {
  const { id } = useParams();
  const assinaturaRef = useRef(null);
  const [contrato, setContrato] = useState(null);
  const [mensalidades, setMensalidades] = useState([]);
  const [assinando, setAssinando] = useState(false);
  const [nomeAssinante, setNomeAssinante] = useState('');
  const [assinou, setAssinou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [erro, setErro] = useState(null);

  async function carregar() {
    const res = await api.get(`/admin/contratos/${id}`);
    setContrato(res.data);
    const cobrancas = await api.get('/admin/mensalidades', { params: { contratoId: id } });
    setMensalidades(cobrancas.data);
    setNomeAssinante(res.data.contratante?.nome || '');
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (!contrato) return <p>Carregando...</p>;

  const linkAssinatura = `${window.location.origin}/contratos/${contrato.tokenAssinatura}`;
  const pendente = !contrato.assinadoEm && contrato.situacao === 'ativo';

  async function handleCopiarLink() {
    try {
      await navigator.clipboard.writeText(linkAssinatura);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (err) {
      window.prompt('Copie o link:', linkAssinatura);
    }
  }

  async function handleAssinar() {
    setErro(null);
    if (!assinou || assinaturaRef.current.estaVazio()) {
      setErro('Peça para assinar no quadro.');
      return;
    }

    setSalvando(true);
    try {
      await api.post(`/admin/contratos/${id}/assinar`, { nomeAssinante, assinatura: assinaturaRef.current.paraDataUrl() });
      setAssinando(false);
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível registrar a assinatura.');
    } finally {
      setSalvando(false);
    }
  }

  async function handleEncerrar(situacao) {
    const texto = situacao === 'cancelado' ? 'Cancelar este contrato?' : 'Encerrar este contrato (aluno saiu do plano)?';
    if (!window.confirm(texto)) return;
    const res = await api.post(`/admin/contratos/${id}/encerrar`, { situacao });
    const avisos = [];
    if (res.data.mensalidadesCanceladas > 0) avisos.push(`${res.data.mensalidadesCanceladas} mensalidade(s) futura(s) em aberto foram canceladas.`);
    if (res.data.irmaosComDescontoSemIrmao?.length > 0) {
      avisos.push(
        `Atenção: ${res.data.irmaosComDescontoSemIrmao.join(', ')} continua com desconto família, mas agora é o único da família com contrato ativo. Se quiser tirar o desconto, encerre e refaça o contrato.`
      );
    }
    if (avisos.length > 0) window.alert(avisos.join('\n\n'));
    carregar();
  }

  return (
    <div>
      <div className="d-print-none">
        <Link to="/admin/contratos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
          &larr; Voltar
        </Link>
        <div className="d-flex justify-content-between align-items-center mb-3 gap-2 flex-wrap">
          <h1 className="h3 mb-0">
            Contrato — {contrato.aluno.nome}{' '}
            <span className={`badge fs-6 align-middle ${SITUACOES_CONTRATO[contrato.situacao]?.classe}`}>
              {SITUACOES_CONTRATO[contrato.situacao]?.label}
            </span>
          </h1>
          <div className="d-flex gap-2 flex-wrap">
            {pendente && (
              <>
                <CButton color="secondary" variant="outline" as={Link} to={`/admin/contratos/${id}/editar`} title="Editar">
                  <CIcon icon={cilPencil} />
                </CButton>
                <CButton color="secondary" variant="outline" onClick={handleCopiarLink}>
                  <CIcon icon={cilLink} className="me-1" />
                  {linkCopiado ? 'Link copiado!' : 'Copiar link de assinatura'}
                </CButton>
                <CButton color="primary" onClick={() => setAssinando(true)} disabled={assinando}>
                  <CIcon icon={cilPen} className="me-1" />
                  Assinar aqui
                </CButton>
              </>
            )}
            <CButton color="secondary" variant="outline" onClick={() => window.print()} title="Imprimir">
              <CIcon icon={cilPrint} />
            </CButton>
            {contrato.situacao === 'ativo' && (
              <CButton color="danger" variant="outline" onClick={() => handleEncerrar('encerrado')} title="Encerrar contrato">
                <CIcon icon={cilBan} className="me-1" />
                Encerrar
              </CButton>
            )}
          </div>
        </div>

        <CCard className="mb-3">
          <CCardBody>
            <div className="row g-2 small">
              <div className="col-md-4">
                <strong>Plano:</strong> {contrato.plano.nome} ({labelPeriodicidade(contrato.plano.periodicidade)})
              </div>
              <div className="col-md-4">
                <strong>Valor:</strong> {formatarMoeda(contrato.valorFinal)}
                {Number(contrato.valorFinal) !== Number(contrato.valorPlano) && (
                  <span className="text-body-secondary"> (plano {formatarMoeda(contrato.valorPlano)})</span>
                )}
              </div>
              <div className="col-md-4">
                <strong>Vencimento:</strong> todo dia {contrato.diaVencimento}
              </div>
              <div className="col-md-4">
                <strong>Início:</strong> {formatarData(contrato.dataInicio)}
                {contrato.dataFim && ` · Fim: ${formatarData(contrato.dataFim)}`}
              </div>
              {Number(contrato.descontoFamiliaPercentual) > 0 && (
                <div className="col-md-4">
                  <strong>Desconto família:</strong> {Number(contrato.descontoFamiliaPercentual)}%
                </div>
              )}
              {Number(contrato.bolsaPercentual) > 0 && (
                <div className="col-md-4">
                  <strong>Bolsa:</strong> {Number(contrato.bolsaPercentual)}% — {contrato.motivoBolsa}
                </div>
              )}
              <div className="col-md-12">
                <strong>Assinatura:</strong>{' '}
                {contrato.assinadoEm ? (
                  <span className="text-success">
                    assinado por {contrato.nomeAssinante} em {formatarDataHora(contrato.assinadoEm)} (
                    {contrato.assinadoVia === 'link' ? 'pelo link' : 'na recepção'})
                  </span>
                ) : (
                  <span className="text-warning-emphasis">pendente — mande o link ou assine aqui</span>
                )}
              </div>
            </div>
          </CCardBody>
        </CCard>

        {assinando && (
          <CCard className="mb-3 border-primary">
            <CCardBody>
              <h2 className="h6">Assinatura na recepção</h2>
              <p className="small text-body-secondary">Peça para a pessoa ler o contrato abaixo antes de assinar.</p>
              <div style={{ maxWidth: 560 }}>
                <CFormLabel>Nome de quem está assinando</CFormLabel>
                <CFormInput className="mb-2" value={nomeAssinante} onChange={(event) => setNomeAssinante(event.target.value)} />
                <AssinaturaCanvas ref={assinaturaRef} onChange={setAssinou} disabled={salvando} />
                <div className="d-flex gap-2 mt-2">
                  <CButton color="primary" onClick={handleAssinar} disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Confirmar assinatura'}
                  </CButton>
                  <CButton color="secondary" variant="outline" onClick={() => assinaturaRef.current.limpar()} disabled={!assinou}>
                    Limpar
                  </CButton>
                  <CButton color="secondary" variant="ghost" onClick={() => setAssinando(false)}>
                    Cancelar
                  </CButton>
                </div>
                {erro && <div className="alert alert-danger mt-2 mb-0">{erro}</div>}
              </div>
            </CCardBody>
          </CCard>
        )}

        {mensalidades.length > 0 && (
          <CCard className="mb-3">
            <CCardBody>
              <h2 className="h6">Cobranças deste contrato</h2>
              <div className="table-responsive">
                <table className="table table-sm mb-0 small">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Vencimento</th>
                      <th className="text-end">Valor</th>
                      <th>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mensalidades.map((mensalidade) => (
                      <tr key={mensalidade.id}>
                        <td>{mensalidade.competencia.split('-').reverse().join('/')}</td>
                        <td>{formatarData(mensalidade.vencimento)}</td>
                        <td className="text-end">
                          {formatarMoeda(mensalidade.status === 'pago' ? mensalidade.valorPago : mensalidade.valorAtualizado ?? mensalidade.valor)}
                        </td>
                        <td>
                          {mensalidade.status === 'pago'
                            ? 'Paga'
                            : mensalidade.status === 'cancelado'
                              ? 'Cancelada'
                              : mensalidade.vencida
                                ? `Vencida (${mensalidade.diasAtraso}d)`
                                : 'A vencer'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CCardBody>
          </CCard>
        )}
      </div>

      <div className="contrato-impresso">
        <div className="contrato-impresso__texto">{contrato.termo}</div>
        {contrato.assinadoEm && (
          <div className="contrato-impresso__assinatura">
            <img src={contrato.assinatura} alt="Assinatura" />
            <div>
              {contrato.nomeAssinante} — assinado em {formatarDataHora(contrato.assinadoEm)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
