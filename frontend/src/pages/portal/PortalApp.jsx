import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import apiPortal, { CHAVE_TOKEN_PORTAL } from '../../services/apiPortal';
import LojaPortal from './LojaPortal.jsx';

const PERIODICIDADES = { mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual' };
const NOMES_MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function lerToken() {
  try {
    return localStorage.getItem(CHAVE_TOKEN_PORTAL);
  } catch (err) {
    return null;
  }
}

function formatarMoeda(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function formatarData(valor) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor || '');
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '-';
}

function nomeMes(competencia) {
  const [ano, mes] = competencia.split('-').map(Number);
  return `${NOMES_MESES[mes - 1]}/${ano}`;
}

// ---- Entrada: e-mail -> código ----

function Entrar() {
  const navigate = useNavigate();
  const [etapa, setEtapa] = useState('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  const [erro, setErro] = useState(null);

  if (lerToken()) return <Navigate to="/portal" replace />;

  async function pedirCodigo(event) {
    event?.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await apiPortal.post('/codigo', { email });
      setMensagem(res.data.mensagem);
      setEtapa('codigo');
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível enviar o código.');
    } finally {
      setEnviando(false);
    }
  }

  async function entrar(event) {
    event.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const res = await apiPortal.post('/entrar', { email, codigo });
      try {
        localStorage.setItem(CHAVE_TOKEN_PORTAL, res.data.token);
      } catch (err) {
        setErro('Seu navegador bloqueou o armazenamento da sessão. Saia do modo privado e tente de novo.');
        return;
      }
      navigate('/portal', { replace: true });
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível entrar.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="portal__entrada">
      <h1>Área do aluno</h1>
      <p className="tile__meta">Mensalidades, frequência, faixa e contrato — para alunos e responsáveis.</p>

      {etapa === 'email' ? (
        <form className="form form--autorizacao" onSubmit={pedirCodigo}>
          <label className="form__field">
            <span>E-mail cadastrado na academia</span>
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          {erro && <p className="alert alert--error">{erro}</p>}
          <button type="submit" className="btn btn--primary btn--bloco" disabled={enviando}>
            {enviando ? 'Enviando...' : 'Receber código por e-mail'}
          </button>
        </form>
      ) : (
        <form className="form form--autorizacao" onSubmit={entrar}>
          <p className="alert alert--success" style={{ marginTop: 0 }}>
            {mensagem}
          </p>
          <label className="form__field">
            <span>Código de 6 dígitos</span>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={codigo}
              onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))}
              className="portal__codigo"
              required
            />
          </label>
          {erro && <p className="alert alert--error">{erro}</p>}
          <button type="submit" className="btn btn--primary btn--bloco" disabled={enviando || codigo.length !== 6}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </button>
          <button type="button" className="btn btn--ghost btn--bloco" onClick={() => { setEtapa('email'); setCodigo(''); setErro(null); }}>
            Usar outro e-mail
          </button>
          <button type="button" className="portal__link-texto" onClick={pedirCodigo} disabled={enviando}>
            Não chegou? Enviar outro código
          </button>
        </form>
      )}
    </div>
  );
}

// ---- Layout logado ----

function Cabecalho({ nome }) {
  const navigate = useNavigate();
  return (
    <header className="sensei__cabecalho">
      <Link to="/portal" className="sensei__marca">
        San·Ryu <span>área do aluno</span>
      </Link>
      <span className="sensei__usuario">
        {nome}
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.removeItem(CHAVE_TOKEN_PORTAL);
            } catch (err) {
              // ignora
            }
            navigate('/portal/entrar');
          }}
        >
          sair
        </button>
      </span>
    </header>
  );
}

function FaixaChip({ faixa }) {
  if (!faixa) return null;
  return (
    <span className="portal__faixa">
      <span className="chamada__faixa" style={{ background: faixa.cor }} />
      {faixa.nome}
      {faixa.grau ? ` ${faixa.grau}º` : ''}
    </span>
  );
}

