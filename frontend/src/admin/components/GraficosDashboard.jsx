import { useEffect, useRef, useState } from 'react';

// Gráficos do dashboard em SVG puro (sem biblioteca). Seguem o mesmo padrão visual: barras finas
// com ponta arredondada saindo de uma linha de base, linha de 2px, grade fina e discreta, legenda
// quando há 2+ séries, tooltip ao passar o mouse/tocar, e texto sempre na cor de texto (nunca na
// cor da série). Cores em admin.css (--viz-*).

const ALTURA = 220;
const MARGEM = { topo: 16, direita: 12, base: 28, esquerda: 56 };
const AREA_Y = ALTURA - MARGEM.topo - MARGEM.base;

// O SVG é desenhado na largura real do card (e redesenhado se ela mudar). Com viewBox fixo o
// gráfico inteiro escalava junto — inclusive o texto, que ficava enorme no card largo e minúsculo
// no estreito.
function useLargura() {
  const ref = useRef(null);
  const [largura, setLargura] = useState(640);

  useEffect(() => {
    const elemento = ref.current;
    if (!elemento) return undefined;
    const observador = new ResizeObserver(([entrada]) => setLargura(Math.max(280, Math.round(entrada.contentRect.width))));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  return [ref, largura];
}
const LARGURA_MAX_BARRA = 18;
const RAIO_PONTA = 4;

const NOMES_MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function rotuloMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return mes === 1 ? `${NOMES_MESES[0]}/${String(ano).slice(2)}` : NOMES_MESES[mes - 1];
}

// Escala "redonda" pro eixo: 0, 250, 500... (ou 1, 2, 5 × 10^n), com folga acima do maior valor.
function escalaRedonda(maximo, divisoes = 4) {
  if (maximo <= 0) return { topo: divisoes, passo: 1 };
  const bruto = maximo / divisoes;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const passo = [1, 2, 2.5, 5, 10].map((fator) => fator * potencia).find((candidato) => candidato >= bruto);
  return { topo: passo * divisoes, passo };
}

function compacto(valor) {
  const absoluto = Math.abs(valor);
  if (absoluto >= 1000) return `${(valor / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`;
  return valor.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

// Retângulo com só as duas pontas do lado do dado arredondadas (base reta na linha de zero).
function caminhoBarra(x, yBase, largura, altura) {
  if (Math.abs(altura) < 0.5) return '';
  const raio = Math.min(RAIO_PONTA, Math.abs(altura), largura / 2);
  if (altura > 0) {
    const topo = yBase - altura;
    return `M${x},${yBase} V${topo + raio} Q${x},${topo} ${x + raio},${topo} H${x + largura - raio} Q${x + largura},${topo} ${x + largura},${topo + raio} V${yBase} Z`;
  }
  const fundo = yBase - altura;
  return `M${x},${yBase} V${fundo - raio} Q${x},${fundo} ${x + raio},${fundo} H${x + largura - raio} Q${x + largura},${fundo} ${x + largura},${fundo - raio} V${yBase} Z`;
}

function Legenda({ series }) {
  return (
    <div className="viz-legenda">
      {series.map((serie) => (
        <span key={serie.chave}>
          <span className="viz-legenda__marca" style={{ background: serie.cor }} />
          {serie.nome}
        </span>
      ))}
    </div>
  );
}

function Tooltip({ ponto, largura, children }) {
  if (!ponto) return null;
  const aDireita = ponto.x < largura * 0.6;
  return (
    <div
      className="viz-tooltip"
      style={{
        left: ponto.x,
        top: ponto.y,
        transform: aDireita ? 'translate(12px, -50%)' : 'translate(calc(-100% - 12px), -50%)',
      }}
    >
      {children}
    </div>
  );
}

// Colunas por mês. Com várias séries ficam lado a lado (2px de folga entre elas). Séries com
// "negativo" descem a partir do zero; com "opostas", as séries dividem a mesma coluna (uma sobe, a
// outra desce — usado em "matrículas × saídas").
export function GraficoColunas({ dados, series, formatarValor = compacto, rotuloTooltip, opostas = false }) {
  const [ativo, setAtivo] = useState(null);
  const [ref, LARGURA] = useLargura();
  const AREA_X = LARGURA - MARGEM.esquerda - MARGEM.direita;

  const valores = dados.flatMap((linha) => series.map((serie) => linha[serie.chave] * (serie.negativo ? -1 : 1)));
  const maximo = Math.max(0, ...valores);
  const minimo = Math.min(0, ...valores);
  const temNegativo = minimo < 0;
  const escala = escalaRedonda(Math.max(maximo, -minimo), temNegativo ? 2 : 4);
  const topo = maximo > 0 || !temNegativo ? escala.topo : 0;
  const fundo = temNegativo ? -escala.topo : 0;
  const y = (valor) => MARGEM.topo + ((topo - valor) / (topo - fundo)) * AREA_Y;
  const ticks = [];
  for (let valor = fundo; valor <= topo + 1e-9; valor += escala.passo) ticks.push(valor);

  const larguraBanda = AREA_X / dados.length;
  const porColuna = opostas ? 1 : series.length;
  const larguraBarra = Math.min(LARGURA_MAX_BARRA, (larguraBanda * 0.7 - (porColuna - 1) * 2) / porColuna);
  const larguraGrupo = larguraBarra * porColuna + (porColuna - 1) * 2;

  return (
    <div className="viz">
      {series.length > 1 && <Legenda series={series} />}
      <div className="viz__area" ref={ref}>
        <svg width={LARGURA} height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" onMouseLeave={() => setAtivo(null)}>
          {ticks.map((valor) => (
            <g key={valor}>
              <line x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(valor)} y2={y(valor)} className={valor === 0 ? 'viz-base' : 'viz-grade'} />
              <text x={MARGEM.esquerda - 6} y={y(valor)} dy="0.32em" textAnchor="end" className="viz-eixo">
                {formatarValor(valor)}
              </text>
            </g>
          ))}

          {dados.map((linha, indice) => {
            const xBanda = MARGEM.esquerda + indice * larguraBanda;
            const xGrupo = xBanda + (larguraBanda - larguraGrupo) / 2;
            return (
              <g key={linha.mes}>
                {ativo === indice && <rect x={xBanda} y={MARGEM.topo} width={larguraBanda} height={AREA_Y} className="viz-destaque" />}
                {series.map((serie, indiceSerie) => {
                  const valor = linha[serie.chave] * (serie.negativo ? -1 : 1);
                  return (
                    <path
                      key={serie.chave}
                      d={caminhoBarra(xGrupo + (opostas ? 0 : indiceSerie * (larguraBarra + 2)), y(0), larguraBarra, y(0) - y(valor))}
                      fill={serie.cor}
                    />
                  );
                })}
                <text x={xBanda + larguraBanda / 2} y={ALTURA - 8} textAnchor="middle" className="viz-eixo">
                  {rotuloMes(linha.mes)}
                </text>
                {/* Alvo de hover maior que a barra: a faixa inteira do mês. */}
                <rect
                  x={xBanda}
                  y={MARGEM.topo}
                  width={larguraBanda}
                  height={AREA_Y}
                  fill="transparent"
                  onMouseEnter={() => setAtivo(indice)}
                  onClick={() => setAtivo(indice)}
                />
              </g>
            );
          })}
        </svg>
        <Tooltip largura={LARGURA} ponto={ativo !== null ? { x: MARGEM.esquerda + (ativo + 0.5) * larguraBanda, y: ALTURA / 2 } : null}>
          {ativo !== null && (
            <>
              <strong>{rotuloMes(dados[ativo].mes)}</strong>
              {series.map((serie) => (
                <div key={serie.chave} className="viz-tooltip__linha">
                  <span className="viz-legenda__marca" style={{ background: serie.cor }} />
                  {serie.nome}: {serie.formatar ? serie.formatar(dados[ativo][serie.chave]) : dados[ativo][serie.chave]}
                </div>
              ))}
              {rotuloTooltip && <div className="viz-tooltip__extra">{rotuloTooltip(dados[ativo])}</div>}
            </>
          )}
        </Tooltip>
      </div>
    </div>
  );
}

// Linha única por mês, com área bem clara embaixo, ponto e valor no fim, e cruz de leitura no hover.
export function GraficoLinha({ dados, chave, cor, formatarValor = compacto }) {
  const [ativo, setAtivo] = useState(null);
  const [ref, LARGURA] = useLargura();
  const AREA_X = LARGURA - MARGEM.esquerda - MARGEM.direita;

  const maximo = Math.max(1, ...dados.map((linha) => linha[chave]));
  const escala = escalaRedonda(maximo, 4);
  const y = (valor) => MARGEM.topo + ((escala.topo - valor) / escala.topo) * AREA_Y;
  const passoX = AREA_X / Math.max(1, dados.length - 1);
  const x = (indice) => MARGEM.esquerda + indice * passoX;
  const pontos = dados.map((linha, indice) => `${x(indice)},${y(linha[chave])}`).join(' ');
  const ticks = [];
  for (let valor = 0; valor <= escala.topo + 1e-9; valor += escala.passo) ticks.push(valor);
  const ultimo = dados.length - 1;

  return (
    <div className="viz">
      <div className="viz__area" ref={ref}>
        <svg width={LARGURA} height={ALTURA} viewBox={`0 0 ${LARGURA} ${ALTURA}`} role="img" onMouseLeave={() => setAtivo(null)}>
          {ticks.map((valor) => (
            <g key={valor}>
              <line x1={MARGEM.esquerda} x2={LARGURA - MARGEM.direita} y1={y(valor)} y2={y(valor)} className={valor === 0 ? 'viz-base' : 'viz-grade'} />
              <text x={MARGEM.esquerda - 6} y={y(valor)} dy="0.32em" textAnchor="end" className="viz-eixo">
                {formatarValor(valor)}
              </text>
            </g>
          ))}
          <polygon points={`${x(0)},${y(0)} ${pontos} ${x(ultimo)},${y(0)}`} fill={cor} opacity="0.1" />
          <polyline points={pontos} fill="none" stroke={cor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {dados.map((linha, indice) => (
            <text key={linha.mes} x={x(indice)} y={ALTURA - 8} textAnchor="middle" className="viz-eixo">
              {rotuloMes(linha.mes)}
            </text>
          ))}
          <circle cx={x(ultimo)} cy={y(dados[ultimo][chave])} r="4.5" fill={cor} className="viz-anel" />
          <text x={x(ultimo) - 8} y={y(dados[ultimo][chave]) - 10} textAnchor="end" className="viz-rotulo">
            {formatarValor(dados[ultimo][chave])}
          </text>
          {ativo !== null && (
            <>
              <line x1={x(ativo)} x2={x(ativo)} y1={MARGEM.topo} y2={y(0)} className="viz-cruz" />
              <circle cx={x(ativo)} cy={y(dados[ativo][chave])} r="4.5" fill={cor} className="viz-anel" />
            </>
          )}
          {dados.map((linha, indice) => (
            <rect
              key={linha.mes}
              x={x(indice) - passoX / 2}
              y={MARGEM.topo}
              width={passoX}
              height={AREA_Y}
              fill="transparent"
              onMouseEnter={() => setAtivo(indice)}
              onClick={() => setAtivo(indice)}
            />
          ))}
        </svg>
        <Tooltip largura={LARGURA} ponto={ativo !== null ? { x: x(ativo), y: y(dados[ativo][chave]) } : null}>
          {ativo !== null && (
            <>
              <strong>{rotuloMes(dados[ativo].mes)}</strong>
              <div>{formatarValor(dados[ativo][chave])}</div>
            </>
          )}
        </Tooltip>
      </div>
    </div>
  );
}

// Visão em tabela dos mesmos dados (acessibilidade / leitura exata), abre sob demanda.
export function TabelaDados({ dados, colunas }) {
  return (
    <details className="viz-tabela">
      <summary>Ver em tabela</summary>
      <div className="table-responsive">
        <table className="table table-sm small mb-0">
          <thead>
            <tr>
              <th>Mês</th>
              {colunas.map((coluna) => (
                <th key={coluna.chave} className="text-end">
                  {coluna.nome}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dados.map((linha) => (
              <tr key={linha.mes}>
                <td>{rotuloMes(linha.mes)}</td>
                {colunas.map((coluna) => (
                  <td key={coluna.chave} className="text-end">
                    {coluna.formatar ? coluna.formatar(linha[coluna.chave]) : linha[coluna.chave]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
