import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

// Certificado de participação (/certificados/:token, link do e-mail). "Salvar PDF" usa o imprimir do
// navegador, que funciona também no celular — sem gerar arquivo no servidor. A4 deitado.
export default function Certificado() {
  const { token } = useParams();
  const [certificado, setCertificado] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get(`/certificados/${token}`)
      .then((res) => setCertificado(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Certificado não encontrado.'));
  }, [token]);

  useEffect(() => {
    if (certificado) document.title = `Certificado · ${certificado.nome} · San·Ryu Dojo`;
  }, [certificado]);

  if (erro) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{erro}</p>
        </div>
      </section>
    );
  }

  if (!certificado) return <p style={{ padding: '2rem' }}>Carregando...</p>;

  return (
    <div className="certificado-pagina">
      <div className="certificado-acoes">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Salvar PDF / imprimir
        </button>
      </div>

      <div className="certificado">
        <div className="certificado__moldura">
          <div className="certificado__logos">
            <img src="/logos/sanryu-wordmark.png" alt="San·Ryu Dojo" className="certificado__logo" />
            <img src="/logos/morganti-jujitsu-selo-hd.webp" alt="Morganti Ju-Jitsu" className="certificado__selo" />
          </div>

          <p className="certificado__titulo">Certificado</p>
          <p className="certificado__subtitulo">de participação</p>

          <p className="certificado__nome">{certificado.nome}</p>
          <p className="certificado__texto">{certificado.texto}</p>

          <div className="certificado__rodape">
            <div className="certificado__assinatura">
              <span className="certificado__linha" />
              <strong>{certificado.instrutor || 'San·Ryu Dojo'}</strong>
              <span>{certificado.instrutor ? 'Instrutor responsável' : 'Morganti Ju-Jitsu'}</span>
            </div>
            <div className="certificado__assinatura">
              <span className="certificado__linha" />
              <strong>San·Ryu Dojo</strong>
              <span>Método Morganti Ju-Jitsu</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
