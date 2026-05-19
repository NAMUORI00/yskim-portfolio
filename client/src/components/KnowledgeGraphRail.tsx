import { useMemo, useState, type PointerEvent } from "react";
import type { PortfolioTheme } from "@/content/theme";
import type { KnowledgeGraphData, KnowledgeGraphNode } from "@/lib/knowledgeGraph";
import { curvedKnowledgeLinkPath, layoutKnowledgeGraph, projectKnowledgeNode, type KnowledgeGraphPointer } from "@/lib/knowledgeGraphLayout";
import { FONT_MONO, FONT_SANS } from "@/content/theme";

const WIDTH = 276;
const HEIGHT = 360;
const INNER_ORBIT = Math.min(WIDTH, HEIGHT) * 0.24;
const OUTER_ORBIT = Math.min(WIDTH, HEIGHT) * 0.37;

function nodeColor(node: KnowledgeGraphNode, T: PortfolioTheme): string {
  if (node.kind === "profile") return T.green;
  if (node.kind === "research") return T.greenLight;
  if (node.kind === "project") return T.text;
  if (node.kind === "note") return T.muted;
  if (node.kind === "skill") return T.green;
  if (node.kind === "repo") return T.sub;
  return T.muted;
}

function kindLabel(kind: KnowledgeGraphNode["kind"]): string {
  if (kind === "profile") return "core";
  if (kind === "research") return "research";
  if (kind === "project") return "project";
  if (kind === "note") return "note";
  if (kind === "skill") return "skill";
  if (kind === "repo") return "repo";
  return "term";
}

