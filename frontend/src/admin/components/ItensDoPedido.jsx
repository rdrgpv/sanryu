import { formatarMoeda } from '../../utils/formato.js';

export function descricaoDoItem(item) {
  const variacao = item.produtoVariacao;
  return [variacao?.produto?.descricao, variacao?.cor?.descricao, variacao?.tamanho?.descricao].filter(Boolean).join(' — ') || 'Item';
}

function textoPersonalizacao(personalizacao) {
  return [
    personalizacao.tipoPersonalizacao?.descricao,
    personalizacao.textoPersonalizado && `"${personalizacao.textoPersonalizado}"`,
    personalizacao.corPersonalizacao,
    personalizacao.posicao,
  ]
    .filter(Boolean)
    .join(' · ');
}

// Tabela compacta dos itens de um pedido, pra abrir dentro das listas (venda, compra, pagamento
// agrupado). Na compra mostra também quanto já foi recebido; na venda, as personalizações.
export default function ItensDoPedido({ itens = [], tipo = 'venda', mostrarRecebido = tipo === 'compra', mostrarCodigo = true }) {
  if (!itens.length) return <div className="small text-body-secondary">Nenhum item.</div>;

  const compra = mostrarRecebido;
  const quantidadeTotal = itens.reduce((soma, item) => soma + Number(item.quantidade || 0), 0);
  const valorTotal = itens.reduce((soma, item) => soma + Number(item.valorTotal || 0), 0);

  return (
    <table className="table table-sm itens-pedido bg-transparent">
      <thead>
        <tr>
          {mostrarCodigo && <th>Código</th>}
          <th>Item</th>
          <th className="text-end">Qtd.</th>
          {compra && <th className="text-end">Recebido</th>}
          <th className="text-end">Valor unit.</th>
          <th className="text-end">Total</th>
        </tr>
      </thead>
      <tbody>
        {itens.map((item) => {
          const recebido = Number(item.quantidadeRecebida || 0);
          return (
            <tr key={item.id}>
              {mostrarCodigo && <td className="text-nowrap">{item.produtoVariacao?.codigo || '-'}</td>}
              <td>
                {descricaoDoItem(item)}
                {(item.personalizacoes || []).map((personalizacao) => (
                  <div key={personalizacao.id} className="itens-pedido__extra">
                    Personalização: {textoPersonalizacao(personalizacao)}
                  </div>
                ))}
                {item.observacao && <div className="itens-pedido__extra">Obs.: {item.observacao}</div>}
              </td>
              <td className="text-end">{item.quantidade}</td>
              {compra && (
                <td className={`text-end ${recebido >= item.quantidade ? 'text-success' : recebido > 0 ? 'text-warning' : ''}`}>
                  {recebido}/{item.quantidade}
                </td>
              )}
              <td className="text-end text-nowrap">{formatarMoeda(item.valorUnitario)}</td>
              <td className="text-end text-nowrap">{formatarMoeda(item.valorTotal)}</td>
            </tr>
          );
        })}
      </tbody>
      {itens.length > 1 && (
        <tfoot>
          <tr>
            <th colSpan={mostrarCodigo ? 2 : 1}>Total</th>
            <th className="text-end">{quantidadeTotal}</th>
            {compra && <th />}
            <th />
            <th className="text-end text-nowrap">{formatarMoeda(valorTotal)}</th>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// Resumo de uma linha: "4× Kimono — Branco — A2 · 6× Faixa — Amarela — M3".
export function resumoDosItens(itens = []) {
  return itens.map((item) => `${item.quantidade}× ${descricaoDoItem(item)}`).join(' · ');
}
