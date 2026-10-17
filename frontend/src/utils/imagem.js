// Reduz uma foto (câmera do celular costuma gerar 3–8MB) pra um JPEG pequeno em data URL, que é
// o que vai pro banco. Mantém a proporção, limitando o maior lado a `ladoMaximo` pixels.
export function reduzirImagem(arquivo, ladoMaximo = 480, qualidade = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();

    imagem.onload = () => {
      const escala = Math.min(1, ladoMaximo / Math.max(imagem.width, imagem.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(imagem.width * escala);
      canvas.height = Math.round(imagem.height * escala);
      canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', qualidade));
    };

    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler a imagem.'));
    };

    imagem.src = url;
  });
}
