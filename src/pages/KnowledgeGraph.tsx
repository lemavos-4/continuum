import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { graphApi, entitiesApi } from "@/lib/api";
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Brain,
  Search,
  Settings,
  Eye,
  EyeOff,
  X,
} from "@/lib/heroicons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SideInspector } from "@/components/SideInspector";
import { useEntityStore } from "@/contexts/EntityContext";
import type { Entity, EntityType } from "@/types";

interface GraphNode {
  id: string;
  label: string;
  type: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  degree: number;
  mass: number;
  recent?: boolean;
  createdAt?: string;
  periodKey?: string;
  periodX?: number;
  periodY?: number;
}

interface GraphEdge {
  source: string;
  target: string;
}

// Paleta estilo Obsidian (Monocromática, limpa e com bom contraste)
const TYPE_COLORS: Record<string, string> = {
  NOTE: "hsl(0, 0%, 85%)",
  ACTIVITY: "hsl(0, 0%, 65%)",
  PERSON: "hsl(0, 0%, 60%)",
  PROJECT: "hsl(0, 0%, 75%)",
  TOPIC: "hsl(0, 0%, 50%)",
  ORGANIZATION: "hsl(0, 0%, 45%)",
};
const HIGHLIGHT_COLOR = "hsl(0, 0%, 100%)";

const TYPE_LABELS: Record<string, string> = {
  NOTE: "Note",
  ACTIVITY: "Activity",
  PERSON: "Person",
  PROJECT: "Project",
  TOPIC: "Topic",
  ORGANIZATION: "Organization",
};

const BASE_RADIUS: Record<string, number> = {
  NOTE: 4, ACTIVITY: 5, PERSON: 5, PROJECT: 6, TOPIC: 5, ORGANIZATION: 6,
};

// ── Barnes-Hut quadtree otimizado (Massa baseada em conexões) ────────
interface QuadNode {
  x: number; y: number; w: number; h: number;
  cx: number; cy: number; mass: number;
  node: GraphNode | null;
  children: (QuadNode | null)[] | null;
}

function makeQuad(x: number, y: number, w: number, h: number): QuadNode {
  return { x, y, w, h, cx: 0, cy: 0, mass: 0, node: null, children: null };
}

function quadInsert(q: QuadNode, n: GraphNode, depth = 0) {
  if (depth > 16) return;
  if (q.mass === 0 && q.node === null) {
    q.node = n; q.cx = n.x; q.cy = n.y; q.mass = n.mass;
    return;
  }
  if (q.children === null) {
    const hw = q.w / 2, hh = q.h / 2;
    q.children = [
      makeQuad(q.x, q.y, hw, hh),
      makeQuad(q.x + hw, q.y, hw, hh),
      makeQuad(q.x, q.y + hh, hw, hh),
      makeQuad(q.x + hw, q.y + hh, hw, hh),
    ];
    if (q.node) {
      const old = q.node; q.node = null;
      const idx = (old.x >= q.x + hw ? 1 : 0) + (old.y >= q.y + hh ? 2 : 0);
      quadInsert(q.children[idx]!, old, depth + 1);
    }
  }
  q.cx = (q.cx * q.mass + n.x * n.mass) / (q.mass + n.mass);
  q.cy = (q.cy * q.mass + n.y * n.mass) / (q.mass + n.mass);
  q.mass += n.mass;
  const hw = q.w / 2, hh = q.h / 2;
  const idx = (n.x >= q.x + hw ? 1 : 0) + (n.y >= q.y + hh ? 2 : 0);
  quadInsert(q.children[idx]!, n, depth + 1);
}

function quadForce(q: QuadNode, n: GraphNode, theta: number, repulsion: number) {
  if (q.mass === 0) return;
  if (q.node === n) return;
  const dx = q.cx - n.x;
  const dy = q.cy - n.y;
  const d2 = dx * dx + dy * dy + 1; // +1 evita divisão por zero
  if (q.children === null || (q.w * q.w) / d2 < theta * theta) {
    const dist = Math.sqrt(d2);
    // Repulsão escala com a massa do cluster
    const force = (repulsion * q.mass) / d2;
    n.vx -= (dx / dist) * force;
    n.vy -= (dy / dist) * force;
    return;
  }
  for (const c of q.children) if (c) quadForce(c, n, theta, repulsion);
}

