import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';
import BotaoWhatsapp from './BotaoWhatsapp.jsx';

export default function PublicLayout({ children }) {
  return (
    <div className="page">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <BotaoWhatsapp />
    </div>
  );
}
