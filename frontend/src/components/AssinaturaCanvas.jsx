import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// Resolução interna fixa do desenho: o canvas é esticado por CSS (largura 100%) e as coordenadas do
// toque são convertidas pra essa escala — assim girar o celular ou redimensionar a tela não apaga
// nem distorce a assinatura já feita.
const LARGURA = 900;
const ALTURA = 360;

const AssinaturaCanvas = forwardRef(function AssinaturaCanvas({ onChange, disabled }, ref) {
  const canvasRef = useRef(null);
  const desenhandoRef = useRef(false);
  const ultimoPontoRef = useRef(null);
  const vazioRef = useRef(true);

  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
  }, []);

  useImperativeHandle(ref, () => ({
    limpar() {
      const canvas = canvasRef.current;
      canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
      vazioRef.current = true;
      onChange?.(false);
    },
    estaVazio: () => vazioRef.current,
    paraDataUrl: () => canvasRef.current.toDataURL('image/png'),
  }));

  function pontoDoEvento(event) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) * canvas.width) / rect.width,
      y: ((event.clientY - rect.top) * canvas.height) / rect.height,
    };
  }

  function iniciar(event) {
    if (disabled) return;
    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);
    desenhandoRef.current = true;

    // Um toque sem arrastar ainda deixa um ponto (ex.: pingo do "i").
    const ponto = pontoDoEvento(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(ponto.x, ponto.y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
    ultimoPontoRef.current = ponto;
  }

  function mover(event) {
    if (!desenhandoRef.current) return;
    event.preventDefault();

    const ponto = pontoDoEvento(event);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(ultimoPontoRef.current.x, ultimoPontoRef.current.y);
    ctx.lineTo(ponto.x, ponto.y);
    ctx.stroke();
    ultimoPontoRef.current = ponto;

    if (vazioRef.current) {
      vazioRef.current = false;
      onChange?.(true);
    }
  }

  function terminar() {
    desenhandoRef.current = false;
    ultimoPontoRef.current = null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={LARGURA}
      height={ALTURA}
      className="assinatura-canvas"
      onPointerDown={iniciar}
      onPointerMove={mover}
      onPointerUp={terminar}
      onPointerCancel={terminar}
      aria-label="Área para assinatura"
    />
  );
});

export default AssinaturaCanvas;
