import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormSelect, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  nome: '',
  email: '',
  telefone: '',
  dataNascimento: '',
  faixaId: '',
  ativo: true,
};

export default function AlunoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [faixas, setFaixas] = useState([]);
  const [erro, setErro] = useState(null);
  const [verificandoGatame, setVerificandoGatame] = useState(false);
  const [resultadoGatame, setResultadoGatame] = useState(null);

  useEffect(() => {
    api.get('/admin/faixas').then((res) => setFaixas(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/alunos/${id}`).then((res) => {
      const aluno = res.data;
      setForm({
        nome: aluno.nome,
        email: aluno.email,
        telefone: aluno.telefone || '',
        dataNascimento: aluno.dataNascimento || '',
        faixaId: aluno.faixaId || '',
        ativo: aluno.ativo,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  // Verifica se o aluno já existe no Gatame pelo email — independente de já ter passado pelo fluxo
  // de "cadastrar no Gatame" a partir de uma inscrição de evento.
  async function verificarGatame() {
    setVerificandoGatame(true);
    setResultadoGatame(null);

    try {
      const res = await api.get(`/admin/alunos/${id}/verificar-gatame`);
      setResultadoGatame(res.data);
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível consultar o Gatame agora.');
    } finally {
      setVerificandoGatame(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, faixaId: form.faixaId || null };

    try {
      if (editando) {
        await api.put(`/admin/alunos/${id}`, payload);
      } else {
        await api.post('/admin/alunos', payload);
      }
      navigate('/admin/alunos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar aluno.');
    }
  }

  return (
    <div>
      <Link to="/admin/alunos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar aluno' : 'Novo aluno'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" name="email" value={form.email} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput name="telefone" value={form.telefone} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Nascimento</CFormLabel>
                <CFormInput
                  type="date"
                  name="dataNascimento"
                  value={form.dataNascimento}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Faixa</CFormLabel>
                <CFormSelect name="faixaId" value={form.faixaId} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {faixas.map((faixa) => (
                    <option key={faixa.id} value={faixa.id}>
                      {faixa.nome}
                      {faixa.grau ? ` ${faixa.grau}º grau` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck name="ativo" label="Ativo" checked={form.ativo} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar aluno'}
              </CButton>
              <CButton as={Link} to="/admin/alunos" color="secondary" variant="outline">
                Cancelar
              </CButton>
              {editando && (
                <CButton type="button" color="info" variant="outline" disabled={verificandoGatame} onClick={verificarGatame}>
                  {verificandoGatame ? 'Verificando...' : 'Verificar no Gatame'}
                </CButton>
              )}
            </div>
            {erro && <div className="alert alert-danger mt-3">{erro}</div>}
            {resultadoGatame &&
              (resultadoGatame.apto ? (
                <div className="alert alert-success mt-3 mb-0">
                  <strong>Encontrado no Gatame.</strong>
                  <ul className="mb-0 mt-1 ps-3">
                    {resultadoGatame.candidatos.map((candidato, indice) => (
                      <li key={indice}>
                        {candidato.nome || form.nome} — Faixa {candidato.faixa || '?'}
                        {candidato.origem ? ` (${candidato.origem})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="alert alert-warning mt-3 mb-0">Não encontrado no Gatame.</div>
              ))}
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
}
