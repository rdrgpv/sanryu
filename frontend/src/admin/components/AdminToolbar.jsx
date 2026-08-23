import { CButton, CButtonGroup } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPlus, cilPencil, cilTrash, cilReload } from '@coreui/icons';

export default function AdminToolbar({
  onNovo,
  onEditar,
  onExcluir,
  onAtualizar,
  podeEditar,
  podeExcluir,
  novoLabel = 'Novo',
  extra,
}) {
  const excluirHabilitado = podeExcluir === undefined ? podeEditar : podeExcluir;

  return (
    <div className="d-flex flex-wrap gap-2 mb-3">
      <CButtonGroup role="group">
        <CButton color="primary" onClick={onNovo}>
          <CIcon icon={cilPlus} className="me-1" />
          {novoLabel}
        </CButton>
        <CButton color="secondary" variant="outline" disabled={!podeEditar} onClick={onEditar}>
          <CIcon icon={cilPencil} className="me-1" />
          Editar
        </CButton>
        <CButton color="danger" variant="outline" disabled={!excluirHabilitado} onClick={onExcluir}>
          <CIcon icon={cilTrash} className="me-1" />
          Excluir
        </CButton>
        <CButton color="secondary" variant="outline" onClick={onAtualizar}>
          <CIcon icon={cilReload} className="me-1" />
          Atualizar
        </CButton>
      </CButtonGroup>
      {extra && <div className="d-flex flex-wrap gap-2">{extra}</div>}
    </div>
  );
}
