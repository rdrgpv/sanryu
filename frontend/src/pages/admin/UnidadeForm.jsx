import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';
import { formatarTelefone } from '../../utils/formato.js';

const estadoInicial = { nome: '', telefone: '', endereco: '', ativo: true };

export default function UnidadeForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/unidades/${id}`).then((res) => {
      const unidade = res.data;
      setForm({
        nome: unidade.nome,
        telefone: unidade.telefone || '',
        endereco: unidade.endereco || '',
        ativo: unidade.ativo,
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
        await api.put(`/admin/unidades/${id}`, form);
      } else {
        await api.post('/admin/unidades', form);
      }
      navigate('/admin/unidades');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar unidade.');
    }
  }

  return (
    <div>
      <Link to="/admin/unidades" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar unidade' : 'Nova unidade'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={5}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput
                  inputMode="numeric"
                  value={form.telefone}
                  onChange={(event) => setForm((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }))}
                />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck name="ativo" label="Ativa" checked={form.ativo} onChange={handleChange} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Endereço</CFormLabel>
                <CFormInput name="endereco" value={form.endereco} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar unidade'}
              </CButton>
              <CButton as={Link} to="/admin/unidades" color="secondary" variant="outline">
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
