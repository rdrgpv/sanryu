import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  descricao: '',
  corHex: '#CCCCCC',
  ativo: true,
};

export default function CorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/cores/${id}`).then((res) => {
      const cor = res.data;
      setForm({
        descricao: cor.descricao,
        corHex: cor.corHex || '#CCCCCC',
        ativo: cor.ativo,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editando) {
        await api.put(`/admin/cores/${id}`, form);
      } else {
        await api.post('/admin/cores', form);
      }
      navigate('/admin/cores');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar cor.');
    }
  }

  return (
    <div>
      <Link to="/admin/cores" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar cor' : 'Nova cor'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3 align-items-end">
              <CCol md={5}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormInput name="descricao" value={form.descricao} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Cor</CFormLabel>
                <div className="d-flex align-items-center gap-2">
                  <CFormInput
                    type="color"
                    name="corHex"
                    value={form.corHex}
                    onChange={handleChange}
                    style={{ width: '3rem', padding: '0.2rem' }}
                  />
                  <CFormInput name="corHex" value={form.corHex} onChange={handleChange} />
                </div>
              </CCol>
              <CCol md={4}>
                <CFormCheck name="ativo" label="Ativa" checked={form.ativo} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar cor'}
              </CButton>
              <CButton as={Link} to="/admin/cores" color="secondary" variant="outline">
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
