import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormTextarea, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';
import { formatarCpf, cpfValido, formatarTelefone } from '../../utils/formato.js';

const estadoInicial = { nome: '', cpf: '', telefone: '', email: '', observacoes: '' };

export default function ResponsavelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [alunos, setAlunos] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/responsaveis/${id}`).then((res) => {
      const responsavel = res.data;
      setForm({
        nome: responsavel.nome,
        cpf: responsavel.cpf || '',
        telefone: responsavel.telefone || '',
        email: responsavel.email || '',
        observacoes: responsavel.observacoes || '',
      });
      setAlunos(responsavel.alunos || []);
    });
  }, [id, editando]);

  function atualizar(campo, valor) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    if (form.cpf && !cpfValido(form.cpf)) {
      setErro('CPF inválido.');
      return;
    }

    try {
      if (editando) {
        await api.put(`/admin/responsaveis/${id}`, form);
      } else {
        await api.post('/admin/responsaveis', form);
      }
      navigate('/admin/responsaveis');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar responsável.');
    }
  }

  return (
    <div>
      <Link to="/admin/responsaveis" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar responsável' : 'Novo responsável'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Nome completo</CFormLabel>
                <CFormInput value={form.nome} onChange={(event) => atualizar('nome', event.target.value)} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>CPF</CFormLabel>
                <CFormInput
                  inputMode="numeric"
                  value={form.cpf}
                  onChange={(event) => atualizar('cpf', formatarCpf(event.target.value))}
                  invalid={form.cpf.length === 14 && !cpfValido(form.cpf)}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput
                  inputMode="numeric"
                  value={form.telefone}
                  onChange={(event) => atualizar('telefone', formatarTelefone(event.target.value))}
                />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" value={form.email} onChange={(event) => atualizar('email', event.target.value)} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} value={form.observacoes} onChange={(event) => atualizar('observacoes', event.target.value)} />
              </CCol>
            </CRow>

            {editando && (
              <div className="mt-4">
                <h2 className="h6">Alunos sob responsabilidade</h2>
                {alunos.length === 0 ? (
                  <p className="text-body-secondary small mb-0">Nenhum aluno ligado a este responsável.</p>
                ) : (
                  <ul className="mb-0">
                    {alunos.map((aluno) => (
                      <li key={aluno.id}>
                        <Link to={`/admin/alunos/${aluno.id}/editar`}>{aluno.nome}</Link>
                        {aluno.parentescoResponsavel && <span className="text-body-secondary"> — {aluno.parentescoResponsavel}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar responsável'}
              </CButton>
              <CButton as={Link} to="/admin/responsaveis" color="secondary" variant="outline">
                Cancelar
              </CButton>
            </div>
            {erro && <div className="alert alert-danger mt-3">{erro}</div>}
          </CForm>
        </CCardBody>
      </CCard>
    </div>
  );
}
