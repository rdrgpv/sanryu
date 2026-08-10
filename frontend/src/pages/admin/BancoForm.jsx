import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormSelect, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const TIPOS_CHAVE = ['cpf', 'cnpj', 'email', 'telefone', 'aleatoria'];

const estadoInicial = { nome: '', chavePix: '', tipoChave: TIPOS_CHAVE[2], titular: '', cidade: '' };

export default function BancoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/bancos/${id}`).then((res) => {
      const banco = res.data;
      setForm({
        nome: banco.nome,
        chavePix: banco.chavePix,
        tipoChave: banco.tipoChave,
        titular: banco.titular,
        cidade: banco.cidade,
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
        await api.put(`/admin/bancos/${id}`, form);
      } else {
        await api.post('/admin/bancos', form);
      }
      navigate('/admin/bancos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar configuração Pix.');
    }
  }

  return (
    <div>
      <Link to="/admin/bancos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar configuração Pix' : 'Nova configuração Pix'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Titular</CFormLabel>
                <CFormInput name="titular" value={form.titular} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tipo de chave</CFormLabel>
                <CFormSelect name="tipoChave" value={form.tipoChave} onChange={handleChange} required>
                  {TIPOS_CHAVE.map((tipo) => (
                    <option key={tipo} value={tipo}>
                      {tipo}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Chave Pix</CFormLabel>
                <CFormInput name="chavePix" value={form.chavePix} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Cidade</CFormLabel>
                <CFormInput name="cidade" value={form.cidade} onChange={handleChange} required />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar configuração'}
              </CButton>
              <CButton as={Link} to="/admin/bancos" color="secondary" variant="outline">
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
