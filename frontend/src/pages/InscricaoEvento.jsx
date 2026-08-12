import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

const TIPO_EXAME_DE_FAIXA_ID = 1;
const OPCOES_FAIXA_BRANCA = ['Cinza', 'Amarela'];

function faixaEfetiva(candidato) {
  return candidato.origem === 'gatame' && candidato.faixa ? candidato.faixa : 'Branca';
}

function precisaDadosExtras(candidato) {
  return candidato.origem !== 'gatame' || !candidato.faixa;
}

// Usa o cadastro de Faixas (ordenado por "ordem") pra achar a próxima faixa da graduação.
function proximaFaixa(nomeAtual, faixas) {
  const indice = faixas.findIndex((faixa) => faixa.nome.toLowerCase() === (nomeAtual || '').toLowerCase());
  if (indice === -1 || indice === faixas.length - 1) return null;
  return faixas[indice + 1];
}

function buscarFaixaPorNome(nome, faixas) {
  return faixas.find((faixa) => faixa.nome.toLowerCase() === (nome || '').toLowerCase());
}

// Máscara progressiva (11) 99999-9999 (celular) ou (11) 9999-9999 (fixo), conforme a quantidade de dígitos digitados.
function formatarTelefone(valor) {
  const digitos = (valor || '').replace(/\D/g, '').slice(0, 11);

  if (!digitos) return '';
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);

  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  const tamanhoPrefixo = digitos.length > 10 ? 5 : 4;
  return `(${ddd}) ${resto.slice(0, tamanhoPrefixo)}-${resto.slice(tamanhoPrefixo)}`;
}

// Texto branco ou escuro por cima da cor da faixa, conforme a luminância dela (ex.: Amarela precisa de texto escuro).
function corTextoContraste(hex) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!match) return '#111';
  const n = parseInt(match[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? '#111' : '#fff';
}

// Datas vindas da API/inputs são strings "YYYY-MM-DD" sem horário. Evita `new Date(string)` para
// esses casos: ele interpreta como meia-noite UTC, o que "volta" um dia em fusos negativos (Brasil).
function formatarData(valor) {
  if (!valor) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!match) return valor;
  const [, ano, mes, dia] = match;
  return `${dia}/${mes}/${ano}`;
}

function paraInputDate(valor) {
  if (!valor) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  return match ? match[0] : '';
}

function calcularIdade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');
  if (!match) return null;

  const [, anoStr, mesStr, diaStr] = match;
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);

  if (aindaNaoFezAniversario) idade -= 1;
  return idade;
}

