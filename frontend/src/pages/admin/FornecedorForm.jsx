import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';
import { formatarTelefone } from '../../utils/formato.js';

const estadoInicial = { nome: '', cnpjCpf: '', telefone: '', email: '', ativo: true };

export default function FornecedorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/fornecedores/${id}`).then((res) => {
      const fornecedor = res.data;
      setForm({
        nome: fornecedor.nome,
        cnpjCpf: fornecedor.cnpjCpf || '',
        telefone: formatarTelefone(fornecedor.telefone),
        email: fornecedor.email || '',
        ativo: fornecedor.ativo,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleTelefoneChange(event) {
    setForm((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    try {
      if (editando) {
        await api.put(`/admin/fornecedores/${id}`, form);
      } else {
        await api.post('/admin/fornecedores', form);
      }
      navigate('/admin/fornecedores');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar fornecedor.');
    }
  }

  return (
    <div>
      <Link to="/admin/fornecedores" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar fornecedor' : 'Novo fornecedor'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={5}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>CNPJ/CPF</CFormLabel>
                <CFormInput name="cnpjCpf" value={form.cnpjCpf} onChange={handleChange} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput name="telefone" value={form.telefone} onChange={handleTelefoneChange} placeholder="(11) 98888-7777" />
              </CCol>
              <CCol md={2} className="d-flex align-items-end">
                <CFormCheck name="ativo" label="Ativo" checked={form.ativo} onChange={handleChange} />
              </CCol>
              <CCol md={6}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" name="email" value={form.email} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar fornecedor'}
              </CButton>
              <CButton as={Link} to="/admin/fornecedores" color="secondary" variant="outline">
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
