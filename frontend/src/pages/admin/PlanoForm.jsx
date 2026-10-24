import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CInputGroup,
  CInputGroupText,
  CRow,
  CCol,
  CButton,
} from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';
import { PERIODICIDADES, mesesPeriodicidade } from '../../utils/planos.js';

const estadoInicial = { nome: '', descricao: '', periodicidade: 'mensal', valor: '', unidadeId: '', ativo: true, exibirNoSite: true };

export default function PlanoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [unidades, setUnidades] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/unidades').then((res) => setUnidades(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/planos/${id}`).then((res) => {
      const plano = res.data;
      setForm({
        nome: plano.nome,
        descricao: plano.descricao || '',
        periodicidade: plano.periodicidade,
        valor: plano.valor,
        unidadeId: plano.unidadeId || '',
        ativo: plano.ativo,
        exibirNoSite: plano.exibirNoSite !== false,
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

    const payload = { ...form, valor: Number(form.valor), unidadeId: form.unidadeId || null };

    try {
      if (editando) {
        await api.put(`/admin/planos/${id}`, payload);
      } else {
        await api.post('/admin/planos', payload);
      }
      navigate('/admin/planos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar plano.');
    }
  }

  const meses = mesesPeriodicidade(form.periodicidade);

  return (
    <div>
      <Link to="/admin/planos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar plano' : 'Novo plano'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={5}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} placeholder="Ex.: Kids 2x por semana" required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Periodicidade</CFormLabel>
                <CFormSelect name="periodicidade" value={form.periodicidade} onChange={handleChange}>
                  {PERIODICIDADES.map((item) => (
                    <option key={item.valor} value={item.valor}>
                      {item.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Valor por período</CFormLabel>
                <CInputGroup>
                  <CInputGroupText>R$</CInputGroupText>
                  <CFormInput type="number" step="0.01" min="0" name="valor" value={form.valor} onChange={handleChange} required />
                </CInputGroup>
                {meses > 1 && Number(form.valor) > 0 && (
                  <small className="text-body-secondary">Equivale a {formatarMoeda(Number(form.valor) / meses)} por mês.</small>
                )}
              </CCol>
              <CCol md={5}>
                <CFormLabel>Unidade</CFormLabel>
                <CFormSelect name="unidadeId" value={form.unidadeId} onChange={handleChange}>
                  <option value="">Todas as unidades</option>
                  {unidades.map((unidade) => (
                    <option key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck name="ativo" label="Ativo (disponível para novas matrículas)" checked={form.ativo} onChange={handleChange} />
              </CCol>
              <CCol md={4} className="d-flex align-items-end">
                <CFormCheck name="exibirNoSite" label="Mostrar na página Planos do site" checked={form.exibirNoSite} onChange={handleChange} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormTextarea rows={2} name="descricao" value={form.descricao} onChange={handleChange} />
              </CCol>
            </CRow>

            {editando && (
              <p className="text-body-secondary small mt-3 mb-0">
                Alterar o valor vale só para novos contratos — os já feitos mantêm o valor da época.
              </p>
            )}

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar plano'}
              </CButton>
              <CButton as={Link} to="/admin/planos" color="secondary" variant="outline">
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
