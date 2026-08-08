import { useState } from 'react';
import api from '../services/api';

const estadoInicial = { nome: '', email: '', mensagem: '' };

export default function Contato() {
  const [form, setForm] = useState(estadoInicial);
  const [status, setStatus] = useState('idle');

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
            <h2>Endereço</h2>
            <p>Rua das Artes Marciais, 123 — São Paulo, SP</p>
            <p>(11) 4000-0000</p>
            <p>contato@sanryudojo.com.br</p>

            <div className="map-placeholder" role="img" aria-label="Mapa de localização do San·Ryu Dojo">
              Mapa — Rua das Artes Marciais, 123
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
