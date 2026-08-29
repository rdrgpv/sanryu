import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormCheck,
  CRow,
  CCol,
  CButton,
} from '@coreui/react';
import api from '../../services/api';

const CORES = [
  { nome: 'Branca', hex: '#FFFFFF' },
  { nome: 'Cinza', hex: '#808080' },
  { nome: 'Amarela', hex: '#FFFF00' },
  { nome: 'Laranja', hex: '#FFA500' },
  { nome: 'Vermelha', hex: '#FF2C2C' },
  { nome: 'Azul', hex: '#0000FF' },
  { nome: 'Verde', hex: '#008000' },
  { nome: 'Roxa', hex: '#800080' },
  { nome: 'Marrom', hex: '#8B4513' },
  { nome: 'Preta', hex: '#000000' },
  { nome: 'Branca/Vermelha', hex: 'linear-gradient(135deg, #FFFFFF 50%, #FF2C2C 50%)' },
];

const CORES_QUE_EXIGEM_GRAU = ['#000000', 'linear-gradient(135deg, #FFFFFF 50%, #FF2C2C 50%)'];

const estadoInicial = {
  nome: '',
  cor: CORES[0].hex,
  grau: '',
  ordem: 0,
  ativo: true,
  valorComCarteirinha: '',
  valorSemCarteirinha: '',
};

export default function FaixaForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  const grauObrigatorio = CORES_QUE_EXIGEM_GRAU.includes(form.cor);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/faixas/${id}`).then((res) => {
      const faixa = res.data;
      setForm({
        nome: faixa.nome,
        cor: faixa.cor,
        grau: faixa.grau ?? '',
        ordem: faixa.ordem,
        ativo: faixa.ativo,
        valorComCarteirinha: faixa.valorComCarteirinha ?? '',
        valorSemCarteirinha: faixa.valorSemCarteirinha ?? '',
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function selecionarCor(hex) {
    setForm((prev) => ({ ...prev, cor: hex }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = {
      ...form,
      ordem: Number(form.ordem),
      grau: grauObrigatorio && form.grau !== '' ? Number(form.grau) : null,
      valorComCarteirinha: form.valorComCarteirinha !== '' ? Number(form.valorComCarteirinha) : null,
      valorSemCarteirinha: form.valorSemCarteirinha !== '' ? Number(form.valorSemCarteirinha) : null,
    };

    try {
      if (editando) {
        await api.put(`/admin/faixas/${id}`, payload);
      } else {
        await api.post('/admin/faixas', payload);
      }
      navigate('/admin/faixas');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar faixa.');
    }
  }

  return (
    <div>
      <Link to="/admin/faixas" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar faixa' : 'Nova faixa'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Dan {grauObrigatorio ? '' : '(opcional)'}</CFormLabel>
                <CFormInput
                  type="number"
                  name="grau"
                  min="0"
                  value={form.grau}
                  onChange={handleChange}
                  required={grauObrigatorio}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Ordem</CFormLabel>
                <CFormInput type="number" name="ordem" value={form.ordem} onChange={handleChange} required />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck name="ativo" label="Ativa" checked={form.ativo} onChange={handleChange} />
              </CCol>

              <CCol md={3}>
                <CFormLabel>Valor do exame (com carteirinha)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  name="valorComCarteirinha"
                  value={form.valorComCarteirinha}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Valor do exame (sem carteirinha)</CFormLabel>
                <CFormInput
                  type="number"
                  step="0.01"
                  min="0"
                  name="valorSemCarteirinha"
                  value={form.valorSemCarteirinha}
                  onChange={handleChange}
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel className="d-block">Cor da faixa</CFormLabel>
                <div className="d-flex flex-wrap gap-2">
                  {CORES.map((cor) => (
                    <button
                      key={cor.nome}
                      type="button"
                      onClick={() => selecionarCor(cor.hex)}
                      title={cor.nome}
                      aria-label={cor.nome}
                      style={{
                        width: '2rem',
                        height: '2rem',
                        borderRadius: '50%',
                        background: cor.hex,
                        border: form.cor === cor.hex ? '2px solid #b23a2f' : '1px solid rgba(0,0,0,0.2)',
                        boxShadow: form.cor === cor.hex ? '0 0 0 2px #fff, 0 0 0 4px #b23a2f' : 'none',
                        cursor: 'pointer',
                      }}
                    />
                  ))}
                </div>
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar faixa'}
              </CButton>
              <CButton as={Link} to="/admin/faixas" color="secondary" variant="outline">
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
