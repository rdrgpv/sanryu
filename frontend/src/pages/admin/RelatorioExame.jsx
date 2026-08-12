import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CButton } from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilPrint } from '@coreui/icons';
import api from '../../services/api';

// Currículo de golpes por faixa (a que está sendo testada), pra montar a ficha de exame impressa.
// Cadastrado direto aqui pois é conteúdo fixo do método, sem tela de admin — vai sendo completado
// faixa por faixa conforme o conteúdo chega.
const CURRICULO_POR_FAIXA = {
  amarela: {
    categorias: [
      { titulo: 'SOCOS', itens: ['Jodan Zuki', 'Chudan Zuki', 'Gedan Zuki', 'Ura Zuki', 'Uraken', 'Tetsui'] },
      { titulo: 'DEFESAS', itens: ['Jodan Age Uke', 'Chudan Yoko Uke', 'Chudan Yoko Uchi', 'Gedan Barai'] },
      { titulo: 'CHUTES', itens: ['Mae Geri', 'Yoko Geri', 'Mawashi Geri'] },
      {
        titulo: 'NAGE-WAZA',
        itens: ['Koshi Guruma', 'O Goshi', 'O Soto Gari', 'O Soto Guruma', 'Ko Uchi Gari', 'O Uchi Gari', 'Tobi Tate Shiho Gatame'],
      },
      {
        titulo: 'NE-WAZA',
        itens: [
          'Hon Kesa Gatame',
          'Tate Shiho Gatame',
          'Juji Gatame',
          'Ude Garami',
          'Nami Juji Jime',
          'Gyaku Juji Jime',
          'Kata Juji Jime',
          'Hadaka Jime',
        ],
      },
    ],
  },
  laranja: {
    categorias: [
      { titulo: 'SOCOS', itens: ['Nukite', 'Mawashi Shuto', 'Haito', 'Empi', 'Gyaku Zuki'] },
      { titulo: 'DEFESAS', itens: ['Jodan Hiza Uke', 'Shuto Uke', 'Gedan Shuto Uke'] },
      { titulo: 'CHUTES', itens: ['Shimo Mawashi Geri', 'Tensho Mawashi Geri', 'Ura Mawashi Geri'] },
      {
        titulo: 'NAGE-WAZA',
        itens: ['De Ashi Barai', 'Harai Goshi', 'Yama Arashi', 'Yoko Otoshi', 'Yoko Gake', 'Morote Gari', 'Tatte Hishigi'],
      },
      {
        titulo: 'NE-WAZA',
        itens: ['Yoko Shiho Gatame', 'Kami Shiho Gatame', 'Kubi Gatame', 'Ashi Hishigi', 'Okuri Eri Jime', 'Kataha Jime'],
      },
    ],
  },
  vermelha: {
    categorias: [
      { titulo: 'SOCOS', itens: ['Tensho', 'Hiraken', 'Tachi Zuki', 'Mawashi Zuki'] },
      { titulo: 'DEFESAS', itens: ['Gedan Tensho Uke', 'Chudan Sasae Uke'] },
      { titulo: 'CHUTES', itens: ['Hiza Geri', 'Gedan Geri', 'Kansetsu Geri', 'Ushiro Geri', 'Ushiro Kakato Geri'] },
      {
        titulo: 'NAGE-WAZA',
        itens: ['Seoi Nage', 'Ipon Seoi Nage', 'Tai Otoshi', 'Seoi Otoshi', 'Tani Otoshi', 'Uchi Mata', 'Kata Guruma'],
      },
      {
        titulo: 'NE-WAZA',
        itens: ['Ushiro Kesa Gatame', 'Shimo Shiho Gatame', 'Ude Gatame', 'Sankaku Gatame', 'Sankaku Jime', 'Nigiri Jime'],
      },
    ],
  },
  azul: {
    categorias: [
      { titulo: 'SOCOS', itens: ['Morote Zuki', 'Sanbon Zuki', 'Hirabasami'] },
      { titulo: 'DEFESAS', itens: ['Morote Uke', 'Chudan Haito Uke', 'Juji Uke', 'Mikazuki Geri'] },
      { titulo: 'CHUTES', itens: ['Fumikomi', 'Kingeri', 'Keri Age'] },
      {
        titulo: 'NAGE-WAZA',
        itens: ['Koshi Nage', 'Sode Tsurikomi Goshi', 'Obi Harai Goshi', 'Ko Uchi Gake Makikomi', 'Kuchiki Taoshi'],
      },
      {
        titulo: 'NE-WAZA',
        itens: ['Makura Kesa Gatame', 'Kata Gatame', 'Ashi Garami', 'Sode Guruma Jime', 'Jigoku Jime'],
      },
    ],
  },
};

