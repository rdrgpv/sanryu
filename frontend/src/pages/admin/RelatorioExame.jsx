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
  verde: {
    categorias: [
      { titulo: 'SOCOS', itens: ['Nihon Nukite', 'Yoko Zuki', 'Yama Zuki'] },
      { titulo: 'DEFESAS', itens: ['Kakuto', 'Mawashi Uke', 'Kake Uke'] },
      { titulo: 'CHUTES', itens: ['Nidan Geri', 'Mae Tobi Geri', 'Yoko Tobi Geri'] },
      {
        titulo: 'NAGE-WAZA',
        itens: ['Uchii Makikomi', 'O Soto Makikomi', 'Harai Makikomi', 'Hane Goshi', 'Tomoe Nage', 'Tawara Gaeshi', 'Kani Hasami'],
      },
      {
        titulo: 'NE-WAZA',
        itens: ['Nihon Kata Gatame', 'Sankaku Ashi Hishigi', 'Kakato Hishigi', 'Ashi Jime', 'Tsukomi Jime'],
      },
    ],
  },
  roxa: {
    // A partir da Roxa o currículo deixa de ter Socos/Defesas/Chutes — só Nage-Waza e Ne-Waza.
    categorias: [
      {
        titulo: 'NAGE-WAZA',
        itens: [
          'Tobi Juji Gatame',
          'Tobi Sankaku Jime',
          'Yoko Tomoe Juji Gatame',
          'Sumi Gaeshi',
          'Sasae Tsurikomi Ashi',
          'Te Guruma',
          'Kuzure Kata Guruma',
        ],
      },
      {
        titulo: 'NE-WAZA',
        itens: ['Nihon Ude Gatame', 'Hasame Hishigi', 'Ushiro Kubi Gatame', 'Hiraken Jime', 'Atama Jime', 'Hiza Jime'],
      },
    ],
  },
  marrom: {
    categorias: [
      {
        titulo: 'NAGE-WAZA',
        itens: [
          'Seoi Nage Hizamazuki',
          'Eri Seoi Nage',
          'Seoi Uchi Mata',
          'Seoi Hane Goshi',
          'Yoko Wakare',
          'Sode Guruma',
          'Nidan Gake',
          'Obi Otoshi',
          'Hiza Guruma',
          'Ushiro Ura Nage',
        ],
      },
      {
        titulo: 'NE-WAZA',
        itens: [
          'Ude Nigiri',
          'Ushiro Sankaku Jime',
          'Ushiro Ude Garami',
          'Ushiro Do Gatame',
          'Tate Eri Jime',
          'Tate Sankaku Ashi Hishigi',
          'Haisoku Jime',
          'Nidan Sode Jime',
          'Shuto Jime',
          'Hiji Jime',
          'Kata Jime',
        ],
      },
    ],
  },
  preta: {
    // Ficha maior (2 blocos de 3 categorias) — só 2 fichas por página, ver capacidadePagina().
    blocos: [
      [
        { titulo: 'SOCOS', itens: ['Tobi Gyaku Zuki', 'Kumade', 'Nihon Mawashi Tetsui', 'Gyaku Mawashi Empi Uchi', 'Ushiro Empi'] },
        { titulo: 'DEFESAS', itens: ['Haishu Uke', 'Kakiwake Uke', 'Osae Uke', 'Kosa Uke', 'Nihon Gedan Hiraken Uke'] },
        {
          titulo: 'CHUTES',
          itens: ['Uchi Mawashi Geri', 'Otoshi Mawashi Geri', 'Kakato Otoshi Geri', 'Nihon Geri', 'Tobi Ushiro Geri', 'Mawashi Kaiten Geri'],
        },
      ],
      [
        {
          titulo: 'NAGE-WAZA',
          itens: ['Ko Soto Gari', 'Okuri Ashi Barai', 'Ashi Barai', 'Ushiro Goshi', 'Kata Otoshi', 'Yoko Guruma', 'Kuzure Tomoe Nage', 'Sode Otoshi'],
        },
        {
          titulo: 'NE-WAZA',
          itens: [
            'Kuzure Kami Shiho Gatame',
            'Hiza Hishigi',
            'Gyaku Kakato Hishigi',
            'Hara Gatame',
            'Katate Jime',
            'Obi Jime',
            'Seiken Jime',
            'Kuzure Okuri Eri Jime',
            'Ude Sankaku Jime',
            'Tate Sankaku Jime',
          ],
        },
        {
          titulo: 'KAESHI-WAZA',
          itens: ['De Ashi Barai/ Juji Gatame', 'Mawashi Geri/ Harai Goshi', 'Tetsui/ Ippon Seoi Nage'],
        },
      ],
    ],
  },
};

