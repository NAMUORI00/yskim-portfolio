import { useMemo, useState } from "react";
import type { PortfolioTheme } from "@/content/theme";
import type { KnowledgeGraphData, KnowledgeGraphNode } from "@/lib/knowledgeGraph";
import { layoutKnowledgeGraph } from "@/lib/knowledgeGraphLayout";
import { FONT_MONO, FONT_SANS } from "@/content/theme";

const WIDTH = 276;
const HEIGHT = 360;

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

export function KnowledgeGraphRail({
  graph,
  T,
  active,
  onSection,
}: {
  graph: KnowledgeGraphData;
  T: PortfolioTheme;
  active: string;
  onSection: (id: string) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const layout = useMemo(() => layoutKnowledgeGraph(graph, WIDTH, HEIGHT), [graph]);
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
  const topNodes = layout.nodes.filter((node) => node.kind !== "profile").slice(0, 5);

  function activateNode(node: KnowledgeGraphNode) {
    if (node.section) {
      onSection(node.section);
      return;
    }
    if (node.href) window.open(node.href, "_blank", "noopener,noreferrer");
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
          콘텐츠의 태그, 관련 노트, 자연어 키워드로 매 배포마다 다시 그려지는 관심사 지도입니다.
        </p>
      </div>

      <div
        style={{
          position: "relative",
          border: `1px solid ${T.border}`,
          borderRadius: "6px",
          background: T.bg,
          overflow: "hidden",
          minHeight: "340px",
        }}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="관심사 노드 그래프" style={{ display: "block", width: "100%", height: "auto" }}>
          <defs>
            <radialGradient id="knowledge-core" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor={T.greenLight} stopOpacity="0.35" />
              <stop offset="100%" stopColor={T.green} stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="transparent" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r="92" fill="url(#knowledge-core)" />
          {layout.links.map((link) => {
            const isLit = !focusNode || connected.has(link.sourceId) || connected.has(link.targetId);
            return (
              <line
                key={`${link.sourceId}-${link.targetId}-${link.kind}`}
                x1={link.source.x}
                y1={link.source.y}
                x2={link.target.x}
                y2={link.target.y}
                stroke={link.kind === "related" ? T.green : T.border}
                strokeWidth={Math.max(0.6, Math.min(2.2, link.weight / 1.4))}
                strokeOpacity={isLit ? 0.55 : 0.12}
              />
            );
          })}
          {layout.nodes.map((node) => {
            const color = nodeColor(node, T);
            const isActive = node.section === active || node.id === hovered;
            const isLit = !focusNode || connected.has(node.id);
            return (
              <g
                key={node.id}
                tabIndex={0}
                role="button"
                aria-label={`${node.label} ${kindLabel(node.kind)}`}
                onMouseEnter={() => setHovered(node.id)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)}
                onBlur={() => setHovered(null)}
                onClick={() => activateNode(node)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") activateNode(node);
                }}
                style={{ cursor: node.section || node.href ? "pointer" : "default", outline: "none" }}
              >
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius + (isActive ? 4 : 0)}
                  fill={color}
                  opacity={isActive ? 0.16 : 0.08}
                />
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={node.radius}
                  fill={color}
                  opacity={isLit ? 0.92 : 0.28}
                  stroke={isActive ? T.green : T.bg}
                  strokeWidth={isActive ? 1.5 : 1}
                />
                {(node.kind === "profile" || isActive) && (
                  <text
                    x={node.x}
                    y={node.y - node.radius - 7}
                    textAnchor="middle"
                    fill={isActive ? T.green : T.sub}
                    fontFamily={FONT_MONO}
                    fontSize="8"
                  >
                    {node.label.length > 18 ? `${node.label.slice(0, 17)}...` : node.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{ display: "grid", gap: "0.5rem", minHeight: 0 }}>
        {(hoveredNode ? [hoveredNode] : topNodes).map((node) => (
          <button
            key={node.id}
            type="button"
            onClick={() => activateNode(node)}
            style={{
              border: `1px solid ${node.section === active ? T.green : T.border}`,
              background: node.section === active ? T.greenBg : T.surface,
              color: node.section === active ? T.green : T.sub,
              borderRadius: "4px",
              padding: "0.55rem 0.65rem",
              textAlign: "left",
              cursor: node.section || node.href ? "pointer" : "default",
            }}
          >
            <span style={{ display: "block", fontFamily: FONT_MONO, fontSize: "0.55rem", color: nodeColor(node, T), textTransform: "uppercase", marginBottom: "0.2rem" }}>
              {kindLabel(node.kind)}
            </span>
            <span style={{ display: "block", fontFamily: FONT_SANS, fontSize: "0.72rem", color: T.text, lineHeight: 1.45 }}>
              {node.label}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
