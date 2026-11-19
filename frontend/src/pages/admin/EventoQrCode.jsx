import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint, cilCloudDownload } from '@coreui/icons';
import api from '../../services/api';

// Cartaz com o QR Code da inscrição do evento, pra imprimir e deixar na entrada: a pessoa aponta a
// câmera do celular e cai direto na página de inscrição.
export default function EventoQrCode() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [qr, setQr] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api
      .get(`/admin/eventos/${id}/qrcode-inscricao`)
      .then((res) => setQr(res.data))
      .catch(() => setErro('Não foi possível gerar o QR Code.'));
  }, [id]);

  if (erro) return <div className="alert alert-danger">{erro}</div>;
  if (!evento || !qr) return <p>Carregando...</p>;

  const data = new Date(evento.data);

  return (
    <div>
      <div className="d-print-none d-flex flex-wrap gap-2 align-items-center mb-3">
        <Link to="/admin/eventos" className="text-body-secondary text-decoration-none me-auto">
          &larr; Eventos
        </Link>
        <CButton color="secondary" variant="outline" href={qr.qrcode} download={`qrcode-inscricao-${evento.slug || evento.id}.png`}>
          <CIcon icon={cilCloudDownload} className="me-1" />
          Baixar imagem
        </CButton>
        <CButton color="primary" onClick={() => window.print()}>
          <CIcon icon={cilPrint} className="me-1" />
          Imprimir cartaz
        </CButton>
      </div>
      {!qr.publicado && (
        <div className="d-print-none alert alert-warning py-2">
          O evento ainda não está publicado: o QR Code só funciona depois de marcar "Publicado" no cadastro do evento.
        </div>
      )}

      <div className="cartaz-qrcode">
        <img src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" className="cartaz-qrcode__logo" />
        <p className="cartaz-qrcode__chamada">Faça sua inscrição</p>
        <h1 className="cartaz-qrcode__evento">{evento.nome}</h1>
        <p className="cartaz-qrcode__data">
          {data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })} ·{' '}
          {data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          {evento.local ? ` · ${evento.local}` : ''}
        </p>
        <img src={qr.qrcode} alt="QR Code da inscrição" className="cartaz-qrcode__qr" />
        <p className="cartaz-qrcode__instrucao">Aponte a câmera do celular para o código</p>
        <p className="cartaz-qrcode__link">{qr.link.replace(/^https?:\/\//, '')}</p>
      </div>
    </div>
  );
}
