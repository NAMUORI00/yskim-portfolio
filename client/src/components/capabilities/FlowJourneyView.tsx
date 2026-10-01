/*
 * 홈 프로젝트 "자세히 보기"의 흐름 도식 — 작은 도식(자세히 보기 안)과 넓게 보기가 함께 씁니다 (지연 로딩 묶음에만 들어감).
 * 스마트팜 운영 콘솔 첫 화면의 흐름 보드처럼 역할 레인(행) × 단계(열)에 단계 상자를 놓고, 연결선과 그 위를 지나는
 * 데이터 아이콘으로 무엇이 들어와 어떤 모듈을 거쳐 무엇이 되는지 보여 줍니다.
 * - 고른 단계 하나의 짧은 설명과 받은 것·보낸 것만 도식 옆(자리가 모자라면 아래)에 둡니다.
 * - 너비가 레인 도식에 모자라면 같은 단계를 위에서 아래로 쌓고, 고른 단계 바로 밑에 설명을 둡니다.
 * - 단계 상자는 Tab 한 번으로 들어가 화살표·Home·End 키로 옮깁니다. 움직임 줄이기에서는 데이터 이동을 그리지 않습니다.
 * 기록·코드·설명용 흐름의 구분과 출처는 capabilityFlowModel.ts 의 FlowView 를 그대로 따릅니다.
 */
