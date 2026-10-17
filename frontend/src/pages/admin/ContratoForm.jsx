import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import {
  CCard,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CInputGroup,
  CInputGroupText,
  CRow,
  CCol,
  CButton,
} from '@coreui/react';
import api from '../../services/api';
import { formatarMoeda } from '../../utils/formato.js';
import { labelPeriodicidade } from '../../utils/planos.js';

const DIAS_VENCIMENTO = Array.from({ length: 28 }, (_, indice) => indice + 1);

function hoje() {
  return new Date().toLocaleDateString('sv-SE');
}

export default function ContratoForm() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState({
    alunoId: searchParams.get('alunoId') || '',
    planoId: '',
    dataInicio: hoje(),
    diaVencimento: '10',
    bolsaPercentual: '0',
    motivoBolsa: '',
    observacoes: '',
  });
  const [alunos, setAlunos] = useState([]);
  const [planos, setPlanos] = useState([]);
  const [previa, setPrevia] = useState(null);
  const [erroPrevia, setErroPrevia] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/alunos', { params: { situacao: 'ativo' } }).then((res) => setAlunos(res.data));
    api.get('/admin/planos').then((res) => setPlanos(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/contratos/${id}`).then((res) => {
      const contrato = res.data;
      setForm({
        alunoId: String(contrato.alunoId),
        planoId: String(contrato.planoId),
        dataInicio: contrato.dataInicio,
        diaVencimento: String(contrato.diaVencimento),
        bolsaPercentual: String(Number(contrato.bolsaPercentual)),
        motivoBolsa: contrato.motivoBolsa || '',
        observacoes: contrato.observacoes || '',
      });
      // Editando, o aluno pode já não estar "ativo" na lista — garante que ele apareça no combo.
      setAlunos((prev) => (prev.some((aluno) => aluno.id === contrato.aluno.id) ? prev : [...prev, contrato.aluno]));
    });
  }, [id, editando]);

  const alunoSelecionado = alunos.find((aluno) => String(aluno.id) === String(form.alunoId));
  // Só planos ativos que valem pra unidade do aluno (ou pra todas). Editando, mantém o plano atual.
  const planosDisponiveis = planos.filter(
    (plano) =>
      (plano.ativo || String(plano.id) === form.planoId) &&
      (!plano.unidadeId || !alunoSelecionado || plano.unidadeId === alunoSelecionado.unidadeId)
  );

  // Prévia do valor (com desconto família e bolsa) calculada pelo backend — mesma regra que grava.
  useEffect(() => {
    setPrevia(null);
    setErroPrevia(null);
    if (!form.alunoId || !form.planoId || !form.diaVencimento) return;

    const timeout = setTimeout(() => {
      api
        .post('/admin/contratos/simular', {
          ...form,
          bolsaPercentual: Number(form.bolsaPercentual) || 0,
          // A prévia não deve travar enquanto o motivo ainda está sendo digitado — o motivo só é
          // exigido de verdade ao salvar.
          motivoBolsa: form.motivoBolsa || (Number(form.bolsaPercentual) > 0 ? '-' : ''),
          contratoId: editando ? id : undefined,
        })
        .then((res) => setPrevia(res.data))
        .catch((err) => setErroPrevia(err.response?.data?.error || null));
    }, 300);

    return () => clearTimeout(timeout);
  }, [form, editando, id]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, bolsaPercentual: Number(form.bolsaPercentual) || 0, diaVencimento: Number(form.diaVencimento) };

    try {
      const res = editando ? await api.put(`/admin/contratos/${id}`, payload) : await api.post('/admin/contratos', payload);
      navigate(`/admin/contratos/${res.data.id}`);
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar contrato.');
    }
  }

  const temBolsa = Number(form.bolsaPercentual) > 0;

  return (
    <div>
      <Link to="/admin/contratos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar contrato' : 'Novo contrato'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Aluno</CFormLabel>
                <CFormSelect name="alunoId" value={form.alunoId} onChange={handleChange} disabled={editando} required>
                  <option value="">Selecione</option>
                  {alunos.map((aluno) => (
                    <option key={aluno.id} value={aluno.id}>
                      {aluno.nome}
                      {aluno.responsavel ? ` — resp.: ${aluno.responsavel.nome}` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={6}>
                <CFormLabel>Plano</CFormLabel>
                <CFormSelect name="planoId" value={form.planoId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {planosDisponiveis.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} — {labelPeriodicidade(plano.periodicidade)} — {formatarMoeda(plano.valor)}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Início</CFormLabel>
                <CFormInput type="date" name="dataInicio" value={form.dataInicio} onChange={handleChange} required />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Dia de vencimento</CFormLabel>
                <CFormSelect name="diaVencimento" value={form.diaVencimento} onChange={handleChange}>
                  {DIAS_VENCIMENTO.map((dia) => (
                    <option key={dia} value={dia}>
                      Dia {dia}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={2}>
                <CFormLabel>Bolsa</CFormLabel>
                <CInputGroup>
                  <CFormInput type="number" min="0" max="100" step="1" name="bolsaPercentual" value={form.bolsaPercentual} onChange={handleChange} />
                  <CInputGroupText>%</CInputGroupText>
                </CInputGroup>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Motivo da bolsa {temBolsa && '*'}</CFormLabel>
                <CFormInput name="motivoBolsa" value={form.motivoBolsa} onChange={handleChange} disabled={!temBolsa} required={temBolsa} />
              </CCol>
              <CCol md={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} name="observacoes" value={form.observacoes} onChange={handleChange} />
              </CCol>
            </CRow>

            {previa && (
              <div className="border rounded p-3 mt-4 bg-body-tertiary">
                <div className="d-flex justify-content-between">
                  <span>Valor do plano</span>
                  <span>{formatarMoeda(previa.valorPlano)}</span>
                </div>
                {previa.descontoFamiliaPercentual > 0 && (
                  <div className="d-flex justify-content-between text-success">
                    <span>Desconto família (já tem irmão matriculado)</span>
                    <span>−{previa.descontoFamiliaPercentual}%</span>
                  </div>
                )}
                {previa.bolsaPercentual > 0 && (
                  <div className="d-flex justify-content-between text-success">
                    <span>Bolsa</span>
                    <span>−{previa.bolsaPercentual}%</span>
                  </div>
                )}
                <div className="d-flex justify-content-between fw-bold border-top mt-2 pt-2">
                  <span>Valor final por período</span>
                  <span>{formatarMoeda(previa.valorFinal)}</span>
                </div>
              </div>
            )}
            {erroPrevia && <div className="alert alert-warning mt-3 mb-0">{erroPrevia}</div>}

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Criar contrato'}
              </CButton>
              <CButton as={Link} to="/admin/contratos" color="secondary" variant="outline">
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
