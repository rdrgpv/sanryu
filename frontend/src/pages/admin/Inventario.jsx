import { useEffect, useState } from 'react';
import { CButton, CCard, CCardBody, CFormInput, CFormSelect } from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda, formatarDataHora } from '../../utils/formato.js';

// Contagem física: digite o que tem na prateleira; o que não for digitado não muda. Ao aplicar, a
// diferença vira movimentação de estoque (com o motivo) e fica no histórico.
export default function Inventario() {
  const [produtos, setProdutos] = useState([]);
  const [produtoId, setProdutoId] = useState('');
  const [linhas, setLinhas] = useState([]);
  const [contado, setContado] = useState({});
  const [motivo, setMotivo] = useState('');
  const [historico, setHistorico] = useState([]);
  const [mensagem, setMensagem] = useState(null);
  const [aplicando, setAplicando] = useState(false);

  async function carregar() {
    const res = await api.get('/admin/estoque/inventario', { params: produtoId ? { produtoId } : {} });
    setLinhas(res.data);
    setContado({});
    setHistorico((await api.get('/admin/estoque/inventarios')).data);
  }

  useEffect(() => {
    api.get('/admin/produtos', { params: { ativo: true } }).then((res) => setProdutos(res.data.filter((produto) => produto.controlaEstoque)));
  }, []);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produtoId]);

  const digitados = linhas.filter((linha) => contado[linha.id] !== undefined && contado[linha.id] !== '');
  const comDiferenca = digitados.filter((linha) => Number(contado[linha.id]) !== linha.estoque);
  const valorDiferenca = comDiferenca.reduce((total, linha) => total + (Number(contado[linha.id]) - linha.estoque) * linha.valorCusto, 0);

  async function aplicar() {
    if (!window.confirm(`Aplicar a contagem? ${comDiferenca.length} item(s) terão o estoque ajustado.`)) return;
    setMensagem(null);
    setAplicando(true);
    try {
      const res = await api.post('/admin/estoque/inventario', { motivo, itens: digitados.map((linha) => ({ produtoVariacaoId: linha.id, contado: Number(contado[linha.id]) })) });
      setMensagem({ cor: 'success', texto: `Inventário #${res.data.id} aplicado: ${res.data.itensAjustados} ajuste(s), diferença de ${formatarMoeda(res.data.valorDiferenca)} no custo.` });
      setMotivo('');
      carregar();
    } catch (err) {
      setMensagem({ cor: 'danger', texto: err.response?.data?.error || 'Não foi possível aplicar.' });
    } finally {
      setAplicando(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Inventário</h1>
      <p className="text-body-secondary small mb-3">Conte o que está na prateleira e digite. Itens em branco não mudam — dá para contar por partes.</p>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CFormSelect style={{ maxWidth: 280 }} value={produtoId} onChange={(event) => setProdutoId(event.target.value)}>
          <option value="">Todos os produtos</option>
          {produtos.map((produto) => (
            <option key={produto.id} value={produto.id}>
              {produto.descricao}
            </option>
          ))}
        </CFormSelect>
        <CButton color="secondary" variant="outline" onClick={() => window.print()}>
          Imprimir lista para contagem
        </CButton>
      </div>

      <CCard className="mb-3">
        <CCardBody>
          <div className="table-responsive">
            <table className="table table-sm align-middle small mb-0">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th className="text-center">Registrado</th>
                  <th style={{ width: 120 }}>Contado</th>
                  <th className="text-center">Diferença</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((linha) => {
                  const digitado = contado[linha.id] !== undefined && contado[linha.id] !== '';
                  const diferenca = digitado ? Number(contado[linha.id]) - linha.estoque : null;
                  return (
                    <tr key={linha.id}>
                      <td>
                        {linha.descricao}
                        <small className="text-body-secondary d-block">{linha.codigo}</small>
                      </td>
                      <td className="text-center">{linha.estoque}</td>
                      <td>
                        <CFormInput size="sm" type="number" min="0" value={contado[linha.id] ?? ''} onChange={(event) => setContado((prev) => ({ ...prev, [linha.id]: event.target.value }))} />
                      </td>
                      <td className={`text-center fw-semibold ${diferenca > 0 ? 'text-success' : diferenca < 0 ? 'text-danger' : ''}`}>
                        {diferenca === null ? '' : diferenca > 0 ? `+${diferenca}` : diferenca}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CCardBody>
      </CCard>

      <div className="d-flex flex-wrap gap-2 align-items-center mb-3 d-print-none">
        <CFormInput style={{ maxWidth: 360 }} placeholder="Motivo (ex.: contagem de fim de ano, avaria)" value={motivo} onChange={(event) => setMotivo(event.target.value)} />
        <CButton color="primary" onClick={aplicar} disabled={!digitados.length || aplicando}>
          {aplicando ? 'Aplicando...' : `Aplicar contagem (${comDiferenca.length} ajuste(s) · ${formatarMoeda(valorDiferenca)})`}
        </CButton>
      </div>
      {mensagem && <div className={`alert alert-${mensagem.cor} py-2 d-print-none`}>{mensagem.texto}</div>}

      {historico.length > 0 && (
        <CCard className="d-print-none">
          <CCardBody>
            <h2 className="h6">Inventários anteriores</h2>
            {historico.map((item) => (
              <div key={item.id} className="d-flex justify-content-between small border-bottom py-1">
                <span>
                  #{item.id} · {formatarDataHora(item.createdAt)} {item.motivo && `· ${item.motivo}`}
                </span>
                <span>
                  {item.itensContados} contado(s), {item.itensAjustados} ajuste(s) ·{' '}
                  <span className={Number(item.valorDiferenca) < 0 ? 'text-danger' : ''}>{formatarMoeda(item.valorDiferenca)}</span>
                </span>
              </div>
            ))}
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}
