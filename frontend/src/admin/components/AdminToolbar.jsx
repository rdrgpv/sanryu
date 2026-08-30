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
        <CButton color="primary" onClick={onNovo} title={novoLabel}>
          <CIcon icon={cilPlus} />
        </CButton>
        <CButton color="secondary" variant="outline" disabled={!podeEditar} onClick={onEditar} title="Editar">
          <CIcon icon={cilPencil} />
        </CButton>
        <CButton color="danger" variant="outline" disabled={!excluirHabilitado} onClick={onExcluir} title="Excluir">
          <CIcon icon={cilTrash} />
        </CButton>
        <CButton color="secondary" variant="outline" onClick={onAtualizar} title="Atualizar">
          <CIcon icon={cilReload} />
        </CButton>
      </CButtonGroup>
      {extra && <div className="d-flex flex-wrap gap-2">{extra}</div>}
    </div>
  );
}