export default function KnowledgeGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [graphStats, setGraphStats] = useState({ nodes: 0, edges: 0 });
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [showEdges, setShowEdges] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"all" | "7d" | "30d">("all");
  const [legendOpen, setLegendOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  // Default false para formação orgânica estilo Obsidian
  const [clusterByPeriod, setClusterByPeriod] = useState(false); 

  const { inspectorOpen, inspectorEntity, openInspector, closeInspector } = useEntityStore();
  const [allEntities, setAllEntities] = useState<Entity[]>([]);

  // Refs mutáveis para o loop de animação
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const adjRef = useRef<Map<string, Set<string>>>(new Map());
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const draggingRef = useRef<GraphNode | null>(null);
  const panningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const animFrameRef = useRef<number>(0);
  const alphaRef = useRef(1); // Temperatura da simulação
  
  const selectedRef = useRef<GraphNode | null>(null);
  const hoveredRef = useRef<GraphNode | null>(null);
  const filtersRef = useRef<Set<string>>(typeFilters);
  const searchRef = useRef<string>("");
  const showLabelsRef = useRef(true);
  const showEdgesRef = useRef(true);
  const timeFilterRef = useRef<"all" | "7d" | "30d">("all");
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const pinchRef = useRef<{ dist: number; cx: number; cy: number } | null>(null);
  const tappedAtRef = useRef(0);
  const focusModeRef = useRef(false);
  const clusterRef = useRef(false);

  // Re-aquecer a simulação ao mudar seleções
  useEffect(() => { selectedRef.current = selectedNode; alphaRef.current = Math.max(alphaRef.current, 0.4); }, [selectedNode]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { filtersRef.current = typeFilters; alphaRef.current = 0.5; }, [typeFilters]);
  useEffect(() => { searchRef.current = search.trim().toLowerCase(); }, [search]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { showEdgesRef.current = showEdges; }, [showEdges]);
  useEffect(() => { timeFilterRef.current = timeFilter; alphaRef.current = 0.5; }, [timeFilter]);
  useEffect(() => { focusModeRef.current = focusMode; alphaRef.current = 0.5; }, [focusMode]);
  useEffect(() => { clusterRef.current = clusterByPeriod; alphaRef.current = 1; }, [clusterByPeriod]);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const isNodeVisible = useCallback((n: GraphNode) => {
    const f = filtersRef.current;
    if (f.size > 0 && !f.has(n.type)) return false;
    const tf = timeFilterRef.current;
    if (tf !== "all" && n.createdAt) {
      const diff = Date.now() - new Date(n.createdAt).getTime();
      const limit = tf === "7d" ? 7 * 86400000 : 30 * 86400000;
      if (diff > limit) return false;
    } else if (tf !== "all" && !n.createdAt) {
      return false;
    }
    return true;
  }, []);

  const neighborIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const n = adjRef.current.get(selectedNode.id) || new Set<string>();
    const out = new Set<string>(n);
    out.add(selectedNode.id);
    return out;
  }, [selectedNode]);

  const neighborIdsRef = useRef(neighborIds);
  useEffect(() => { neighborIdsRef.current = neighborIds; }, [neighborIds]);

  const screenToWorld = useCallback((sx: number, sy: number) => {
    const z = zoomRef.current;
    const p = panRef.current;
    return { x: (sx - p.x) / z, y: (sy - p.y) / z };
  }, []);

  const findNodeAt = useCallback((sx: number, sy: number) => {
    const w = screenToWorld(sx, sy);
    const z = zoomRef.current;
    const nodes = nodesRef.current;
    const hitPad = (isMobile ? 12 : 6) / z;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      if (!isNodeVisible(n)) continue;
      const r = (BASE_RADIUS[n.type] || 4) + Math.min(8, n.degree * 0.4) + hitPad;
      const dx = n.x - w.x;
      const dy = n.y - w.y;
      if (dx * dx + dy * dy < r * r) return n;
    }
    return null;
  }, [screenToWorld, isMobile, isNodeVisible]);

  // ── Física de Simulação Profissional (Obsidian-like) ───────────────
  const simulate = useCallback(() => {
    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    if (nodes.length === 0 || alphaRef.current < 0.005) return;

    // Constantes aprimoradas
    const repulsion = 450; 
    const attraction = 0.015; 
    const damping = 0.90; // Deslizamento suave
    const centerForce = 0.015; 
    const periodPull = clusterRef.current ? 0.03 : 0;
    const alpha = alphaRef.current;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x > maxX) maxX = n.x;
      if (n.y > maxY) maxY = n.y;
    }
    const pad = 100;
    const w = Math.max(maxX - minX, maxY - minY, 300) + pad * 2;
    const root = makeQuad(minX - pad, minY - pad, w, w);
    for (const n of nodes) quadInsert(root, n);

    for (const n of nodes) {
      // Força para o centro ou período
      if (periodPull > 0 && n.periodX !== undefined && n.periodY !== undefined) {
        n.vx += (n.periodX - n.x) * periodPull;
        n.vy += (n.periodY - n.y) * periodPull;
      } else {
        n.vx -= n.x * centerForce;
        n.vy -= n.y * centerForce;
      }
      // Força de repulsão via quadtree
      quadForce(root, n, 0.85, repulsion);
    }

    // Força das Molas (Edges) com Distância Dinâmica
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    for (const e of edges) {
      const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      
      // Distância ideal baseada nos graus: Hubs ficam mais distantes
      const idealLen = 40 + (a.degree + b.degree) * 3;
      const force = (dist - idealLen) * attraction;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      
      a.vx += fx; a.vy += fy;
      b.vx -= fx; b.vy -= fy;
    }

    // Passe de Colisão Rígida (Evita nós sobrepostos)
    for (let i = 0; i < nodes.length; i++) {
      const a = nodes[i];
      const rA = (BASE_RADIUS[a.type] || 4) + Math.min(8, a.degree * 0.4);
      for (let j = i + 1; j < nodes.length; j++) {
        const b = nodes[j];
        const rB = (BASE_RADIUS[b.type] || 4) + Math.min(8, b.degree * 0.4);
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist2 = dx * dx + dy * dy;
        const minD = rA + rB + 6; // Raio + padding

        if (dist2 < minD * minD && dist2 > 0) {
          const dist = Math.sqrt(dist2);
          const force = (minD - dist) / dist * 0.3; // Resolver colisão
          const fx = dx * force;
          const fy = dy * force;
          // Nós com menos conexões cedem mais no impacto
          const massRatioA = b.mass / (a.mass + b.mass);
          const massRatioB = a.mass / (a.mass + b.mass);
          a.vx -= fx * massRatioA; a.vy -= fy * massRatioA;
          b.vx += fx * massRatioB; b.vy += fy * massRatioB;
        }
      }
    }

    const drag = draggingRef.current;
    for (const n of nodes) {
      if (n === drag) continue;
      n.vx *= damping;
      n.vy *= damping;
      n.x += n.vx * alpha;
      n.y += n.vy * alpha;
    }

    // Resfriamento logarítmico para parada suave
    alphaRef.current = Math.max(0.0, alphaRef.current * 0.985);
  }, []);

  // ── Renderização Avançada ────────────────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { w, h } = sizeRef.current;
    if (w === 0 || h === 0) return;

    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.translate(panRef.current.x, panRef.current.y);
    ctx.scale(zoomRef.current, zoomRef.current);

    const nodes = nodesRef.current;
    const edges = edgesRef.current;
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const selected = selectedRef.current;
    const hovered = hoveredRef.current;
    const neighbors = neighborIdsRef.current;
    const hasSelection = selected !== null;
    const z = zoomRef.current;
    const sq = searchRef.current;
    const showL = showLabelsRef.current;
    const focusOn = focusModeRef.current && hasSelection;

    // Renderizar Arestas
    if (showEdgesRef.current) {
      ctx.lineCap = "round";
      for (const e of edges) {
        const a = nodeMap.get(e.source), b = nodeMap.get(e.target);
        if (!a || !b) continue;
        if (!isNodeVisible(a) || !isNodeVisible(b)) continue;
        if (focusOn && !(neighbors.has(e.source) && neighbors.has(e.target))) continue;
        
        const isHighlighted = hasSelection && neighbors.has(e.source) && neighbors.has(e.target);
        const isHoveredEdge = hovered && (hovered.id === e.source || hovered.id === e.target);
        
        if (hasSelection && !isHighlighted) {
          ctx.strokeStyle = "hsla(0,0%,100%,0.02)";
          ctx.lineWidth = 0.5 / z;
        } else if (isHighlighted || isHoveredEdge) {
          ctx.strokeStyle = "hsla(0,0%,100%,0.6)";
          ctx.lineWidth = 1.8 / z;
        } else {
          ctx.strokeStyle = "hsla(0,0%,100%,0.15)";
          ctx.lineWidth = Math.min(1.5, 0.8 + (a.degree + b.degree) * 0.02) / z;
        }
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // Renderizar Nós
    for (const n of nodes) {
      if (focusOn && !neighbors.has(n.id)) continue;
      const visible = isNodeVisible(n);
      const r = (BASE_RADIUS[n.type] || 4) + Math.min(8, n.degree * 0.4);
      const color = TYPE_COLORS[n.type] || "hsl(0,0%,40%)";
      const isHovered = hovered?.id === n.id;
      const isSelected = selected?.id === n.id;
      const isNeighbor = hasSelection && neighbors.has(n.id);
      const matchesSearch = sq.length > 0 && n.label.toLowerCase().includes(sq);
      const dimmed = !visible || (hasSelection && !isNeighbor) || (sq.length > 0 && !matchesSearch);

      const drawRadius = isHovered || isSelected ? r + 2.5 : r;
      const nodeAlpha = dimmed ? 0.1 : 1;

      // Glow suave
      if (!dimmed && (isSelected || isHovered || isNeighbor || matchesSearch)) {
        ctx.save();
        ctx.globalAlpha = isSelected ? 0.6 : matchesSearch ? 0.5 : isHovered ? 0.4 : 0.15;
        ctx.beginPath();
        ctx.arc(n.x, n.y, drawRadius + 7, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
      }

      ctx.save();
      ctx.globalAlpha = nodeAlpha;
      ctx.beginPath();
      ctx.arc(n.x, n.y, drawRadius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      // Borda indicativa
      if (isSelected || matchesSearch) {
        ctx.strokeStyle = HIGHLIGHT_COLOR;
        ctx.lineWidth = 1.5 / z;
        ctx.stroke();
      }

      // Lógica profissional para exibição de texto
      // No Obsidian, labels aparecem ao dar zoom ou em nós muito importantes
      const isImportantNode = n.degree >= 4;
      const labelable = !dimmed && showL && (
        isHovered || isSelected || isNeighbor || matchesSearch ||
        z > 1.8 || (z > 0.8 && isImportantNode) || (z > 0.4 && n.degree >= 10)
      );
      
      if (labelable) {
        const fontSize = Math.max(10, 11 / z);
        ctx.font = `${isSelected || isHovered ? "500" : "400"} ${fontSize}px Inter, sans-serif`;
        ctx.textAlign = "center";
        
        // Fundo sutil para o texto facilitar a leitura nas linhas
        const text = n.label.length > 25 ? n.label.slice(0, 24) + "…" : n.label;
        const textY = n.y + drawRadius + fontSize + 3;
        
        ctx.fillStyle = "hsla(0,0%,0%,0.5)";
        const textWidth = ctx.measureText(text).width;
        ctx.fillRect(n.x - textWidth/2 - 2, textY - fontSize, textWidth + 4, fontSize + 2);

        ctx.fillStyle = isSelected || isHovered || matchesSearch
          ? "hsl(0,0%,100%)"
          : "hsla(0,0%,100%,0.75)";
        ctx.fillText(text, n.x, textY);
      }
      ctx.restore();
    }
  }, [isNodeVisible]);

  const tick = useCallback(() => {
    simulate();
    draw();
    animFrameRef.current = requestAnimationFrame(tick);
  }, [simulate, draw]);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (w === 0 || h === 0) return;
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    dprRef.current = dpr;
    sizeRef.current = { w, h };
    alphaRef.current = Math.max(alphaRef.current, 0.5);
  }, [isMobile]);

  // ── Load graph ──────────────────────────────────────────────────────
  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const [graphRes, entitiesRes] = await Promise.all([graphApi.data(), entitiesApi.list()]);
      const data = graphRes.data;
      const entities = Array.isArray(entitiesRes.data) ? entitiesRes.data : [];
      setAllEntities(entities);

      const rawNodes = Array.isArray(data?.nodes) ? data.nodes : [];
      const rawEdges = Array.isArray(data?.links) ? data.links : (Array.isArray((data as any)?.edges) ? (data as any).edges : []);

      if (rawNodes.length === 0) {
        setEmpty(true);
        setGraphStats({ nodes: 0, edges: 0 });
        return;
      }

      const degree = new Map<string, number>();
      const adj = new Map<string, Set<string>>();
      for (const e of rawEdges as GraphEdge[]) {
        degree.set(e.source, (degree.get(e.source) || 0) + 1);
        degree.set(e.target, (degree.get(e.target) || 0) + 1);
        if (!adj.has(e.source)) adj.set(e.source, new Set());
        if (!adj.has(e.target)) adj.set(e.target, new Set());
        adj.get(e.source)!.add(e.target);
        adj.get(e.target)!.add(e.source);
      }
      adjRef.current = adj;

      // Mantemos todas as arestas se possível, Obsidian suporta muitas. 
      // Mas para performance purista, capamos apenas hubs extremamentes densos (ex: > 30)
      const MAX_EDGES_PER_NODE = 25; 
      const keptCount = new Map<string, number>();
      const sortedEdges = [...(rawEdges as GraphEdge[])].sort((a, b) => {
        const da = (degree.get(a.source) || 0) + (degree.get(a.target) || 0);
        const db = (degree.get(b.source) || 0) + (degree.get(b.target) || 0);
        return db - da;
      });
      const prunedEdges: GraphEdge[] = [];
      for (const e of sortedEdges) {
        const s = keptCount.get(e.source) || 0;
        const t = keptCount.get(e.target) || 0;
        if (s >= MAX_EDGES_PER_NODE || t >= MAX_EDGES_PER_NODE) continue;
        keptCount.set(e.source, s + 1);
        keptCount.set(e.target, t + 1);
        prunedEdges.push(e);
      }

      const entityMap = new Map(entities.map(e => [e.id, e]));
      const recentLimit = Date.now() - 7 * 86400000;

      const monthOf = (iso?: string) => {
        if (!iso) return "unknown";
        const d = new Date(iso);
        if (isNaN(d.getTime())) return "unknown";
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      };
      const allMonths = Array.from(new Set(rawNodes.map((n: any) => {
        const ent = entityMap.get(n.id);
        return monthOf(ent?.createdAt);
      }))).sort() as string[];
      const monthIndex = new Map<string, number>();
      allMonths.forEach((m: string, i: number) => monthIndex.set(m, i));
      const monthCount = Math.max(1, allMonths.length);
      const spacingX = 400;

      const nextNodes: GraphNode[] = rawNodes.map((n: any) => {
        const ent = entityMap.get(n.id);
        const createdAt = ent?.createdAt;
        const periodKey = monthOf(createdAt);
        const idx = monthIndex.get(periodKey) ?? 0;
        const periodX = (idx - (monthCount - 1) / 2) * spacingX;
        const periodY = 0;
        const deg = degree.get(n.id) || 0;
        
        return {
          id: n.id,
          label: n.label,
          type: String(n.type),
          // Dispersão inicial circular e orgânica
          x: (Math.random() - 0.5) * 500,
          y: (Math.random() - 0.5) * 500,
          vx: 0,
          vy: 0,
          degree: deg,
          mass: 1 + deg * 0.5, // Hubs têm massa maior
          createdAt,
          periodKey,
          periodX,
          periodY,
          recent: createdAt ? new Date(createdAt).getTime() > recentLimit : false,
        };
      });

      nodesRef.current = nextNodes;
      edgesRef.current = prunedEdges;
      setGraphStats({ nodes: nextNodes.length, edges: prunedEdges.length });
      alphaRef.current = 1; // Dispara a simulação

      requestAnimationFrame(() => {
        resizeCanvas();
        const { w, h } = sizeRef.current;
        panRef.current = { x: w / 2, y: h / 2 };
        zoomRef.current = 1;
      });
      setEmpty(false);
    } catch {
      setEmpty(true);
      setGraphStats({ nodes: 0, edges: 0 });
    } finally {
      setLoading(false);
    }
  }, [resizeCanvas]);

  useEffect(() => { void loadGraph(); }, [loadGraph]);

  useEffect(() => {
    if (loading || empty) return;
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [loading, empty, tick]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => resizeCanvas());
    observer.observe(container);
    resizeCanvas();
    return () => observer.disconnect();
  }, [resizeCanvas]);

  // ── Interação ───────────────────────────────────────────────────────
  const focusNode = useCallback((node: GraphNode) => {
    setSelectedNode(node);
    const entity = allEntities.find(e => e.id === node.id);
    
    // Calcular score baseado em degree e recência
    const baseScore = Math.min(100, node.degree * 5 + 20);
    const recencyBonus = node.recent ? 15 : 0;
    const score = Math.round(baseScore + recencyBonus);
    
    // Se encontrar a entidade, abre o inspector com os dados completos + score
    if (entity) {
      openInspector({
        ...entity,
        graphScore: score,
        graphDegree: node.degree,
      } as any);
    } else {
      // Criar uma entidade com informações adicionais do grafo
      openInspector({
        id: node.id,
        title: node.label,
        type: (node.type as EntityType) || "TOPIC",
        createdAt: node.createdAt || new Date().toISOString(),
        ownerId: "",
        description: `Graph node • ${node.degree} connection${node.degree === 1 ? '' : 's'} • Type: ${TYPE_LABELS[node.type] || node.type}`,
        graphScore: score,
        graphDegree: node.degree,
      } as any);
    }
    
    // Aguarda o render do DOM e depois centraliza o node
    requestAnimationFrame(() => {
      const { w, h } = sizeRef.current;
      if (w > 0 && h > 0) {
        const z = zoomRef.current;
        panRef.current = { x: w / 2 - node.x * z, y: h / 2 - node.y * z };
      }
    });
  }, [allEntities, openInspector]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (node) {
      draggingRef.current = node;
      focusNode(node);
      alphaRef.current = Math.max(alphaRef.current, 0.5); // Acorda a simulação ao tocar
    } else {
      panningRef.current = true;
      setSelectedNode(null);
      closeInspector();
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x;
      draggingRef.current.y = w.y;
      draggingRef.current.vx = 0;
      draggingRef.current.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
    } else if (panningRef.current) {
      panRef.current.x += e.clientX - lastMouseRef.current.x;
      panRef.current.y += e.clientY - lastMouseRef.current.y;
    } else {
      const node = findNodeAt(sx, sy);
      setHoveredNode(node);
      setTooltipPos(node ? { x: sx, y: sy } : null);
      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab";
    }
    lastMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { draggingRef.current = null; panningRef.current = false; };

  const handleWheel = (e: React.WheelEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const oldZ = zoomRef.current;
    // Permite zoomar mais de perto como no Obsidian (0.1 -> 8)
    const newZ = Math.max(0.1, Math.min(8, oldZ * (e.deltaY < 0 ? 1.15 : 0.85)));
    panRef.current.x = sx - (sx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = sy - (sy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    if (!node) return;
    if (node.type === "NOTE") navigate(`/notes/${node.id}`);
    else navigate(`/entities/${node.id}`);
  };

  const handleZoom = (dir: number) => {
    const { w, h } = sizeRef.current;
    const cx = w / 2, cy = h / 2;
    const oldZ = zoomRef.current;
    const newZ = Math.max(0.1, Math.min(8, oldZ * (dir > 0 ? 1.4 : 0.7)));
    panRef.current.x = cx - (cx - panRef.current.x) * (newZ / oldZ);
    panRef.current.y = cy - (cy - panRef.current.y) * (newZ / oldZ);
    zoomRef.current = newZ;
  };

  const handleReset = () => {
    const { w, h } = sizeRef.current;
    panRef.current = { x: w / 2, y: h / 2 };
    zoomRef.current = 1;
    setTypeFilters(new Set());
    setSearch("");
    setTimeFilter("all");
    setSelectedNode(null);
    closeInspector();
    alphaRef.current = 0.8; // Reorganiza
  };

  const handleShowAll = () => {
    setTypeFilters(new Set());
    setSearch("");
    setTimeFilter("all");
    setSelectedNode(null);
    closeInspector();
    alphaRef.current = 0.8;
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY;
      pinchRef.current = {
        dist: Math.sqrt(dx * dx + dy * dy),
        cx: (t1.clientX + t2.clientX) / 2,
        cy: (t1.clientY + t2.clientY) / 2,
      };
      draggingRef.current = null;
      panningRef.current = false;
      return;
    }
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    const node = findNodeAt(sx, sy);
    const now = Date.now();
    if (node && now - tappedAtRef.current < 300) {
      if (node.type === "NOTE") navigate(`/notes/${node.id}`);
      else navigate(`/entities/${node.id}`);
      tappedAtRef.current = 0;
      return;
    }
    tappedAtRef.current = now;
    if (node) { 
      draggingRef.current = node; 
      focusNode(node); 
      alphaRef.current = Math.max(alphaRef.current, 0.5);
    }
    else { panningRef.current = true; setSelectedNode(null); closeInspector(); }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const dx = t2.clientX - t1.clientX, dy = t2.clientY - t1.clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = (t1.clientX + t2.clientX) / 2 - rect.left;
      const cy = (t1.clientY + t2.clientY) / 2 - rect.top;
      const oldZ = zoomRef.current;
      const ratio = dist / pinchRef.current.dist;
      const newZ = Math.max(0.1, Math.min(8, oldZ * ratio));
      panRef.current.x = cx - (cx - panRef.current.x) * (newZ / oldZ);
      panRef.current.y = cy - (cy - panRef.current.y) * (newZ / oldZ);
      zoomRef.current = newZ;
      pinchRef.current.dist = dist;
      return;
    }
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = touch.clientX - rect.left, sy = touch.clientY - rect.top;
    if (draggingRef.current) {
      const w = screenToWorld(sx, sy);
      draggingRef.current.x = w.x; draggingRef.current.y = w.y;
      draggingRef.current.vx = 0; draggingRef.current.vy = 0;
      alphaRef.current = Math.max(alphaRef.current, 0.4);
    } else if (panningRef.current) {
      panRef.current.x += touch.clientX - lastMouseRef.current.x;
      panRef.current.y += touch.clientY - lastMouseRef.current.y;
    }
    lastMouseRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchRef.current = null;
    if (e.touches.length === 0) {
      draggingRef.current = null;
      panningRef.current = false;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const prevent = (e: TouchEvent) => { if (e.touches.length >= 1) e.preventDefault(); };
    const wheel = (e: WheelEvent) => e.preventDefault();
    canvas.addEventListener("touchmove", prevent, { passive: false });
    canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      canvas.removeEventListener("touchmove", prevent);
      canvas.removeEventListener("wheel", wheel);
    };
  }, []);

  const availableTypes = useMemo(() => {
    const nodes = nodesRef.current;
    const types = new Set(nodes.map(n => n.type));
    return Array.from(types).map(t => ({
      type: t,
      label: TYPE_LABELS[t] || t,
      color: TYPE_COLORS[t] || "hsl(0,0%,40%)",
    }));
  }, [graphStats]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const listener = () => setOptionsOpen(open => !open);
    window.addEventListener("graph-options-toggle", listener);
    return () => window.removeEventListener("graph-options-toggle", listener);
  }, []);

  const toggleTypeFilter = (type: string) => {
    setTypeFilters(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ height: "calc(100vh - 3.5rem)" }}>
        <div className="relative flex flex-col flex-1">
          <button
            type="button"
            onClick={() => setOptionsOpen(true)}
            className="absolute right-4 top-4 z-30 hidden h-10 w-10 items-center justify-center rounded-md bg-white/5 text-white shadow-lg shadow-black/20 transition hover:bg-white/10 sm:grid"
            aria-label="Open graph options"
          >
            <Settings className="h-5 w-5" />
          </button>

          <div className="absolute right-4 top-16 z-30 flex flex-col items-end gap-2">
            <div className="flex flex-col items-center gap-0.5">
              <button
                type="button"
                onClick={() => handleZoom(1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/80 text-white transition hover:bg-white/10"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => handleZoom(-1)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/80 text-white transition hover:bg-white/10"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setFocusMode(f => !f)}
                className={`grid h-10 w-10 place-items-center rounded-full border bg-black/80 text-white transition ${focusMode ? "border-white/60 bg-white/15" : "border-white/10 hover:bg-white/10"}`}
                aria-label="Toggle focus mode"
                title="Focus mode"
              >
                {focusMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={() => setOptionsOpen(true)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-black/80 text-white transition hover:bg-white/10 sm:hidden"
                aria-label="Open graph options"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>

          {optionsOpen && (
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/50 px-4 py-6 sm:p-6">
              <div className="w-full max-w-md rounded-3xl border border-white/10 bg-black/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">Graph options</p>
                    <p className="text-xs text-muted-foreground">Customize your visualization</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOptionsOpen(false)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-white/5 text-white transition hover:bg-white/10"
                    aria-label="Close graph options"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground">Search nodes</label>
                    <div className="mt-2 relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search nodes…"
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => { handleShowAll(); setOptionsOpen(false); }}>
                      Show all
                    </Button>
                    <Button variant="ghost" size="sm" className="w-full" onClick={handleReset}>
                      Reset view
                    </Button>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-background/90 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Type filters</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setTypeFilters(new Set())}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${typeFilters.size === 0 ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        All
                      </button>
                      {availableTypes.map(({ type, label, color }) => {
                        const active = typeFilters.has(type);
                        return (
                          <button
                            key={type}
                            onClick={() => toggleTypeFilter(type)}
                            className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-[11px] font-medium transition ${active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-background/90 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Time range</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(["all", "7d", "30d"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTimeFilter(t)}
                          className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${timeFilter === t ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                        >
                          {t === "all" ? "Anytime" : t === "7d" ? "Last 7d" : "Last 30d"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-background/90 p-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Display options</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button
                        onClick={() => setShowEdges(prev => !prev)}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${showEdges ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        {showEdges ? <Eye className="inline h-3 w-3 mr-1" /> : <EyeOff className="inline h-3 w-3 mr-1" />}
                        {showEdges ? "Edges on" : "Edges off"}
                      </button>
                      <button
                        onClick={() => setShowLabels(prev => !prev)}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${showLabels ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        {showLabels ? <Eye className="inline h-3 w-3 mr-1" /> : <EyeOff className="inline h-3 w-3 mr-1" />}
                        {showLabels ? "Labels on" : "Labels off"}
                      </button>
                      <button
                        onClick={() => setLegendOpen(open => !open)}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${legendOpen ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        {legendOpen ? <Eye className="inline h-3 w-3 mr-1" /> : <EyeOff className="inline h-3 w-3 mr-1" />}
                        {legendOpen ? "Legend on" : "Legend off"}
                      </button>
                      <button
                        onClick={() => setClusterByPeriod(prev => !prev)}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${clusterByPeriod ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        {clusterByPeriod ? "Period clusters on" : "Period clusters off"}
                      </button>
                      <button
                        onClick={() => setFocusMode(prev => !prev)}
                        className={`rounded-md px-3 py-2 text-[11px] font-medium transition ${focusMode ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        {focusMode ? "Focus on" : "Focus off"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={containerRef} className="flex-1 relative overflow-hidden min-h-0 touch-none">
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Loading graph…</p>
                </div>
              </div>
            )}

            {empty && !loading && (
              <div className="absolute inset-0 flex items-center justify-center z-10">
                <div className="text-center space-y-4 max-w-xs px-6">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                    <Brain className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-display text-lg font-semibold text-foreground">
                      No connections detected yet
                    </h2>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Start creating notes and mention entities with <span className="text-primary font-medium">@</span> to grow your graph.
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate("/notes")}>Create first note →</Button>
                </div>
              </div>
            )}

            {!empty && (
              <canvas
                ref={canvasRef}
                className="bg-black select-none" // Obsidian é tradicionalmente escuro
                style={{ display: "block", touchAction: "none" }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onWheel={handleWheel}
                onDoubleClick={handleDoubleClick}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              />
            )}

            {legendOpen && (
              <div className="absolute left-4 top-4 z-20 rounded-3xl border border-white/10 bg-black/80 p-4 text-sm text-white shadow-lg shadow-black/30 backdrop-blur-xl">
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-muted-foreground">Legend</p>
                <div className="grid gap-2">
                  {availableTypes.map(({ label, color, type }) => (
                    <div key={type} className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm text-white">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hoveredNode && tooltipPos && !selectedNode && (
              <div
                className="absolute z-20 pointer-events-none px-2.5 py-1.5 rounded-md bg-black/90 backdrop-blur-sm border border-white/10 shadow-lg"
                style={{
                  left: Math.min(tooltipPos.x + 12, (containerRef.current?.clientWidth || 300) - 180),
                  top: Math.max(8, tooltipPos.y - 40),
                }}
              >
                <p className="text-xs font-medium text-white truncate max-w-[160px]">{hoveredNode.label}</p>
                <p className="text-[10px] text-muted-foreground">
                  {TYPE_LABELS[hoveredNode.type] || hoveredNode.type} · {hoveredNode.degree} link{hoveredNode.degree === 1 ? "" : "s"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SideInspector
        isOpen={inspectorOpen}
        entity={inspectorEntity}
        onClose={() => { closeInspector(); setSelectedNode(null); }}
      />
    </AppLayout>
  );
}