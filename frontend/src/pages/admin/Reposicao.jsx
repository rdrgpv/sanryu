import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CCard, CCardBody, CFormInput, CFormSelect } from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';

// Itens no estoque mínimo ou abaixo (disponível = estoque − reservado), já descontando o que está a
// caminho em compras abertas. A sugestão completa até o "repor até"; dá pra ajustar e gerar o
// pedido de compra pro fornecedor de uma vez.
export default function Reposicao() {
  const navigate = useNavigate();
  const [linhas, setLinhas] = useState(null);
  const [quantidades, setQuantidades] = useState({});
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorId, setFornecedorId] = useState('');
  const [erro, setErro] = useState(null);
  const [gerando, setGerando] = useState(false);

  useEffect(() => {
    api.get('/admin/estoque/reposicao').then((res) => {
      setLinhas(res.data);
      setQuantidades(Object.fromEntries(res.data.map((linha) => [linha.id, String(linha.sugestao)])));
    });
    api.get('/admin/fornecedores').then((res) => setFornecedores(res.data.filter((fornecedor) => fornecedor.ativo !== false)));
  }, []);

  const itens = (linhas || []).map((linha) => ({ ...linha, quantidade: Number(quantidades[linha.id]) || 0 })).filter((linha) => linha.quantidade > 0);
  const total = itens.reduce((soma, linha) => soma + linha.quantidade * linha.valorCusto, 0);

  async function gerar() {
    setErro(null);
    setGerando(true);
    try {
      const res = await api.post('/admin/estoque/reposicao/pedido-compra', { fornecedorId, itens: itens.map((linha) => ({ produtoVariacaoId: linha.id, quantidade: linha.quantidade })) });
      navigate(`/admin/pedidos-compra/${res.data.id}`);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível gerar o pedido de compra.');
    } finally {
      setGerando(false);
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Reposição de estoque</h1>
      <p className="text-body-secondary small mb-3">
        Itens no mínimo ou abaixo. Defina o mínimo e o “repor até” de cada variação em Variações (SKUs).
      </p>

      {linhas === null && <p>Carregando...</p>}
      {linhas?.length === 0 && <div className="alert alert-success">Nada para repor — tudo acima do mínimo.</div>}

      {linhas?.length > 0 && (
        <CCard>
          <CCardBody>
            <div className="table-responsive">
              <table className="table table-sm align-middle small mb-3">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th className="text-center">Estoque</th>
                    <th className="text-center">Reservado</th>
                    <th className="text-center">Disponível</th>
                    <th className="text-center">A caminho</th>
                    <th className="text-center">Mínimo / repor até</th>
                    <th style={{ width: 110 }}>Comprar</th>
                    <th className="text-end">Custo</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((linha) => (
                    <tr key={linha.id}>
                      <td>
                        {linha.descricao}
                        <small className="text-body-secondary d-block">{linha.codigo}</small>
                      </td>
                      <td className="text-center">{linha.estoque}</td>
                      <td className="text-center">{linha.reservado || '-'}</td>
                      <td className={`text-center fw-semibold ${linha.disponivel <= 0 ? 'text-danger' : 'text-warning-emphasis'}`}>{linha.disponivel}</td>
                      <td className="text-center">{linha.aCaminho || '-'}</td>
                      <td className="text-center">
                        {linha.minimo} / {linha.ideal}
                      </td>
                      <td>
                        <CFormInput size="sm" type="number" min="0" value={quantidades[linha.id] ?? ''} onChange={(event) => setQuantidades((prev) => ({ ...prev, [linha.id]: event.target.value }))} />
                      </td>
                      <td className="text-end">{formatarMoeda((Number(quantidades[linha.id]) || 0) * linha.valorCusto)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="d-flex flex-wrap gap-2 align-items-center">
              <CFormSelect style={{ maxWidth: 280 }} value={fornecedorId} onChange={(event) => setFornecedorId(event.target.value)}>
                <option value="">Fornecedor...</option>
                {fornecedores.map((fornecedor) => (
                  <option key={fornecedor.id} value={fornecedor.id}>
                    {fornecedor.nome}
                  </option>
                ))}
              </CFormSelect>
              <CButton color="primary" onClick={gerar} disabled={!fornecedorId || !itens.length || gerando}>
                {gerando ? 'Gerando...' : `Gerar pedido de compra (${itens.length} item(s) · ${formatarMoeda(total)})`}
              </CButton>
            </div>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CCardBody>
        </CCard>
      )}
    </div>
  );
}
