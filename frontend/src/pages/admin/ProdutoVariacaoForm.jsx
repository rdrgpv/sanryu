import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { CCard, CCardBody, CForm, CFormLabel, CFormInput, CFormSelect, CFormCheck, CRow, CCol, CButton } from '@coreui/react';
import api from '../../services/api';

const estadoInicial = {
  produtoId: '',
  corId: '',
  tamanhoId: '',
  valorCusto: '',
  valorVenda: '',
  ativo: true,
};

export default function ProdutoVariacaoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = !!id;
  const [form, setForm] = useState(estadoInicial);
  const [codigo, setCodigo] = useState(null);
  const [produtos, setProdutos] = useState([]);
  const [cores, setCores] = useState([]);
  const [tamanhos, setTamanhos] = useState([]);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api.get('/admin/produtos?ativo=true').then((res) => setProdutos(res.data));
    api.get('/admin/cores?ativo=true').then((res) => setCores(res.data));
    api.get('/admin/tamanhos?ativo=true').then((res) => setTamanhos(res.data));
  }, []);

  useEffect(() => {
    if (!editando) return;
    api.get(`/admin/produto-variacoes/${id}`).then((res) => {
      const variacao = res.data;
      setForm({
        produtoId: variacao.produtoId,
        corId: variacao.corId ?? '',
        tamanhoId: variacao.tamanhoId ?? '',
        valorCusto: variacao.valorCusto ?? '',
        valorVenda: variacao.valorVenda ?? '',
        ativo: variacao.ativo,
      });
      setCodigo(variacao.codigo);
    });
  }, [id, editando]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setErro(null);

    const payload = {
      produtoId: Number(form.produtoId),
      corId: form.corId !== '' ? Number(form.corId) : null,
      tamanhoId: form.tamanhoId !== '' ? Number(form.tamanhoId) : null,
      valorCusto: form.valorCusto !== '' ? Number(form.valorCusto) : 0,
      valorVenda: form.valorVenda !== '' ? Number(form.valorVenda) : 0,
      ativo: form.ativo,
    };

    try {
      if (editando) {
        await api.put(`/admin/produto-variacoes/${id}`, payload);
      } else {
        await api.post('/admin/produto-variacoes', payload);
      }
      navigate('/admin/produto-variacoes');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar variação.');
    }
  }

  return (
    <div>
      <Link to="/admin/produto-variacoes" className="text-body-secondary text-decoration-none d-inline-block mb-2">
        &larr; Voltar
      </Link>
      <h1 className="h3 mb-3">{editando ? 'Editar variação' : 'Nova variação'}</h1>

      <CCard>
        <CCardBody>
          <CForm onSubmit={handleSubmit}>
            <CRow className="g-3">
              {editando && (
                <CCol md={3}>
                  <CFormLabel>Código</CFormLabel>
                  <CFormInput value={codigo || ''} disabled readOnly />
                </CCol>
              )}
              <CCol md={editando ? 5 : 6}>
                <CFormLabel>Produto</CFormLabel>
                <CFormSelect name="produtoId" value={form.produtoId} onChange={handleChange} required>
                  <option value="">Selecione</option>
                  {produtos.map((produto) => (
                    <option key={produto.id} value={produto.id}>
                      {produto.descricao}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={editando ? 4 : 6}>
                <CFormCheck className="mt-4" name="ativo" label="Ativa" checked={form.ativo} onChange={handleChange} />
              </CCol>

              <CCol md={4}>
                <CFormLabel>Cor (opcional)</CFormLabel>
                <CFormSelect name="corId" value={form.corId} onChange={handleChange}>
                  <option value="">Nenhuma</option>
                  {cores.map((cor) => (
                    <option key={cor.id} value={cor.id}>
                      {cor.descricao}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={4}>
                <CFormLabel>Tamanho (opcional)</CFormLabel>
                <CFormSelect name="tamanhoId" value={form.tamanhoId} onChange={handleChange}>
                  <option value="">Nenhum</option>
                  {tamanhos.map((tamanho) => (
                    <option key={tamanho.id} value={tamanho.id}>
                      {tamanho.descricao}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>

              <CCol md={2}>
                <CFormLabel>Valor de custo</CFormLabel>
                <CFormInput type="number" step="0.01" min="0" name="valorCusto" value={form.valorCusto} onChange={handleChange} />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Valor de venda</CFormLabel>
                <CFormInput type="number" step="0.01" min="0" name="valorVenda" value={form.valorVenda} onChange={handleChange} />
              </CCol>
            </CRow>

            <div className="d-flex gap-2 mt-4">
              <CButton type="submit" color="primary">
                {editando ? 'Salvar alterações' : 'Adicionar variação'}
              </CButton>
              <CButton as={Link} to="/admin/produto-variacoes" color="secondary" variant="outline">
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