function normalizarFaixa(nome) {
  return (nome || '').trim().toLowerCase();
}

const FICHAS_POR_PAGINA = 5;

function agruparEmPaginas(itens, tamanho) {
  const paginas = [];
  for (let i = 0; i < itens.length; i += tamanho) {
    paginas.push(itens.slice(i, i + tamanho));
  }
  return paginas;
}

// Datas "YYYY-MM-DD" sem horário — evita `new Date(string)`, que interpreta como meia-noite UTC e
// pode "voltar" um dia em fusos negativos (Brasil).
function calcularIdade(dataNascimento) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dataNascimento || '');
  if (!match) return null;

  const [, anoStr, mesStr, diaStr] = match;
  const ano = Number(anoStr);
  const mes = Number(mesStr);
  const dia = Number(diaStr);

  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario = hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) idade -= 1;

  return idade;
}

function FichaExame({ inscricao }) {
  const idade = calcularIdade(inscricao.dataNascimento);
  const curriculo = CURRICULO_POR_FAIXA[normalizarFaixa(inscricao.faixa)];
  const maxLinhas = curriculo ? Math.max(...curriculo.categorias.map((categoria) => categoria.itens.length)) : 0;

  return (
    <div className="ficha-exame">
      <table className="ficha-exame__tabela">
        <tbody>
          <tr>
            <td colSpan={curriculo?.categorias.length || 1} className="ficha-exame__cabecalho">
              <strong>Nome:</strong> {inscricao.nome || '-'}
              <span className="ms-4">
                <strong>Idade:</strong> {idade != null ? `${idade} anos` : '-'}
              </span>
              <span className="ms-4">
                <strong>Faixa:</strong> {inscricao.faixa || '-'}
              </span>
            </td>
          </tr>

          {curriculo ? (
            <>
              <tr>
                {curriculo.categorias.map((categoria) => (
                  <th key={categoria.titulo} className="ficha-exame__categoria">
                    {categoria.titulo}
                  </th>
                ))}
              </tr>
              {Array.from({ length: maxLinhas }).map((_, linha) => (
                <tr key={linha}>
                  {curriculo.categorias.map((categoria) => (
                    <td key={categoria.titulo}>{categoria.itens[linha] ? `( ) ${categoria.itens[linha]}` : ''}</td>
                  ))}
                </tr>
              ))}
              <tr>
                <td colSpan={curriculo.categorias.length}>
                  <strong>KATA:</strong> _______________________________
                  <span className="ms-4">
                    <strong>UKEMIS:</strong> _______________________________
                  </span>
                </td>
              </tr>
              <tr>
                <td colSpan={curriculo.categorias.length}>
                  <strong>Obs:</strong>
                </td>
              </tr>
            </>
          ) : (
            <tr>
              <td className="text-body-secondary">Currículo da faixa "{inscricao.faixa || '-'}" ainda não cadastrado neste relatório.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default function RelatorioExame() {
  const { id } = useParams();
  const [evento, setEvento] = useState(null);
  const [inscricoes, setInscricoes] = useState([]);

  useEffect(() => {
    api.get(`/admin/eventos/${id}`).then((res) => setEvento(res.data));
    api.get(`/admin/eventos/${id}/inscricoes`).then((res) => setInscricoes(res.data));
  }, [id]);

  return (
    <div>
      <div className="d-print-none">
        <Link to={`/admin/eventos/${id}/inscricoes`} className="text-body-secondary text-decoration-none d-inline-block mb-2">
          &larr; Voltar
        </Link>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h1 className="h3 mb-0">Fichas de exame{evento ? ` — ${evento.nome}` : ''}</h1>
          <CButton color="primary" onClick={() => window.print()} disabled={inscricoes.length === 0}>
            <CIcon icon={cilPrint} className="me-1" />
            Imprimir
          </CButton>
        </div>
        {inscricoes.length === 0 && <p className="text-body-secondary">Nenhuma inscrição confirmada para este evento.</p>}
      </div>

      {agruparEmPaginas(inscricoes, FICHAS_POR_PAGINA).map((pagina, indice) => (
        <div key={indice} className="ficha-exame-pagina">
          {pagina.map((inscricao) => (
            <FichaExame key={inscricao.id} inscricao={inscricao} />
          ))}
        </div>
      ))}
    </div>
  );
}
