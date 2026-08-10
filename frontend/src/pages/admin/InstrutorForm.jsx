import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormTextarea, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  nome: '',
  faixa: 'Preta',
  especialidade: '',
  bio: '',
  fotoUrl: '',
};

export default function InstrutorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/instrutores/${id}`).then((res) => {
      const instrutor = res.data;
      setForm({
        nome: instrutor.nome,
        faixa: instrutor.faixa,
        especialidade: instrutor.especialidade || '',
        bio: instrutor.bio || '',
        fotoUrl: instrutor.fotoUrl || '',
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editando) {
        await api.put(`/admin/instrutores/${id}`, form);
      } else {
        await api.post('/admin/instrutores', form);
      }
      navigate('/admin/instrutores');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar instrutor.');
    }
  }

  return (
    <div>
      <Link to="/admin/instrutores" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar instrutor' : 'Novo instrutor'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Faixa</CFormLabel>
                <CFormInput name="faixa" value={form.faixa} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Especialidade</CFormLabel>
                <CFormInput name="especialidade" value={form.especialidade} onChange={handleChange} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Foto (URL)</CFormLabel>
                <CFormInput name="fotoUrl" value={form.fotoUrl} onChange={handleChange} />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Bio</CFormLabel>
                <CFormTextarea name="bio" rows={2} value={form.bio} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar instrutor'}
              </CButton>
              <CButton as={Link} to="/admin/instrutores" color="secondary" variant="outline">
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