export default function InscricaoEvento() {
  const { id } = useParams();

  const [evento, setEvento] = useState(null);
  const [eventoErro, setEventoErro] = useState(null);
  const [faixas, setFaixas] = useState([]);

  const [email, setEmail] = useState('');
  const [consultando, setConsultando] = useState(false);
  const [candidatos, setCandidatos] = useState(null);
  const [extras, setExtras] = useState({});
  const [naoApto, setNaoApto] = useState(false);
  const [erro, setErro] = useState(null);

  const [inscrevendo, setInscrevendo] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [novaFaixaConfirmada, setNovaFaixaConfirmada] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [mostrarQrCode, setMostrarQrCode] = useState(false);

  useEffect(() => {
    api
      .get(`/eventos/${id}/publico`)
      .then((res) => setEvento(res.data))
      .catch(() => setEventoErro('Evento não encontrado ou não está disponível para inscrição.'));

    api
      .get('/faixas')
      .then((res) => setFaixas(res.data))
      .catch(() => setFaixas([]));
  }, [id]);

  async function handleConsultar(event) {
    event.preventDefault();
    setErro(null);
    setNaoApto(false);
    setCandidatos(null);
    setConsultando(true);

    try {
      const res = await api.post(`/eventos/${id}/consulta`, { email });

      if (!res.data.apto) {
        setNaoApto(true);
      } else {
        setCandidatos(res.data.candidatos);

        const extrasIniciais = {};
        res.data.candidatos.forEach((candidato, indice) => {
          extrasIniciais[indice] = {
            nome: candidato.nome || '',
            telefone: '',
            dataNascimento: paraInputDate(candidato.dataNascimento),
            responsavel: '',
          };
        });
        setExtras(extrasIniciais);
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível consultar seus dados. Tente novamente.');
    } finally {
      setConsultando(false);
    }
  }

  function atualizarExtra(indice, campo, valor) {
    setExtras((prev) => ({ ...prev, [indice]: { ...prev[indice], [campo]: valor } }));
  }

  async function handleConfirmar(indice, faixaEscolhida, novaFaixaNome) {
    setErro(null);
    setInscrevendo(true);

    try {
      const res = await api.post(`/eventos/${id}/inscricoes`, {
        email,
        indice,
        faixaEscolhida,
        dadosExtras: extras[indice],
      });
      setResultado(res.data);
      setNovaFaixaConfirmada(novaFaixaNome || null);
      setMostrarQrCode(!res.data.jaInscrito);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível concluir sua inscrição. Tente novamente.');
    } finally {
      setInscrevendo(false);
    }
  }

  async function handleCopiarPix() {
    try {
      await navigator.clipboard.writeText(resultado.pixCopiaCola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch (err) {
      setErro('Não foi possível copiar o código. Copie manualmente o QR code exibido.');
    }
  }

  if (eventoErro) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{eventoErro}</p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Inscrição</p>
          <h1>{evento?.nome || 'Carregando...'}</h1>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          {evento && (
            <div className="tile" style={{ marginBottom: '2rem' }}>
              {evento.banner && (
                <img
                  src={evento.banner}
                  alt=""
                  style={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 'var(--raio)', marginBottom: '1rem' }}
                />
              )}
              {evento.descricao && <p style={{ whiteSpace: 'pre-line' }}>{evento.descricao}</p>}
              <p className="tile__meta">{new Date(evento.data).toLocaleString('pt-BR')}</p>
              {evento.local && <p className="tile__meta">{evento.local}</p>}
            </div>
          )}

          {!resultado && (
            <form className="form" onSubmit={handleConsultar}>
              <label className="form__field">
                <span>Email (Email utilizado no Morganti University)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  disabled={consultando || Boolean(candidatos)}
                />
              </label>
              {!candidatos && (
                <button type="submit" className="btn btn--primary" disabled={consultando}>
                  {consultando ? 'Consultando...' : 'Consultar'}
                </button>
              )}
              {erro && <p className="alert alert--error">{erro}</p>}
            </form>
          )}

          {naoApto && (
            <p className="alert alert--error">
              Não localizamos seus dados de carteirinha para o e-mail informado. Verifique o e-mail digitado ou
              entre em contato com o dojo.
            </p>
          )}

          {candidatos && !resultado && (
            <div style={{ marginTop: '1.5rem' }}>
              {candidatos.length > 1 && <p>Encontramos mais de um cadastro para este e-mail. Selecione o seu:</p>}

              <div className="grid grid--2">
                {candidatos.map((candidato, indice) => {
                  const ehExameDeFaixa = evento?.tipoEvento?.id === TIPO_EXAME_DE_FAIXA_ID;
                  const atual = faixaEfetiva(candidato);
                  const precisaEscolherFaixa = ehExameDeFaixa && atual.toLowerCase() === 'branca';
                  const proxima = ehExameDeFaixa && !precisaEscolherFaixa ? proximaFaixa(atual, faixas) : null;
                  const dadosObrigatorios = precisaDadosExtras(candidato);
                  const extraDados = extras[indice] || { nome: '', telefone: '', dataNascimento: '', responsavel: '' };
                  const idade = calcularIdade(extraDados.dataNascimento);
                  const menorDeIdade = idade !== null && idade < 18;
                  const extrasValidos =
                    !dadosObrigatorios ||
                    (extraDados.nome.trim() &&
                      extraDados.dataNascimento &&
                      (!menorDeIdade || extraDados.responsavel.trim()));

                  const camposFaltando = [];
                  if (dadosObrigatorios) {
                    if (!extraDados.nome.trim()) camposFaltando.push('nome completo');
                    if (!extraDados.dataNascimento) camposFaltando.push('data de nascimento');
                    if (menorDeIdade && !extraDados.responsavel.trim()) camposFaltando.push('nome do responsável');
                  }

                  return (
                    <div key={indice} className="tile">
                      <p className="tile__tag">{candidato.origem}</p>
                      <h3>{candidato.nome}</h3>
                      {candidato.email && <p className="tile__meta">Email: {candidato.email}</p>}
                      {candidato.faixa && <p>Faixa: {candidato.faixa}</p>}
                      {formatarData(candidato.dataNascimento) && (
                        <p className="tile__meta">Nascimento: {formatarData(candidato.dataNascimento)}</p>
                      )}
                      {candidato.numeroCarteirinha && (
                        <p className="tile__meta">Carteirinha: {candidato.numeroCarteirinha}</p>
                      )}
                      {formatarData(candidato.validadeCarteirinha) && (
                        <p className="tile__meta">Validade da carteirinha: {formatarData(candidato.validadeCarteirinha)}</p>
                      )}

                      {ehExameDeFaixa && (
                        <div style={{ marginTop: '0.5rem' }}>
                          <p>
                            <strong>Faixa Atual:</strong> {atual}
                            <span
                              className="faixa-retangulo"
                              style={{ background: buscarFaixaPorNome(atual, faixas)?.cor || '#ccc' }}
                            />
                          </p>
                          {!precisaEscolherFaixa && (
                            <p>
                              <strong>Nova Faixa:</strong> {proxima ? proxima.nome : 'Já está na faixa mais alta cadastrada'}
                              {proxima && <span className="faixa-retangulo" style={{ background: proxima.cor }} />}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="tile__meta">
                        Encontrou alguma informação divergente? Procure seu Sensei ou envie um e-mail para{' '}
                        <a href="mailto:contato@sanryu.com.br">contato@sanryu.com.br</a>.
                      </p>

                      {dadosObrigatorios && (
                        <div className="form" style={{ marginTop: '1rem' }}>
                          <label className="form__field">
                            <span>Nome completo</span>
                            <input
                              value={extraDados.nome}
                              onChange={(event) => atualizarExtra(indice, 'nome', event.target.value)}
                              required
                            />
                          </label>
                          <label className="form__field">
                            <span>Telefone</span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              placeholder="(11) 99999-9999"
                              value={extraDados.telefone}
                              onChange={(event) => atualizarExtra(indice, 'telefone', formatarTelefone(event.target.value))}
                            />
                          </label>
                          <label className="form__field">
                            <span>Data de nascimento</span>
                            <input
                              type="date"
                              value={extraDados.dataNascimento}
                              onChange={(event) => atualizarExtra(indice, 'dataNascimento', event.target.value)}
                              required
                            />
                          </label>
                          {menorDeIdade && (
                            <label className="form__field">
                              <span>Nome do responsável</span>
                              <input
                                value={extraDados.responsavel}
                                onChange={(event) => atualizarExtra(indice, 'responsavel', event.target.value)}
                                required
                              />
                            </label>
                          )}
                        </div>
                      )}

                      {camposFaltando.length > 0 && (
                        <p className="alert alert--error" style={{ marginTop: '0.75rem' }}>
                          Preencha {camposFaltando.join(', ')} para continuar.
                        </p>
                      )}

                      {precisaEscolherFaixa ? (
                        <div style={{ marginTop: '1rem' }}>
                          <p>Para qual faixa você vai fazer o exame?</p>
                          <div
                            style={{
                              display: 'flex',
                              gap: '0.75rem',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {OPCOES_FAIXA_BRANCA.map((opcao) => {
                              const cor = buscarFaixaPorNome(opcao, faixas)?.cor || '#ccc';
                              // Faixa Cinza é só para até 8 anos; acima disso, só Amarela fica disponível.
                              const cinzaBloqueadaPelaIdade = opcao === 'Cinza' && idade !== null && idade > 8;
                              return (
                                <button
                                  key={opcao}
                                  type="button"
                                  className="btn"
                                  style={{
                                    background: cor,
                                    color: corTextoContraste(cor),
                                    border: '1px solid rgba(17, 17, 17, 0.25)',
                                  }}
                                  onClick={() => handleConfirmar(indice, opcao, opcao)}
                                  disabled={inscrevendo || !extrasValidos || cinzaBloqueadaPelaIdade}
                                >
                                  {inscrevendo ? 'Confirmando...' : opcao}
                                </button>
                              );
                            })}
                          </div>
                          {idade !== null && idade > 8 && (
                            <p className="tile__meta" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                              Faixa Cinza disponível apenas até 8 anos.
                            </p>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn--primary"
                          onClick={() => handleConfirmar(indice, undefined, proxima?.nome)}
                          disabled={inscrevendo || !extrasValidos}
                          style={{ marginTop: '1rem' }}
                        >
                          {inscrevendo ? 'Confirmando...' : 'Confirmar inscrição'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {erro && <p className="alert alert--error">{erro}</p>}
            </div>
          )}

          {resultado && (
            <div className="tile">
              <h3>{resultado.jaInscrito ? 'Você já está inscrito' : 'Inscrição confirmada'}</h3>
              <p>{resultado.nome}</p>
              {resultado.jaInscrito && (
                <p className="tile__meta">Encontramos uma inscrição sua para este evento com esse e-mail.</p>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <p className="tile__meta">Email: {resultado.email}</p>
                {novaFaixaConfirmada && (
                  <p className="tile__meta">
                    Faixa que vai: {novaFaixaConfirmada}
                    <span
                      className="faixa-retangulo"
                      style={{ background: buscarFaixaPorNome(novaFaixaConfirmada, faixas)?.cor || '#ccc' }}
                    />
                  </p>
                )}
                {formatarData(resultado.dataNascimento) && (
                  <p className="tile__meta">Nascimento: {formatarData(resultado.dataNascimento)}</p>
                )}
                {resultado.telefone && <p className="tile__meta">Telefone: {resultado.telefone}</p>}
                {resultado.responsavel && <p className="tile__meta">Responsável: {resultado.responsavel}</p>}
                {resultado.numeroCarteirinha && (
                  <p className="tile__meta">Carteirinha: {resultado.numeroCarteirinha}</p>
                )}
                {formatarData(resultado.validadeCarteirinha) && (
                  <p className="tile__meta">Validade da carteirinha: {formatarData(resultado.validadeCarteirinha)}</p>
                )}
              </div>

              {resultado.valorCobrado != null ? (
                <>
                  <p>Valor: R$ {Number(resultado.valorCobrado).toFixed(2)}</p>
                  {resultado.qrcodePix ? (
                    <div style={{ marginTop: '1rem' }}>
                      <button type="button" className="btn btn--ghost" onClick={() => setMostrarQrCode((v) => !v)}>
                        {mostrarQrCode ? 'Ocultar QR Code' : 'Ver QR Code'}
                      </button>

                      {mostrarQrCode && (
                        <div style={{ marginTop: '1rem' }}>
                          <p>Escaneie o QR code abaixo para pagar via Pix:</p>
                          <img src={resultado.qrcodePix} alt="QR code Pix" style={{ maxWidth: 260 }} />
                          <p className="tile__meta">Este QR code tem validade de 24 horas.</p>
                          {resultado.pixCopiaCola && (
                            <div style={{ marginTop: '1rem' }}>
                              <button type="button" className="btn btn--ghost" onClick={handleCopiarPix}>
                                {copiado ? 'Código copiado!' : 'Copiar código Pix'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="alert alert--error">
                      Não foi possível gerar o QR code de pagamento agora. Nossa equipe entrará em contato.
                    </p>
                  )}
                </>
              ) : resultado.statusPagamento === 'pago' ? (
                <p className="alert alert--success">Inscrição gratuita, sem pagamento necessário.</p>
              ) : (
                <p className="alert alert--error">
                  Ainda não foi possível calcular o valor da sua inscrição. Nossa equipe entrará em contato.
                </p>
              )}

              {resultado.aviso && <p className="alert alert--error">{resultado.aviso}</p>}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
