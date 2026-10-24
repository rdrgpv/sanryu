import { Link } from 'react-router-dom';
import { useSite, linkWhatsapp, linkInstagram, arrobaInstagram } from '../utils/site.js';

export default function Footer() {
  const contato = useSite()?.contato || {};
  const whatsapp = linkWhatsapp(contato.whatsapp);
  const instagram = linkInstagram(contato.instagram);
  const horarios = (contato.horarioFuncionamento || '').split('\n').map((linha) => linha.trim()).filter(Boolean);

  return (
    <footer className="footer">
      <div className="belt-stripe" />
      <div className="container footer__inner">
        <div>
          <p className="footer__brand">SAN·RYU <span>DOJO</span></p>
          <p className="footer__metodo">Método Morganti Ju-Jitsu</p>
          <p>Tradição, disciplina e superação em cada tatame.</p>
          <p>
            <Link to="/aula-experimental">Agende uma aula experimental gratuita</Link>
          </p>
        </div>
        <div>
          <p className="footer__heading">Contato</p>
          {contato.endereco && <p>{contato.endereco}</p>}
          {contato.telefone && <p>{contato.telefone}</p>}
          {whatsapp && (
            <p>
              <a href={whatsapp} target="_blank" rel="noopener noreferrer">WhatsApp {contato.whatsapp}</a>
            </p>
          )}
          {contato.email && (
            <p>
              <a href={`mailto:${contato.email}`}>{contato.email}</a>
            </p>
          )}
          {instagram && (
            <p>
              <a href={instagram} target="_blank" rel="noopener noreferrer">Instagram {arrobaInstagram(contato.instagram)}</a>
            </p>
          )}
        </div>
        {horarios.length > 0 && (
          <div>
            <p className="footer__heading">Horário de funcionamento</p>
            {horarios.map((linha) => (
              <p key={linha}>{linha}</p>
            ))}
          </div>
        )}
      </div>
      <p className="footer__copy">© {new Date().getFullYear()} San·Ryu Dojo. Todos os direitos reservados.</p>
    </footer>
  );
}
