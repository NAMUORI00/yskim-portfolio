/*
 * 지식 지도의 설명 칸과 목록 보기 — 지도에서 고른 노드의 전체 이름, 한 줄 성과(content 의 metric),
 * 위·아래 층으로 이어진 항목을 글로 보여 줍니다. 지도를 보지 않아도(화면 낭독기·좁은 화면) 같은 내용을 읽을 수 있습니다.
 * 칩을 누르면 그 항목을 지도에서 고정하고, "…에서 보기"는 홈 본문의 해당 자리로 옮겨 갑니다.
 */
import { ArrowDownRight, TrendingUp } from "lucide-react";
import type { Locale } from "@/lib/i18nContent";
import { mapCopy } from "./knowledgeMapCopy";
import { MAP_LAYERS, projectCount, type KnowledgeMap, type MapLayer, type MapNode } from "./knowledgeMapModel";

function nodesOf(map: KnowledgeMap, ids: Iterable<string>): MapNode[] {
  const unique = Array.from(new Set(ids));
  return unique
    .flatMap((id) => {
      const node = map.byId.get(id);
      return node ? [node] : [];
    })
    .sort((a, b) => a.order - b.order);
}

function deeper(map: KnowledgeMap, ids: string[], direction: "above" | "below"): MapNode[] {
  return nodesOf(
    map,
    ids.flatMap((id) => map[direction].get(id) ?? []),
  );
}

function Chip({ node, onPick }: { node: MapNode; onPick: (id: string) => void }) {
  return (
    <button type="button" className="km-chip" data-layer={node.layer} title={node.title} onClick={() => onPick(node.id)}>
      <span className="km-layer-glyph" data-layer={node.layer} aria-hidden="true" />
      {node.label}
    </button>
  );
}

function ChipList({ nodes, onPick }: { nodes: MapNode[]; onPick: (id: string) => void }) {
  return (
    <ul className="km-chips">
      {nodes.map((node) => (
        <li key={node.id}>
          <Chip node={node} onPick={onPick} />
        </li>
      ))}
    </ul>
  );
}

export interface KnowledgeMapDetailProps {
  map: KnowledgeMap;
  node: MapNode | null;
  pinnedId: string | null;
  locale: Locale;
  counts: Record<MapLayer, number>;
  onPick: (id: string) => void;
  onUnpin: () => void;
  /** 홈 본문에서 해당 자리를 보여 줍니다 (없으면 단추를 숨김) */
  onLocate?: (node: MapNode) => void;
}

