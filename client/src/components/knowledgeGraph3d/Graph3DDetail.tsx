/*
 * 3D 지식 지도의 설명 칸 — 그래프를 보지 않아도(화면 낭독기·좁은 화면) 같은 내용을 글로 읽을 수 있게 합니다.
 * 지도와 이 칸은 하나의 영역입니다: 지도에서 이 칸으로 옮겨 읽는 것은 떠남이 아닙니다.
 * 전체 보기
 *  - 아무것도 고르지 않음: 가운데의 나(이름 · 나의 지식), 전체 수, 분야 목록(누르면 펼침), 점 모양과 가운데 선 읽는 법
 *  - 분야를 가리키거나 초점을 옮김: 그 분야 미리 보기 ("누르거나 Enter로 펼치기")
 *  - 홈 목록에서 가리킨 프로젝트: 그 작업이 근거가 된 지식
 * 펼친 분야
 *  - 아무것도 고르지 않음: 펼친 분야 설명, 층 읽는 법(위아래는 의존이 아님), 다른 분야와 이어진 연결(누르면 그 분야로)
 *  - 지식: 무엇인가요 · 직접 한 일(근거 문장에서만) · 근거(이 사이트 안의 주소) · 이어진 지식(관계별, 다른 분야면 분야 이름을 붙임)
 *  - 근거(프로젝트·논문·경력·코드 기록): 이 분야에서 그 근거가 뒷받침하는 지식, 다른 분야
 * 맨 위 줄이 지금 보는 방식을 글로 알려 줍니다: "미리 보기"(점선 표) · "고정됨"(핀 + 고정 풀기) · "펼친 분야".
 * 파일 경로·내부 용어는 보여 주지 않습니다. 넓게 보기(한국어)에서만 근거의 원문 문장을 덧붙입니다.
 */
import { memo } from "react";
import { ArrowUpRight, Pin } from "lucide-react";
import type { Locale } from "@/lib/i18nContent";
import { graph3dCopy } from "./graph3dCopy";
import {
  domainLinkCounts,
  domainOfKey,
  focusKind,
  neighborhood,
  nodesInOrder,
  sharedVia,
  type DomainId,
  type KDomain,
  type KEvidence,
  type KLink,
  type KnowledgeGraph,
  type KNode,
  type NodeKind,
  type Relation,
} from "./graph3dModel";
import { RELATIONS } from "./knowledgeData";
import type { ExploreMode } from "./useGraph3DExplore";

export function KindGlyph({ kind, open = false }: { kind: NodeKind | "evidence"; open?: boolean }) {
  return <span className="kg3-glyph" data-kind={kind} data-open={open ? "true" : undefined} aria-hidden="true" />;
}

function Chip({ node, onPick, title, field }: { node: KNode; onPick: (id: string) => void; title?: string; field?: string }) {
  return (
    <button type="button" className="km-chip kg3-chip" data-kind={node.kind} data-status={node.status} title={title ?? node.title} onClick={() => onPick(node.id)}>
      <KindGlyph kind={node.kind} open={node.status !== "evidenced"} />
      {node.label}
      {field && <small className="kg3-chip-field">{field}</small>}
    </button>
  );
}

function StatusBadges({ node, locale }: { node: KNode; locale: Locale }) {
  const copy = graph3dCopy(locale);
  const items = node.status === "evidenced" ? (["built", "studied"] as const).filter((key) => node[key]) : [node.status];
  return (
    <ul className="kg3-badges">
      {items.map((key) => (
        <li key={key} data-status={key} title={copy.statusHelp[key]}>
          {copy.statuses[key]}
        </li>
      ))}
    </ul>
  );
}

function EvidenceLink({ item, locale }: { item: KEvidence; locale: Locale }) {
  const copy = graph3dCopy(locale);
  return (
    <>
      <span className="kg3-source-kind">{copy.evidenceKinds[item.kind]}</span>
      {item.href ? (
        <a href={item.href} className="kg3-source-title">
          {item.title}
          <ArrowUpRight size={11} aria-hidden="true" />
        </a>
      ) : (
        <span className="kg3-source-title">{item.title}</span>
      )}
      {item.status && <small className="kg3-source-status">{item.status}</small>}
    </>
  );
}

