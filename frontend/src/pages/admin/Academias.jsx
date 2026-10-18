import { useEffect, useState } from 'react';
import { CButton, CButtonGroup, CFormCheck, CFormInput, CFormLabel, CFormSelect, CFormTextarea, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle, CRow, CCol } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarTelefone } from '../../utils/formato.js';

// Academias de outros professores do Método Morganti (não administradas aqui) — agrupam os alunos
// externos dos eventos e exames. O professor responsável vai como "professor" no cadastro do Gatame.
export default function Academias() {
  const [academias, setAcademias] = useState([]);
  const [instrutores, setInstrutores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState(null);

  const selecionada = academias.find((academia) => academia.id === selecionadoId) || null;

  async function carregar() {
    setAcademias((await api.get('/admin/academias')).data);
  }

  useEffect(() => {
    carregar();
    api.get('/admin/instrutores').then((res) => setInstrutores(res.data));
  }, []);

  function abrir(academia) {
    setErro(null);
    setFormulario(
      academia
        ? { id: academia.id, nome: academia.nome, instrutorId: academia.instrutorId ? String(academia.instrutorId) : '', cidade: academia.cidade || '', telefone: academia.telefone || '', observacoes: academia.observacoes || '', ativo: academia.ativo }
        : { nome: '', instrutorId: '', cidade: '', telefone: '', observacoes: '', ativo: true }
    );
  }

  async function salvar() {
    setErro(null);
    try {
      if (formulario.id) await api.put(`/admin/academias/${formulario.id}`, formulario);
      else await api.post('/admin/academias', formulario);
      setFormulario(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir a academia ${selecionada.nome}?`)) return;
    try {
      await api.delete(`/admin/academias/${selecionadoId}`);
      setSelecionadoId(null);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Academias Morganti</h1>
      <p className="text-body-secondary small mb-3">
        Academias de outros professores do Método. Servem para organizar os alunos externos nos eventos e exames de faixa — as unidades do
        seu dojo ficam em Unidades.
      </p>

      <div className="d-flex gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={() => abrir(null)} title="Nova academia">
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!selecionada} onClick={() => abrir(selecionada)} title="Editar">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton color="danger" variant="outline" disabled={!selecionada} onClick={excluir} title="Excluir">
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
      </div>

      <AdminDataTable
        rows={academias}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhuma academia cadastrada."
        columns={[
          { key: 'nome', label: 'Academia', sortable: true },
          {
            key: 'instrutor',
            label: 'Professor responsável',
            sortable: true,
            sortValue: (academia) => academia.instrutor?.nome || '',
            render: (academia) =>
              academia.instrutor ? (
                <>
                  {academia.instrutor.nome}
                  {!academia.instrutor.email && <small className="text-warning-emphasis d-block">sem e-mail (Gatame não funciona)</small>}
                </>
              ) : (
                <span className="text-warning-emphasis small">sem professor</span>
              ),
          },
          { key: 'cidade', label: 'Cidade', sortable: true, render: (academia) => academia.cidade || '-' },
          { key: 'totalAlunos', label: 'Alunos', align: 'center', sortable: true },
          {
            key: 'ativo',
            label: 'Situação',
            render: (academia) => <span className={`badge ${academia.ativo ? 'text-bg-success' : 'text-bg-secondary'}`}>{academia.ativo ? 'Ativa' : 'Inativa'}</span>,
          },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)}>
        <CModalHeader>
          <CModalTitle>{formulario?.id ? 'Editar academia' : 'Nova academia'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CRow className="g-3">
              <CCol sm={12}>
                <CFormLabel>Nome</CFormLabel>
                <CFormInput value={formulario.nome} onChange={(event) => setFormulario((prev) => ({ ...prev, nome: event.target.value }))} />
              </CCol>
              <CCol sm={12}>
                <CFormLabel>Professor responsável</CFormLabel>
                <CFormSelect value={formulario.instrutorId} onChange={(event) => setFormulario((prev) => ({ ...prev, instrutorId: event.target.value }))}>
                  <option value="">Nenhum</option>
                  {instrutores.map((instrutor) => (
                    <option key={instrutor.id} value={instrutor.id}>
                      {instrutor.nome}
                      {instrutor.email ? '' : ' (sem e-mail)'}
                    </option>
                  ))}
                </CFormSelect>
                <small className="text-body-secondary">Cadastre o professor em Instrutores, com e-mail — é ele que vai no cadastro do Gatame.</small>
              </CCol>
              <CCol sm={7}>
                <CFormLabel>Cidade</CFormLabel>
                <CFormInput value={formulario.cidade} onChange={(event) => setFormulario((prev) => ({ ...prev, cidade: event.target.value }))} />
              </CCol>
              <CCol sm={5}>
                <CFormLabel>Telefone</CFormLabel>
                <CFormInput value={formulario.telefone} onChange={(event) => setFormulario((prev) => ({ ...prev, telefone: formatarTelefone(event.target.value) }))} />
              </CCol>
              <CCol sm={12}>
                <CFormLabel>Observações</CFormLabel>
                <CFormTextarea rows={2} value={formulario.observacoes} onChange={(event) => setFormulario((prev) => ({ ...prev, observacoes: event.target.value }))} />
              </CCol>
              <CCol sm={12}>
                <CFormCheck id="academiaAtiva" label="Ativa" checked={formulario.ativo} onChange={(event) => setFormulario((prev) => ({ ...prev, ativo: event.target.checked }))} />
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
