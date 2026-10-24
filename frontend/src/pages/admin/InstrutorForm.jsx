import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormSelect, CFormTextarea, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';
import { reduzirImagem } from '../../utils/imagem.js';

const estadoInicial = {
  nome: '',
  faixaId: '',
  email: '',
  especialidade: '',
  bio: '',
  foto: '',
  titulos: [],
  exibirNoSite: false,
};

export default function InstrutorForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [novoTitulo, setNovoTitulo] = useState('');
  const [faixas, setFaixas] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/faixas').then((res) => setFaixas(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/instrutores/${id}`).then((res) => {
      const instrutor = res.data;
      setForm({
        nome: instrutor.nome,
        faixaId: instrutor.faixaId || '',
        email: instrutor.email || '',
        especialidade: instrutor.especialidade || '',
        bio: instrutor.bio || '',
        // Fotos antigas eram só URL; a enviada aqui substitui.
        foto: instrutor.foto || instrutor.fotoUrl || '',
        titulos: instrutor.titulos || [],
        exibirNoSite: !!instrutor.exibirNoSite,
      });
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function escolherFoto(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;

    try {
      const foto = await reduzirImagem(arquivo, 600, 0.85);
      setForm((prev) => ({ ...prev, foto }));
    } catch (err) {
      setErro(err.message);
    }
  }

  function adicionarTitulo() {
    const titulo = novoTitulo.trim();
    if (!titulo) return;
    setForm((prev) => ({ ...prev, titulos: [...prev.titulos, titulo] }));
    setNovoTitulo('');
  }

  function alterarTitulo(indice, valor) {
    setForm((prev) => ({ ...prev, titulos: prev.titulos.map((item, i) => (i === indice ? valor : item)) }));
  }

  function moverTitulo(indice, direcao) {
    setForm((prev) => {
      const titulos = [...prev.titulos];
      const destino = indice + direcao;
      if (destino < 0 || destino >= titulos.length) return prev;
      [titulos[indice], titulos[destino]] = [titulos[destino], titulos[indice]];
      return { ...prev, titulos };
    });
  }

  function removerTitulo(indice) {
    setForm((prev) => ({ ...prev, titulos: prev.titulos.filter((_, i) => i !== indice) }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    // O que ficou digitado no campo de novo título também entra (evita perder ao esquecer o "Adicionar").
    const titulos = [...form.titulos, novoTitulo].map((item) => item.trim()).filter(Boolean);
    const ehDataUrl = form.foto.startsWith('data:');
    const payload = {
      ...form,
      faixaId: form.faixaId || null,
      titulos,
      foto: ehDataUrl ? form.foto : null,
      fotoUrl: ehDataUrl ? null : form.foto || null,
    };

    try {
      if (editando) {
        await api.put(`/admin/instrutores/${id}`, payload);
      } else {
        await api.post('/admin/instrutores', payload);
      }
      navigate('/admin/instrutores');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar instrutor.');
    }
  }

  return (
    <div>
      <Link to="/admin/instrutores" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar instrutor' : 'Novo instrutor'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput name="nome" value={form.nome} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Faixa</CFormLabel>
                <CFormSelect name="faixaId" value={form.faixaId} onChange={handleChange}>
                  <option value="">Selecione</option>
                  {faixas.map((faixa) => (
                    <option key={faixa.id} value={faixa.id}>
                      {faixa.nome}
                      {faixa.grau ? ` ${faixa.grau}º Dan` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Especialidade</CFormLabel>
                <CFormInput name="especialidade" value={form.especialidade} onChange={handleChange} />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput type="email" name="email" value={form.email} onChange={handleChange} />
                <div className="form-text">Não aparece no site.</div>
              </CCol>
              <CCol md={8}>
                <CFormLabel>Foto</CFormLabel>
                <div className="d-flex align-items-center gap-3">
                  {form.foto && (
                    <img src={form.foto} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: '50%', border: '1px solid #ddd' }} />
                  )}
                  <CFormInput type="file" accept="image/*" onChange={escolherFoto} style={{ maxWidth: 320 }} />
                  {form.foto && (
                    <CButton color="link" className="text-danger" onClick={() => setForm((prev) => ({ ...prev, foto: '' }))}>
                      Remover
                    </CButton>
                  )}
                </div>
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Bio</CFormLabel>
                <CFormTextarea name="bio" rows={3} value={form.bio} onChange={handleChange} />
              </CCol>

              <CCol xs={12}>
                <CFormLabel>Títulos e conquistas</CFormLabel>
                <div className="form-text mb-2">Ex.: "Campeão Paulista 2023", "Instrutor credenciado Morganti Ju-Jitsu". Aparecem na ordem da lista.</div>
                {form.titulos.map((titulo, indice) => (
                  <div key={indice} className="d-flex gap-2 mb-2">
                    <CFormInput value={titulo} onChange={(event) => alterarTitulo(indice, event.target.value)} />
                    <CButton color="secondary" variant="outline" onClick={() => moverTitulo(indice, -1)} disabled={indice === 0} title="Subir">
                      ↑
                    </CButton>
                    <CButton color="secondary" variant="outline" onClick={() => moverTitulo(indice, 1)} disabled={indice === form.titulos.length - 1} title="Descer">
                      ↓
                    </CButton>
                    <CButton color="danger" variant="outline" onClick={() => removerTitulo(indice)} title="Remover">
                      ✕
                    </CButton>
                  </div>
                ))}
                <div className="d-flex gap-2">
                  <CFormInput
                    placeholder="Novo título ou conquista"
                    value={novoTitulo}
                    onChange={(event) => setNovoTitulo(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        adicionarTitulo();
                      }
                    }}
                  />
                  <CButton color="primary" variant="outline" onClick={adicionarTitulo}>
                    Adicionar
                  </CButton>
                </div>
              </CCol>

              <CCol xs={12}>
                <CFormCheck
                  name="exibirNoSite"
                  label='Mostrar em "Nossos instrutores" no site (nome, faixa, foto, bio e títulos)'
                  checked={form.exibirNoSite}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar instrutor'}
              </CButton>
              <CButton as={Link} to="/admin/instrutores" color="secondary" variant="outline">
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
