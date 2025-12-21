import React, { useEffect, useRef } from 'react';

export const Visualizer: React.FC<{ isGenerating: boolean }> = ({ isGenerating }) => {
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

      // Clear with trail effect
      ctx.fillStyle = 'rgba(15, 23, 42, 0.2)';
      ctx.fillRect(0, 0, w, h);

      // Draw Grid/Horizon
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1;
      
      const horizon = h * 0.6;
      
      // Moving Grid Lines
      ctx.beginPath();
      for (let i = 0; i < w; i += 40) {
         // Perspective lines
         ctx.moveTo(w/2, horizon - 50);
         ctx.lineTo(i - (w/2) + (i*2), h);
      }
      ctx.stroke();

      // Horizontal lines moving down
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

      // Audio-reactive style bars (simulated)
      if (isGenerating) {
        const barCount = 20;
        const barWidth = w / barCount;
        ctx.fillStyle = '#c084fc';
        for (let i = 0; i < barCount; i++) {
           const height = Math.sin(time * 5 + i) * 50 + Math.random() * 50;
           ctx.fillRect(i * barWidth, horizon - height, barWidth - 2, height);
        }
      } else {
        // Idle ambient orb
        const grad = ctx.createRadialGradient(w/2, horizon - 100, 10, w/2, horizon - 100, 100);
        grad.addColorStop(0, '#f472b6');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(w/2, horizon - 100 + Math.sin(time)*20, 100, 0, Math.PI * 2);
        ctx.fill();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [isGenerating]);

  return <canvas ref={canvasRef} className="w-full h-64 rounded-lg border border-slate-700 shadow-[0_0_20px_rgba(56,189,248,0.2)]" />;
};
