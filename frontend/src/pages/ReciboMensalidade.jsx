import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';

function formatarMoeda(valor) {
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarCompetencia(valor) {
  const nomes = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [ano, mes] = (valor || '').split('-').map(Number);
  return mes ? `${nomes[mes - 1]} de ${ano}` : valor;
}

// Recibo da mensalidade paga (/mensalidades/:token/recibo). "Baixar PDF" usa o imprimir do navegador
// (Salvar como PDF), que funciona também no celular — sem gerar arquivo no servidor.
export default function ReciboMensalidade() {
  const { token } = useParams();
  const [recibo, setRecibo] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    api
      .get(`/mensalidades/${token}/recibo`)
      .then((res) => setRecibo(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Recibo não encontrado.'));
  }, [token]);

  useEffect(() => {
    if (recibo) document.title = `Recibo ${recibo.numero} · San·Ryu Dojo`;
  }, [recibo]);

  if (erro) {
    return (
      <section className="section">
        <div className="container narrow">
          <p className="alert alert--error">{erro}</p>
        </div>
      </section>
    );
  }

  if (!recibo) return <p style={{ padding: 16 }}>Carregando...</p>;

  const pagoEm = new Date(recibo.pagoEm);

  return (
    <div className="recibo-pagina">
      <div className="recibo-acoes">
        <button type="button" className="btn btn--primary" onClick={() => window.print()}>
          Baixar PDF / imprimir
        </button>
        <small>No celular: toque em “Baixar PDF” e escolha “Salvar como PDF”.</small>
      </div>

      <article className="recibo">
        <header className="recibo__cabecalho">
          <div>
            <strong className="recibo__emissor">{recibo.emissor.nome}</strong>
            {recibo.emissor.documento && <div>CPF/CNPJ: {recibo.emissor.documento}</div>}
            {recibo.emissor.endereco && <div>{recibo.emissor.endereco}</div>}
          </div>
          <div className="recibo__numero">
            <span>RECIBO</span>
            <strong>Nº {recibo.numero}</strong>
          </div>
        </header>

        <div className="recibo__valor">{formatarMoeda(recibo.valor)}</div>

        <p className="recibo__texto">
          Recebemos de <strong>{recibo.pagador.nome}</strong>
          {recibo.pagador.cpf ? `, CPF ${recibo.pagador.cpf},` : ''} a importância de <strong>{formatarMoeda(recibo.valor)}</strong> (
          {recibo.valorPorExtenso}), referente à mensalidade de <strong>{formatarCompetencia(recibo.competencia)}</strong>
          {recibo.plano ? ` do plano ${recibo.plano}` : ''} do(a) aluno(a) <strong>{recibo.aluno}</strong>, paga via {recibo.formaPagamento} em{' '}
          {pagoEm.toLocaleDateString('pt-BR')}.
        </p>

        <p className="recibo__texto">Para clareza, firmamos o presente recibo, dando plena quitação do valor acima.</p>

        <footer className="recibo__rodape">
          <div className="recibo__assinatura">
            <span />
            {recibo.emissor.nome}
          </div>
          <small>Emitido eletronicamente em {new Date().toLocaleDateString('pt-BR')}. Documento sem valor fiscal.</small>
        </footer>
      </article>
    </div>
  );
}