function cssAttr(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function KnowledgeGraphRail({
  graph,
  T,
  active,
}: {
  graph: KnowledgeGraphData;
  T: PortfolioTheme;
  active: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pointer, setPointer] = useState<KnowledgeGraphPointer | null>(null);
  const layout = useMemo(() => layoutKnowledgeGraph(graph, WIDTH, HEIGHT), [graph]);
  const projectedNodes = useMemo(() => new Map(layout.nodes.map((node) => [node.id, projectKnowledgeNode(node, pointer)])), [layout.nodes, pointer]);
  const hoveredNode = layout.nodes.find((node) => node.id === hovered) ?? null;
  const activeNode = layout.nodes.find((node) => node.section === active) ?? null;
  const focusNode = hoveredNode ?? activeNode;
  const connected = useMemo(() => {
    if (!focusNode) return new Set<string>();
    const ids = new Set<string>([focusNode.id]);
    for (const link of layout.links) {
      if (link.sourceId === focusNode.id) ids.add(link.targetId);
      if (link.targetId === focusNode.id) ids.add(link.sourceId);
    }
    return ids;
  }, [focusNode, layout.links]);
  const hoverRules = useMemo(
    () =>
      layout.nodes
        .map((node) => {
          const id = cssAttr(node.id);
          return `
            #knowledge-rail .knowledge-node-group[data-node-id="${id}"]:hover ~ .knowledge-hover-layer [data-connects~="${id}"] {
              stroke-opacity: 0.58;
              animation-duration: 1.15s;
            }
          `;
        })
        .join("\n"),
    [layout.nodes],
  );
  const topNodes = layout.nodes.filter((node) => node.kind !== "profile").slice(0, 4);

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    setPointer({
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    });
  }

  return (
    <aside
      id="knowledge-rail"
      aria-label="포트폴리오 지식 그래프"
      style={{
        width: "clamp(236px, 20vw, 312px)",
        flexShrink: 0,
        height: "100dvh",
        borderLeft: `1px solid ${T.border}`,
        background: T.sidebarBg,
        padding: "clamp(1.25rem, 2vw, 2rem) clamp(1rem, 1.5vw, 1.35rem)",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        overflow: "hidden",
      }}
    >
      <div>
        <div style={{ color: T.green, fontFamily: FONT_MONO, fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Knowledge Graph
        </div>
        <p style={{ margin: "0.35rem 0 0", color: T.sub, fontFamily: FONT_SANS, fontSize: "0.72rem", lineHeight: 1.6, wordBreak: "keep-all" }}>
          스킬과 프로젝트를 중심으로 은은히 반응하는 원형 관심사 KG입니다.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          border: `1px solid ${T.border}`,
          borderRadius: "6px",
          background: T.surface,
          overflow: "hidden",
          minHeight: "340px",
          boxShadow: `inset 0 0 36px ${T.green}18`,
        }}
      >
        <svg
          className="knowledge-canvas knowledge-neural-canvas"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          aria-hidden="true"
          focusable="false"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => {
            setPointer(null);
            setHovered(null);
          }}
          style={{ display: "block", width: "100%", height: "auto" }}
        >
          <defs>
            <radialGradient id="knowledge-vignette" cx="50%" cy="48%" r="64%">
              <stop offset="0%" stopColor={T.greenLight} stopOpacity="0.16" />
              <stop offset="58%" stopColor={T.green} stopOpacity="0.045" />
              <stop offset="100%" stopColor={T.bg} stopOpacity="0" />
            </radialGradient>
            <pattern id="knowledge-grid" width="18" height="18" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.75" fill={T.muted} opacity="0.14" />
            </pattern>
          </defs>
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill={T.bg} />
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="url(#knowledge-grid)" />
          <circle cx={WIDTH / 2} cy={HEIGHT * 0.48} r="128" fill="url(#knowledge-vignette)" />
          <circle className="knowledge-orbit knowledge-orbit-inner" cx={WIDTH / 2} cy={HEIGHT / 2} r={INNER_ORBIT} fill="none" stroke={T.green} strokeWidth="0.8" strokeOpacity="0.15" />
          <circle className="knowledge-orbit knowledge-orbit-outer" cx={WIDTH / 2} cy={HEIGHT / 2} r={OUTER_ORBIT} fill="none" stroke={T.greenLight} strokeWidth="0.65" strokeOpacity="0.12" />
          {layout.links.map((link) => {
            const isLit = !focusNode || link.sourceId === focusNode.id || link.targetId === focusNode.id;
            const edgeState = !focusNode ? "idle" : isLit ? "active" : "dim";
            const path = curvedKnowledgeLinkPath(link, pointer);
            return (
              <g key={`${link.sourceId}-${link.targetId}-${link.kind}`}>
                <path
                  className="knowledge-edge knowledge-edge-base knowledge-neural-edge"
                  data-connects={`${link.sourceId} ${link.targetId}`}
                  data-edge-state={edgeState}
                  d={path}
                  fill="none"
                  stroke={link.kind === "related" ? T.greenLight : T.muted}
                  strokeWidth={isLit ? Math.max(0.7, Math.min(1.7, link.weight / 1.7)) : 0.52}
                  strokeOpacity={edgeState === "active" ? (hoveredNode ? 0.58 : 0.34) : 0.09}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {layout.nodes.map((node) => {
            const projected = projectedNodes.get(node.id) ?? projectKnowledgeNode(node, pointer);
            const color = nodeColor(node, T);
            const isActive = node.section === active || node.id === hovered;
            const isLit = !focusNode || connected.has(node.id);
            const isHovered = node.id === hovered;
            return (
              <g
                className="knowledge-node-group"
                key={node.id}
                data-node-id={node.id}
                data-neural-node={node.id}
                data-node-state={isHovered ? "hovered" : isLit ? "connected" : "dim"}
                data-pointer-influence={projected.influence.toFixed(2)}
                aria-label={`${node.label} ${kindLabel(node.kind)}`}
                onPointerEnter={() => setHovered(node.id)}
                onPointerLeave={() => setHovered(null)}
                style={{ cursor: "default", outline: "none" }}
              >
                {(isHovered || (!hoveredNode && isActive)) && (
                  <circle
                    className="knowledge-ripple"
                    cx={projected.x}
                    cy={projected.y}
                    r={node.radius * projected.scale + 8}
                    fill="none"
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.38"
                  />
                )}
                <circle
                  className={isHovered || (!hoveredNode && isActive) ? "knowledge-halo knowledge-focus-glow active" : "knowledge-halo knowledge-focus-glow"}
                  cx={projected.x}
                  cy={projected.y}
                  r={node.radius * projected.scale + (isActive ? 8 : 4)}
                  fill={color}
                  opacity={Math.max(isActive ? 0.18 : 0.045, projected.influence * 0.16)}
                />
                <circle
                  className={isLit ? "knowledge-node lit" : "knowledge-node"}
                  cx={projected.x}
                  cy={projected.y}
                  r={node.radius * projected.scale}
                  fill={color}
                  opacity={isLit ? Math.min(0.96, (hoveredNode ? 0.86 : 0.72) + projected.influence * 0.12) : Math.max(0.2, projected.influence * 0.42)}
                  stroke={isActive ? T.green : T.bg}
                  strokeWidth={isActive ? 1.45 : 0.85}
                />
                {(node.kind === "profile" || isHovered || (!hoveredNode && isActive)) && (
                  <text
                    x={projected.x}
                    y={projected.y - node.radius * projected.scale - 7}
                    textAnchor="middle"
                    fill={isActive ? T.green : T.sub}
                    fontFamily={FONT_MONO}
                    fontSize="8"
                  >
                    {node.label.length > 18 ? `${node.label.slice(0, 17)}...` : node.label}
                  </text>
                )}
                <circle
                  className="knowledge-hit"
                  aria-hidden="true"
                  cx={projected.x}
                  cy={projected.y}
                  r={node.radius + 12}
                  fill="transparent"
                  pointerEvents="all"
                />
              </g>
            );
          })}
          <g className="knowledge-hover-layer" pointerEvents="none" aria-hidden="true">
            {layout.links.map((link) => (
              <path
                key={`hover-${link.sourceId}-${link.targetId}-${link.kind}`}
                className="knowledge-edge knowledge-hover-signal"
                data-connects={`${link.sourceId} ${link.targetId}`}
                d={curvedKnowledgeLinkPath(link, pointer)}
                fill="none"
                stroke={T.greenLight}
                strokeWidth={Math.max(0.7, Math.min(1.35, link.weight / 2.2))}
                strokeOpacity="0"
                strokeLinecap="round"
              />
            ))}
          </g>
        </svg>
        <style>{`
          #knowledge-rail .knowledge-hit {
            cursor: default;
          }
          #knowledge-rail .knowledge-edge {
            transition: stroke-opacity 180ms ease, stroke-width 180ms ease;
          }
          #knowledge-rail .knowledge-orbit {
            stroke-dasharray: 2 10;
            transform-box: fill-box;
            transform-origin: center;
            animation: neuralDrift 14s linear infinite;
          }
          #knowledge-rail .knowledge-orbit-outer {
            animation-duration: 19s;
            animation-direction: reverse;
          }
          #knowledge-rail .knowledge-neural-edge {
            stroke-linejoin: round;
            filter: drop-shadow(0 0 5px ${T.green}1f);
          }
          #knowledge-rail .knowledge-node {
            transform-box: fill-box;
            transform-origin: center;
            transition: opacity 180ms ease, stroke 180ms ease, r 140ms ease;
          }
          #knowledge-rail .knowledge-halo {
            transform-box: fill-box;
            transform-origin: center;
            transition: opacity 160ms ease, r 140ms ease;
          }
          #knowledge-rail .knowledge-focus-glow {
            filter: drop-shadow(0 0 10px ${T.green}22);
          }
          #knowledge-rail .knowledge-halo.active {
            animation: neuralPulse 2.2s ease-out infinite;
          }
          #knowledge-rail .knowledge-ripple {
            transform-box: fill-box;
            transform-origin: center;
            animation: neuralPulse 2.8s ease-out infinite;
          }
          #knowledge-rail .knowledge-hover-layer {
            pointer-events: none;
          }
          #knowledge-rail .knowledge-hover-signal {
            stroke-dasharray: 2 10;
            animation: signalFlow 1.35s linear infinite;
            transition: stroke-opacity 140ms ease;
          }
          #knowledge-rail .knowledge-node-group:hover .knowledge-node {
            opacity: 0.98;
            stroke: ${T.green};
          }
          #knowledge-rail .knowledge-node-group:hover .knowledge-halo {
            opacity: 0.24;
            animation: neuralPulse 2.2s ease-out infinite;
          }
          #knowledge-rail .knowledge-node-group:hover text {
            fill: ${T.green};
          }
          ${hoverRules}
          @keyframes neuralPulse {
            0% { opacity: 0.22; transform: scale(0.92); }
            72% { opacity: 0.05; transform: scale(1.35); }
            100% { opacity: 0; transform: scale(1.48); }
          }
          @keyframes neuralDrift {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes signalFlow {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -30; }
          }
        `}</style>
      </div>

      <div style={{ display: "grid", gap: "0.5rem", minHeight: 0 }}>
        {(hoveredNode ? [hoveredNode] : topNodes).map((node) => (
          <div
            key={node.id}
            style={{
              border: `1px solid ${node.section === active ? T.green : T.border}`,
              background: node.section === active ? T.greenBg : T.surface,
              color: node.section === active ? T.green : T.sub,
              borderRadius: "4px",
              padding: "0.55rem 0.65rem",
              textAlign: "left",
            }}
          >
            <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: "0.55rem", color: nodeColor(node, T), textTransform: "uppercase", marginBottom: "0.2rem" }}>
              {kindLabel(node.kind)}
            </span>
            <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: "0.72rem", color: T.text, lineHeight: 1.45 }}>
              {node.label}
            </span>
          </div>
        ))}
      </div>
    </aside>
  );
}
