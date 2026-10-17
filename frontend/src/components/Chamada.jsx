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