export function KnowledgeMapDetail({ map, node, pinnedId, locale, counts, onPick, onUnpin, onLocate }: KnowledgeMapDetailProps) {
  const copy = mapCopy(locale);

  if (!node) {
    return (
      <section className="km-detail" aria-label={copy.overviewTitle}>
        <p className="km-detail-kicker">{copy.overviewTitle}</p>
        <ul className="km-counts">
          {MAP_LAYERS.map((layer) => (
            <li key={layer}>
              <span className="km-layer-glyph" data-layer={layer} aria-hidden="true" />
              {copy.layers[layer]} <b>{counts[layer]}</b>
            </li>
          ))}
        </ul>
        <p className="km-detail-text">{copy.overview}</p>
        <p className="km-hint">{copy.hint}</p>
      </section>
    );
  }

  const up = map.above.get(node.id) ?? [];
  const down = map.below.get(node.id) ?? [];
  const meta = node.layer === "project" ? node.period : node.layer === "tech" ? node.group : undefined;
  // 연구 질문 → 그 프로젝트들의 기술, 기술 → 그 프로젝트들의 연구 질문
  const twoAway = node.layer === "research" ? deeper(map, down, "below") : node.layer === "tech" ? deeper(map, up, "above") : [];

  return (
    <section className="km-detail" aria-label={node.title} data-layer={node.layer}>
      <div className="km-detail-kicker">
        <span>
          {copy.layers[node.layer]}
          {meta ? ` · ${meta}` : ""}
        </span>
        {pinnedId === node.id && (
          <button type="button" className="km-pin-clear" onClick={onUnpin}>
            {copy.pinned} · {copy.unpin}
          </button>
        )}
      </div>
      <h3 className="km-detail-title">{node.title}</h3>

      {node.layer === "research" && (
        <>
          <div className="km-detail-section">
            <h4>
              {copy.related.research.down} <b>{down.length}</b>
            </h4>
            <ul className="km-evidence">
              {nodesOf(map, down).map((project) => (
                <li key={project.id}>
                  <Chip node={project} onPick={onPick} />
                  {project.metric && <small>{project.metric}</small>}
                </li>
              ))}
            </ul>
          </div>
          <div className="km-detail-section">
            <h4>
              {copy.related.research.downDeep} <b>{twoAway.length}</b>
            </h4>
            <ChipList nodes={twoAway} onPick={onPick} />
          </div>
        </>
      )}

      {node.layer === "project" && (
        <>
          {node.metric && (
            <p className="km-detail-metric">
              <TrendingUp size={13} aria-hidden="true" />
              <span>{node.metric}</span>
            </p>
          )}
          <div className="km-detail-section">
            <h4>{copy.related.project.up}</h4>
            {up.length ? <ChipList nodes={nodesOf(map, up)} onPick={onPick} /> : <p className="km-hint">{copy.noResearch}</p>}
          </div>
          <div className="km-detail-section">
            <h4>
              {copy.related.project.down} <b>{down.length}</b>
            </h4>
            {down.length ? <ChipList nodes={nodesOf(map, down)} onPick={onPick} /> : <p className="km-hint">{copy.noTech}</p>}
          </div>
        </>
      )}

      {node.layer === "tech" && (
        <>
          <p className="km-detail-text">{copy.usedCount(projectCount(map, node.id))}</p>
          <div className="km-detail-section">
            <h4>
              {copy.related.tech.up} <b>{up.length}</b>
            </h4>
            <ChipList nodes={nodesOf(map, up)} onPick={onPick} />
          </div>
          {twoAway.length > 0 && (
            <div className="km-detail-section">
              <h4>
                {copy.related.tech.upDeep} <b>{twoAway.length}</b>
              </h4>
              <ChipList nodes={twoAway} onPick={onPick} />
            </div>
          )}
        </>
      )}

      {onLocate && (
        <button type="button" className="km-locate" onClick={() => onLocate(node)}>
          {copy.locate[node.layer]}
          <ArrowDownRight size={14} aria-hidden="true" />
        </button>
      )}
    </section>
  );
}

/** 목록 보기 — 연구 질문 아래에 그 프로젝트와 기술을, 이어지지 않은 프로젝트는 따로 적습니다. */
export function KnowledgeMapOutline({
  map,
  locale,
  selectedId,
  onPick,
}: {
  map: KnowledgeMap;
  locale: Locale;
  selectedId: string | null;
  onPick: (id: string) => void;
}) {
  const copy = mapCopy(locale);
  const research = map.nodes.filter((node) => node.layer === "research").sort((a, b) => (a.slot ?? a.order) - (b.slot ?? b.order));
  const loose = map.nodes.filter((node) => node.layer === "project" && !(map.above.get(node.id) ?? []).length);
  const item = (node: MapNode) => (
    <button type="button" className="km-outline-item" data-layer={node.layer} aria-pressed={selectedId === node.id} onClick={() => onPick(node.id)}>
      <span className="km-layer-glyph" data-layer={node.layer} aria-hidden="true" />
      <span>{node.title}</span>
    </button>
  );
  const techLine = (project: MapNode) => {
    const techs = nodesOf(map, map.below.get(project.id) ?? []);
    return techs.length ? <span className="km-outline-tech">{techs.map((tech) => tech.label).join(" · ")}</span> : null;
  };
  return (
    <div className="km-outline">
      <section>
        <h3>
          {copy.layers.research} <b>{research.length}</b>
        </h3>
        <ol>
          {research.map((node) => (
            <li key={node.id}>
              {item(node)}
              <ul>
                {nodesOf(map, map.below.get(node.id) ?? []).map((project) => (
                  <li key={project.id}>
                    {item(project)}
                    {techLine(project)}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>
      {loose.length > 0 && (
        <section>
          <h3>
            {copy.looseProjects} <b>{loose.length}</b>
          </h3>
          <ul>
            {loose.map((project) => (
              <li key={project.id}>
                {item(project)}
                {techLine(project)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
