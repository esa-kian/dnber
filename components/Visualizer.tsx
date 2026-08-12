import React, { useEffect, useRef } from 'react';

type VisualizerProps = {
  isGenerating: boolean;
  primaryColor: string;
  secondaryColor: string;
};

export const Visualizer: React.FC<VisualizerProps> = ({ isGenerating, primaryColor, secondaryColor }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const draw = () => {
      time += 0.01;
      // Resize
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
          canvas.width = canvas.clientWidth;
          canvas.height = canvas.clientHeight;
      }

      const w = canvas.width;
      const h = canvas.height;

      const background = ctx.createLinearGradient(0, 0, w, h);
      background.addColorStop(0, '#020617');
      background.addColorStop(0.58, '#0f172a');
      background.addColorStop(1, '#020617');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, w, h);

      ctx.globalAlpha = 0.26;
      ctx.strokeStyle = primaryColor;
      ctx.lineWidth = 1;
      
      const horizon = h * 0.6;
      
      ctx.beginPath();
      for (let i = 0; i < w; i += 40) {
         ctx.moveTo(w/2, horizon - 50);
         ctx.lineTo(i - (w/2) + (i*2), h);
      }
      ctx.stroke();

      const speed = isGenerating ? 4 : 1;
      const offset = (time * 50 * speed) % 50;
      
      ctx.beginPath();
      for (let y = horizon; y < h; y += (y - horizon + 10) * 0.1) {
           const yPos = y + offset;
           if (yPos > h) continue;
           ctx.moveTo(0, yPos);
           ctx.lineTo(w, yPos);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (isGenerating) {
        const barCount = 28;
        const barWidth = w / barCount;
        for (let i = 0; i < barCount; i++) {
           const height = 16 + Math.abs(Math.sin(time * 5 + i * 0.7)) * 54 + Math.random() * 22;
           const barGradient = ctx.createLinearGradient(0, horizon - height, 0, horizon);
           barGradient.addColorStop(0, i % 4 === 0 ? secondaryColor : primaryColor);
           barGradient.addColorStop(1, 'rgba(15, 23, 42, 0.1)');
           ctx.fillStyle = barGradient;
           ctx.fillRect(i * barWidth + 2, horizon - height, Math.max(2, barWidth - 4), height);
        }
      } else {
        ctx.strokeStyle = secondaryColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= w; x += 8) {
          const y = horizon - 90 + Math.sin(time * 2 + x * 0.018) * 20 + Math.sin(time * 0.8 + x * 0.045) * 12;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isGenerating, primaryColor, secondaryColor]);

  // Decorative only: the drawing is animated shapes, not a reading of the audio,
  // so there is nothing here worth announcing
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="h-64 w-full rounded-lg border border-slate-800/90 bg-slate-950 shadow-2xl shadow-black/25"
    />
  );
};
