import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

// "29 NOV 2026", no fuso de São Paulo.
function dataCurta(valor) {
  const partes = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'America/Sao_Paulo' })
    .formatToParts(new Date(valor))
    .reduce((acc, parte) => ({ ...acc, [parte.type]: parte.value }), {});
  return `${partes.day} ${MESES[Number(partes.month) - 1]} ${partes.year}`;
}

// "Clube ADC - São Paulo/SP" -> ["Clube ADC", "São Paulo/SP"]: o lugar em destaque, a cidade embaixo.
function partesDoLocal(local) {
  const [lugar, ...resto] = String(local || '').split(/\s+[-–—]\s+|\s*\n\s*/);
  return [lugar, resto.join(' · ')];
}

// Certificado de participação (/certificados/:token, link do e-mail), no modelo do Morganti Ju-Jitsu:
// faixa escura à esquerda (selo, data, local, carga horária) e o certificado à direita. "Salvar PDF"
// usa o imprimir do navegador, que funciona no celular. A4 deitado.
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
    if (certificado) document.title = `Certificado · ${certificado.nome} · Morganti Ju-Jitsu`;
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

  const [lugar, cidade] = partesDoLocal(certificado.local);
  const assinatura = certificado.assinatura || {};

  return (
    <div className="certificado-pagina">
      <div className="certificado-acoes">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Salvar PDF / imprimir
        </button>
      </div>

      <div className="certificado">
        <aside className="certificado__lateral">
          <div className="certificado__selo">
            <img src="/logos/morganti-jujitsu-selo-hd.webp" alt="Morganti Ju-Jitsu" />
          </div>
          <p className="certificado__marca">
            MORGANTI
            <br />
            JU-JITSU
          </p>
          <span className="certificado__traco" />
          <p className="certificado__data">{dataCurta(certificado.data)}</p>
          {lugar && <p className="certificado__lugar">{lugar}</p>}
          {cidade && <p className="certificado__cidade">{cidade}</p>}
          {certificado.cargaHoraria && <p className="certificado__carga">{certificado.cargaHoraria} de treinamento</p>}
        </aside>

        <main className="certificado__corpo">
          <p className="certificado__kicker">Morganti Ju-Jitsu</p>
          <h1 className="certificado__titulo">Certificado de participação</h1>
          <span className="certificado__traco" />
          <p className="certificado__parabens">Parabéns pela sua participação na</p>
          <p className="certificado__evento">{certificado.evento}</p>

          <p className="certificado__nome">{certificado.nome}</p>
          <p className="certificado__texto">{certificado.texto}</p>

          <div className="certificado__assinatura">
            {assinatura.imagem ? <img src={assinatura.imagem} alt="" className="certificado__rubrica" /> : <span className="certificado__rubrica" />}
            <span className="certificado__linha" />
            <strong>{assinatura.nome}</strong>
            <span>{assinatura.cargo}</span>
          </div>
        </main>
      </div>
    </div>
  );
}
