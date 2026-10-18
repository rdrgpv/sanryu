import { useEffect, useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { CButton, CCard, CCardBody, CFormInput } from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';

// Folha A4 Pimaco A4256: 3 colunas × 7 linhas de 63,5 × 38,1 mm (medidas em admin.css, .etiquetas-*).
const POR_FOLHA = 21;

function descricao(variacao) {
  return [variacao.cor?.descricao, variacao.tamanho?.descricao].filter(Boolean).join(' · ');
}

// Código de barras (CODE128) do código da variação — o mesmo que o balcão reconhece ao bipar.
function CodigoDeBarras({ valor }) {
  return (
    <svg
      ref={(elemento) => {
        if (elemento) JsBarcode(elemento, valor, { format: 'CODE128', height: 34, width: 1.3, fontSize: 11, margin: 0, displayValue: true });
      }}
    />
  );
}

export default function Etiquetas() {
  const [variacoes, setVariacoes] = useState([]);
  const [busca, setBusca] = useState('');
  const [quantidades, setQuantidades] = useState({});
  const [pular, setPular] = useState('0');

  useEffect(() => {
    api.get('/admin/produto-variacoes').then((res) => setVariacoes(res.data.filter((variacao) => variacao.ativo)));
  }, []);

  const filtradas = variacoes.filter((variacao) => `${variacao.produto?.descricao} ${descricao(variacao)} ${variacao.codigo}`.toLowerCase().includes(busca.toLowerCase()));

  const etiquetas = useMemo(() => {
    const lista = Array.from({ length: Math.max(0, Math.min(POR_FOLHA - 1, Number(pular) || 0)) }, (_, indice) => ({ vazia: true, chave: `vazia-${indice}` }));
    variacoes.forEach((variacao) => {
      const quantidade = Math.max(0, Number(quantidades[variacao.id]) || 0);
      for (let indice = 0; indice < quantidade; indice += 1) lista.push({ variacao, chave: `${variacao.id}-${indice}` });
    });
    return lista;
  }, [variacoes, quantidades, pular]);

  const total = etiquetas.filter((etiqueta) => !etiqueta.vazia).length;
  const folhas = [];
  for (let inicio = 0; inicio < etiquetas.length; inicio += POR_FOLHA) folhas.push(etiquetas.slice(inicio, inicio + POR_FOLHA));

  function preencherComEstoque() {
    setQuantidades(Object.fromEntries(filtradas.map((variacao) => [variacao.id, String(Math.max(0, variacao.quantidadeEstoque))])));
  }

  return (
    <div>
      <div className="d-print-none">
        <h1 className="h3 mb-1">Etiquetas com código de barras</h1>
        <p className="text-body-secondary small mb-3">
          Folha A4 Pimaco A4256 (21 etiquetas de 63,5 × 38,1 mm). Na impressão, use escala 100% (sem “ajustar à página”). Com um leitor de código de barras, o
          balcão adiciona o produto ao bipar.
        </p>

        <CCard className="mb-3">
          <CCardBody>
            <div className="d-flex flex-wrap gap-2 mb-2">
              <CFormInput style={{ maxWidth: 300 }} placeholder="Filtrar produto..." value={busca} onChange={(event) => setBusca(event.target.value)} />
              <CButton color="secondary" variant="outline" onClick={preencherComEstoque}>
                Uma por unidade em estoque
              </CButton>
              <CButton color="secondary" variant="outline" onClick={() => setQuantidades({})}>
                Zerar
              </CButton>
            </div>
            <div className="table-responsive" style={{ maxHeight: 360, overflowY: 'auto' }}>
              <table className="table table-sm align-middle small mb-0">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Código</th>
                    <th className="text-center">Estoque</th>
                    <th style={{ width: 110 }}>Etiquetas</th>
                  </tr>
                </thead>
                <tbody>
                  {filtradas.map((variacao) => (
                    <tr key={variacao.id}>
                      <td>
                        {variacao.produto?.descricao} <span className="text-body-secondary">{descricao(variacao)}</span>
                      </td>
                      <td>
                        <code>{variacao.codigo}</code>
                      </td>
                      <td className="text-center">{variacao.quantidadeEstoque}</td>
                      <td>
                        <CFormInput size="sm" type="number" min="0" value={quantidades[variacao.id] ?? ''} onChange={(event) => setQuantidades((prev) => ({ ...prev, [variacao.id]: event.target.value }))} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="d-flex flex-wrap gap-2 align-items-center mt-3">
              <span className="small">Pular as primeiras</span>
              <CFormInput size="sm" type="number" min="0" max={POR_FOLHA - 1} style={{ width: 80 }} value={pular} onChange={(event) => setPular(event.target.value)} />
              <span className="small text-body-secondary">etiquetas (folha já começada)</span>
              <CButton color="primary" className="ms-auto" onClick={() => window.print()} disabled={!total}>
                Imprimir {total} etiqueta(s) — {folhas.length} folha(s)
              </CButton>
            </div>
          </CCardBody>
        </CCard>
      </div>

      {folhas.map((folha, indiceFolha) => (
        <div key={indiceFolha} className="etiquetas-folha">
          {folha.map((etiqueta) =>
            etiqueta.vazia ? (
              <div key={etiqueta.chave} className="etiquetas-item" />
            ) : (
              <div key={etiqueta.chave} className="etiquetas-item">
                <div className="etiquetas-produto">{etiqueta.variacao.produto?.descricao}</div>
                <div className="etiquetas-detalhe">
                  {descricao(etiqueta.variacao)} <strong>{formatarMoeda(etiqueta.variacao.valorVenda)}</strong>
                </div>
                <CodigoDeBarras valor={etiqueta.variacao.codigo} />
              </div>
            )
          )}
        </div>
      ))}
    </div>
  );
}
