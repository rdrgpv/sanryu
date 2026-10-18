import { useEffect, useState } from 'react';
import { CButton, CButtonGroup, CFormInput, CFormLabel, CFormSelect, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload } from '@coreui/icons';
import api from '../../services/api';
import AdminDataTable from '../../admin/components/AdminDataTable.jsx';
import { formatarDataHora } from '../../utils/formato.js';

const PERFIS = {
  admin: { label: 'Admin', descricao: 'Acesso a tudo.' },
  recepcao: {
    label: 'Recepção',
    descricao: 'Alunos, responsáveis, contratos, receber mensalidades, interessados, chamada e frequência. Sem financeiro, configurações, preços, usuários e loja.',
  },
};

// Logins do painel. Os logins de sensei (só chamada) ficam em Instrutores → cadeado.
export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [selecionadoId, setSelecionadoId] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [erro, setErro] = useState(null);

  const selecionado = usuarios.find((usuario) => usuario.id === selecionadoId) || null;

  async function carregar() {
    setUsuarios((await api.get('/admin/usuarios')).data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrir(usuario) {
    setErro(null);
    setFormulario(usuario ? { id: usuario.id, nome: usuario.nome, username: usuario.username, perfil: usuario.perfil, senha: '' } : { nome: '', username: '', perfil: 'recepcao', senha: '' });
  }

  async function salvar() {
    setErro(null);
    try {
      if (formulario.id) await api.put(`/admin/usuarios/${formulario.id}`, { nome: formulario.nome, perfil: formulario.perfil, senha: formulario.senha || undefined });
      else await api.post('/admin/usuarios', formulario);
      setFormulario(null);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível salvar.');
    }
  }

  async function excluir() {
    if (!window.confirm(`Excluir o acesso de ${selecionado.nome}?`)) return;
    try {
      await api.delete(`/admin/usuarios/${selecionadoId}`);
      setSelecionadoId(null);
      carregar();
    } catch (err) {
      window.alert(err.response?.data?.error || 'Não foi possível excluir.');
    }
  }

  return (
    <div>
      <h1 className="h3 mb-1">Usuários do painel</h1>
      <p className="text-body-secondary small mb-3">Os logins de sensei (só a chamada no celular) ficam em Instrutores → cadeado.</p>

      <div className="d-flex gap-2 mb-3">
        <CButtonGroup>
          <CButton color="primary" onClick={() => abrir(null)} title="Novo usuário">
            <CIcon icon={cilPlus} />
          </CButton>
          <CButton color="secondary" variant="outline" disabled={!selecionado} onClick={() => abrir(selecionado)} title="Editar / trocar senha">
            <CIcon icon={cilPencil} />
          </CButton>
          <CButton color="danger" variant="outline" disabled={!selecionado} onClick={excluir} title="Excluir">
            <CIcon icon={cilTrash} />
          </CButton>
          <CButton color="secondary" variant="outline" onClick={carregar} title="Atualizar">
            <CIcon icon={cilReload} />
          </CButton>
        </CButtonGroup>
      </div>

      <AdminDataTable
        rows={usuarios}
        selectedId={selecionadoId}
        onSelectRow={(id) => setSelecionadoId((atual) => (atual === id ? null : id))}
        emptyMessage="Nenhum usuário."
        columns={[
          { key: 'nome', label: 'Nome', sortable: true },
          { key: 'username', label: 'Usuário', render: (usuario) => <code>{usuario.username}</code> },
          {
            key: 'perfil',
            label: 'Perfil',
            sortable: true,
            render: (usuario) => <span className={`badge ${usuario.perfil === 'admin' ? 'text-bg-dark' : 'text-bg-info'}`}>{PERFIS[usuario.perfil]?.label}</span>,
          },
          { key: 'createdAt', label: 'Criado em', render: (usuario) => formatarDataHora(usuario.createdAt) },
        ]}
      />

      <CModal visible={!!formulario} onClose={() => setFormulario(null)}>
        <CModalHeader>
          <CModalTitle>{formulario?.id ? 'Editar usuário' : 'Novo usuário'}</CModalTitle>
        </CModalHeader>
        {formulario && (
          <CModalBody>
            <CFormLabel>Nome</CFormLabel>
            <CFormInput className="mb-3" value={formulario.nome} onChange={(event) => setFormulario((prev) => ({ ...prev, nome: event.target.value }))} />
            <CFormLabel>Usuário (login)</CFormLabel>
            <CFormInput className="mb-3" value={formulario.username} disabled={!!formulario.id} onChange={(event) => setFormulario((prev) => ({ ...prev, username: event.target.value }))} />
            <CFormLabel>Perfil</CFormLabel>
            <CFormSelect value={formulario.perfil} onChange={(event) => setFormulario((prev) => ({ ...prev, perfil: event.target.value }))}>
              {Object.entries(PERFIS).map(([valor, perfil]) => (
                <option key={valor} value={valor}>
                  {perfil.label}
                </option>
              ))}
            </CFormSelect>
            <small className="text-body-secondary d-block mb-3">{PERFIS[formulario.perfil]?.descricao}</small>
            <CFormLabel>{formulario.id ? 'Nova senha (deixe em branco para manter)' : 'Senha (mínimo 8 caracteres)'}</CFormLabel>
            <CFormInput type="password" autoComplete="new-password" value={formulario.senha} onChange={(event) => setFormulario((prev) => ({ ...prev, senha: event.target.value }))} />
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
