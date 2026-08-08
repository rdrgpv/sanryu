export default function Sobre() {
  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Sobre</p>
          <h1>Nossa história</h1>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <p>
            Bem-vindos ao nosso Dojo. Pensamos em inúmeros nomes para descrever nosso local de
            treino, nossa equipe, uma minúscula parte do todo que é o <strong>Morganti Ju-Jitsu</strong>.
            Muitas sugestões vieram de nomes de guerreiras — Imperatriz Jingū, Tomoe Gozen, Hangaku
            Gozen, Nakano Takeko, dentre outras — mas ainda estava faltando algo.
          </p>
          <p>
            A sugestão veio do David, publicitário que faz parte de tudo que fazemos e que ainda
            não é sensei, mas está na jornada: <em>San·Ryu</em>.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section__title">Entenda o porquê do nome</h2>
          <div className="grid grid--2">
            <div className="tile">
              <h3>SAN — o triângulo</h3>
              <p>
                Base forte, equilíbrio, representativo das três fases de luta e do indivíduo:
                corpo, mente e espírito, do ímpeto da motivação pessoal. Está totalmente
                relacionado com o que foi aprendido com o Shidoshi Ricardo Morganti,{' '}
                <a href="https://www.instagram.com/shihan_alberto_nicoletti/" target="_blank" rel="noopener noreferrer">
                  Shihan Alberto Nicoletti
                </a>{' '}
                e{' '}
                <a href="https://www.instagram.com/shihanmarcelo/" target="_blank" rel="noopener noreferrer">
                  Shihan Marcelo
                </a>
                , que acompanha o trabalho em São Paulo. A tomoe, símbolo do Morganti, é o
                triângulo em movimento que faz a junção das três fases de luta.
              </p>
            </div>
            <div className="tile">
              <h3>RYU — o dragão</h3>
              <p>
                São caminhos ou técnicas que também convergem para o nosso estilo, além de também
                significar dragão. Os dragões são criaturas míticas, símbolo de força, sabedoria e
                prosperidade. No Japão, acredita-se que são guardiões da nação, que protegem as
                pessoas dos males e minimizam qualquer catástrofe.
              </p>
            </div>
          </div>
          <p style={{ marginTop: '2rem' }}>
            Achamos excelente também homenagear dois Senseis que estão sempre por perto e fazem
            parte do nosso Dojo: Sensei{' '}
            <a href="https://www.instagram.com/rdrgpv/" target="_blank" rel="noopener noreferrer">
              @rdrgpv
            </a>{' '}
            e Sensei{' '}
            <a href="https://www.instagram.com/matheusr_07/" target="_blank" rel="noopener noreferrer">
              @matheusr_07
            </a>
            . Somos sempre uma equipe — a força vem de um ajudar o outro.
          </p>
          <p className="hero__slogan" style={{ color: 'var(--cor-sumi)' }}>
            "Ainda que tiver um aluno, MJJ vai estar." — Shidoshi
            <br />
            Bora! Juntos, MJJ.
          </p>
        </div>
      </section>

      <div className="belt-stripe" />

      <section className="section section--dark">
        <div className="container narrow">
          <h2 className="section__title">Filosofia</h2>
          <p>
            "Quem teme perder já está vencido" — a filosofia da Morganti Ju-Jitsu resume o que
            ensinamos no tatame: disciplina, humildade e perseverança são o verdadeiro caminho da
            evolução, muito além da técnica.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container narrow" style={{ textAlign: 'center' }}>
          <img
            src="/logos/morganti-jujitsu-selo-hd.webp"
            alt="Selo oficial Morganti Ju-Jitsu"
            style={{ maxWidth: '220px', margin: '0 auto 1.5rem' }}
          />
          <h2 className="section__title">Método Morganti Ju-Jitsu</h2>
          <p className="section__lead" style={{ margin: '0 auto' }}>
            O San·Ryu Dojo é filiado à Morganti Ju-Jitsu®. Conheça nossa equipe de instrutores na
            página de <a href="/aulas">Aulas</a>, onde cada turma traz o responsável pela graduação.
          </p>
        </div>
      </section>
    </>
  );
}
