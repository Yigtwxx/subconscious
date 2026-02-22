import React, { useEffect, useRef, useState } from 'react';
import { Network } from 'lucide-react';
import type { GraphData, NodeData, EdgeData } from '../types';

interface GraphPanelProps {
    data: GraphData | null;
}

const NODE_COLORS: Record<string, string> = {
    concept: '#8b5cf6',
    memory: '#3b82f6',
    dream: '#6366f1',
    emotion: '#ec4899',
};

export function GraphPanel({ data }: GraphPanelProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);

    const simRef = useRef<{ nodes: NodeData[]; edges: EdgeData[]; raf: number | null }>({ nodes: [], edges: [], raf: null });
    const dragRef = useRef<{ node: NodeData | null }>({ node: null });

    // Sync data into simulation
    useEffect(() => {
        if (!data) return;
        const w = containerRef.current?.clientWidth || 800;
        const h = containerRef.current?.clientHeight || 600;
        const existing = new Map(simRef.current.nodes.map(n => [n.id, n]));

        simRef.current.nodes = data.nodes.map(n => {
            const prev = existing.get(n.id);
            return { ...n, x: prev?.x ?? w / 2 + (Math.random() - 0.5) * w * 0.6, y: prev?.y ?? h / 2 + (Math.random() - 0.5) * h * 0.6, vx: prev?.vx ?? 0, vy: prev?.vy ?? 0 };
        });
        simRef.current.edges = data.edges;
        setReady(true);
    }, [data]);

    // Render loop
    useEffect(() => {
        if (!ready || !canvasRef.current || !containerRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        let dpr = 1;

        const resize = () => {
            const rect = containerRef.current!.getBoundingClientRect();
            dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            canvas.style.width = `${rect.width}px`;
            canvas.style.height = `${rect.height}px`;
        };

        window.addEventListener('resize', resize);
        resize();

        const REPULSION = 2500;
        const SPRING_LEN = 110;
        const SPRING_K = 0.04;
        const FRICTION = 0.88;

        const tick = () => {
            const { width: cw, height: ch } = containerRef.current!.getBoundingClientRect();
            const { nodes, edges } = simRef.current;

            // Forces
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = (a.x ?? 0) - (b.x ?? 0);
                    const dy = (a.y ?? 0) - (b.y ?? 0);
                    const d2 = dx * dx + dy * dy || 1;
                    const f = REPULSION / d2;
                    const dist = Math.sqrt(d2);
                    const fx = (dx / dist) * f;
                    const fy = (dy / dist) * f;
                    a.vx = (a.vx ?? 0) + fx; a.vy = (a.vy ?? 0) + fy;
                    b.vx = (b.vx ?? 0) - fx; b.vy = (b.vy ?? 0) - fy;
                }
            }

            for (const e of edges) {
                const s = nodes.find(n => n.id === e.source);
                const t = nodes.find(n => n.id === e.target);
                if (!s || !t) continue;
                const dx = (t.x ?? 0) - (s.x ?? 0);
                const dy = (t.y ?? 0) - (s.y ?? 0);
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const f = (dist - SPRING_LEN) * SPRING_K;
                const fx = (dx / dist) * f;
                const fy = (dy / dist) * f;
                s.vx = (s.vx ?? 0) + fx; s.vy = (s.vy ?? 0) + fy;
                t.vx = (t.vx ?? 0) - fx; t.vy = (t.vy ?? 0) - fy;
            }

            // Update positions
            for (const n of nodes) {
                if (dragRef.current.node?.id === n.id) continue;
                n.vx = (n.vx ?? 0) * FRICTION;
                n.vy = (n.vy ?? 0) * FRICTION;
                n.x = (n.x ?? 0) + (n.vx ?? 0);
                n.y = (n.y ?? 0) + (n.vy ?? 0);
                // Bounds
                const r = 24;
                if ((n.x ?? 0) < r) { n.x = r; n.vx! *= -0.5; }
                if ((n.x ?? 0) > cw - r) { n.x = cw - r; n.vx! *= -0.5; }
                if ((n.y ?? 0) < r) { n.y = r; n.vy! *= -0.5; }
                if ((n.y ?? 0) > ch - r) { n.y = ch - r; n.vy! *= -0.5; }
            }

            // Draw
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, cw, ch);

            // Edges with glow
            for (const e of edges) {
                const s = nodes.find(n => n.id === e.source);
                const t = nodes.find(n => n.id === e.target);
                if (!s || !t || s.x == null || t.x == null) continue;
                const alpha = Math.min((e.weight ?? 0.5) * 0.8, 0.6);
                ctx.beginPath();
                ctx.moveTo(s.x!, s.y!);
                ctx.lineTo(t.x!, t.y!);
                ctx.strokeStyle = `rgba(139, 92, 246, ${alpha})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Nodes with glow
            for (const n of nodes) {
                if (n.x == null || n.y == null) continue;
                const isDrag = dragRef.current.node?.id === n.id;
                const r = isDrag ? 14 : Math.max(6, Math.min((n.weight ?? 1) * 7, 20));
                const color = NODE_COLORS[n.type ?? 'concept'] ?? NODE_COLORS.concept;

                // Glow
                ctx.beginPath();
                ctx.arc(n.x, n.y, r + 6, 0, Math.PI * 2);
                ctx.fillStyle = `${color}18`;
                ctx.fill();

                // Node
                ctx.beginPath();
                ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = isDrag ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.12)';
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Label
                ctx.fillStyle = '#b8b8d4';
                ctx.font = '500 10px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(n.id || '', n.x, n.y + r + 5);
            }

            simRef.current.raf = requestAnimationFrame(tick);
        };

        tick();

        return () => {
            window.removeEventListener('resize', resize);
            if (simRef.current.raf) cancelAnimationFrame(simRef.current.raf);
        };
    }, [ready]);

    // Mouse handlers
    const getPos = (e: React.MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        return rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: 0, y: 0 };
    };

    const onDown = (e: React.MouseEvent) => {
        const { x, y } = getPos(e);
        for (const n of simRef.current.nodes) {
            if (n.x == null || n.y == null) continue;
            if ((n.x - x) ** 2 + (n.y - y) ** 2 < 400) {
                dragRef.current.node = n; n.vx = 0; n.vy = 0;
                break;
            }
        }
    };

    const onMove = (e: React.MouseEvent) => {
        if (!dragRef.current.node) return;
        const { x, y } = getPos(e);
        dragRef.current.node.x = x;
        dragRef.current.node.y = y;
    };

    const onUp = () => { dragRef.current.node = null; };

    return (
        <div ref={containerRef} className="flex-1 relative overflow-hidden hidden md:block rounded-2xl bg-white/[0.01] border border-white/5 shadow-inner">
            {/* Overlay title */}
            <div className="absolute top-5 left-5 z-10 bg-white/5 backdrop-blur-md rounded-2xl px-5 py-3 flex items-center gap-3 border border-white/10 shadow-lg">
                <Network className="w-5 h-5 text-accent-purple" />
                <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-text-primary/90">Çağrışım Ağı</span>
            </div>

            <canvas
                ref={canvasRef}
                onMouseDown={onDown}
                onMouseMove={onMove}
                onMouseUp={onUp}
                onMouseLeave={onUp}
                className="w-full h-full cursor-grab active:cursor-grabbing mix-blend-screen"
            />

            {/* Info overlay */}
            <div className="absolute bottom-5 right-5 z-10 bg-white/5 backdrop-blur-md rounded-2xl px-5 py-3 text-[12px] text-text-primary/70 font-mono font-medium border border-white/10 shadow-lg">
                {data ? `${data.nodes.length} kavram · ${data.edges.length} bağlantı` : 'Konuşmaya başla →'}
            </div>
        </div>
    );
}
