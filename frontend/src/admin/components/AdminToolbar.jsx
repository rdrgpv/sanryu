import { CButton, CButtonGroup } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload } from '@coreui/icons';

export default function AdminToolbar({ onNovo, onEditar, onExcluir, onAtualizar, podeEditar, novoLabel = 'Novo', extra }) {
  return (
    <CButtonGroup role="group" className="mb-3">
      <CButton color="primary" onClick={onNovo}>
        <CIcon icon={cilPlus} className="me-1" />
        {novoLabel}
      </CButton>
      <CButton color="secondary" variant="outline" disabled={!podeEditar} onClick={onEditar}>
        <CIcon icon={cilPencil} className="me-1" />
        Editar
      </CButton>
      <CButton color="danger" variant="outline" disabled={!podeEditar} onClick={onExcluir}>
        <CIcon icon={cilTrash} className="me-1" />
        Excluir
      </CButton>
      <CButton color="secondary" variant="outline" onClick={onAtualizar}>
        <CIcon icon={cilReload} className="me-1" />
        Atualizar
      </CButton>
      {extra}
    </CButtonGroup>
  );
}
