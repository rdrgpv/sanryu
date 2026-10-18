import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';
import { reduzirImagem } from '../../utils/imagem.js';

const estadoInicial = {
  descricao: '',
  tipoProduto: '',
  controlaEstoque: true,
  vendaOnline: false,
  foto: '',
  ativo: true,
};

export default function ProdutoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/produtos/${id}`).then((res) => {
      const produto = res.data;
      setForm({
        descricao: produto.descricao,
        tipoProduto: produto.tipoProduto || '',
        controlaEstoque: produto.controlaEstoque,
        vendaOnline: produto.vendaOnline,
        foto: produto.foto || '',
        ativo: produto.ativo,
      });
    });
  }, [id, editando]);

  async function handleFoto(event) {
    const arquivo = event.target.files?.[0];
    event.target.value = '';
    if (!arquivo) return;
    try {
      setForm((prev) => ({ ...prev, foto: '' }));
      const foto = await reduzirImagem(arquivo, 800, 0.85);
      setForm((prev) => ({ ...prev, foto }));
    } catch (err) {
      setErro(err.message);
    }
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = { ...form, tipoProduto: form.tipoProduto.trim() || null };

    try {
      if (editando) {
        await api.put(`/admin/produtos/${id}`, payload);
      } else {
        await api.post('/admin/produtos', payload);
      }
      navigate('/admin/produtos');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar produto.');
    }
  }

  return (
    <div>
      <Link to="/admin/produtos" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar produto' : 'Novo produto'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel>Descrição</CFormLabel>
                <CFormInput name="descricao" value={form.descricao} onChange={handleChange} required />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tipo (categoria)</CFormLabel>
                <CFormInput name="tipoProduto" value={form.tipoProduto} onChange={handleChange} placeholder="Ex.: Kimono" />
              </CCol>
              <CCol md={2} className="d-flex align-items-end gap-3">
                <CFormCheck name="controlaEstoque" label="Controla estoque" checked={form.controlaEstoque} onChange={handleChange} />
              </CCol>
              <CCol xs={12} className="d-flex flex-wrap gap-4">
                <CFormCheck name="ativo" label="Ativo" checked={form.ativo} onChange={handleChange} />
                <CFormCheck name="vendaOnline" label="Vender na loja da área do aluno (Pix, retirada na academia)" checked={form.vendaOnline} onChange={handleChange} />
              </CCol>
              <CCol xs={12}>
                <CFormLabel>Foto (aparece na loja)</CFormLabel>
                <div className="d-flex align-items-center gap-3">
                  {form.foto && <img src={form.foto} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 6, border: '1px solid #ddd' }} />}
                  <CFormInput type="file" accept="image/*" onChange={handleFoto} style={{ maxWidth: 320 }} />
                  {form.foto && (
                    <CButton color="link" className="text-danger" onClick={() => setForm((prev) => ({ ...prev, foto: '' }))}>
                      Remover
                    </CButton>
                  )}
                </div>
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar produto'}
              </CButton>
              <CButton as={Link} to="/admin/produtos" color="secondary" variant="outline">
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
