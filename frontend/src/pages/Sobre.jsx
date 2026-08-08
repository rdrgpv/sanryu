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
            O nome <em>San·Ryu</em> (三竜, "três dragões") vem da tradição do Método Morganti, que
            historicamente uniu Judo, Karatê e Ju-Jitsu sob um mesmo teto. Hoje, o San·Ryu Dojo é
            dedicado inteiramente ao <strong>Ju-Jitsu</strong>, seguindo a metodologia oficial da
            Morganti Ju-Jitsu®.
          </p>
          <p>
            Formamos alunos de todas as idades, de crianças em sua primeira aula a competidores
            experientes, através de um sistema de katas e graduação por faixas que preserva a
            tradição marcial japonesa com uma pedagogia atenta às necessidades de cada aluno.
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
            src="/logos/morganti-jujitsu-selo.jpg"
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
