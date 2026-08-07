import { Link } from 'react-router-dom';

const destaques = [
  {
    titulo: 'Jiu-Jitsu',
    texto: 'Técnica e estratégia no solo, para todas as idades e níveis.',
  },
  {
    titulo: 'Judo',
    texto: 'Equilíbrio, quedas e alavancas — a arte suave em sua essência.',
  },
  {
    titulo: 'Karatê',
    texto: 'Disciplina, katas e precisão nos golpes de percussão.',
  },
];

const diferenciais = [
  'Instrutores faixa-preta com décadas de tatame',
  'Turmas para crianças, adultos e competidores',
  'Estrutura completa com tatames e equipamentos próprios',
  'Ambiente familiar com foco em respeito e disciplina',
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero__inner">
          <p className="hero__kicker">道場三流 — Dojo Sanryu</p>
          <h1 className="hero__title">O caminho da força começa com um passo no tatame.</h1>
          <p className="hero__subtitle">
            Tradição das artes marciais japonesas com metodologia moderna. Venha fazer uma aula
            experimental gratuita e descubra o seu caminho.
          </p>
          <div className="hero__actions">
            <Link to="/contato" className="btn btn--primary">
              Agendar aula experimental
            </Link>
            <Link to="/aulas" className="btn btn--outline">
              Ver modalidades
            </Link>
          </div>
        </div>
      </section>

      <div className="belt-stripe" />

      <section className="section">
        <div className="container">
          <h2 className="section__title">Modalidades</h2>
          <div className="grid grid--3">
            {destaques.map((item) => (
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
          <h2 className="section__title">Por que treinar no Sanryu</h2>
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
