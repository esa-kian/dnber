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
      ctx.strokeStyle = '#22d3ee';
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
        const barCount = 28;
        const barWidth = w / barCount;
        for (let i = 0; i < barCount; i++) {
           const height = 16 + Math.abs(Math.sin(time * 5 + i * 0.7)) * 54 + Math.random() * 22;
           ctx.fillStyle = i % 4 === 0 ? '#f59e0b' : '#14b8a6';
           ctx.fillRect(i * barWidth, horizon - height, Math.max(2, barWidth - 3), height);
        }
      } else {
        // Idle waveform
        ctx.strokeStyle = '#f59e0b';
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
  }, [isGenerating]);

  return <canvas ref={canvasRef} className="w-full h-64 rounded-lg border border-slate-800 shadow-[0_0_20px_rgba(20,184,166,0.18)]" />;
};
