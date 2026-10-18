import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CButtonGroup, CFormInput, CFormLabel, CFormSelect, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload, cilSearch, cilUserPlus, cilArrowCircleRight } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { OPCOES_TAMANHO_FAIXA } from '../../utils/opcoesTamanhoFaixa.js';
import { formatarTelefone, calcularIdade } from '../../utils/formato.js';

const VAZIO = { nome: '', email: '', telefone: '', dataNascimento: '', faixaId: '', tamanhoFaixa: '', academiaId: '' };

// Alunos do Método Morganti de outros professores — o cadastro simples de antes. Não têm contrato,
// mensalidade nem chamada aqui: aparecem nos eventos/exames de faixa e no Gatame.
export default function AlunosExternos() {
  const navigate = useNavigate();
  const [alunos, setAlunos] = useState([]);
  const [academias, setAcademias] = useState([]);
  const [faixas, setFaixas] = useState([]);
  const [busca, setBusca] = useState('');
  const [academiaFiltro, setAcademiaFiltro] = useState('');
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState(null);
  const [ocupado, setOcupado] = useState(false);

  const selecionado = alunos.find((aluno) => aluno.id === selecionadoId) || null;

  async function carregar() {
    const params = { vinculo: 'externo' };
    if (busca) params.busca = busca;
    if (academiaFiltro) params.academiaId = academiaFiltro;
    setAlunos((await api.get('/admin/alunos', { params })).data);
  }

  useEffect(() => {
    api.get('/admin/academias').then((res) => setAcademias(res.data));
    api.get('/admin/faixas').then((res) => setFaixas(res.data));
  }, []);

  useEffect(() => {
    const timeout = setTimeout(carregar, 250);
    setSelecionadoId(null);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca, academiaFiltro]);

  function abrir(aluno) {
    setErro(null);
    setFormulario(
      aluno
        ? {
            id: aluno.id,
            nome: aluno.nome,
            email: aluno.email || '',
            telefone: aluno.telefone || '',
            dataNascimento: aluno.dataNascimento || '',
            faixaId: aluno.faixaId ? String(aluno.faixaId) : '',
            tamanhoFaixa: aluno.tamanhoFaixa || '',
            academiaId: aluno.academiaId ? String(aluno.academiaId) : '',
          }
        : { ...VAZIO, academiaId: academiaFiltro }
    );
  }

  async function salvar() {
    setErro(null);
    const payload = { ...formulario, vinculo: 'externo', faixaId: formulario.faixaId || null, academiaId: formulario.academiaId || null };
    try {
      if (formulario.id) await api.put(`/admin/alunos/${formulario.id}`, payload);
      else await api.post('/admin/alunos', payload);
      setFormulario(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir ${selecionado.nome}?`)) return;
    await api.delete(`/admin/alunos/${selecionadoId}`);
    setSelecionadoId(null);
    carregar();
  }

  async function acao(funcao) {
    setOcupado(true);
    try {
      await funcao();
      await carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível concluir.');
    } finally {
      setOcupado(false);
    }
  }

  function verificarGatame() {
    acao(async () => {
      const res = await api.get(`/admin/alunos/${selecionadoId}/verificar-gatame`);
      window.alert(
        res.data.apto
          ? `Encontrado no Gatame:\n${res.data.candidatos.map((candidato) => `${candidato.nome} — Faixa ${candidato.faixa || '?'} (${candidato.origem})`).join('\n')}`
          : 'Não encontrado no Gatame.'
      );
    });
  }

  function cadastrarGatame() {
    if (!window.confirm(`Cadastrar ${selecionado.nome} no Gatame (professor: ${selecionado.academia?.instrutor?.nome || 'da academia'})?`)) return;
    acao(() => api.post(`/admin/alunos/${selecionadoId}/cadastrar-gatame`));
  }

  // Veio treinar no dojo: vira aluno da academia e abre o cadastro completo (contrato depois).
  function tornarAlunoDoDojo() {
    if (!window.confirm(`${selecionado.nome} vai treinar no seu dojo? Ele sai dos alunos externos e vira aluno da academia.`)) return;
    acao(async () => {
      await api.put(`/admin/alunos/${selecionadoId}`, { vinculo: 'academia', academiaId: null });
      navigate(`/admin/alunos/${selecionadoId}/editar`);
    });
  }

  return (
    <div>
      <h1 className="h3 mb-1">Alunos Morganti (externos)</h1>
      <p className="text-body-secondary small mb-3">
        Alunos de outros professores que aparecem nos eventos e exames de faixa. Os alunos do seu dojo ficam em Alunos.
      </p>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={() => abrir(null)} title="Novo aluno externo">
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!selecionado} onClick={() => abrir(selecionado)} title="Editar">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton color="danger" variant="outline" disabled={!selecionado} onClick={excluir} title="Excluir">
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
        <CButtonGroup>
          <CButton color="info" variant="outline" disabled={!selecionado?.email || ocupado} onClick={verificarGatame} title="Verificar no Gatame">
            <CIcon icon={cilSearch} />
          </CButton>
          <CButton color="success" variant="outline" disabled={!selecionado || selecionado.cadastradoNoGatame || ocupado} onClick={cadastrarGatame} title="Cadastrar no Gatame">
            <CIcon icon={cilUserPlus} />
          </CButton>
        </CButtonGroup>
        <CButton color="secondary" variant="outline" disabled={!selecionado || ocupado} onClick={tornarAlunoDoDojo} title="Veio treinar no dojo">
          <CIcon icon={cilArrowCircleRight} className="me-1" />
          Tornar aluno do dojo
        </CButton>
      </div>

      <div className="d-flex flex-wrap gap-2 mb-3">
        <CFormInput style={{ maxWidth: 300 }} placeholder="Buscar por nome, e-mail ou CPF..." value={busca} onChange={(event) => setBusca(event.target.value)} />
        <CFormSelect style={{ maxWidth: 280 }} value={academiaFiltro} onChange={(event) => setAcademiaFiltro(event.target.value)}>
          <option value="">Todas as academias</option>
          {academias.map((academia) => (
            <option key={academia.id} value={academia.id}>
              {academia.nome}
            </option>
          ))}
        </CFormSelect>
      </div>

      <AdminDataTable
        rows={alunos}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhum aluno externo."
        columns={[
          {
            key: 'nome',
            label: 'Nome',
            sortable: true,
            render: (aluno) => {
              const idade = calcularIdade(aluno.dataNascimento);
              return (
                <>
                  {aluno.nome}
                  {idade !== null && <small className="text-body-secondary"> · {idade} anos</small>}
                </>
              );
            },
          },
          { key: 'email', label: 'E-mail', render: (aluno) => aluno.email || '-' },
          {
            key: 'academia',
            label: 'Academia',
            sortable: true,
            sortValue: (aluno) => aluno.academia?.nome || '',
            render: (aluno) =>
              aluno.academia ? (
                <>
                  {aluno.academia.nome}
                  {aluno.academia.instrutor && <small className="text-body-secondary d-block">{aluno.academia.instrutor.nome}</small>}
                </>
              ) : (
                <span className="text-warning-emphasis small">sem academia</span>
              ),
          },
          {
            key: 'faixa',
            label: 'Faixa',
            sortable: true,
            sortValue: (aluno) => aluno.faixa?.nome || '',
            render: (aluno) =>
              aluno.faixa ? (
                <span className="d-flex align-items-center gap-2">
                  <span style={{ display: 'inline-block', width: '1rem', height: '1rem', borderRadius: '50%', background: aluno.faixa.cor, border: '1px solid rgba(0,0,0,0.15)' }} />
                  {aluno.faixa.nome}
                  {aluno.tamanhoFaixa && <small className="text-body-secondary">({aluno.tamanhoFaixa})</small>}
                </span>
              ) : (
                '-'
              ),
          },
          {
            key: 'cadastradoNoGatame',
            label: 'Gatame',
            sortable: true,
            render: (aluno) => (aluno.cadastradoNoGatame ? <span className="text-success small">Cadastrado</span> : <span className="text-body-secondary small">Não cadastrado</span>),
          },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)}>
        <CModalHeader>
          <CModalTitle>{formulario?.id ? 'Editar aluno externo' : 'Novo aluno externo'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CRow className="g-3">
              <CCol sm={12}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput value={formulario.nome} onChange={(event) => setFormulario((prev) => ({ ...prev, nome: event.target.value }))} />
              </CCol>
              <CCol sm={12}>
                <CFormLabel>Academia</CFormLabel>
                <CFormSelect value={formulario.academiaId} onChange={(event) => setFormulario((prev) => ({ ...prev, academiaId: event.target.value }))}>
                  <option value="">Sem academia</option>
                  {academias.map((academia) => (
                    <option key={academia.id} value={academia.id}>
                      {academia.nome}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={7}>
                <CFormLabel>E-mail</CFormLabel>
                <CFormInput type="email" value={formulario.email} onChange={(event) => setFormulario((prev) => ({ ...prev, email: event.target.value }))} />
              </CCol>
              <CCol sm={5}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput value={formulario.telefone} onChange={(event) => setFormulario((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }))} />
              </CCol>
              <CCol sm={5}>
                <CFormLabel>Nascimento</CFormLabel>
                <CFormInput type="date" value={formulario.dataNascimento} onChange={(event) => setFormulario((prev) => ({ ...prev, dataNascimento: event.target.value }))} />
              </CCol>
              <CCol sm={4}>
                <CFormLabel>Faixa</CFormLabel>
                <CFormSelect value={formulario.faixaId} onChange={(event) => setFormulario((prev) => ({ ...prev, faixaId: event.target.value }))}>
                  <option value="">-</option>
                  {faixas.map((faixa) => (
                    <option key={faixa.id} value={faixa.id}>
                      {faixa.nome}
                      {faixa.grau ? ` ${faixa.grau}º Dan` : ''}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol sm={3}>
                <CFormLabel>Tamanho</CFormLabel>
                <CFormSelect value={formulario.tamanhoFaixa} onChange={(event) => setFormulario((prev) => ({ ...prev, tamanhoFaixa: event.target.value }))}>
                  <option value="">-</option>
                  {OPCOES_TAMANHO_FAIXA.map((opcao) => (
                    <option key={opcao.valor} value={opcao.valor}>
                      {opcao.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            </CRow>
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setFormulario(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvar}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>
    </div>
  );
}
