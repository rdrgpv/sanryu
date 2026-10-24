import { Link } from 'react-router-dom';
import { usePagina } from '../utils/site.js';

// Perguntas frequentes. Texto fixo aqui no código — revisar quando as regras da academia mudarem.
const PERGUNTAS = [
  {
    pergunta: 'Preciso ter experiência para começar?',
    resposta:
      'Não. As turmas recebem iniciantes, e o Método Morganti é progressivo: você aprende os fundamentos primeiro e evolui no seu ritmo, com acompanhamento do sensei.',
  },
  {
    pergunta: 'A partir de que idade a criança pode treinar?',
    resposta:
      'Temos turmas infantis separadas por idade. Na página Aulas e horários você vê o nível de cada turma; se ficar em dúvida, agende a aula experimental e a gente indica a turma certa.',
  },
  {
    pergunta: 'Como funciona a aula experimental?',
    resposta:
      'É gratuita e sem compromisso. Você escolhe a turma e o dia no formulário de agendamento, e a gente confirma pelo WhatsApp ou e-mail. Menores de idade precisam dos dados de um responsável.',
  },
  {
    pergunta: 'O que levar na primeira aula?',
    resposta:
      'Roupa confortável para treino (camiseta e calça de moletom ou similar, sem zíperes ou botões), uma garrafa de água e chinelo para andar fora do tatame. Treinamos descalços; unhas curtas e sem acessórios (brincos, anéis, relógio).',
  },
  {
    pergunta: 'Preciso comprar kimono?',
    resposta:
      'Para a aula experimental, não. Depois da matrícula o kimono passa a ser o uniforme de treino — vendemos kimonos e faixas na própria academia e pela loja da Área do Aluno.',
  },
  {
    pergunta: 'Como funciona a graduação por faixas?',
    resposta:
      'A evolução é reconhecida em exames de faixa, do branco ao preto, conforme o programa do Método Morganti Ju-Jitsu. O sensei avalia frequência, técnica e conduta e indica quando o aluno está pronto para o exame.',
  },
  {
    pergunta: 'Como é feito o pagamento?',
    resposta:
      'Por plano (mensal, trimestral, semestral ou anual), com vencimento no dia que você escolher. A cobrança chega por e-mail com Pix, e você acompanha tudo pela Área do Aluno. Irmãos têm desconto família.',
  },
  {
    pergunta: 'Ju-Jitsu é seguro para crianças?',
    resposta:
      'Sim. O treino é supervisionado, com quedas e técnicas ensinadas de forma progressiva e adequada à idade. Além da autodefesa, o foco é respeito, disciplina e autoconfiança.',
  },
];

export default function Duvidas() {
  usePagina('Dúvidas frequentes', 'Respostas sobre aula experimental, idade, kimono, graduação por faixas e pagamento no San·Ryu Dojo.');

  return (
    <>
      <section className="page-header">
        <div className="container">
          <p className="hero__kicker">Dúvidas</p>
          <h1>Perguntas frequentes</h1>
        </div>
      </section>

      <section className="section">
        <div className="container narrow">
          <div className="faq">
            {PERGUNTAS.map((item) => (
              <details key={item.pergunta} className="faq__item">
                <summary>{item.pergunta}</summary>
                <p>{item.resposta}</p>
              </details>
            ))}
          </div>

          <div className="chamada-final">
            <p>Ficou alguma dúvida? Fale com a gente.</p>
            <Link to="/contato" className="btn btn--ghost">
              Entrar em contato
            </Link>
            <Link to="/aula-experimental" className="btn btn--primary">
              Agendar aula experimental
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
