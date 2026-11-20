import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilCloudDownload, cilExternalLink, cilCopy } from '@coreui/icons';
import api from '../../services/api';

// "domingo, 29 de novembro" -> "Domingo, 29 de novembro".
function primeiraMaiuscula(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

// Cartaz com o QR Code da inscrição do evento, pra imprimir e deixar na entrada (ou mandar a imagem):
// a pessoa aponta a câmera do celular e cai direto na página de inscrição. O link usa o endereço do
// site aberto agora (o mesmo domínio do admin), então não depende do SITE_URL estar certo.
export default function EventoQrCode() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [qr, setQr] = useState(null);
  const [erro, setErro] = useState(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api
      .get(`/admin/eventos/${id}/qrcode-inscricao`, { params: { base: window.location.origin } })
      .then((res) => setQr(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Não foi possível gerar o QR Code.'));
  }, [id]);

  async function copiarLink() {
    try {
      await navigator.clipboard.writeText(qr.link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.alert(qr.link);
    }
  }

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!evento || !qr) return <p>Carregando...</p>;

  const data = new Date(evento.data);

  return (
    <div>
      <div className="d-print-none d-flex flex-wrap gap-2 align-items-center mb-3">
        <Link to="/admin/eventos" className="text-body-secondary text-decoration-none me-auto">
          &larr; Eventos
        </Link>
        <CButton color="secondary" variant="outline" href={qr.link} target="_blank" rel="noopener noreferrer" title="Abrir a página de inscrição para testar">
          <CIcon icon={cilExternalLink} className="me-1" />
          Testar link
        </CButton>
        <CButton color="secondary" variant="outline" onClick={copiarLink}>
          <CIcon icon={cilCopy} className="me-1" />
          {copiado ? 'Copiado!' : 'Copiar link'}
        </CButton>
        <CButton color="secondary" variant="outline" href={qr.qrcode} download={`qrcode-inscricao-${evento.slug || evento.id}.png`}>
          <CIcon icon={cilCloudDownload} className="me-1" />
          Baixar QR Code
        </CButton>
        <CButton color="primary" onClick={() => window.print()}>
          <CIcon icon={cilPrint} className="me-1" />
          Imprimir cartaz
        </CButton>
      </div>
      {!qr.publicado && (
        <div className="d-print-none alert alert-warning py-2">
          <strong>O evento ainda não está publicado.</strong> Quem ler o QR Code vai ver "evento não encontrado" até você marcar "Publicado" no cadastro do
          evento.
        </div>
      )}
      <p className="d-print-none small text-body-secondary">
        Link do QR Code: <a href={qr.link} target="_blank" rel="noopener noreferrer">{qr.link}</a>
      </p>

      <div className="cartaz-qrcode">
        {evento.banner ? (
          <img src={evento.banner} alt="" className="cartaz-qrcode__banner" />
        ) : (
          <img src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" className="cartaz-qrcode__logo" />
        )}
        <div className="cartaz-qrcode__corpo">
          <p className="cartaz-qrcode__chamada">Faça sua inscrição</p>
          <h1 className="cartaz-qrcode__evento">{evento.nome}</h1>
          <p className="cartaz-qrcode__data">
            {primeiraMaiuscula(data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }))} ·{' '}
            {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {evento.local ? ` · ${evento.local}` : ''}
          </p>
          <div className="cartaz-qrcode__qr-moldura">
            <img src={qr.qrcode} alt="QR Code da inscrição" className="cartaz-qrcode__qr" />
          </div>
          <p className="cartaz-qrcode__instrucao">Aponte a câmera do celular para o código</p>
          <p className="cartaz-qrcode__link">{qr.link.replace(/^https?:\/\//, '')}</p>
        </div>
      </div>
    </div>
  );
}
