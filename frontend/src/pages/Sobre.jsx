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
            Fundado em 1998, o Dojo Sanryu nasceu do encontro de três caminhos — Jiu-Jitsu, Judo e
            Karatê — sob um mesmo teto. O nome <em>Sanryu</em> (三流, "três correntes") representa
            justamente essa união: estilos diferentes, uma só filosofia de respeito, disciplina e
            evolução constante.
          </p>
          <p>
            Ao longo de mais de duas décadas, formamos centenas de alunos, de crianças em sua
            primeira aula a atletas competidores em nível nacional. Mantemos viva a tradição
            marcial japonesa, mas com uma pedagogia atenta às necessidades de cada aluno.
          </p>
        </div>
      </section>

      <div className="belt-stripe" />

      <section className="section section--dark">
        <div className="container narrow">
          <h2 className="section__title">Filosofia</h2>
          <p>
            Acreditamos que a arte marcial vai muito além da técnica: é um caminho de
            autoconhecimento. No tatame, ensinamos disciplina, humildade e perseverança — valores
            que os alunos levam para toda a vida.
          </p>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section__title">Instrutores em destaque</h2>
          <p className="section__lead">
            Conheça nossa equipe completa na página de <a href="/aulas">Aulas</a>, onde cada turma
            traz o instrutor responsável.
          </p>
        </div>
      </section>
    </>
  );
}
