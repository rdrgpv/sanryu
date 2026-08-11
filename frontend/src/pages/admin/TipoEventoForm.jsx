import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = { nome: '', cobravel: false, valor: '' };

export default function TipoEventoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/tipos-evento/${id}`).then((res) => {
      setForm({ nome: res.data.nome, cobravel: res.data.cobravel, valor: res.data.valor ?? '' });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, valor: form.cobravel && form.valor !== '' ? Number(form.valor) : null };

    try {
      if (editando) {
        await api.put(`/admin/tipos-evento/${id}`, payload);
      } else {
        await api.post('/admin/tipos-evento', payload);
      }
      navigate('/admin/tipos-evento');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar tipo de evento.');
    }
  }

  return (
    <div>
      <Link to="/admin/tipos-evento" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar tipo de evento' : 'Novo tipo de evento'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={5}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={3} className="d-flex align-items-end">
                <CFormCheck name="cobravel" label="Cobrável" checked={form.cobravel} onChange={handleChange} />
              </CCol>
              {form.cobravel && (
                <CCol md={4}>
                  <CFormLabel>Valor padrão</CFormLabel>
                  <CFormInput
                    type="number"
                    step="0.01"
                    min="0"
                    name="valor"
                    value={form.valor}
                    onChange={handleChange}
                  />
                </CCol>
              )}
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar tipo de evento'}
              </CButton>
              <CButton as={Link} to="/admin/tipos-evento" color="secondary" variant="outline">
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
