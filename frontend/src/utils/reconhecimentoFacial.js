// Reconhecimento facial da chamada por foto. Roda 100% no navegador: a foto da turma não é enviada
// pra lugar nenhum e nenhum "modelo de rosto" é guardado no servidor — os descritores são calculados
// na hora, a partir da foto do cadastro de quem autorizou, e ficam só na memória desta aba.
// O resultado é uma SUGESTÃO: o sensei confere antes de salvar.

const URL_MODELOS = '/modelos-face';

// Distância euclidiana entre descritores abaixo da qual consideramos "a mesma pessoa". O padrão da
// biblioteca é 0,6; 0,5 erra menos marcando a pessoa errada (preferível: o sensei completa o resto).
const LIMIAR_DISTANCIA = 0.5;
const LADO_MAXIMO_FOTO_TURMA = 1600;

let faceapiPromise = null;
const descritoresPorAluno = new Map();

function carregarBiblioteca() {
  if (!faceapiPromise) {
    faceapiPromise = (async () => {
      const faceapi = await import('@vladmandic/face-api');
      await faceapi.tf.ready();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(URL_MODELOS),
        faceapi.nets.faceLandmark68Net.loadFromUri(URL_MODELOS),
        faceapi.nets.faceRecognitionNet.loadFromUri(URL_MODELOS),
      ]);
      return faceapi;
    })().catch((err) => {
      faceapiPromise = null;
      throw err;
    });
  }
  return faceapiPromise;
}

function carregarImagem(src) {
  return new Promise((resolve, reject) => {
    const imagem = new Image();
    imagem.onload = () => resolve(imagem);
    imagem.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    imagem.src = src;
  });
}

// Foto de celular tem 12MP+ — reduzir deixa a detecção bem mais rápida sem perder os rostos.
async function prepararFotoTurma(arquivo) {
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = await carregarImagem(url);
    const escala = Math.min(1, LADO_MAXIMO_FOTO_TURMA / Math.max(imagem.width, imagem.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(imagem.width * escala);
    canvas.height = Math.round(imagem.height * escala);
    canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function descritorDoAluno(faceapi, aluno) {
  const chave = `${aluno.id}:${aluno.foto.length}`;
  if (descritoresPorAluno.has(chave)) return descritoresPorAluno.get(chave);

  const imagem = await carregarImagem(aluno.foto);
  const deteccao = await faceapi
    .detectSingleFace(imagem, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  const descritor = deteccao?.descriptor || null;
  descritoresPorAluno.set(chave, descritor);
  return descritor;
}

// Compara os rostos da foto da turma com as fotos de cadastro dos alunos permitidos. Cada rosto
// fica com no máximo um aluno e vice-versa (os pares mais parecidos primeiro).
export async function reconhecerAlunos(arquivo, alunos, aoProgredir = () => {}) {
  aoProgredir('Carregando reconhecimento (só na primeira vez)...');
  const faceapi = await carregarBiblioteca();

  const permitidos = alunos.filter((aluno) => aluno.reconhecimentoPermitido && aluno.foto);
  const referencias = [];
  const semRostoNoCadastro = [];

  for (const [indice, aluno] of permitidos.entries()) {
    aoProgredir(`Preparando fotos do cadastro (${indice + 1}/${permitidos.length})...`);
    const descritor = await descritorDoAluno(faceapi, aluno);
    if (descritor) referencias.push({ aluno, descritor });
    else semRostoNoCadastro.push(aluno);
  }

  aoProgredir('Procurando rostos na foto...');
  const canvas = await prepararFotoTurma(arquivo);
  const rostos = await faceapi
    .detectAllFaces(canvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4, maxResults: 80 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const pares = [];
  rostos.forEach((rosto, indiceRosto) => {
    referencias.forEach(({ aluno, descritor }) => {
      const distancia = faceapi.euclideanDistance(rosto.descriptor, descritor);
      if (distancia < LIMIAR_DISTANCIA) pares.push({ indiceRosto, aluno, distancia });
    });
  });
  pares.sort((a, b) => a.distancia - b.distancia);

  const rostosUsados = new Set();
  const reconhecidos = [];
  for (const par of pares) {
    if (rostosUsados.has(par.indiceRosto) || reconhecidos.some((item) => item.aluno.id === par.aluno.id)) continue;
    rostosUsados.add(par.indiceRosto);
    reconhecidos.push(par);
  }

  return {
    rostosNaFoto: rostos.length,
    reconhecidos: reconhecidos.map((item) => ({ alunoId: item.aluno.id, nome: item.aluno.nome, distancia: item.distancia })),
    rostosSemCorrespondencia: rostos.length - reconhecidos.length,
    semRostoNoCadastro: semRostoNoCadastro.map((aluno) => aluno.nome),
    alunosComparados: referencias.length,
  };
}
