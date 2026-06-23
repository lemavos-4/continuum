/*
 * CONTINUUM — KnowledgeGraph
 * Animated SVG node graph representing connected thinking.
 * Nodes pulse, lines animate. Subtle and precise.
 */
import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  opacity: number;
  pulsePhase: number;
  pulseSpeed: number;
}

interface Edge {
  from: number;
  to: number;
}

const CYAN = "78, 205, 196";
const WHITE = "220, 230, 240";

function createNodes(width: number, height: number): Node[] {
  const nodes: Node[] = [];
  const count = Math.min(28, Math.floor((width * height) / 14000));
  for (let i = 0; i < count; i++) {
    const isCentral = i < 3;
    nodes.push({
      x: width * 0.15 + Math.random() * width * 0.7,
      y: height * 0.1 + Math.random() * height * 0.8,
      r: isCentral ? 5 + Math.random() * 4 : 2 + Math.random() * 3,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      opacity: 0.4 + Math.random() * 0.6,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseSpeed: 0.008 + Math.random() * 0.012,
    });
  }
  return nodes;
}

function createEdges(nodes: Node[]): Edge[] {
  const edges: Edge[] = [];
  const maxDist = 200;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const dx = nodes[i].x - nodes[j].x;
      const dy = nodes[i].y - nodes[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < maxDist && edges.length < 45) {
        edges.push({ from: i, to: j });
      }
    }
  }
  return edges;
}

export default function KnowledgeGraph({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const frameRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      nodesRef.current = createNodes(rect.width, rect.height);
      edgesRef.current = createEdges(nodesRef.current);
    };

    resize();
    window.addEventListener("resize", resize);

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      frameRef.current++;

      ctx.clearRect(0, 0, W, H);

      const nodes = nodesRef.current;
      const edges = edgesRef.current;

      // Update node positions
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > W) node.vx *= -1;
        if (node.y < 0 || node.y > H) node.vy *= -1;

        node.x = Math.max(node.r, Math.min(W - node.r, node.x));
        node.y = Math.max(node.r, Math.min(H - node.r, node.y));

        // Pulse animation
        node.pulsePhase += node.pulseSpeed;
        const pulse = Math.sin(node.pulsePhase) * 0.3 + 0.7;
        node.opacity = Math.max(0.2, Math.min(1, node.opacity + (Math.random() - 0.5) * 0.02)) * pulse;
      });

      // Draw edges
      edges.forEach(({ from, to }) => {
        const fromNode = nodes[from];
        const toNode = nodes[to];
        const avgOpacity = (fromNode.opacity + toNode.opacity) / 2;
        ctx.strokeStyle = `rgba(${CYAN}, ${avgOpacity * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fromNode.x, fromNode.y);
        ctx.lineTo(toNode.x, toNode.y);
        ctx.stroke();
      });

      // Draw nodes
      nodes.forEach((node) => {
        ctx.fillStyle = `rgba(${CYAN}, ${node.opacity})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      });

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full rounded-2xl ${className}`}
      style={{ background: "transparent" }}
    />
  );
}
