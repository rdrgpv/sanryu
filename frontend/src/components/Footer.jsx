export default function Footer() {
  return (
    <footer className="footer">
      <div className="belt-stripe" />
      <div className="container footer__inner">
        <div>
          <p className="footer__brand">道場 Sanryu</p>
          <p>Tradição, disciplina e superação em cada tatame.</p>
        </div>
        <div>
          <p className="footer__heading">Contato</p>
          <p>Rua das Artes Marciais, 123 — São Paulo, SP</p>
          <p>(11) 4000-0000</p>
          <p>contato@dojosanryu.com.br</p>
        </div>
        <div>
          <p className="footer__heading">Horário de funcionamento</p>
          <p>Segunda a sexta: 07h — 22h</p>
          <p>Sábado: 08h — 13h</p>
        </div>
      </div>
      <p className="footer__copy">© {new Date().getFullYear()} Dojo Sanryu. Todos os direitos reservados.</p>
    </footer>
  );
}
