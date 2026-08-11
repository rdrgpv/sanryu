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
  CRow,
  CCol,
  CButton,
} from '@coreui/react';
import api from '../../services/api';

const STATUS = ['agendado', 'realizado', 'cancelado'];
const BANNER_TAMANHO_MAXIMO = 4 * 1024 * 1024;

const estadoInicial = {
  nome: '',
  slug: '',
  descricao: '',
  tipoEventoId: '',
  data: '',
  local: '',
  status: STATUS[0],
  valor: '',
  publicado: false,
  banner: '',
};

function paraInputDatetime(iso) {
  if (!iso) return '';
  const data = new Date(iso);
  const offsetMs = data.getTimezoneOffset() * 60000;
  return new Date(data.getTime() - offsetMs).toISOString().slice(0, 16);
}

export default function EventoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [tiposEvento, setTiposEvento] = useState([]);
  const [erro, setErro] = useState(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  useEffect(() => {
    api.get('/admin/tipos-evento').then((res) => setTiposEvento(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/eventos/${id}`).then((res) => {
      const evento = res.data;
      setForm({
        nome: evento.nome,
        slug: evento.slug || '',
        descricao: evento.descricao || '',
        tipoEventoId: evento.tipoEventoId,
        data: paraInputDatetime(evento.data),
        local: evento.local || '',
        status: evento.status,
        valor: evento.valor ?? '',
        publicado: evento.publicado,
        banner: evento.banner || '',
      });
    });
  }, [id, editando]);

  const tipoSelecionado = tiposEvento.find((tipo) => String(tipo.id) === String(form.tipoEventoId));
  const mostrarValor = Boolean(tipoSelecionado?.cobravel) && Number(form.tipoEventoId) !== 1;

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    // Ao escolher o tipo num evento novo, pré-preenche o valor com o padrão cadastrado
    // no tipo — só não editando, pra não sobrescrever um valor já definido.
    if (name === 'tipoEventoId' && !editando) {
      const tipo = tiposEvento.find((t) => String(t.id) === value);
      setForm((prev) => ({
        ...prev,
        tipoEventoId: value,
        valor: tipo?.valor != null ? String(tipo.valor) : prev.valor,
      }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  function handleBannerChange(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > BANNER_TAMANHO_MAXIMO) {
      setErro('A imagem do banner deve ter no máximo 4MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, banner: reader.result }));
    reader.readAsDataURL(file);
  }

  function removerBanner() {
    setForm((prev) => ({ ...prev, banner: '' }));
  }

  async function handleCopiarLink(link) {
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch (err) {
      setErro('Não foi possível copiar o link. Copie manualmente.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = {
      ...form,
      slug: form.slug.trim() || null,
      tipoEventoId: Number(form.tipoEventoId),
      valor: mostrarValor && form.valor !== '' ? Number(form.valor) : null,
    };

    try {
      if (editando) {
        await api.put(`/admin/eventos/${id}`, payload);
      } else {
        await api.post('/admin/eventos', payload);
      }
      navigate('/admin/eventos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar evento.');
    }
  }

  return (
    <div>
      <Link to="/admin/eventos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar evento' : 'Novo evento'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={5}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Link amigável (slug)</CFormLabel>
                <CFormInput
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="gerado automaticamente a partir do nome"
                />
              </CCol>
            </CRow>

            <CRow className="g-3 mt-0">
              <CCol md={4}>
                <CFormLabel>Tipo de evento</CFormLabel>
                <CFormSelect name="tipoEventoId" value={form.tipoEventoId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {tiposEvento.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CFormLabel>Status</CFormLabel>
                <CFormSelect name="status" value={form.status} onChange={handleChange}>
                  {STATUS.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={4}>
                <CFormLabel>Data e hora</CFormLabel>
                <CFormInput type="datetime-local" name="data" value={form.data} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Local</CFormLabel>
                <CFormInput name="local" value={form.local} onChange={handleChange} />
              </CCol>
              {mostrarValor && (
                <CCol md={2}>
                  <CFormLabel>Valor</CFormLabel>
                  <CFormInput type="number" step="0.01" min="0" name="valor" value={form.valor} onChange={handleChange} />
                </CCol>
              )}
              <CCol md={2} className="d-flex align-items-end">
                <CFormCheck name="publicado" label="Publicado" checked={form.publicado} onChange={handleChange} />
              </CCol>

              <CCol xs={12}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormTextarea name="descricao" rows={3} value={form.descricao} onChange={handleChange} />
              </CCol>

              <CCol xs={12}>
                <CFormLabel>Banner do evento</CFormLabel>
                <CFormInput type="file" accept="image/*" onChange={handleBannerChange} />
                {form.banner && (
                  <div className="mt-2">
                    <img src={form.banner} alt="Prévia do banner" style={{ maxWidth: '100%', maxHeight: 160, display: 'block' }} className="mb-2" />
                    <CButton color="secondary" variant="outline" size="sm" onClick={removerBanner}>
                      Remover banner
                    </CButton>
                  </div>
                )}
              </CCol>
            </CRow>

            {editando && (
              <div className="mt-3">
                <CFormLabel>Link de inscrição</CFormLabel>
                <div className="d-flex gap-2">
                  <CFormInput readOnly value={`${window.location.origin}/eventos/${form.slug || id}`} />
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    className="text-nowrap"
                    onClick={() => handleCopiarLink(`${window.location.origin}/eventos/${form.slug || id}`)}
                  >
                    {linkCopiado ? 'Copiado!' : 'Copiar link'}
                  </CButton>
                </div>
              </div>
            )}

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar evento'}
              </CButton>
              <CButton as={Link} to="/admin/eventos" color="secondary" variant="outline">
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
