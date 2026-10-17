import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CButton, CFormInput, CFormLabel, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilLockLocked } from '@coreui/icons';
import api from '../../services/api';
import AdminToolbar from '../../admin/components/AdminToolbar.jsx';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';

export default function Instrutores() {
  const navigate = useNavigate();
  const [instrutores, setInstrutores] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  // Login do sensei pra chamada no celular (perfil "instrutor", sem acesso ao resto do admin).
  const [acesso, setAcesso] = useState(null);
  const [erroAcesso, setErroAcesso] = useState(null);

  const selecionado = instrutores.find((instrutor) => instrutor.id === selecionadoId) || null;

  function abrirAcesso() {
    setErroAcesso(null);
    setAcesso({ username: selecionado.acesso?.username || '', senha: '' });
  }

  async function salvarAcesso() {
    setErroAcesso(null);
    try {
      await api.post(`/admin/instrutores/${selecionadoId}/acesso`, acesso);
      setAcesso(null);
      carregarInstrutores();
    } catch (err) {
      setErroAcesso(err.response?.data?.error || 'Não foi possível salvar o acesso.');
    }
  }

  async function removerAcesso() {
    if (!window.confirm('Remover o acesso deste sensei? Ele não vai mais conseguir entrar.')) return;
    await api.delete(`/admin/instrutores/${selecionadoId}/acesso`);
    setAcesso(null);
    carregarInstrutores();
  }

  async function carregarInstrutores() {
    const res = await api.get('/admin/instrutores');
    setInstrutores(res.data);
  }

  useEffect(() => {
    carregarInstrutores();
  }, []);

  function selecionarLinha(id) {
    setSelecionadoId((atual) => (atual === id ? null : id));
  }

  async function handleExcluir() {
    if (!selecionadoId) return;
    if (!window.confirm('Tem certeza que deseja excluir este instrutor?')) return;
    await api.delete(`/admin/instrutores/${selecionadoId}`);
    setSelecionadoId(null);
    carregarInstrutores();
  }

  return (
    <div>
      <h1 className="h3 mb-3">Instrutores</h1>

      <AdminToolbar
        podeEditar={!!selecionadoId}
        onNovo={() => navigate('/admin/instrutores/novo')}
        onEditar={() => navigate(`/admin/instrutores/${selecionadoId}/editar`)}
        onExcluir={handleExcluir}
        onAtualizar={carregarInstrutores}
        extra={
          <CButton color="secondary" variant="outline" disabled={!selecionadoId} onClick={abrirAcesso} title="Acesso à chamada (login do sensei)">
            <CIcon icon={cilLockLocked} />
          </CButton>
        }
      />

      <CModal visible={!!acesso} onClose={() => setAcesso(null)}>
        <CModalHeader>
          <CModalTitle>Acesso à chamada — {selecionado?.nome}</CModalTitle>
        </CModalHeader>
        {acesso && (
          <CModalBody>
            <p className="small text-body-secondary">
              Com este login o sensei entra em <strong>{window.location.origin}/sensei</strong> e só vê a chamada das turmas dele —
              sem cadastros nem financeiro.
            </p>
            <CFormLabel>Usuário</CFormLabel>
            <CFormInput className="mb-3" value={acesso.username} onChange={(event) => setAcesso((prev) => ({ ...prev, username: event.target.value }))} />
            <CFormLabel>{selecionado?.acesso ? 'Nova senha (deixe em branco para manter)' : 'Senha (mínimo 8 caracteres)'}</CFormLabel>
            <CFormInput type="password" value={acesso.senha} onChange={(event) => setAcesso((prev) => ({ ...prev, senha: event.target.value }))} autoComplete="new-password" />
            {erroAcesso && <div className="alert alert-danger mt-3 mb-0">{erroAcesso}</div>}
          </CModalBody>
        )}
        <CModalFooter>
          {selecionado?.acesso && (
            <CButton color="danger" variant="ghost" className="me-auto" onClick={removerAcesso}>
              Remover acesso
            </CButton>
          )}
          <CButton color="secondary" variant="outline" onClick={() => setAcesso(null)}>
            Cancelar
          </CButton>
          <CButton color="primary" onClick={salvarAcesso}>
            Salvar
          </CButton>
        </CModalFooter>
      </CModal>

      <AdminDataTable
        rows={instrutores}
        selectedId={selecionadoId}
        onSelectRow={selecionarLinha}
        emptyMessage="Nenhum instrutor cadastrado."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          {
            key: 'faixa',
            label: 'Faixa',
            sortable: true,
            sortValue: (instrutor) => instrutor.faixa?.nome || '',
            render: (instrutor) =>
              instrutor.faixa ? (
                <span className="d-flex align-items-center gap-2">
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1rem',
                      height: '1rem',
                      borderRadius: '50%',
                      background: instrutor.faixa.cor,
                      border: '1px solid rgba(0,0,0,0.15)',
                      flexShrink: 0,
                    }}
                  />
                  {instrutor.faixa.nome}
                  {instrutor.faixa.grau ? ` ${instrutor.faixa.grau}º Dan` : ''}
                </span>
              ) : (
                '-'
              ),
          },
          { key: 'email', label: 'Email', sortable: true, render: (instrutor) => instrutor.email || '-' },
          { key: 'especialidade', label: 'Especialidade', render: (instrutor) => instrutor.especialidade || '-' },
          {
            key: 'acesso',
            label: 'Acesso à chamada',
            render: (instrutor) => (instrutor.acesso ? <code>{instrutor.acesso.username}</code> : <span className="text-body-secondary small">sem acesso</span>),
          },
          {
            key: 'bio',
            label: 'Bio',
            render: (instrutor) => <span style={{ display: 'inline-block', maxWidth: 320 }}>{instrutor.bio || '-'}</span>,
          },
        ]}
      />
    </div>
  );
}
