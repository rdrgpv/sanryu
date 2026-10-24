import { useState } from 'react';
import api from '../services/api';
import { useSite, usePagina, linkWhatsapp, linkInstagram, arrobaInstagram } from '../utils/site.js';

const estadoInicial = { nome: '', email: '', mensagem: '' };

export default function Contato() {
  const [form, setForm] = useState(estadoInicial);
  const [status, setStatus] = useState('idle');
  const contato = useSite()?.contato || {};
  const whatsapp = linkWhatsapp(contato.whatsapp, 'Olá! Vim pelo site do San·Ryu Dojo.');
  const instagram = linkInstagram(contato.instagram);
  usePagina('Contato', 'Endereço, telefone, WhatsApp e mapa do San·Ryu Dojo, no Tatuapé, São Paulo. Fale com a gente.');

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('loading');

    try {
      await api.post('/contato', form);
      setStatus('success');
      setForm(estadoInicial);
    } catch (err) {
      setStatus('error');
    }
  }

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Contato</p>
          <h1>Fale com o dojo</h1>
        </div>
      </section>

      <section className="section">
        <div className="container grid grid--2">
          <form className="form" onSubmit={handleSubmit}>
            <label className="form__field">
              <span>Nome</span>
              <input type="text" name="nome" value={form.nome} onChange={handleChange} required />
            </label>

            <label className="form__field">
              <span>Email</span>
              <input type="email" name="email" value={form.email} onChange={handleChange} required />
            </label>

            <label className="form__field">
              <span>Mensagem</span>
              <textarea name="mensagem" rows={5} value={form.mensagem} onChange={handleChange} required />
            </label>

            <button type="submit" className="btn btn--primary" disabled={status === 'loading'}>
              {status === 'loading' ? 'Enviando...' : 'Enviar mensagem'}
            </button>

            {status === 'success' && (
              <p className="alert alert--success">Mensagem enviada! Em breve entraremos em contato.</p>
            )}
            {status === 'error' && (
              <p className="alert alert--error">Não foi possível enviar sua mensagem. Tente novamente.</p>
            )}
          </form>

          <div className="contact-info">
            <h2>Onde estamos</h2>
            {contato.endereco && <p>{contato.endereco}</p>}
            {contato.telefone && <p>{contato.telefone}</p>}
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
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="btn btn--primary">
                Chamar no WhatsApp
              </a>
            )}

            {contato.endereco && (
              <iframe
                className="contato-mapa"
                title="Mapa de localização do San·Ryu Dojo"
                src={`https://maps.google.com/maps?q=${encodeURIComponent(contato.endereco)}&z=16&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