import {
  Fragment,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";
import {
  AppWindow,
  AudioLines,
  Award,
  Braces,
  BrainCircuit,
  Cctv,
  ChartColumn,
  ChartLine,
  CircuitBoard,
  Clock3,
  CodeXml,
  Cpu,
  Database,
  EqualNot,
  FileAudio,
  FileText,
  Flag,
  FlaskConical,
  FolderOpen,
  Gamepad2,
  Gauge,
  GitPullRequest,
  Globe,
  Hand,
  Image as ImageIcon,
  Images,
  ListChecks,
  ListFilter,
  LogIn,
  Map as MapIcon,
  MessageSquareText,
  Music,
  Pause,
  Play,
  Presentation,
  RotateCcw,
  Route,
  Salad,
  Scale,
  Search,
  Send,
  Server,
  ShieldCheck,
  SlidersHorizontal,
  Smartphone,
  SquareTerminal,
  Table2,
  Thermometer,
  TriangleAlert,
  User,
  UserCheck,
  Users,
  Video,
  Waypoints,
  type LucideIcon,
} from "lucide-react";
import { FONT_MONO, FONT_SANS, type PortfolioTheme } from "@/content/theme";
import type { Locale } from "@/lib/i18nContent";
import { LANES, type LaneId } from "./capabilityArchitectures";
import { pick, type Localized } from "./capabilityModel";
import {
  flowProvenance,
  incomingLinks,
  labelFits,
  labelMaxWidth,
  nodeLabel,
  outgoingLinks,
  routeKind,
  routePath,
  type FlowBody,
  type FlowReading,
  type FlowView,
  type GridCell,
} from "./capabilityFlowModel";
import { journeyFor, LANE_ICON, linkIcon, nodeIcon, type FlowIcon, type JourneyPayload, type StepJourney } from "./capabilityJourneys";
import type { Journey } from "./useFlowPlayer";
import "./flowJourney.css";

const GLYPHS: Record<FlowIcon, LucideIcon> = {
  user: User,
  team: Users,
  operator: UserCheck,
  browser: AppWindow,
  phone: Smartphone,
  login: LogIn,
  text: MessageSquareText,
  document: FileText,
  json: Braces,
  request: Send,
  code: CodeXml,
  config: SlidersHorizontal,
  terminal: SquareTerminal,
  audio: AudioLines,
  audioFile: FileAudio,
  video: Video,
  camera: Cctv,
  frames: Images,
  image: ImageIcon,
  model: BrainCircuit,
  gpu: Cpu,
  rule: Scale,
  score: ChartColumn,
  search: Search,
  filter: ListFilter,
  check: ShieldCheck,
  alert: TriangleAlert,
  compare: EqualNot,
  route: Route,
  gauge: Gauge,
  server: Server,
  database: Database,
  records: Table2,
  folder: FolderOpen,
  device: CircuitBoard,
  sensor: Thermometer,
  hand: Hand,
  sim: FlaskConical,
  clock: Clock3,
  map: MapIcon,
  external: Globe,
  pr: GitPullRequest,
  result: Flag,
  award: Award,
  chart: ChartLine,
  list: ListChecks,
  nutrition: Salad,
  game: Gamepad2,
  music: Music,
  proposal: Presentation,
};

/** 데이터·구성 요소의 종류를 나타내는 아이콘 (화면 읽기 프로그램에는 글로만 전달합니다) */
export function Glyph({ icon, size = 18, className }: { icon: FlowIcon; size?: number; className?: string }) {
  const Icon = GLYPHS[icon] ?? Flag;
  return <Icon size={size} strokeWidth={1.8} aria-hidden="true" focusable="false" className={className} />;
}

export const JOURNEY_COPY = {
  ko: {
    evidence: { recorded: "화면 기록 재생", code: "코드로 확인한 흐름", explanatory: "설명용 흐름" },
    flows: "흐름 선택",
    defaultTitle: "작업 흐름",
    play: "재생",
    pause: "멈춤",
    replay: "다시 재생",
    steps: (title: string) => `${title} 단계 (화살표 키로 이동)`,
    stepNo: (n: number) => `${n}단계 `,
    note: (n: number, title: string) => `${n}단계 ${title} 설명`,
    receives: "받음",
    sends: "보냄",
    tech: "사용 기술",
    via: "전달 경로",
    good: (n: number) => `정상 ${n}`,
    doubtful: (n: number) => `의심 ${n}`,
    doubtfulSr: "품질 의심 값",
    inRange: "기준 안",
    outside: "벗어남",
    noRange: "기준 없음",
    range: (lower: number, upper: number) => `기준 ${lower}–${upper}`,
  },
  en: {
    evidence: { recorded: "Replay of a screen record", code: "Traced in source code", explanatory: "Explanatory flow" },
    flows: "Choose a flow",
    defaultTitle: "How it works",
    play: "Play",
    pause: "Pause",
    replay: "Replay",
    steps: (title: string) => `${title} steps (arrow keys move between steps)`,
    stepNo: (n: number) => `Step ${n}: `,
    note: (n: number, title: string) => `Step ${n}, ${title}`,
    receives: "In",
    sends: "Out",
    tech: "Technologies",
    via: "Route",
    good: (n: number) => `${n} good`,
    doubtful: (n: number) => `${n} doubtful`,
    doubtfulSr: "doubtful reading",
    inRange: "In range",
    outside: "Out of range",
    noRange: "No range",
    range: (lower: number, upper: number) => `Range ${lower}–${upper}`,
  },
} as const;

type Copy = (typeof JOURNEY_COPY)[Locale];
type Mode = "compact" | "wide";

const t = (ko: string, en: string): Localized => ({ ko, en });

/** 작은 도식의 좁은 레인 칸에 맞춘 레인 이름 (넓게 보기는 전체 이름) */
const LANE_COMPACT: Record<LaneId, Localized> = {
  user: t("사용자 화면", "User screen"),
  ai: t("AI·모델", "AI / model"),
  server: t("서버", "Server"),
  data: t("데이터", "Data"),
  field: t("현장 장치", "Device"),
  sim: t("시뮬레이션", "Simulator"),
  tool: t("스크립트", "Script"),
  operator: t("운영자", "Operator"),
  external: t("외부 서비스", "External"),
  mywork: t("내 작업", "Mine"),
  team: t("팀 작업", "Team"),
  outcome: t("결과", "Result"),
};

function laneLabel(lane: LaneId, mode: Mode, locale: Locale): string {
  return mode === "compact" ? pick(LANE_COMPACT[lane], locale) : LANES[lane][locale];
}

/** 홈 테마 색과 글꼴을 도식 CSS 변수로 넘깁니다. */
export function flowThemeVars(T: PortfolioTheme): CSSProperties {
  return {
    "--cf-bg": T.bg,
    "--cf-surface": T.surface,
    "--cf-border": T.border,
    "--cf-text": T.text,
    "--cf-sub": T.sub,
    "--cf-muted": T.muted,
    "--cf-green": T.green,
    "--cf-green-light": T.greenLight,
    "--cf-green-bg": T.greenBg,
    "--cf-red": T.red,
    "--cf-red-bg": T.redBg,
    "--cf-sans": FONT_SANS,
    "--cf-mono": FONT_MONO,
  } as CSSProperties;
}

/* ────────────────────────────────────────────
   배치: 레인 도식이 들어갈 너비인지, 설명을 옆에 둘 자리가 있는지
──────────────────────────────────────────── */

interface StageMetrics {
  /** 레인 이름 칸 */
  head: number;
  /** 단계 칸의 최소 너비 */
  col: number;
  gap: number;
  noteMin: number;
  noteMax: number;
  /** 설명 상자가 차지하는 너비 비율 */
  noteShare: number;
  stageGap: number;
}

export const STAGE_METRICS: Record<Mode, StageMetrics> = {
  compact: { head: 64, col: 78, gap: 12, noteMin: 248, noteMax: 340, noteShare: 0.38, stageGap: 16 },
  wide: { head: 104, col: 104, gap: 26, noteMin: 290, noteMax: 380, noteShare: 0.3, stageGap: 24 },
};

export function laneBoardMinWidth(count: number, mode: Mode): number {
  const m = STAGE_METRICS[mode];
  return m.head + count * m.col + Math.max(0, count - 1) * m.gap;
}

/**
 * 너비에 따른 배치 — 레인 도식이 들어가면 레인 도식, 아니면 쌓은 목록.
 * 레인 도식 옆에 설명 상자를 둘 자리가 있으면 그 너비(px)를, 없으면 null(도식 아래)을 돌려줍니다.
 * 너비를 아직 모르면(첫 그리기) 레인 도식으로 둡니다.
 */
export function stageLayout(width: number | null, count: number, mode: Mode): { layout: "lanes" | "stack"; note: number | null } {
  if (width === null) return { layout: "lanes", note: null };
  const m = STAGE_METRICS[mode];
  const min = laneBoardMinWidth(count, mode);
  if (width < min) return { layout: "stack", note: null };
  const note = Math.round(Math.min(m.noteMax, Math.max(m.noteMin, width * m.noteShare)));
  return { layout: "lanes", note: width - note - m.stageGap >= min ? note : null };
}

/* ────────────────────────────────────────────
   고른 단계가 받는 것과 보내는 것
──────────────────────────────────────────── */

export interface IoItem {
  key: string;
  icon: FlowIcon;
  /** 연결선이 나르는 데이터 */
  data?: string;
  /** 보낸 단계·받는 단계 또는 흐름의 출발점·도착점 */
  place?: string;
}

function boxName(flow: FlowView, id: string, locale: Locale): string {
  const node = flow.nodes.find((item) => item.id === id);
  return node ? nodeLabel(node, locale) : id;
}

/** 받은 것: 들어오는 연결선(데이터 + 보낸 단계), 첫 단계는 데이터가 처음 생기는 곳 */
export function inputsOf(flow: FlowView, index: number, locale: Locale): IoItem[] {
  const node = flow.nodes[index];
  if (!node) return [];
  const incoming = incomingLinks(flow, node.id);
  if (incoming.length > 0) {
    return incoming.map((link) => ({
      key: `${link.from}>${link.to}`,
      icon: linkIcon(flow, link),
      ...(link.label ? { data: pick(link.label, locale) } : {}),
      place: boxName(flow, link.from, locale),
    }));
  }
  const origin = journeyFor(flow, index)?.origin;
  return origin ? [{ key: "origin", icon: origin.icon, place: pick(origin.name, locale) }] : [];
}

/** 보낸 것: 나가는 연결선(데이터 + 받는 단계), 마지막 단계는 결과가 닿는 곳 */
export function outputsOf(flow: FlowView, index: number, locale: Locale): IoItem[] {
  const node = flow.nodes[index];
  if (!node) return [];
  const outgoing = outgoingLinks(flow, node.id);
  if (outgoing.length > 0) {
    return outgoing.map((link) => ({
      key: `${link.from}>${link.to}`,
      icon: linkIcon(flow, link),
      ...(link.label ? { data: pick(link.label, locale) } : {}),
      place: boxName(flow, link.to, locale),
    }));
  }
  const destination = journeyFor(flow, index)?.destination;
  return destination ? [{ key: "destination", icon: destination.icon, place: pick(destination.name, locale) }] : [];
}

const valueText = (value: string | Localized, locale: Locale) => (typeof value === "string" ? value : pick(value, locale));

/** 코드에 적힌 형식·이름 (예: FormData, vocals.wav) — 연결선 이름과 겹치는 것은 빼고 한 줄로 */
function payloadCodes(payload: JourneyPayload | undefined, outputs: IoItem[], locale: Locale): string[] {
  if (!payload) return [];
  const shown = new Set(outputs.flatMap((item) => (item.data ? [item.data] : [])));
  const values = [...(payload.items ?? []).flatMap((item) => (item.value === undefined ? [] : [valueText(item.value, locale)])), ...(payload.code ? [payload.code] : [])];
  return Array.from(new Set(values)).filter((value) => !shown.has(value)).slice(0, 6);
}

/* ────────────────────────────────────────────
   기록된 흐름에서 그 단계가 화면에 내놓은 실제 값
──────────────────────────────────────────── */

function Tile({ reading, locale, copy, compact = false }: { reading: FlowReading; locale: Locale; copy: Copy; compact?: boolean }) {
  return (
    <span className={`fj-tile${reading.doubtful ? " is-doubt" : ""}${compact ? " is-compact" : ""}`}>
      <small>{pick(reading.label, locale)}</small>
      <b>
        {reading.value}
        <i>{reading.unit}</i>
      </b>
      {reading.doubtful && <span className="fj-sr">{` (${copy.doubtfulSr})`}</span>}
    </span>
  );
}

/** 대시보드의 기준 범위 막대와 같은 계산: 기준 띠 양옆에 여백을 두고 값의 자리를 백분율로 */
function bandPositions(value: number, lower: number, upper: number) {
  const pad = Math.max((upper - lower) / 2, Math.abs(upper || lower || 1) * 0.1, 0.5);
  const min = Math.min(lower - pad, value);
  const max = Math.max(upper + pad, value);
  const span = max - min || 1;
  const pct = (v: number) => Math.round(((v - min) / span) * 1000) / 10;
  return { start: pct(lower), end: pct(upper), needle: pct(value), outside: value < lower || value > upper };
}

export function NodeBody({ body, locale }: { body: FlowBody; locale: Locale }) {
  const copy = JOURNEY_COPY[locale];
  switch (body.kind) {
    case "readings":
      return (
        <>
          <ul className="fj-tiles">
            {body.readings.map((reading) => (
              <li key={reading.label.ko}>
                <Tile reading={reading} locale={locale} copy={copy} />
              </li>
            ))}
          </ul>
          {body.note && <p className="fj-data-note">{pick(body.note, locale)}</p>}
        </>
      );
    case "count":
      return (
        <p className="fj-count">
          <b>{body.value}</b>
          <span>{pick(body.label, locale)}</span>
          {body.note && <small>{pick(body.note, locale)}</small>}
          {body.stamp && (
            <span className="fj-stamp">
              <Clock3 size={14} strokeWidth={1.8} aria-hidden="true" focusable="false" />
              {pick(body.stamp.label, locale)} <b>{body.stamp.value}</b>
            </span>
          )}
        </p>
      );
    case "quality":
      return (
        <>
          <span className="fj-seg" aria-hidden="true">
            <i className="is-ok" style={{ flexGrow: Math.max(body.good, 0.01) }} />
            {body.doubtful > 0 && <i className="is-warn" style={{ flexGrow: body.doubtful }} />}
          </span>
          <p className="fj-legend">
            <span className="is-ok">{copy.good(body.good)}</span>
            {body.doubtful > 0 && <span className="is-warn">{copy.doubtful(body.doubtful)}</span>}
          </p>
          <p className="fj-out">
            <Tile reading={body.excluded} locale={locale} copy={copy} compact />
            <em>{pick(body.excludedTag, locale)}</em>
          </p>
        </>
      );
    case "range": {
      const band = bandPositions(Number(body.reading.value), body.lower, body.upper);
      return (
        <>
          <div className="fj-gauge">
            <p className="fj-gauge-top">
              <small>{pick(body.reading.label, locale)}</small>
              <b>
                {body.reading.value}
                <i>{body.reading.unit}</i>
              </b>
            </p>
            <span className={`fj-gauge-bar${band.outside ? " is-out" : ""}`} aria-hidden="true">
              <u style={{ left: `${band.start}%`, width: `${Math.max(2, band.end - band.start)}%` }} />
              <i style={{ left: `${band.needle}%` }} />
            </span>
            <small className="fj-gauge-range">{copy.range(body.lower, body.upper)}</small>
          </div>
          <dl className="fj-stats">
            <div>
              <dt>{copy.inRange}</dt>
              <dd>{body.inRange}</dd>
            </div>
            <div>
              <dt>{copy.outside}</dt>
              <dd className={body.outside > 0 ? "is-warn" : ""}>{body.outside}</dd>
            </div>
            <div>
              <dt>{copy.noRange}</dt>
              <dd>{body.noRange}</dd>
            </div>
          </dl>
        </>
      );
    }
    case "note":
      return (
        <>
          <p className="fj-data-text">{pick(body.text, locale)}</p>
          {body.muted && <p className="fj-data-note">{pick(body.muted, locale)}</p>}
        </>
      );
    case "cross":
      return (
        <>
          <div className="fj-cross">
            <Tile reading={body.doubt} locale={locale} copy={copy} compact />
            <p className="fj-neq">
              <b aria-hidden="true">≠</b>
              {pick(body.neq, locale)}
            </p>
            <ul className="fj-tiles is-row">
              {body.partners.map((reading) => (
                <li key={reading.label.ko}>
                  <Tile reading={reading} locale={locale} copy={copy} compact />
                </li>
              ))}
            </ul>
          </div>
          <p className="fj-verdict">{pick(body.verdict, locale)}</p>
          <p className="fj-chip">{pick(body.chip, locale)}</p>
        </>
      );
    case "marker":
      return (
        <>
          <p className="fj-marker">
            <b className="fj-pin" aria-hidden="true">
              {body.pin}
            </b>
            {pick(body.place, locale)}
          </p>
          {body.note && <p className="fj-data-note">{pick(body.note, locale)}</p>}
        </>
      );
    default:
      return null;
  }
}

/* ────────────────────────────────────────────
   고른 단계의 설명
──────────────────────────────────────────── */

function IoItems({ items }: { items: IoItem[] }) {
  return (
    <ul className="fj-io-items">
      {items.map((item) => (
        <li key={item.key}>
          <Glyph icon={item.icon} size={14} />
          {item.data ? (
            <>
              <b>{item.data}</b>
              {item.place && <small>{item.place}</small>}
            </>
          ) : (
            <b>{item.place}</b>
          )}
        </li>
      ))}
    </ul>
  );
}

/** 넓게 보기에서만: 코드에 적힌 요청·응답 형식과 전달 경로 */
function PayloadDetails({ journey, locale, copy }: { journey: StepJourney | null; locale: Locale; copy: Copy }) {
  if (!journey) return null;
  const blocks = [...(journey.receives ?? []), ...(journey.produces ? [journey.produces] : [])].filter((payload) => (payload.items?.length ?? 0) > 0 || payload.code);
  const via = journey.via ?? [];
  if (blocks.length === 0 && via.length === 0) return null;
  return (
    <div className="fj-payloads">
      {blocks.map((payload) => (
        <div className="fj-payload" key={payload.label.ko}>
          <p className="fj-payload-head">
            <Glyph icon={payload.icon} size={14} />
            {pick(payload.label, locale)}
          </p>
          {payload.items && payload.items.length > 0 && (
            <dl>
              {payload.items.map((item) => (
                <div key={item.label.ko}>
                  <dt>{pick(item.label, locale)}</dt>
                  {item.value !== undefined && (
                    <dd>
                      <code>{valueText(item.value, locale)}</code>
                    </dd>
                  )}
                </div>
              ))}
            </dl>
          )}
          {payload.code && <code className="fj-payload-code">{payload.code}</code>}
        </div>
      ))}
      {via.length > 0 && (
        <div className="fj-via">
          <p>
            <Waypoints size={14} strokeWidth={1.8} aria-hidden="true" focusable="false" />
            {copy.via}
          </p>
          <ol>
            {via.map((line) => (
              <li key={line.ko}>{pick(line, locale)}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export function StepNote({ flow, index, locale, mode, id }: { flow: FlowView; index: number; locale: Locale; mode: Mode; id: string }) {
  const copy = JOURNEY_COPY[locale];
  const node = flow.nodes[index];
  if (!node) return null;
  const journey = journeyFor(flow, index);
  const method = journey?.method ?? node.tag;
  // 작은 도식은 한두 문장, 넓게 보기는 코드·기록에서 확인한 처리 설명까지
  const text = mode === "wide" && journey ? journey.process : node.detail;
  const inputs = inputsOf(flow, index, locale);
  const outputs = outputsOf(flow, index, locale);
  const codes = mode === "compact" && !node.body ? payloadCodes(journey?.produces, outputs, locale) : [];
  const title = pick(node.title, locale);
  return (
    <section id={id} className={`fj-note is-${mode}`} aria-label={copy.note(index + 1, title)}>
      <header className="fj-note-head">
        <span className="fj-note-num" aria-hidden="true">
          {index + 1}
        </span>
        <h4 className="fj-note-title">{title}</h4>
        {method && <span className="fj-note-tag">{pick(method, locale)}</span>}
      </header>
      <p className="fj-note-text">{pick(text, locale)}</p>
      {(inputs.length > 0 || outputs.length > 0) && (
        <dl className="fj-io">
          {inputs.length > 0 && (
            <div className="is-in">
              <dt>{copy.receives}</dt>
              <dd>
                <IoItems items={inputs} />
              </dd>
            </div>
          )}
          {outputs.length > 0 && (
            <div className="is-out">
              <dt>{copy.sends}</dt>
              <dd>
                <IoItems items={outputs} />
              </dd>
            </div>
          )}
        </dl>
      )}
      {node.body && (
        <div className="fj-data">
          <NodeBody body={node.body} locale={locale} />
        </div>
      )}
      {codes.length > 0 && (
        <p className="fj-codes">
          {codes.map((code) => (
            <code key={code}>{code}</code>
          ))}
        </p>
      )}
      {mode === "wide" && <PayloadDetails journey={journey} locale={locale} copy={copy} />}
      {node.tech && node.tech.length > 0 && (
        <ul className="fj-tech" aria-label={copy.tech}>
          {node.tech.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────
   도식 위의 조작: 흐름 고르기 · 재생
──────────────────────────────────────────── */

export function FlowTabs({ flows, selectedKey, onSelect, locale, idBase }: { flows: FlowView[]; selectedKey: string; onSelect: (key: string) => void; locale: Locale; idBase: string }) {
  const copy = JOURNEY_COPY[locale];
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = flows.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    onSelect(flows[next].key);
    refs.current[next]?.focus();
  };
  return (
    <div className="fj-tabs" role="tablist" aria-label={copy.flows}>
      {flows.map((flow, index) => {
        const selected = flow.key === selectedKey;
        return (
          <button
            key={flow.key}
            ref={(node) => {
              refs.current[index] = node;
            }}
            type="button"
            role="tab"
            id={`${idBase}-tab-${index}`}
            aria-selected={selected}
            aria-controls={`${idBase}-panel`}
            tabIndex={selected ? 0 : -1}
            className="fj-tab"
            onClick={() => onSelect(flow.key)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <i className={`fj-dot is-${flow.evidence}`} aria-hidden="true" />
            <span>{flow.title ? pick(flow.title, locale) : copy.defaultTitle}</span>
            <span className="fj-sr">{` · ${copy.evidence[flow.evidence]}`}</span>
          </button>
        );
      })}
    </div>
  );
}

/** 재생 ↔ 멈춤, 끝까지 본 뒤에는 다시 재생. 움직임 줄이기에서는 재생할 움직임이 없어 두지 않습니다. */
export function PlayButton({ journey, locale }: { journey: Journey; locale: Locale }) {
  if (journey.reducedMotion) return null;
  const copy = JOURNEY_COPY[locale];
  const label = journey.playing ? copy.pause : journey.done ? copy.replay : copy.play;
  const Icon = journey.playing ? Pause : journey.done ? RotateCcw : Play;
  return (
    <button type="button" className="fj-btn" onClick={journey.toggle}>
      <Icon size={14} strokeWidth={2} aria-hidden="true" focusable="false" />
      <span>{label}</span>
    </button>
  );
}

/** 도식 아래 두 줄: 흐름이 보여 주는 것, 그리고 이 흐름의 근거(기록·코드·설명용)와 한계 */
export function FlowCaption({ flow, locale }: { flow: FlowView; locale: Locale }) {
  const copy = JOURNEY_COPY[locale];
  return (
    <figcaption className="fj-cap">
      {flow.caption && <span className="fj-cap-text">{pick(flow.caption, locale)}</span>}
      <span className="fj-cap-meta">
        <i className={`fj-dot is-${flow.evidence}`} aria-hidden="true" />
        <b>{copy.evidence[flow.evidence]}</b>
        <span>{flowProvenance(flow, locale)}</span>
      </span>
    </figcaption>
  );
}

/* ────────────────────────────────────────────
   도식
──────────────────────────────────────────── */

/** 요소 너비를 따라갑니다 (레인 도식 ↔ 쌓은 목록, 설명 옆 ↔ 아래 전환용). */
function useElementWidth(ref: RefObject<HTMLElement | null>): number | null {
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth((prev) => (prev !== null && Math.abs(prev - el.clientWidth) < 1 ? prev : el.clientWidth));
    read();
    if (typeof ResizeObserver === "undefined") return;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [ref]);
  return width;
}

/** 화면에 보이는 동안만 데이터 이동을 되풀이합니다. */
function useInView(ref: RefObject<HTMLElement | null>): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => setInView(entries.some((entry) => entry.isIntersecting)), { threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return inView;
}

interface BoardProps {
  flow: FlowView;
  journey: Journey;
  locale: Locale;
  mode: Mode;
  copy: Copy;
  noteId: string;
  title: string;
  nodeRefs: RefObject<Array<HTMLButtonElement | null>>;
  onNodeKeyDown: (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => void;
}

/** 지금 데이터가 드나드는 단계 (켜진 단계를 고른 때만) */
function focusedId(flow: FlowView, journey: Journey): string | null {
  return journey.phase(journey.step) === "now" ? flow.nodes[journey.step]?.id ?? null : null;
}

function StepButton({ flow, journey, locale, mode, copy, noteId, nodeRefs, onNodeKeyDown, index, stacked = false }: BoardProps & { index: number; stacked?: boolean }) {
  const node = flow.nodes[index];
  const phase = journey.phase(index);
  const selected = index === journey.step;
  const summary = mode === "wide" && !stacked ? journeyFor(flow, index)?.summary?.[0] : undefined;
  const lane = LANES[node.lane][locale];
  return (
    <button
      ref={(el) => {
        nodeRefs.current[index] = el;
      }}
      type="button"
      data-node={node.id}
      className={`fj-node is-${phase}${stacked ? " is-row" : ""}`}
      aria-current={phase === "now" ? "step" : undefined}
      aria-describedby={selected ? noteId : undefined}
      tabIndex={selected ? 0 : -1}
      onClick={() => journey.pick(index)}
      onKeyDown={(event) => onNodeKeyDown(event, index)}
    >
      <span className="fj-num" aria-hidden="true">
        {index + 1}
      </span>
      <span className="fj-disc" aria-hidden="true">
        <Glyph icon={nodeIcon(flow, index)} size={mode === "wide" ? 17 : 15} />
      </span>
      <span className="fj-label">
        <span className="fj-sr">{copy.stepNo(index + 1)}</span>
        {nodeLabel(node, locale)}
      </span>
      {summary && <span className="fj-sum">{pick(summary, locale)}</span>}
      {stacked ? <span className="fj-slane">{lane}</span> : <span className="fj-sr">{`, ${lane}`}</span>}
    </button>
  );
}

interface Wire {
  id: string;
  from: string;
  to: string;
  d: string;
  icon: FlowIcon;
  label: { x: number; y: number; text: string; max: number } | null;
}

/** 넓은 자리: 레인(행) × 단계(열). 연결선은 상자 크기를 재어 빈 칸을 따라 그립니다. */
function LaneBoard(props: BoardProps) {
  const { flow, journey, locale, mode, copy, title } = props;
  const gridRef = useRef<HTMLDivElement>(null);
  const markerBase = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [wires, setWires] = useState<Wire[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const rows = useMemo(() => new Map(flow.lanes.map((lane, row) => [lane, row])), [flow.lanes]);
  const cells = useMemo<GridCell[]>(() => flow.nodes.map((node, col) => ({ id: node.id, row: rows.get(node.lane) ?? 0, col })), [flow.nodes, rows]);

  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const measure = () => {
      const base = grid.getBoundingClientRect();
      const box = (id: string) => {
        const el = grid.querySelector<HTMLElement>(`[data-node="${id}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { x: rect.left - base.left, y: rect.top - base.top, w: rect.width, h: rect.height };
      };
      const next: Wire[] = flow.links.flatMap((link) => {
        const a = cells.find((cell) => cell.id === link.from);
        const b = cells.find((cell) => cell.id === link.to);
        const boxA = box(link.from);
        const boxB = box(link.to);
        if (!a || !b || !boxA || !boxB) return [];
        const route = routePath(routeKind(a, b, cells), boxA, boxB);
        const text = link.label ? pick(link.label, locale) : "";
        const fits = route.label !== null && labelFits(text, route.label.room);
        return [
          {
            id: `${link.from}>${link.to}`,
            from: link.from,
            to: link.to,
            d: route.d,
            icon: linkIcon(flow, link),
            label: fits && route.label ? { x: route.label.x, y: route.label.y, text, max: labelMaxWidth(route.label.room) } : null,
          },
        ];
      });
      setWires((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
      const w = Math.round(base.width);
      const h = Math.round(base.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    // 크기 변화는 다음 프레임에 한 번만 다시 잽니다.
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    });
    observer.observe(grid);
    grid.querySelectorAll("[data-node]").forEach((el) => observer.observe(el));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [flow, cells, locale, mode]);

  const focus = focusedId(flow, journey);
  const lit = (id: string) => journey.phase(flow.nodes.findIndex((node) => node.id === id)) !== "off";
  const wireKind = (wire: Wire) => (!lit(wire.to) ? "off" : focus !== null && (wire.to === focus || wire.from === focus) ? "adj" : "lit");

  return (
    <div className="fj-board">
      <div className="fj-grid" ref={gridRef} style={{ "--fj-n": flow.nodes.length, gridTemplateRows: `repeat(${flow.lanes.length}, auto)` } as CSSProperties}>
        {flow.lanes.map((lane, row) => (
          <Fragment key={lane}>
            <div className={`fj-band${row === 0 ? " is-first" : ""}${lane === "ai" ? " is-ai" : ""}`} style={{ gridRow: row + 1 }} aria-hidden="true" />
            <div className={`fj-lane${row === 0 ? " is-first" : ""}${lane === "ai" ? " is-ai" : ""}`} style={{ gridRow: row + 1 }} title={LANES[lane][locale]} aria-hidden="true">
              <Glyph icon={LANE_ICON[lane]} size={mode === "wide" ? 16 : 14} />
              <span>{laneLabel(lane, mode, locale)}</span>
            </div>
          </Fragment>
        ))}
        <svg className="fj-wires" width={size.w} height={size.h} aria-hidden="true" focusable="false">
          <defs>
            {(["off", "lit", "adj"] as const).map((kind) => (
              <marker key={kind} id={`${markerBase}-${kind}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0L8 4L0 8Z" className={`fj-head is-${kind}`} />
              </marker>
            ))}
          </defs>
          {wires.map((wire) => {
            const kind = wireKind(wire);
            return <path key={wire.id} d={wire.d} className={`fj-wire is-${kind}`} markerEnd={`url(#${markerBase}-${kind})`} />;
          })}
        </svg>
        <ol className="fj-nodes" role="list" aria-label={copy.steps(title)}>
          {flow.nodes.map((node, index) => (
            <li key={node.id} className="fj-cell" style={{ gridRow: (rows.get(node.lane) ?? 0) + 1, gridColumn: index + 2 }}>
              <StepButton {...props} index={index} />
            </li>
          ))}
        </ol>
        {/* 고른 단계로 들어오는 데이터와 나가는 데이터 (재생 중에는 새로 켜진 단계로 들어오는 것만 한 번) */}
        {!journey.reducedMotion &&
          focus !== null &&
          wires.map((wire) => {
            const into = wire.to === focus;
            const outOf = wire.from === focus && lit(wire.to);
            if (!into && (!outOf || journey.playing)) return null;
            const kind = journey.playing ? "is-arrive" : into ? "is-in" : "is-out";
            return (
              <i key={`${wire.id}:${journey.playing ? journey.step : "loop"}`} className={`fj-packet ${kind}`} style={{ offsetPath: `path("${wire.d}")` } as CSSProperties} aria-hidden="true">
                <Glyph icon={wire.icon} size={11} />
              </i>
            );
          })}
        {wires.map(
          (wire) =>
            wire.label && (
              <span key={`label:${wire.id}`} className={`fj-wlabel is-${wireKind(wire)}`} style={{ left: wire.label.x, top: wire.label.y, maxWidth: wire.label.max }} aria-hidden="true">
                {wire.label.text}
              </span>
            ),
        )}
      </div>
    </div>
  );
}

/** 좁은 자리: 같은 단계를 위에서 아래로 쌓고, 고른 단계 밑에 설명을 둡니다. */
function StackList(props: BoardProps) {
  const { flow, journey, locale, mode, copy, noteId, title } = props;
  const focus = focusedId(flow, journey);
  return (
    <ol className="fj-stack" role="list" aria-label={copy.steps(title)}>
      {flow.nodes.map((node, index) => {
        const phase = journey.phase(index);
        const incoming = incomingLinks(flow, node.id);
        const labels = incoming.flatMap((link) => (link.label ? [pick(link.label, locale)] : []));
        const into = node.id === focus;
        const outOf = index > 0 && flow.nodes[index - 1].id === focus && phase !== "off";
        const dot = journey.reducedMotion || (!into && (!outOf || journey.playing)) ? null : journey.playing ? "is-arrive" : into ? "is-in" : "is-out";
        return (
          <li key={node.id} className={`fj-sitem is-${phase}`}>
            {index > 0 && (
              <div className={`fj-sconn${phase !== "off" ? " is-lit" : ""}${into || outOf ? " is-adj" : ""}`} aria-hidden="true">
                <span className="fj-sline">{dot && <i key={`${dot}:${journey.step}`} className={`fj-sdot ${dot}`} />}</span>
                {labels.length > 0 && (
                  <span className="fj-sdata">
                    <Glyph icon={linkIcon(flow, incoming[0])} size={13} />
                    {labels.join(" · ")}
                  </span>
                )}
              </div>
            )}
            <StepButton {...props} index={index} stacked />
            {index === journey.step && <StepNote key={`${flow.key}:${index}`} flow={flow} index={index} locale={locale} mode={mode} id={noteId} />}
          </li>
        );
      })}
    </ol>
  );
}

export interface FlowStageProps {
  flow: FlowView;
  journey: Journey;
  locale: Locale;
  mode: Mode;
  /** 도식 이름 (단계 목록의 이름에 씀) */
  title: string;
  /** 넓게 보기가 열려 있는 동안 뒤에 가려진 작은 도식은 데이터 이동을 멈춥니다 */
  dormant?: boolean;
}

/** 도식 + 고른 단계 설명 — 너비에 따라 레인 도식(설명은 옆 또는 아래) 또는 쌓은 목록 */
export function FlowStage({ flow, journey, locale, mode, title, dormant = false }: FlowStageProps) {
  const copy = JOURNEY_COPY[locale];
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const noteId = `${uid}-note`;
  const stageRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(stageRef);
  const inView = useInView(stageRef);
  const { layout, note } = stageLayout(width, flow.nodes.length, mode);
  const metrics = STAGE_METRICS[mode];
  const nodeRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const pendingFocus = useRef<number | null>(null);
  const count = flow.nodes.length;

  // 레인 도식 ↔ 쌓은 목록이 바뀌면 단계 단추가 새로 그려지므로, 그 안에 있던 초점을 고른 단계로 옮겨 둡니다.
  // (바뀌기 직전의 화면에서 초점이 도식 안에 있었는지를 그리는 동안 확인해 둡니다.)
  const focusWasInside = useRef(false);
  if (typeof document !== "undefined") focusWasInside.current = !!stageRef.current?.contains(document.activeElement);
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (focusWasInside.current && stage && !stage.contains(document.activeElement)) nodeRefs.current[journey.step]?.focus();
  }, [layout]);

  // 키보드로 단계를 옮기면 그 단계 단추로 초점을 옮깁니다.
  useEffect(() => {
    const index = pendingFocus.current;
    if (index === null) return;
    pendingFocus.current = null;
    nodeRefs.current[index]?.focus();
  }, [journey.step]);

  const onNodeKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = Math.min(count - 1, index + 1);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = Math.max(0, index - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = count - 1;
    if (next === null) return;
    event.preventDefault();
    // 고른 단계가 바뀌면 다시 그린 뒤에, 그대로면(재생 중 지금 단계를 고른 경우 등) 바로 초점을 옮깁니다.
    if (next === journey.step) nodeRefs.current[next]?.focus();
    else pendingFocus.current = next;
    journey.pick(next);
  };

  const live = inView && !dormant && !journey.reducedMotion && !journey.playing;
  const props: BoardProps = { flow, journey, locale, mode, copy, noteId, title, nodeRefs, onNodeKeyDown };
  const style = {
    "--fj-head": `${metrics.head}px`,
    "--fj-gap": `${metrics.gap}px`,
    ...(note !== null ? { gridTemplateColumns: `minmax(0, 1fr) ${note}px` } : {}),
  } as CSSProperties;
  return (
    <div
      ref={stageRef}
      className={`fj-stage is-${mode} is-${layout}${note !== null ? " is-beside" : ""}${live ? " is-live" : ""}${dormant ? " is-dormant" : ""}`}
      style={style}
    >
      {layout === "lanes" ? (
        <>
          <LaneBoard {...props} />
          <StepNote key={`${flow.key}:${journey.step}`} flow={flow} index={journey.step} locale={locale} mode={mode} id={noteId} />
        </>
      ) : (
        <StackList {...props} />
      )}
    </div>
  );
}