function Sources({ node, locale, rich }: { node: KNode; locale: Locale; rich: boolean }) {
  const copy = graph3dCopy(locale);
  return (
    <div className="km-detail-section">
      <h4>
        {copy.evidence} <b>{node.sources.length}</b>
      </h4>
      <ul className="kg3-sources">
        {node.sources.map((item) => (
          <li key={item.id}>
            <EvidenceLink item={item} locale={locale} />
            {rich &&
              locale === "ko" &&
              node.claims
                .filter((claim) => claim.evidence.id === item.id && claim.quote !== item.status && !node.did.includes(claim.quote))
                .map((claim, index) => (
                  <q key={index} className="kg3-quote">
                    {claim.quote}
                  </q>
                ))}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface RelationGroup {
  relation: Relation;
  direction: "out" | "in";
  items: Array<{ node: KNode; link: KLink }>;
}

function relationGroups(graph: KnowledgeGraph, node: KNode): RelationGroup[] {
  const links = graph.linksOf.get(node.id) ?? [];
  return RELATIONS.flatMap((relation) =>
    (["out", "in"] as const).flatMap((direction): RelationGroup[] => {
      const items = links
        .filter((link) => link.relation === relation && (direction === "out" ? link.source === node.id : link.target === node.id))
        .map((link) => ({ node: graph.byId.get(direction === "out" ? link.target : link.source)!, link }))
        .sort((a, b) => a.node.order - b.node.order);
      return items.length ? [{ relation, direction, items }] : [];
    }),
  );
}

function Relations({ graph, node, locale, rich, onPick }: { graph: KnowledgeGraph; node: KNode; locale: Locale; rich: boolean; onPick: (id: string) => void }) {
  const copy = graph3dCopy(locale);
  const groups = relationGroups(graph, node);
  // 다른 분야의 지식에는 분야 이름을 붙여, 층 그림에 없는 연결이 어디로 이어지는지 밝힙니다.
  const fieldOf = (other: KNode) => (other.domain === node.domain ? undefined : graph.domainById.get(other.domain)?.label);
  return (
    <div className="km-detail-section">
      <h4>
        {copy.relations} <b>{graph.neighbors.get(node.id)?.length ?? 0}</b>
      </h4>
      {groups.length === 0 && <p className="km-hint">{copy.noLinks}</p>}
      {groups.map((group) => (
        <div key={`${group.relation}-${group.direction}`} className="kg3-group" data-relation={group.relation}>
          <h5>{copy.relation[group.relation][group.direction]}</h5>
          {rich ? (
            <ul className="km-evidence">
              {group.items.map(({ node: other, link }) => (
                <li key={other.id}>
                  <Chip node={other} onPick={onPick} field={fieldOf(other)} />
                  <small className="kg3-via">
                    {copy.evidence}: {link.evidence.title}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="km-chips">
              {group.items.map(({ node: other, link }) => (
                <li key={other.id}>
                  <Chip node={other} onPick={onPick} field={fieldOf(other)} title={`${other.title} — ${copy.evidence}: ${link.evidence.title}`} />
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function TwoStep({ graph, node, locale, onPick }: { graph: KnowledgeGraph; node: KNode; locale: Locale; onPick: (id: string) => void }) {
  const copy = graph3dCopy(locale);
  const hood = neighborhood(graph, node.id, 2);
  const far = hood ? nodesInOrder(graph, Array.from(hood.hops.entries()).flatMap(([id, hop]) => (hop === 2 ? [id] : []))) : [];
  if (!far.length) return null;
  const byDomain = graph.domains.flatMap((domain) => {
    const members = far.filter((item) => item.domain === domain.id);
    return members.length ? [{ domain, members }] : [];
  });
  return (
    <div className="km-detail-section kg3-two-step">
      <h4>
        {copy.twoStep} <b>{far.length}</b>
      </h4>
      {byDomain.map(({ domain, members }) => (
        <div key={domain.id} className="kg3-group">
          <h5>{domain.label}</h5>
          <ul className="km-chips">
            {members.map((item) => (
              <li key={item.id}>
                <Chip node={item} onPick={onPick} title={copy.shared(nodesInOrder(graph, sharedVia(graph, node.id, item.id)).map((via) => via.label).join(" · "))} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

type RowMode = "preview" | "pinned" | "open";

/** 지금 보는 방식 — 미리 보기(가리키거나 초점을 옮긴 것, 곧 바뀔 수 있음) / 고정됨(누르거나 Enter, 풀 때까지 그대로) / 펼친 분야 */
function ModeRow({ mode, locale, hint, onUnpin }: { mode: RowMode; locale: Locale; hint?: string; onUnpin?: () => void }) {
  const copy = graph3dCopy(locale);
  return (
    <div className="kg3-mode-row" data-mode={mode}>
      <span className="kg3-mode">
        {mode === "pinned" && <Pin size={10} strokeWidth={2.5} aria-hidden="true" />}
        {mode === "pinned" ? copy.modePinned : mode === "open" ? copy.modeOpen : copy.modePreview}
      </span>
      {mode === "pinned" ? (
        <button type="button" className="km-pin-clear" onClick={onUnpin}>
          {copy.unpin}
        </button>
      ) : (
        <span className="kg3-mode-hint">{hint ?? copy.previewHint}</span>
      )}
    </div>
  );
}

function kindCounts(graph: KnowledgeGraph, ids: string[]): Record<NodeKind, number> {
  const counts: Record<NodeKind, number> = { tech: 0, concept: 0, method: 0 };
  for (const id of ids) {
    const node = graph.byId.get(id)!;
    if (node.status === "evidenced") counts[node.kind] += 1;
  }
  return counts;
}

function crossFields(graph: KnowledgeGraph, domain: KDomain) {
  const cross = new Map<string, number>();
  for (const [pair, count] of Array.from(domainLinkCounts(graph).entries())) {
    const [a, b] = pair.split("|");
    if (a === domain.id) cross.set(b, count);
    if (b === domain.id) cross.set(a, count);
  }
  const others = graph.domains.filter((item) => cross.has(item.id)).sort((a, b) => cross.get(b.id)! - cross.get(a.id)! || a.order - b.order);
  return { cross, others };
}

/** 전체 보기에서 분야를 가리키거나 초점을 옮김 — 펼치기 전의 미리 보기 */
function DomainPreview({ graph, domain, locale, onOpenDomain }: { graph: KnowledgeGraph; domain: KDomain; locale: Locale; onOpenDomain: (domain: DomainId) => void }) {
  const copy = graph3dCopy(locale);
  const open = domain.members.filter((id) => graph.byId.get(id)!.status !== "evidenced").length;
  return (
    <section className="km-detail kg3-detail" aria-label={domain.title} data-focus="domain" data-mode="preview">
      <ModeRow mode="preview" locale={locale} hint={copy.openFieldHint} />
      <div className="km-detail-kicker">
        <span>
          {copy.field} · {domain.evidenced}
        </span>
      </div>
      <h3 className="km-detail-title">{domain.title}</h3>
      <p className="km-detail-text">{domain.summary}</p>
      <p className="kg3-meta">
        {copy.fieldMembers(kindCounts(graph, domain.members))}
        {open > 0 ? ` · ${copy.fieldOpen(open)}` : ""}
      </p>

      <button type="button" className="km-locate kg3-open-field" onClick={() => onOpenDomain(domain.id)}>
        {copy.openField(domain.label)}
        <ArrowUpRight size={14} aria-hidden="true" />
      </button>
    </section>
  );
}

/** 펼친 분야에서 아무것도 고르지 않았을 때 */
function DomainOpened({ graph, domain, locale, onOpenDomain }: { graph: KnowledgeGraph; domain: KDomain; locale: Locale; onOpenDomain: (domain: DomainId) => void }) {
  const copy = graph3dCopy(locale);
  const { cross, others } = crossFields(graph, domain);
  const open = domain.members.filter((id) => graph.byId.get(id)!.status !== "evidenced").length;
  return (
    <section className="km-detail kg3-detail" aria-label={domain.title} data-focus="domain" data-mode="open">
      <ModeRow mode="open" locale={locale} hint={copy.openedHint} />
      <div className="km-detail-kicker">
        <span>
          {copy.field} · {domain.evidenced}
        </span>
      </div>
      <h3 className="km-detail-title">{domain.title}</h3>
      <p className="km-detail-text">{domain.summary}</p>
      <p className="kg3-meta">
        {copy.fieldMembers(kindCounts(graph, domain.members))}
        {open > 0 ? ` · ${copy.fieldOpen(open)}` : ""}
      </p>


      {others.length > 0 && (
        <div className="km-detail-section kg3-two-step">
          <h4>{copy.crossFields}</h4>
          <ul className="km-chips">
            {others.map((item) => (
              <li key={item.id}>
                <button type="button" className="km-chip kg3-field-chip" onClick={() => onOpenDomain(item.id)}>
                  {item.label} <b>{cross.get(item.id)}</b>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function EvidenceDetail({
  graph,
  evidence,
  locale,
  mode,
  hint,
  fieldId,
  onPick,
  onUnpin,
}: {
  graph: KnowledgeGraph;
  evidence: KEvidence;
  locale: Locale;
  mode: RowMode;
  hint?: string;
  /** 펼친 분야 — 그 분야의 지식을 먼저 적습니다 */
  fieldId: DomainId | null;
  onPick: (id: string) => void;
  onUnpin: () => void;
}) {
  const copy = graph3dCopy(locale);
  const nodes = nodesInOrder(graph, graph.evidenceNodes.get(evidence.id) ?? []);
  const field = fieldId ? graph.domainById.get(fieldId) : undefined;
  const inField = field ? nodes.filter((node) => node.domain === field.id) : [];
  const rest = field ? nodes.filter((node) => node.domain !== field.id) : nodes;
  const byDomain = graph.domains.flatMap((domain) => {
    const members = rest.filter((node) => node.domain === domain.id);
    return members.length ? [{ domain, members }] : [];
  });
  return (
    <section className="km-detail kg3-detail" aria-label={evidence.title} data-focus="evidence" data-mode={mode}>
      <ModeRow mode={mode} locale={locale} hint={hint} onUnpin={onUnpin} />
      <p className="km-detail-kicker">
        <span>
          {copy.evidenceKinds[evidence.kind]}
          {evidence.status ? ` · ${evidence.status}` : ""}
        </span>
      </p>
      <h3 className="km-detail-title">{evidence.title}</h3>
      {field && inField.length > 0 && (
        <div className="km-detail-section">
          <h4>
            {copy.evidenceInField(field.label)} <b>{inField.length}</b>
          </h4>
          <ul className="km-chips">
            {inField.map((node) => (
              <li key={node.id}>
                <Chip node={node} onPick={onPick} />
              </li>
            ))}
          </ul>
        </div>
      )}
      {byDomain.length > 0 && (
        <div className={field ? "km-detail-section kg3-two-step" : "km-detail-section"}>
          <h4>
            {field ? copy.evidenceElsewhere : copy.evidenceFocus} <b>{rest.length}</b>
          </h4>
          {byDomain.map(({ domain, members }) => (
            <div key={domain.id} className="kg3-group">
              <h5>{domain.label}</h5>
              <ul className="km-chips">
                {members.map((node) => (
                  <li key={node.id}>
                    <Chip node={node} onPick={onPick} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {evidence.href && (
        <a href={evidence.href} className="km-locate">
          {copy.openEvidence}
          <ArrowUpRight size={14} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

function Overview({ graph, locale, identity, onOpenDomain }: { graph: KnowledgeGraph; locale: Locale; identity: string; onOpenDomain: (domain: DomainId) => void }) {
  const copy = graph3dCopy(locale);
  return (
    <section className="km-detail kg3-detail" aria-label={copy.overviewTitle} data-focus="overview">
      <p className="km-detail-kicker">{copy.overviewTitle}</p>
      <h3 className="km-detail-title kg3-identity">{identity}</h3>

      <div className="km-detail-section">
        <h4>
          {copy.overviewFields} <b>{graph.counts.domains}</b>
        </h4>
        <ul className="km-chips kg3-fields">
          {graph.domains.map((domain) => (
            <li key={domain.id}>
              <button type="button" className="km-chip kg3-field-chip" title={domain.title} onClick={() => onOpenDomain(domain.id)}>
                {domain.label} <b>{domain.evidenced}</b>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <ul className="km-legend kg3-legend">
        {(["concept", "method", "tech"] as const).map((kind) => (
          <li key={kind}>
            <KindGlyph kind={kind} />
            {copy.legend[kind]} <b>{graph.counts.kinds[kind]}</b>
          </li>
        ))}
        <li>
          <KindGlyph kind="concept" open />
          {copy.legend.open} <b>{graph.counts.interest + graph.counts.listed}</b>
        </li>
      </ul>


    </section>
  );
}

export interface Graph3DDetailProps {
  graph: KnowledgeGraph;
  mode: ExploreMode;
  /** 펼친 분야 (전체 보기에서는 null) */
  domainId: DomainId | null;
  focusId: string | null;
  pinnedId: string | null;
  locale: Locale;
  identity: string;
  /** 넓게 보기: 연결마다의 근거와 (한국어) 원문 문장, 한 걸음 더 */
  rich?: boolean;
  /** 지식을 고릅니다 — 펼친 분야의 지식이면 고정, 다른 분야면 그 분야를 펼치며 고정 */
  onPick: (id: string) => void;
  onOpenDomain: (domain: DomainId) => void;
  onUnpin: () => void;
}

/** 펼치는 동안처럼 설명할 대상이 그대로일 때는 다시 그리지 않습니다. */
export const Graph3DDetail = memo(function Graph3DDetail({ graph, mode, domainId, focusId, pinnedId, locale, identity, rich = false, onPick, onOpenDomain, onUnpin }: Graph3DDetailProps) {
  const copy = graph3dCopy(locale);
  const kind = focusKind(graph, focusId);
  const opened = mode === "detail" && domainId ? graph.domainById.get(domainId) : undefined;

  if (mode === "overview" || !opened) {
    if (kind === "evidence" && focusId) return <EvidenceDetail graph={graph} evidence={graph.evidence.get(focusId)!} locale={locale} mode="preview" hint={copy.evidenceHint} fieldId={null} onPick={onPick} onUnpin={onUnpin} />;
    const previewed = kind === "domain" && focusId ? domainOfKey(graph, focusId) : kind === "node" && focusId ? graph.domainById.get(graph.byId.get(focusId)!.domain) : null;
    if (previewed) return <DomainPreview graph={graph} domain={previewed} locale={locale} onOpenDomain={onOpenDomain} />;
    return <Overview graph={graph} locale={locale} identity={identity} onOpenDomain={onOpenDomain} />;
  }

  if (kind === "evidence" && focusId) {
    return (
      <EvidenceDetail
        graph={graph}
        evidence={graph.evidence.get(focusId)!}
        locale={locale}
        mode={pinnedId === focusId ? "pinned" : "preview"}
        fieldId={opened.id}
        onPick={onPick}
        onUnpin={onUnpin}
      />
    );
  }
  if (kind !== "node" || !focusId) return <DomainOpened graph={graph} domain={opened} locale={locale} onOpenDomain={onOpenDomain} />;

  const node = graph.byId.get(focusId)!;
  const domain = graph.domainById.get(node.domain)!;
  const pinned = pinnedId === node.id;
  return (
    <section className="km-detail kg3-detail" aria-label={node.title} data-kind={node.kind} data-status={node.status} data-mode={pinned ? "pinned" : "preview"}>
      <ModeRow mode={pinned ? "pinned" : "preview"} locale={locale} onUnpin={onUnpin} />
      <div className="km-detail-kicker">
        <span>
          {domain.label} · {copy.kinds[node.kind]}
        </span>
      </div>
      <h3 className="km-detail-title">{node.title}</h3>
      <StatusBadges node={node} locale={locale} />
      <dl className="kg3-explain">
        <dt>{copy.what}</dt>
        <dd>{node.what}</dd>
        <dt>{copy.did}</dt>
        <dd>{node.did}</dd>
      </dl>
      <Sources node={node} locale={locale} rich={rich} />
      <Relations graph={graph} node={node} locale={locale} rich={rich} onPick={onPick} />
      {rich && <TwoStep graph={graph} node={node} locale={locale} onPick={onPick} />}
    </section>
  );
});
