import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  descricao: '',
  ordem: '',
  ativo: true,
};

export default function TamanhoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/tamanhos/${id}`).then((res) => {
      const tamanho = res.data;
      setForm({
        descricao: tamanho.descricao,
        ordem: tamanho.ordem ?? '',
        ativo: tamanho.ativo,
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

    const payload = { ...form, ordem: form.ordem !== '' ? Number(form.ordem) : null };

    try {
      if (editando) {
        await api.put(`/admin/tamanhos/${id}`, payload);
      } else {
        await api.post('/admin/tamanhos', payload);
      }
      navigate('/admin/tamanhos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar tamanho.');
    }
  }

  return (
    <div>
      <Link to="/admin/tamanhos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar tamanho' : 'Novo tamanho'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3 align-items-end">
              <CCol md={5}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormInput name="descricao" value={form.descricao} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Ordem (opcional)</CFormLabel>
                <CFormInput type="number" name="ordem" value={form.ordem} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormCheck name="ativo" label="Ativo" checked={form.ativo} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar tamanho'}
              </CButton>
              <CButton as={Link} to="/admin/tamanhos" color="secondary" variant="outline">
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
