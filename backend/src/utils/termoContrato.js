// Modelo inicial do contrato de matrícula — gravado na ConfiguracaoAcademia na primeira subida e
// editável depois em /admin/configuracao-academia. É um texto genérico de ponto de partida: o
// definitivo deve ser revisado por um advogado.
//
// Marcadores substituídos na hora de exibir/assinar (ver services/contratoService.js):
//   {{contratante}} {{cpfContratante}} {{aluno}} {{cpfAluno}} {{dataNascimentoAluno}}
//   {{unidade}} {{plano}} {{periodicidade}} {{valor}} {{diaVencimento}} {{dataInicio}} {{data}}
const TERMO_CONTRATO_PADRAO = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS — MATRÍCULA

CONTRATANTE: {{contratante}}, CPF {{cpfContratante}}.
ALUNO(A): {{aluno}}, CPF {{cpfAluno}}, nascido(a) em {{dataNascimentoAluno}}.
UNIDADE: {{unidade}}.

1. OBJETO. O presente contrato tem por objeto a prestação de aulas de artes marciais ao(à) ALUNO(A), na unidade acima, conforme as turmas e horários vigentes da academia.

2. PLANO E PAGAMENTO. O CONTRATANTE adere ao plano "{{plano}}" ({{periodicidade}}), no valor de {{valor}} por período, com vencimento todo dia {{diaVencimento}}, a partir de {{dataInicio}}. O atraso no pagamento poderá suspender o acesso às aulas até a regularização.

3. VIGÊNCIA E CANCELAMENTO. Este contrato vigora por prazo indeterminado, podendo ser cancelado por qualquer das partes mediante aviso prévio de 30 (trinta) dias. Valores de períodos já iniciados não são reembolsados.

4. SAÚDE. O CONTRATANTE declara que o(a) ALUNO(A) está apto(a) à prática de atividade física e se compromete a informar à academia qualquer condição de saúde, lesão ou uso de medicamento que possa interferir na prática.

5. RISCOS. O CONTRATANTE declara ciência de que a prática de artes marciais envolve contato físico e risco de lesões, comprometendo-se o(a) ALUNO(A) a seguir as orientações dos instrutores e as regras da academia.

6. IMAGEM. O CONTRATANTE autoriza o uso de imagens e vídeos do(a) ALUNO(A) feitos durante aulas, eventos e graduações nos canais de comunicação da academia, nos termos da Lei nº 13.709/2018 (LGPD), podendo revogar esta autorização a qualquer momento por escrito.

7. DADOS PESSOAIS. Os dados informados serão usados exclusivamente para a gestão da matrícula, cobrança e comunicação com o CONTRATANTE, conforme a LGPD.

{{data}}.`;

module.exports = { TERMO_CONTRATO_PADRAO };
