import { Link } from 'react-router-dom';

const pilares = [
  {
    titulo: 'Katas',
    texto: 'Sistema de katas do Método Morganti para fixar técnica e princípios de forma progressiva.',
  },
  {
    titulo: 'Graduação por faixas',
    texto: 'Evolução reconhecida através de exames, do branco ao preto, com grau e ordem definidos.',
  },
  {
    titulo: 'Autodefesa aplicada',
    texto: 'Treino voltado para situações reais, unindo tradição marcial e efetividade.',
  },
];

const diferenciais = [
  'Instrutores formados no Método Morganti Ju-Jitsu',
  'Turmas para crianças, adultos e competidores',
  'Estrutura completa com tatames e equipamentos próprios',
  'Ambiente familiar com foco em respeito e disciplina',
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <div>
            <p className="hero__kicker">San·Ryu Dojo — Método Morganti Ju-Jitsu</p>
            <h1 className="hero__title">O caminho da força começa com um passo no tatame.</h1>
            <p className="hero__subtitle">
              Tradição marcial japonesa com a metodologia Morganti Ju-Jitsu. Venha fazer uma aula
              experimental gratuita e descubra o seu caminho.
            </p>
            <p className="hero__slogan">"Quem teme perder já está vencido."</p>
            <div className="hero__actions">
              <Link to="/contato" className="btn btn--primary">
                Agendar aula experimental
              </Link>
              <Link to="/aulas" className="btn btn--outline">
                Ver turmas
              </Link>
            </div>
          </div>
          <div className="hero__badge">
            <img src="/logos/sanryu-dragao.png" alt="San·Ryu Dojo" />
          </div>
        </div>
      </section>

      <div className="belt-stripe" />

      <section className="section">
        <div className="container">
          <h2 className="section__title">O Método</h2>
          <div className="grid grid--3">
            {pilares.map((item) => (
              <div key={item.titulo} className="tile">
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="container">
          <h2 className="section__title">Por que treinar no San·Ryu</h2>
          <ul className="checklist">
            {diferenciais.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
