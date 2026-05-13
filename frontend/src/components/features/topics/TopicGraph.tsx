import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchGraph } from '@/api/resonance';
import { useNavigate } from 'react-router-dom';
import type { GraphData, GraphNode } from '@/types';
import styles from './TopicGraph.module.css';

export function TopicGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['topicGraph'],
    queryFn: fetchGraph,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const graphData = data;

    const rect = canvas.parentElement!.getBoundingClientRect();
    const w = rect.width;
    const h = 400;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.scale(dpr, dpr);

    const nodes = graphData.nodes.map((n) => ({
      ...n,
      x: Math.random() * w * 0.6 + w * 0.2,
      y: Math.random() * h * 0.6 + h * 0.2,
      vx: 0,
      vy: 0,
    }));

    const edgeSet = new Set(data.edges.map((e) => `${e.source}--${e.target}`));

    let animId: number;
    let dragging: GraphNode | null = null;
    let mouseX = 0, mouseY = 0;

    function forceSim() {
      const centerX = w / 2;
      const centerY = h / 2;
      const k = 0.05;
      const repulsion = 600;
      const attractionK = 0.01;
      const damping = 0.85;

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        if (n === dragging) continue;

        n.vx += (centerX - n.x) * 0.0005;
        n.vy += (centerY - n.y) * 0.0005;

        for (let j = i + 1; j < nodes.length; j++) {
          const m = nodes[j];
          const dx = n.x - m.x;
          const dy = n.y - m.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = repulsion / (dist * dist);
          const fx = (dx / dist) * force * k;
          const fy = (dy / dist) * force * k;
          n.vx += fx;
          n.vy += fy;
          m.vx -= fx;
          m.vy -= fy;
        }

        for (const e of graphData.edges) {
          let other: typeof nodes[0] | undefined;
          if (e.source === n.id) other = nodes.find((x) => x.id === e.target);
          else if (e.target === n.id) other = nodes.find((x) => x.id === e.source);
          if (other) {
            const dx = other.x - n.x;
            const dy = other.y - n.y;
            n.vx += dx * attractionK * e.weight;
            n.vy += dy * attractionK * e.weight;
          }
        }

        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(20, Math.min(w - 20, n.x));
        n.y = Math.max(20, Math.min(h - 20, n.y));
      }
    }

    function render() {
      ctx.clearRect(0, 0, w, h);

      for (const e of graphData.edges) {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        if (!src || !tgt) continue;
        ctx.beginPath();
        ctx.moveTo(src.x, src.y);
        ctx.lineTo(tgt.x, tgt.y);
        ctx.strokeStyle = 'rgba(228, 228, 222, 0.6)';
        ctx.lineWidth = Math.min(e.weight * 1.5, 4);
        ctx.stroke();
      }

      for (const n of nodes) {
        const r = Math.max(6, Math.min(28, n.size * 0.5 + 6));
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);

        if (hoveredNode === n.id) {
          ctx.fillStyle = '#ff6b6b';
          ctx.strokeStyle = '#f55757';
          ctx.lineWidth = 3;
        } else {
          ctx.fillStyle = 'rgba(255, 107, 107, 0.85)';
          ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
          ctx.lineWidth = 2;
        }
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = hoveredNode === n.id ? '#ffffff' : '#1d1a18';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(n.name, n.x, n.y + r + 13);
      }
    }

    function animate() {
      forceSim();
      render();
      animId = requestAnimationFrame(animate);
    }

    animate();

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const n of nodes) {
        const r = Math.max(6, Math.min(28, n.size * 0.5 + 6));
        const dx = cx - n.x;
        const dy = cy - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < r + 4) {
          navigate(`/topics/${n.id}`);
          return;
        }
      }
    };

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let found: string | null = null;
      for (const n of nodes) {
        const r = Math.max(6, Math.min(28, n.size * 0.5 + 6));
        const dx = cx - n.x;
        const dy = cy - n.y;
        if (Math.sqrt(dx * dx + dy * dy) < r + 4) {
          found = n.id;
          break;
        }
      }
      setHoveredNode(found);
      if (found) canvas.style.cursor = 'pointer';
      else canvas.style.cursor = 'default';
    };

    canvas.addEventListener('click', handleClick);
    canvas.addEventListener('mousemove', handleMove);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('click', handleClick);
      canvas.removeEventListener('mousemove', handleMove);
    };
  }, [data, navigate, hoveredNode]);

  return <canvas ref={canvasRef} className={styles.canvas} />;
}
