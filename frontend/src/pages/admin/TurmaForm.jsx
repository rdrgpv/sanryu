import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormSelect, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  nome: '',
  modalidade: '',
  nivel: 'Todos os níveis',
  instrutorId: '',
  diaSemana: '',
  horaInicio: '',
  horaFim: '',
  vagas: 20,
};

export default function TurmaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [instrutores, setInstrutores] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/instrutores').then((res) => setInstrutores(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/turmas/${id}`).then((res) => {
      const turma = res.data;
      setForm({
        nome: turma.nome,
        modalidade: turma.modalidade,
        nivel: turma.nivel,
        instrutorId: turma.instrutorId || '',
        diaSemana: turma.diaSemana,
        horaInicio: turma.horaInicio,
        horaFim: turma.horaFim,
        vagas: turma.vagas,
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

    const payload = { ...form, vagas: Number(form.vagas), instrutorId: form.instrutorId || null };

    try {
      if (editando) {
        await api.put(`/admin/turmas/${id}`, payload);
      } else {
        await api.post('/admin/turmas', payload);
      }
      navigate('/admin/turmas');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar turma.');
    }
  }

  return (
    <div>
      <Link to="/admin/turmas" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar turma' : 'Nova turma'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Modalidade</CFormLabel>
                <CFormInput name="modalidade" value={form.modalidade} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Nível</CFormLabel>
                <CFormInput name="nivel" value={form.nivel} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Instrutor</CFormLabel>
                <CFormSelect name="instrutorId" value={form.instrutorId} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {instrutores.map((instrutor) => (
                    <option key={instrutor.id} value={instrutor.id}>
                      {instrutor.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Dias (ex: Segunda,Quarta)</CFormLabel>
                <CFormInput name="diaSemana" value={form.diaSemana} onChange={handleChange} required />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Início</CFormLabel>
                <CFormInput type="time" name="horaInicio" value={form.horaInicio} onChange={handleChange} required />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Fim</CFormLabel>
                <CFormInput type="time" name="horaFim" value={form.horaFim} onChange={handleChange} required />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Vagas</CFormLabel>
                <CFormInput type="number" name="vagas" min="1" value={form.vagas} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar turma'}
              </CButton>
              <CButton as={Link} to="/admin/turmas" color="secondary" variant="outline">
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
