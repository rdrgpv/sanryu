import { useState } from 'react';
import { CButton, CFormInput, CFormLabel, CModal, CModalBody, CModalFooter, CModalHeader, CModalTitle } from '@coreui/react';
import api from '../../services/api';

// Cada pessoa troca a própria senha (confirmando a atual) — admin, recepção ou sensei.
export default function TrocarSenhaModal({ visivel, aoFechar }) {
  const [campos, setCampos] = useState({ senhaAtual: '', novaSenha: '', confirmacao: '' });
  const [erro, setErro] = useState(null);
  const [ok, setOk] = useState(false);

  function fechar() {
    setCampos({ senhaAtual: '', novaSenha: '', confirmacao: '' });
    setErro(null);
    setOk(false);
    aoFechar();
  }

  async function salvar() {
    setErro(null);
    if (campos.novaSenha !== campos.confirmacao) {
      setErro('A confirmação não bate com a nova senha.');
      return;
    }
    try {
      await api.put('/auth/senha', { senhaAtual: campos.senhaAtual, novaSenha: campos.novaSenha });
      setOk(true);
    } catch (err) {
      setErro(err.response?.data?.error || 'Não foi possível trocar a senha.');
    }
  }

  return (
    <CModal visible={visivel} onClose={fechar}>
      <CModalHeader>
        <CModalTitle>Trocar minha senha</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {ok ? (
          <div className="alert alert-success mb-0">Senha trocada. Use a nova no próximo login.</div>
        ) : (
          <>
            <CFormLabel>Senha atual</CFormLabel>
            <CFormInput type="password" className="mb-3" autoComplete="current-password" value={campos.senhaAtual} onChange={(event) => setCampos((prev) => ({ ...prev, senhaAtual: event.target.value }))} />
            <CFormLabel>Nova senha (mínimo 8 caracteres)</CFormLabel>
            <CFormInput type="password" className="mb-3" autoComplete="new-password" value={campos.novaSenha} onChange={(event) => setCampos((prev) => ({ ...prev, novaSenha: event.target.value }))} />
            <CFormLabel>Repita a nova senha</CFormLabel>
            <CFormInput type="password" autoComplete="new-password" value={campos.confirmacao} onChange={(event) => setCampos((prev) => ({ ...prev, confirmacao: event.target.value }))} />
            {erro && <div className="alert alert-danger mt-3 mb-0">{erro}</div>}
          </>
        )}
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" onClick={fechar}>
          {ok ? 'Fechar' : 'Cancelar'}
        </CButton>
        {!ok && (
          <CButton color="primary" onClick={salvar}>
            Salvar
          </CButton>
        )}
      </CModalFooter>
    </CModal>
  );
}
