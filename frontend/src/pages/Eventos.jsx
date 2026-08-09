import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function Eventos() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get('/eventos')
      .then((res) => setEventos(res.data))
      .catch(() => setErro('Não foi possível carregar os eventos no momento.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Eventos</p>
          <h1>Exames e eventos do dojo</h1>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {loading && <p>Carregando eventos...</p>}
          {erro && <p className="alert alert--error">{erro}</p>}

          {!loading && !erro && (
            <div className="grid grid--3">
              {eventos.map((evento) => (
                <Link key={evento.id} to={`/eventos/${evento.id}`} className="tile" style={{ textDecoration: 'none' }}>
                  <p className="tile__tag">{evento.tipoEvento?.nome}</p>
                  <h3>{evento.nome}</h3>
                  <p>{new Date(evento.data).toLocaleString('pt-BR')}</p>
                  {evento.local && <p className="tile__meta">{evento.local}</p>}
                </Link>
              ))}
              {eventos.length === 0 && <p>Nenhum evento disponível para inscrição no momento.</p>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
