import { useEffect, useMemo, useState } from 'react';
import {
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CFormSelect,
  CButton,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilArrowTop, cilArrowBottom, cilInbox } from '@coreui/icons';

const OPCOES_PAGINA_PADRAO = [10, 25, 50];

function valorPadraoDaColuna(coluna, row) {
  return row[coluna.key];
}

function compararValores(a, b) {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base', numeric: true });
}

// Grid genérico usado nas telas de listagem do admin: mantém o padrão já existente no sistema
// (CTable do CoreUI, seleção de uma linha por clique controlando a AdminToolbar) e adiciona, por
// cima disso, ordenação por coluna e paginação client-side — sem tocar em API/contrato nenhum,
// já que os dados continuam vindo inteiros do backend como sempre vieram.
//
// `columns`: [{ key, label, align?, sortable?, sortValue?(row), render?(row) }]
export default function AdminDataTable({
  columns,
  rows,
  getRowId = (row) => row.id,
  selectedId,
  onSelectRow,
  emptyMessage = 'Nenhum registro encontrado.',
  pageSizeOptions = OPCOES_PAGINA_PADRAO,
  pageSize = OPCOES_PAGINA_PADRAO[0],
  tableClassName = '',
  tableStyle,
}) {
  const [ordenacao, setOrdenacao] = useState(null); // { key, direcao: 'asc' | 'desc' }
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(pageSize);

  // Volta pra primeira página quando a QUANTIDADE de linhas muda (nova busca, exclusão, filtro) —
  // não a cada nova referência de `rows`. Telas como EventoInscricoes atualizam uma linha só (ex.:
  // marcar pagamento verificado) recriando o array inteiro; se resetasse nessa hora, o admin seria
  // jogado de volta pra página 1 no meio de uma ação, o que é pior do que simplesmente não resetar.
  useEffect(() => {
    setPagina(1);
  }, [rows.length]);

  function alternarOrdenacao(coluna) {
    if (!coluna.sortable) return;

    setOrdenacao((atual) => {
      if (!atual || atual.key !== coluna.key) return { key: coluna.key, direcao: 'asc' };
      if (atual.direcao === 'asc') return { key: coluna.key, direcao: 'desc' };
      return null;
    });
    setPagina(1);
  }

  const linhasOrdenadas = useMemo(() => {
    if (!ordenacao) return rows;

    const coluna = columns.find((item) => item.key === ordenacao.key);
    if (!coluna) return rows;

    const valorDe = coluna.sortValue || ((row) => valorPadraoDaColuna(coluna, row));
    const ordenadas = [...rows].sort((a, b) => compararValores(valorDe(a), valorDe(b)));

    return ordenacao.direcao === 'asc' ? ordenadas : ordenadas.reverse();
  }, [rows, ordenacao, columns]);

  const totalPaginas = Math.max(1, Math.ceil(linhasOrdenadas.length / tamanhoPagina));
  const paginaAtual = Math.min(pagina, totalPaginas);
  const inicio = (paginaAtual - 1) * tamanhoPagina;
  const fim = inicio + tamanhoPagina;

  return (
    <div>
      <div className="table-responsive">
        <CTable hover className={`bg-white mb-0 ${tableClassName}`} style={tableStyle}>
          <CTableHead>
            <CTableRow>
              {columns.map((coluna) => (
                <CTableHeaderCell
                  key={coluna.key}
                  onClick={() => alternarOrdenacao(coluna)}
                  role={coluna.sortable ? 'button' : undefined}
                  className={coluna.sortable ? 'user-select-none' : undefined}
                  style={{ textAlign: coluna.align, whiteSpace: 'nowrap' }}
                >
                  <span className="d-inline-flex align-items-center gap-1">
                    {coluna.label}
                    {coluna.sortable && ordenacao?.key === coluna.key && (
                      <CIcon icon={ordenacao.direcao === 'asc' ? cilArrowTop : cilArrowBottom} size="sm" />
                    )}
                  </span>
                </CTableHeaderCell>
              ))}
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {/* Sempre renderiza TODAS as linhas ordenadas — a paginação só esconde por CSS (classe
                abaixo) as que estão fora da página atual. Assim, na impressão (ver admin.css), a
                folha sai com a lista inteira, não só com a página visível na tela. */}
            {linhasOrdenadas.map((row, indice) => {
              const id = getRowId(row);
              const foraDaPaginaAtual = indice < inicio || indice >= fim;

              return (
                <CTableRow
                  key={id}
                  active={selectedId === id}
                  onClick={() => onSelectRow?.(id)}
                  className={foraDaPaginaAtual ? 'admin-table-row--fora-da-pagina' : undefined}
                >
                  {columns.map((coluna) => (
                    <CTableDataCell key={coluna.key} style={{ textAlign: coluna.align }}>
                      {coluna.render ? coluna.render(row) : (valorPadraoDaColuna(coluna, row) ?? '-')}
                    </CTableDataCell>
                  ))}
                </CTableRow>
              );
            })}
            {linhasOrdenadas.length === 0 && (
              <CTableRow>
                <CTableDataCell colSpan={columns.length} className="p-0">
                  <div className="admin-empty-state">
                    <CIcon icon={cilInbox} size="xl" className="mb-2 opacity-50" />
                    <div>{emptyMessage}</div>
                  </div>
                </CTableDataCell>
              </CTableRow>
            )}
          </CTableBody>
        </CTable>
      </div>

      {linhasOrdenadas.length > 0 && (
        <div className="d-print-none d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
          <div className="d-flex align-items-center gap-2 small text-body-secondary">
            <span>
              {inicio + 1}–{Math.min(fim, linhasOrdenadas.length)} de {linhasOrdenadas.length}
            </span>
            {pageSizeOptions.length > 1 && (
              <CFormSelect
                size="sm"
                style={{ width: 'auto' }}
                value={tamanhoPagina}
                onChange={(event) => {
                  setTamanhoPagina(Number(event.target.value));
                  setPagina(1);
                }}
              >
                {pageSizeOptions.map((opcao) => (
                  <option key={opcao} value={opcao}>
                    {opcao} por página
                  </option>
                ))}
              </CFormSelect>
            )}
          </div>

          {totalPaginas > 1 && (
            <div className="d-flex align-items-center gap-2">
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                disabled={paginaAtual <= 1}
                onClick={() => setPagina((atual) => atual - 1)}
              >
                Anterior
              </CButton>
              <span className="small text-body-secondary">
                Página {paginaAtual} de {totalPaginas}
              </span>
              <CButton
                color="secondary"
                variant="outline"
                size="sm"
                disabled={paginaAtual >= totalPaginas}
                onClick={() => setPagina((atual) => atual + 1)}
              >
                Próxima
              </CButton>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
