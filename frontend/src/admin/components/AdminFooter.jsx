export default function AdminFooter() {
  return (
    <footer className="admin-footer d-print-none d-flex align-items-center justify-content-center">
      <span>© {new Date().getFullYear()} San·Ryu Dojo</span>
      <span className="creditos-rrp ms-3">
        Desenvolvido por
        <img src="/logos/rrp-sistemas.svg" alt="RRP Sistemas" />
      </span>
    </footer>
  );
}
