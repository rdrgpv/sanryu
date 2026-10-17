import { useEffect, useState } from 'react';
import api from '../services/api';

function hoje() {
  return new Date().toLocaleDateString('sv-SE');
}

// Chamada de uma turma num dia: toque no aluno alterna presente/ausente, "Salvar" grava tudo de uma
// vez. Usada pelo sensei no celular (/sensei) e pelo admin (/admin/turmas/:id/chamada) — o backend
// é o mesmo (/api/sensei), que já confere se a turma é de quem está logado.
export default function Chamada({ turmaId }) {
  const [data, setData] = useState(hoje());
  const [chamada, setChamada] = useState(null);
  const [presentes, setPresentes] = useState(new Set());
  const [observacoes, setObservacoes] = useState('');
  const [alterado, setAlterado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState(null);
  // Chamada por foto: quem foi marcado pelo reconhecimento (pra destacar) e o andamento/resultado.
  const [pelaFoto, setPelaFoto] = useState(new Set());
  const [processandoFoto, setProcessandoFoto] = useState(null);
  const [resultadoFoto, setResultadoFoto] = useState(null);

  useEffect(() => {
    setChamada(null);
    setMensagem(null);
    api
      .get(`/sensei/turmas/${turmaId}/chamada`, { params: { data } })
      .then((res) => {
        setChamada(res.data);
        setPresentes(new Set(res.data.alunos.filter((aluno) => aluno.presente).map((aluno) => aluno.id)));
        setObservacoes(res.data.observacoes || '');
        setAlterado(false);
        setPelaFoto(new Set());
        setResultadoFoto(null);
      })
      .catch((err) => setMensagem({ tipo: 'erro', texto: err.response?.data?.error || 'Não foi possível carregar a chamada.' }));
  }, [turmaId, data]);

  function alternar(alunoId) {
    setPresentes((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(alunoId)) proximo.delete(alunoId);
      else proximo.add(alunoId);
      return proximo;
    });
    setAlterado(true);
    setMensagem(null);
  }

  function marcarTodos(presente) {
    setPresentes(presente ? new Set(chamada.alunos.map((aluno) => aluno.id)) : new Set());
    setAlterado(true);
  }

  // Junta os reconhecidos aos já marcados (dá pra tirar mais de uma foto, de ângulos diferentes).
  async function handleFotoTurma(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    setMensagem(null);
    setProcessandoFoto('Preparando...');
    try {
      const { reconhecerAlunos } = await import('../utils/reconhecimentoFacial.js');
      const resultado = await reconhecerAlunos(arquivo, chamada.alunos, setProcessandoFoto);
      const ids = resultado.reconhecidos.map((item) => item.alunoId);
      setPresentes((prev) => new Set([...prev, ...ids]));
      setPelaFoto((prev) => new Set([...prev, ...ids]));
      setResultadoFoto(resultado);
      if (ids.length > 0) setAlterado(true);
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: 'Não foi possível analisar a foto neste aparelho. Faça a chamada manualmente.' });
    } finally {
      setProcessandoFoto(null);
    }
  }

  async function salvar() {
    setSalvando(true);
    setMensagem(null);
    try {
      await api.put(`/sensei/turmas/${turmaId}/chamada`, { data, presentes: [...presentes], observacoes });
      setAlterado(false);
      setChamada((prev) => ({ ...prev, chamadaFeita: true }));
      setMensagem({ tipo: 'ok', texto: `Chamada salva: ${presentes.size} presente(s).` });
    } catch (err) {
      setMensagem({ tipo: 'erro', texto: err.response?.data?.error || 'Não foi possível salvar a chamada.' });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="chamada">
      <div className="chamada__topo">
        <div>
          <h2 className="chamada__titulo">{chamada?.turma.nome || 'Carregando...'}</h2>
          {chamada && (
            <p className="chamada__meta">
              {chamada.turma.horaInicio}–{chamada.turma.horaFim}
              {chamada.turma.unidade ? ` · ${chamada.turma.unidade}` : ''}
              {chamada.chamadaFeita && !alterado ? ' · chamada feita' : ''}
            </p>
          )}
        </div>
        <input type="date" className="chamada__data" value={data} max={hoje()} onChange={(event) => setData(event.target.value)} />
      </div>

      {chamada && (
        <>
          <div className="chamada__resumo">
            <span>
              <strong>{presentes.size}</strong> de {chamada.alunos.length} presentes
            </span>
            <span className="chamada__atalhos">
              <button type="button" onClick={() => marcarTodos(true)}>
                todos
              </button>
              <button type="button" onClick={() => marcarTodos(false)}>
                limpar
              </button>
            </span>
          </div>

          {chamada.alunos.some((aluno) => aluno.reconhecimentoPermitido) && (
            <div className="chamada__foto-turma">
              <label className={`btn btn--ghost btn--bloco${processandoFoto ? ' chamada__foto-turma--ocupado' : ''}`}>
                {processandoFoto || '📷 Chamada por foto'}
                <input type="file" accept="image/*" capture="environment" hidden onChange={handleFotoTurma} disabled={!!processandoFoto} />
              </label>
              {resultadoFoto && (
                <p className="chamada__foto-resultado">
                  {resultadoFoto.rostosNaFoto} rosto(s) na foto · <strong>{resultadoFoto.reconhecidos.length} reconhecido(s)</strong>
                  {resultadoFoto.rostosSemCorrespondencia > 0 && ` · ${resultadoFoto.rostosSemCorrespondencia} sem correspondência`}
                  . Confira a lista antes de salvar — dá para tirar outra foto para pegar quem faltou.
                  {resultadoFoto.semRostoNoCadastro.length > 0 && (
                    <span className="chamada__foto-alerta">
                      Foto do cadastro sem rosto visível: {resultadoFoto.semRostoNoCadastro.join(', ')}.
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {chamada.alunos.length === 0 && <p className="chamada__vazio">Nenhum aluno ativo matriculado nesta turma.</p>}

          <ul className="chamada__lista">
            {chamada.alunos.map((aluno) => {
              const presente = presentes.has(aluno.id);
              return (
                <li key={aluno.id}>
                  <button
                    type="button"
                    className={`chamada__aluno${presente ? ' chamada__aluno--presente' : ''}`}
                    onClick={() => alternar(aluno.id)}
                    aria-pressed={presente}
                  >
                    <span className="chamada__foto">
                      {aluno.foto ? <img src={aluno.foto} alt="" /> : aluno.nome.slice(0, 1)}
                    </span>
                    <span className="chamada__nome">
                      {aluno.nome}
                      <span className="chamada__detalhes">
                        {aluno.faixa && (
                          <span className="chamada__faixa" style={{ background: aluno.faixa.cor }} title={aluno.faixa.nome} />
                        )}
                        {aluno.faixa?.nome}
                        {aluno.mensalidadeEmAtraso && <span className="chamada__aviso">mensalidade em atraso</span>}
                        {aluno.foraDaTurma && <span className="chamada__aviso">saiu da turma</span>}
                        {pelaFoto.has(aluno.id) && presente && <span className="chamada__pela-foto">pela foto</span>}
                      </span>
                      {aluno.atencaoSaude && <span className="chamada__saude">⚠ {aluno.atencaoSaude}</span>}
                    </span>
                    <span className="chamada__marca">{presente ? '✓' : ''}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          <label className="chamada__obs">
            <span>Observações da aula</span>
            <textarea rows={2} value={observacoes} onChange={(event) => { setObservacoes(event.target.value); setAlterado(true); }} />
          </label>

          {mensagem && <p className={`alert ${mensagem.tipo === 'ok' ? 'alert--success' : 'alert--error'}`}>{mensagem.texto}</p>}

          <div className="chamada__rodape">
            <button type="button" className="btn btn--primary btn--bloco" onClick={salvar} disabled={salvando || (!alterado && chamada.chamadaFeita)}>
              {salvando ? 'Salvando...' : chamada.chamadaFeita && !alterado ? 'Chamada salva' : 'Salvar chamada'}
            </button>
          </div>
        </>
      )}

      {!chamada && mensagem && <p className="alert alert--error">{mensagem.texto}</p>}
    </div>
  );
}
