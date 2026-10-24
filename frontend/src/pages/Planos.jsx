import { Link } from 'react-router-dom';
import { useSite, usePagina } from '../utils/site.js';

const PERIODOS = { mensal: 'por mês', trimestral: 'por trimestre', semestral: 'por semestre', anual: 'por ano' };

function reais(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Planos ativos marcados "mostrar no site" no admin, do mais barato pro mais caro.
export default function Planos() {
  const site = useSite();
  usePagina('Planos e valores', 'Planos e mensalidades do San·Ryu Dojo, com desconto para irmãos e aula experimental gratuita.');

  const planos = site?.planos || [];
  const desconto = site?.descontoFamiliaPercentual || 0;

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Planos</p>
          <h1>Planos e valores</h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {site === null && <p>Carregando planos...</p>}
          {site && planos.length === 0 && (
            <p>Os valores ainda vão ser divulgados. Fale com a gente pelo contato ou agende uma aula experimental.</p>
          )}

          {planos.length > 0 && (
            <div className="grid grid--3">
              {planos.map((plano) => (
                <div key={plano.id} className="tile plano">
                  <h3>{plano.nome}</h3>
                  <p className="plano__valor">
                    {reais(plano.valor)} <span>{PERIODOS[plano.periodicidade] || ''}</span>
                  </p>
                  {plano.periodicidade !== 'mensal' && <p className="tile__meta">Equivale a {reais(plano.valorMensal)} por mês</p>}
                  {plano.descricao && <p>{plano.descricao}</p>}
                </div>
              ))}
            </div>
          )}

          {desconto > 0 && (
            <p className="plano__aviso">
              <strong>Desconto família:</strong> {String(desconto).replace('.', ',')}% de desconto a partir do segundo aluno do mesmo responsável.
            </p>
          )}

          <div className="chamada-final">
            <p>Antes de escolher, venha conhecer o dojo: a primeira aula é gratuita.</p>
            <Link to="/aula-experimental" className="btn btn--primary">
              Agendar aula experimental
            </Link>
            <Link to="/duvidas" className="btn btn--ghost">
              Ver dúvidas frequentes
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
