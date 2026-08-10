const common = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  viewBox: '0 0 24 24',
  width: '1.2em',
  height: '1.2em',
};

export function IconAlunos(props) {
  return (
    <svg {...common} {...props}>
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </svg>
  );
}

export function IconTurmas(props) {
  return (
    <svg {...common} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" />
    </svg>
  );
}

export function IconInstrutores(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 3l2.6 4.9 5.4.8-3.9 3.8.9 5.3-4.9-2.6-4.9 2.6.9-5.3-3.9-3.8 5.4-.8L12 3z" />
    </svg>
  );
}

export function IconMatriculas(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 19V5a1 1 0 0 1 1-1h9l6 6v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
      <path d="M13 4v6h6M9 14h6M9 17h4" />
    </svg>
  );
}

export function IconPlus(props) {
  return (
    <svg {...common} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg {...common} {...props}>
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19 3 20l1-4 12.5-12.5z" />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...common} {...props}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}

export function IconBack(props) {
  return (
    <svg {...common} {...props}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}