function Inicio({ dados }) {
  const [eventos, setEventos] = useState([]);
  const [avisos, setAvisos] = useState([]);

  useEffect(() => {
    apiPortal.get('/eventos').then((res) => setEventos(res.data)).catch(() => setEventos([]));
    apiPortal.get('/avisos').then((res) => setAvisos(res.data)).catch(() => setAvisos([]));
  }, []);

  return (
    <>
      <h1 className="portal__titulo">Olá{dados.nome ? `, ${dados.nome.split(' ')[0]}` : ''}!</h1>
      {avisos.map((aviso) => (
        <div key={aviso.id} className="portal__aviso">
          <strong>{aviso.titulo}</strong>
          <small>{new Date(aviso.createdAt).toLocaleDateString('pt-BR')}</small>
          <p>{aviso.mensagem}</p>
        </div>
      ))}
      {dados.alunos.length === 0 && <p>Nenhum aluno ativo ligado a este e-mail. Fale com a academia.</p>}
      {dados.alunos.map((aluno) => (
        <Link key={aluno.id} to={`/portal/alunos/${aluno.id}`} className="portal__aluno">
          <span className="chamada__foto">{aluno.foto ? <img src={aluno.foto} alt="" /> : aluno.nome.slice(0, 1)}</span>
          <span className="portal__aluno-texto">
            <strong>{aluno.nome}</strong>
            <FaixaChip faixa={aluno.faixa} />
            <small>{aluno.turmas.map((turma) => turma.nome).join(', ') || 'Sem turma'}</small>
            {aluno.situacao === 'trancado' && <small className="chamada__aviso">matrícula trancada</small>}
          </span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}

      <Link to="/portal/loja" className="sensei__turma">
        <span>
          <strong>Loja</strong>
          <small>Kimono, faixa e uniforme — pague por Pix e retire na academia</small>
        </span>
        <span aria-hidden="true">›</span>
      </Link>

      {eventos.length > 0 && (
        <>
          <h2 className="sensei__secao">Próximos eventos</h2>
          {eventos.map((evento) => (
            <a key={evento.id} href={evento.linkInscricao} className="sensei__turma">
              <span>
                <strong>{evento.nome}</strong>
                <small>
                  {new Date(evento.data).toLocaleDateString('pt-BR')}
                  {evento.local ? ` · ${evento.local}` : ''}
                </small>
              </span>
              <span className="sensei__selo">inscrição</span>
            </a>
          ))}
        </>
      )}
    </>
  );
}

function DetalheAluno() {
  const { alunoId } = useParams();
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    setDados(null);
    apiPortal
      .get(`/alunos/${alunoId}`)
      .then((res) => setDados(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Não foi possível carregar.'));
  }, [alunoId]);

  if (erro) return <p className="alert alert--error">{erro}</p>;
  if (!dados) return <p>Carregando...</p>;

  const { aluno, contrato, mensalidades, frequencia, ultimasPresencas } = dados;
  const emAberto = mensalidades.filter((mensalidade) => mensalidade.status === 'pendente');
  const pagas = mensalidades.filter((mensalidade) => mensalidade.status === 'pago');

  return (
    <>
      <Link to="/portal" className="sensei__voltar">
        ← início
      </Link>
      <div className="portal__cabecalho-aluno">
        <span className="chamada__foto portal__foto-grande">{aluno.foto ? <img src={aluno.foto} alt="" /> : aluno.nome.slice(0, 1)}</span>
        <div>
          <h1 className="portal__titulo">{aluno.nome}</h1>
          <FaixaChip faixa={aluno.faixa} />
        </div>
      </div>

      <h2 className="sensei__secao">Mensalidades</h2>
      {emAberto.length === 0 && <p className="portal__ok">Tudo em dia. ✓</p>}
      {emAberto.map((mensalidade) => (
        <div key={mensalidade.id} className={`portal__cobranca${mensalidade.vencida ? ' portal__cobranca--vencida' : ''}`}>
          <div>
            <strong>{nomeMes(mensalidade.competencia)}</strong>
            <small>
              {mensalidade.vencida ? 'venceu em ' : 'vence em '}
              {formatarData(mensalidade.vencimento)}
            </small>
          </div>
          <div className="portal__cobranca-acao">
            <strong>{formatarMoeda(mensalidade.valor)}</strong>
            <a href={mensalidade.linkPagamento} className="btn btn--primary btn--small">
              Pagar com Pix
            </a>
          </div>
        </div>
      ))}
      {pagas.length > 0 && (
        <details className="portal__historico">
          <summary>Pagas ({pagas.length})</summary>
          {pagas.map((mensalidade) => (
            <div key={mensalidade.id} className="portal__historico-linha">
              <span>{nomeMes(mensalidade.competencia)}</span>
              <span>
                {formatarMoeda(mensalidade.valor)} · pago em {new Date(mensalidade.pagoEm).toLocaleDateString('pt-BR')}
                {mensalidade.linkRecibo && (
                  <>
                    {' · '}
                    <a href={mensalidade.linkRecibo}>recibo</a>
                  </>
                )}
              </span>
            </div>
          ))}
        </details>
      )}

      <h2 className="sensei__secao">Frequência</h2>
      <div className="portal__frequencia">
        {frequencia.map((mes) => (
          <div key={mes.mes} className="portal__frequencia-mes">
            <span>{nomeMes(mes.mes)}</span>
            {/* Medidor: trilho e preenchimento do mesmo tom; o número vai escrito ao lado. */}
            <span className="portal__medidor" aria-hidden="true">
              <span style={{ width: `${mes.percentual ?? 0}%` }} />
            </span>
            <span className="portal__frequencia-valor">
              {mes.aulas ? `${mes.presencas}/${mes.aulas} · ${mes.percentual}%` : 'sem aulas'}
            </span>
          </div>
        ))}
      </div>
      {ultimasPresencas.length > 0 && (
        <p className="tile__meta">Últimos treinos: {ultimasPresencas.slice(0, 5).map(formatarData).join(', ')}</p>
      )}
      <p className="tile__meta">Turmas: {aluno.turmas.map((turma) => `${turma.nome} (${turma.diaSemana} ${turma.horaInicio})`).join(' · ') || 'nenhuma'}</p>

      <h2 className="sensei__secao">Contrato</h2>
      {contrato ? (
        <div className="sensei__turma">
          <span>
            <strong>{contrato.plano}</strong>
            <small>
              {formatarMoeda(contrato.valor)} {PERIODICIDADES[contrato.periodicidade] || ''} · vence todo dia {contrato.diaVencimento} · desde{' '}
              {formatarData(contrato.dataInicio)}
            </small>
          </span>
          <a href={contrato.link} className={`btn btn--small ${contrato.assinado ? 'btn--ghost' : 'btn--primary'}`}>
            {contrato.assinado ? 'Ver' : 'Assinar'}
          </a>
        </div>
      ) : (
        <p className="tile__meta">Nenhum contrato ativo.</p>
      )}
    </>
  );
}

function AreaLogada() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    apiPortal
      .get('/eu')
      .then((res) => setDados(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Não foi possível carregar.'));
  }, []);

  if (!lerToken()) return <Navigate to="/portal/entrar" replace />;

  return (
    <div className="sensei">
      <Cabecalho nome={dados?.nome} />
      <main className="sensei__conteudo">
        {erro && <p className="alert alert--error">{erro}</p>}
        {!dados && !erro && <p>Carregando...</p>}
        {dados && (
          <Routes>
            <Route index element={<Inicio dados={dados} />} />
            <Route path="alunos/:alunoId" element={<DetalheAluno />} />
            <Route path="loja" element={<LojaPortal />} />
          </Routes>
        )}
      </main>
    </div>
  );
}

// Área do aluno/responsável (/portal), feita pro celular. Sessão própria (apiPortal).
export default function PortalApp() {
  return (
    <Routes>
      <Route
        path="entrar"
        element={
          <div className="sensei">
            <main className="sensei__conteudo">
              <Entrar />
            </main>
          </div>
        }
      />
      <Route path="*" element={<AreaLogada />} />
    </Routes>
  );
}
