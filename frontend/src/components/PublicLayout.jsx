import Navbar from './Navbar.jsx';
import Footer from './Footer.jsx';

export default function PublicLayout({ children }) {
  return (
    <div className="page">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