function normalizarFaixa(nome) {
  return (nome || '').trim().toLowerCase();
}

const FICHAS_POR_PAGINA = 5;
const FICHAS_POR_PAGINA_PRETA = 2; // ficha bem maior (2 blocos de categorias) — só cabem 2 numa folha A4

function capacidadePagina(faixa) {
  return normalizarFaixa(faixa) === 'preta' ? FICHAS_POR_PAGINA_PRETA : FICHAS_POR_PAGINA;
}

// Agrupa em páginas respeitando a capacidade de cada faixa — nunca mistura Preta (ficha grande)
// com as demais (fichas compactas) na mesma folha, mesmo que venham intercaladas na lista.
function agruparEmPaginas(itens) {
  const paginas = [];
  let atual = [];
  let capacidadeAtual = null;

  itens.forEach((item) => {
    const capacidadeItem = capacidadePagina(item.faixa);

    if (atual.length === 0) {
      capacidadeAtual = capacidadeItem;
    } else if (atual.length >= capacidadeAtual || capacidadeItem !== capacidadeAtual) {
      paginas.push(atual);
      atual = [];
      capacidadeAtual = capacidadeItem;
    }

    atual.push(item);
  });

  if (atual.length > 0) paginas.push(atual);

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

// Um bloco = uma linha de títulos de categoria + as linhas de itens debaixo. A ficha da Preta tem
// dois blocos empilhados (Socos/Defesas/Chutes e depois Nage-Waza/Ne-Waza/Kaeshi-Waza); as demais
// faixas têm só um.
function BlocoCategorias({ categorias, rodapeColunas }) {
  const maxLinhas = Math.max(...categorias.map((categoria) => categoria.itens.length));

  return (
    <>
      <tr>
        {categorias.map((categoria) => (
          <th key={categoria.titulo} className="ficha-exame__categoria">
            {categoria.titulo}
          </th>
        ))}
      </tr>
      {Array.from({ length: maxLinhas }).map((_, linha) => (
        <tr key={linha}>
          {categorias.map((categoria) => (
            <td key={categoria.titulo}>{categoria.itens[linha] ? `( ) ${categoria.itens[linha]}` : ''}</td>
          ))}
        </tr>
      ))}
      {rodapeColunas && (
        <tr>
          {categorias.map((categoria, indice) => (
            <td key={categoria.titulo}>
              <strong>{rodapeColunas[indice] || ''}</strong>
            </td>
          ))}
        </tr>
      )}
    </>
  );
}

function FichaExame({ inscricao }) {
  const idade = calcularIdade(inscricao.dataNascimento);
  const curriculo = CURRICULO_POR_FAIXA[normalizarFaixa(inscricao.faixa)];
  const blocos = curriculo ? curriculo.blocos || [curriculo.categorias] : [];
  const colunasCabecalho = blocos[0]?.length || 1;

  return (
    <div className="ficha-exame">
      <table className="ficha-exame__tabela">
        <tbody>
          <tr>
            <td colSpan={colunasCabecalho} className="ficha-exame__cabecalho">
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
            blocos.length > 1 ? (
              // Múltiplos blocos (Preta): rodapé KATA/UKEMIS/OBS em colunas, só no último bloco.
              blocos.map((categorias, indice) => (
                <BlocoCategorias
                  key={indice}
                  categorias={categorias}
                  rodapeColunas={indice === blocos.length - 1 ? ['KATA:', 'UKEMIS:', 'OBS:'] : null}
                />
              ))
            ) : (
              <>
                <BlocoCategorias categorias={blocos[0]} />
                <tr>
                  <td colSpan={colunasCabecalho}>
                    <strong>KATA:</strong> _______________________________
                    <span className="ms-4">
                      <strong>UKEMIS:</strong> _______________________________
                    </span>
                  </td>
                </tr>
                <tr>
                  <td colSpan={colunasCabecalho}>
                    <strong>Obs:</strong>
                  </td>
                </tr>
              </>
            )
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

      {agruparEmPaginas(inscricoes).map((pagina, indice) => (
        <div key={indice} className="ficha-exame-pagina">
          {pagina.map((inscricao) => (
            <FichaExame key={inscricao.id} inscricao={inscricao} />
          ))}
        </div>
      ))}
    </div>
  );
}
