import { IconPlus, IconEdit, IconTrash, IconRefresh } from './icons.jsx';

export default function Toolbar({ onNovo, onEditar, onExcluir, onAtualizar, podeEditar, extra }) {
  return (
    <div className="toolbar">
      <button type="button" className="toolbar__btn toolbar__btn--primary" onClick={onNovo}>
        <IconPlus /> Novo
      </button>
      <button type="button" className="toolbar__btn" onClick={onEditar} disabled={!podeEditar}>
        <IconEdit /> Editar
      </button>
      <button type="button" className="toolbar__btn toolbar__btn--danger" onClick={onExcluir} disabled={!podeEditar}>
        <IconTrash /> Excluir
      </button>
      <button type="button" className="toolbar__btn" onClick={onAtualizar}>
        <IconRefresh /> Atualizar
      </button>
      {extra}
    </div>
  );
}
