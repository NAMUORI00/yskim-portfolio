/* 3D 지식 지도의 화면 문구 (한국어·영어) — 파일 경로나 내부 용어는 쓰지 않습니다. */
import type { Locale } from "@/lib/i18nContent";
import type { DetailGutterKey, DetailTierKey } from "./graph3dDetailLayout";
import type { GraphCounts, KDomain, KEvidence, KNode, NodeKind, Relation } from "./graph3dModel";

export interface Graph3DCopy {
  kicker: string;
  railLabel: string;
  subtitle: string;
  /** 가운데 이름 아래의 작은 글 */
  coreCaption: string;
  globeLabel: (name: string, counts: GraphCounts) => string;
  hint: string;
  explorerHint: string;
  overviewTitle: string;
  overview: (counts: GraphCounts) => string;
  overviewFields: string;
  encoding: string;
  /** 가운데 → 분야 선의 뜻 */
  spokesNote: string;
  legend: Record<NodeKind | "open", string>;
  expand: string;
  expandLabel: string;
  openMap: string;
  unpin: string;
  /** 설명 칸 위의 지금 보는 방식 */
  modePreview: string;
  modePinned: string;
  modeOpen: string;
  previewHint: string;
  openField: (field: string) => string;
  openFieldHint: string;
  openedHint: string;
  evidenceHint: string;
  /** 지도 움직임 켬/끔 */
  motion: string;
  motionOn: string;
  motionOff: string;
  motionReduced: string;
  motionHelp: string;
  motionReducedHelp: string;
  kinds: Record<NodeKind, string>;
  statuses: { built: string; studied: string; interest: string; listed: string };
  statusHelp: { built: string; studied: string; interest: string; listed: string };
  what: string;
  did: string;
  evidence: string;
  quote: string;
  relations: string;
  relation: Record<Relation, { out: string; in: string }>;
  /** 층 그림의 선 위에 붙이는 관계 이름 */
  relationShort: Record<Relation | "claim", string>;
  twoStep: string;
  shared: (names: string) => string;
  field: string;
  fieldNote: string;
  fieldMembers: (counts: Record<NodeKind, number>) => string;
  fieldOpen: (count: number) => string;
  crossFields: string;
  linkCount: (count: number) => string;
  evidenceFocus: string;
  evidenceInField: (field: string) => string;
  evidenceElsewhere: string;
  evidenceKinds: Record<"project" | "research" | "paper" | "work" | "code" | "record" | "site" | "stack", string>;
  openEvidence: string;
  noLinks: string;
  nodeName: (node: KNode, domain: KDomain, links: number) => string;
  domainName: (domain: KDomain) => string;
  domainOpenName: (domain: KDomain) => string;
  pinAnnounce: (title: string) => string;
  unpinAnnounce: string;
  openAnnounce: (field: string) => string;
  backAnnounce: string;
  /** 펼친 분야 — 층 그림 */
  back: string;
  backLabel: string;
  detailLabel: (domain: KDomain) => string;
  tiers: Record<DetailTierKey, string>;
  gutters: Record<DetailGutterKey, string>;
  tierCount: (tier: DetailTierKey, main: number, open: number) => string;
  layerNote: string;
  detailLegend: { relation: string; background: string; evidence: string; open: string };
  crossNote: (count: number) => string;
  evidenceName: (item: KEvidence, supported: number) => string;
  explorerTitle: string;
  explorerDesc: string;
  close: string;
  views: { space: string; list: string };
  viewGroup: string;
  rotateLeft: string;
  rotateRight: string;
  zoomIn: string;
  zoomOut: string;
  resetView: string;
  emptyMap: string;
  outlineOpen: string;
}

const KO: Graph3DCopy = {
  kicker: "Knowledge Map · 3D",
  railLabel: "3D 지식 지도",
  subtitle: "나를 가운데 두고 다뤄 본 기술·개념·방법을 분야별로 모은 지도",
  coreCaption: "나의 지식",
  globeLabel: (name, counts) => `${name}의 지식 지도: 가운데에 ${name}, 둘레에 분야 ${counts.domains}곳과 근거가 있는 지식 ${counts.evidenced}개. 분야를 고르면 펼칩니다`,
  hint: "Tab으로 들어가 화살표로 화면에서 가까운 분야로 옮깁니다. 가리키거나 초점을 옮기면 미리 보고, Enter나 누르기로 그 분야를 종류별 층으로 펼칩니다. 끌거나 Shift+화살표로 구를 돌립니다. 펼친 뒤에는 화살표로 지식을 옮기고 Enter로 고정하며, Esc는 고정을 풀고 한 번 더 누르면 전체 보기로 돌아갑니다. 지도와 설명 칸을 떠나 몇 초가 지나면 전체 보기로 돌아갑니다.",
  explorerHint: "끌어서 돌리기 · 휠·두 손가락으로 확대 · Shift+끌기로 옮기기",
  overviewTitle: "나의 지식",
  overview: () => "",
  overviewFields: "분야",
  encoding: "점 모양은 종류만 나타냅니다. 크기와 연결 수는 숙련도를 뜻하지 않습니다.",
  spokesNote: "가운데에서 분야로 가는 선은 지식을 분야로 정리했다는 뜻일 뿐, 숙련도나 성과를 뜻하지 않습니다.",
  legend: { concept: "개념", method: "구현한 방법", tech: "기술·도구", open: "관심·스택 목록" },
  expand: "넓게 보기",
  expandLabel: "3D 지식 지도 넓게 보기",
  openMap: "3D 지식 지도 열기",
  unpin: "고정 풀기",
  modePreview: "미리 보기",
  modePinned: "고정됨",
  modeOpen: "펼친 분야",
  previewHint: "누르거나 Enter로 고정",
  openField: (field) => `${field} 펼치기`,
  openFieldHint: "누르거나 Enter로 펼치기",
  openedHint: "Esc · 전체 보기",
  evidenceHint: "홈 목록에서 가리킨 작업",
  motion: "움직임",
  motionOn: "켬",
  motionOff: "끔",
  motionReduced: "끔 · 기기 설정",
  motionHelp: "지도의 자동 움직임과 마우스 반응을 켜거나 끕니다.",
  motionReducedHelp: "기기에서 움직임 줄이기를 켜 두어 움직임이 꺼져 있습니다. 보기 전환은 움직임 없이 바로 바뀌고, 고르기 표시는 그대로입니다.",
  kinds: { concept: "개념", method: "구현한 방법", tech: "기술·도구" },
  statuses: { built: "구현", studied: "연구·실험", interest: "관심", listed: "스택 목록" },
  statusHelp: {
    built: "직접 구현했거나 구현에 참여한 작업에 근거가 있습니다.",
    studied: "실험·비교·논문으로 다룬 근거가 있습니다.",
    interest: "더 살펴보고 싶다고 적은 주제입니다. 아직 작업 기록은 없습니다.",
    listed: "기술 스택에 적혀 있지만 연결된 작업 기록은 아직 없습니다.",
  },
  what: "무엇인가요",
  did: "직접 한 일",
  evidence: "근거",
  quote: "원문",
  relations: "이어진 지식",
  relation: {
    uses: { out: "쓴 기술", in: "이 기술을 쓴 곳" },
    implements: { out: "구현한 개념", in: "구현한 방법" },
    applies: { out: "적용한 곳", in: "적용한 지식" },
    supports: { out: "뒷받침하는 것", in: "뒷받침하는 요소" },
    prerequisite: { out: "이어지는 지식", in: "바탕 지식" },
  },
  relationShort: { uses: "사용", implements: "구현", applies: "적용", supports: "뒷받침", prerequisite: "바탕", claim: "근거" },
  twoStep: "한 걸음 더",
  shared: (names) => `거쳐 가는 지식: ${names}`,
  field: "분야",
  fieldNote: "분야는 읽기 쉽게 묶은 이름이며 따로 쌓은 성과가 아닙니다.",
  fieldMembers: (counts) => `기술 ${counts.tech} · 개념 ${counts.concept} · 구현한 방법 ${counts.method}`,
  fieldOpen: (count) => `관심·스택 목록 ${count}`,
  crossFields: "다른 분야와 이어진 연결",
  linkCount: (count) => `연결 ${count}`,
  evidenceFocus: "이 작업이 근거가 된 지식",
  evidenceInField: (field) => `${field}에서 이 근거가 뒷받침하는 지식`,
  evidenceElsewhere: "다른 분야",
  evidenceKinds: { project: "프로젝트", research: "연구 분야", paper: "논문", work: "경력", code: "코드 확인", record: "화면 기록", site: "이 사이트", stack: "기술 스택" },
  openEvidence: "자세히 보기",
  noLinks: "아직 다른 지식과 이은 근거가 없습니다.",
  nodeName: (node, domain, links) => {
    const status = node.status === "interest" ? "관심 주제, 작업 기록 없음" : node.status === "listed" ? "스택 목록, 작업 기록 없음" : [node.built && "구현", node.studied && "연구·실험"].filter(Boolean).join("·");
    return `${node.title} — ${domain.label}, ${KO.kinds[node.kind]}, ${status}, 연결 ${links}개`;
  },
  domainName: (domain) => `${domain.title} — 분야, 근거가 있는 지식 ${domain.evidenced}개`,
  domainOpenName: (domain) => `${domain.title} — 분야, 근거가 있는 지식 ${domain.evidenced}개. 펼치기`,
  pinAnnounce: (title) => `${title} 고정됨`,
  unpinAnnounce: "고정 해제됨",
  openAnnounce: (field) => `${field} 펼침 — 개념, 구현한 방법, 기술, 근거 층`,
  backAnnounce: "전체 보기",
  back: "전체 보기",
  backLabel: "전체 보기로 돌아가기",
  detailLabel: (domain) => `${domain.title} — 종류별 층으로 펼친 분야`,
  tiers: { concept: "개념", method: "구현한 방법", tech: "기술·도구", evidence: "근거 · 기록된 곳" },
  gutters: { interest: "관심", listed: "스택 목록", paper: "논문", project: "프로젝트", research: "연구 글", work: "경력", trace: "코드·기록", stack: "스택 목록" },
  tierCount: (tier, main, open) => (tier === "evidence" ? `${main + open}` : open ? `${main} · 작업 기록 없음 ${open}` : `${main}`),
  layerNote: "층은 지식의 종류로 나눈 것일 뿐 위아래가 의존이나 포함을 뜻하지 않습니다. 선은 기록된 관계만 잇고, 지식을 고르면 관계 이름과 근거로 이어진 선이 보입니다.",
  detailLegend: { relation: "기록된 관계", background: "바탕(설명용)", evidence: "근거", open: "관심·스택 목록 — 작업 기록 없음" },
  crossNote: (count) => `다른 분야와 이어진 연결 ${count}개는 지식을 고르면 설명 칸에 나옵니다.`,
  evidenceName: (item, supported) => `${item.title} — 근거, ${KO.evidenceKinds[item.kind]}${item.status ? `, ${item.status}` : ""}. 이 분야 지식 ${supported}개의 근거`,
  explorerTitle: "나의 지식 지도 — 분야를 펼쳐 보기",
  explorerDesc: "분야를 선택하면 관련 기술과 연구·개발 경험을 살펴볼 수 있습니다.",
  close: "닫기",
  views: { space: "공간", list: "목록" },
  viewGroup: "보기 방식",
  rotateLeft: "왼쪽으로 돌리기",
  rotateRight: "오른쪽으로 돌리기",
  zoomIn: "확대",
  zoomOut: "축소",
  resetView: "처음 시점",
  emptyMap: "지도에 놓을 지식이 아직 없습니다.",
  outlineOpen: "관심·스택 목록 (작업 기록 없음)",
};

const EN: Graph3DCopy = {
  kicker: "Knowledge Map · 3D",
  railLabel: "3D knowledge map",
  subtitle: "Technologies, concepts and methods I have worked with, by field, with me at the centre",
  coreCaption: "My knowledge",
  globeLabel: (name, counts) =>
    `Knowledge map of ${name}: ${name} at the centre, ${counts.domains} fields and ${counts.evidenced} items with evidence around. Choose a field to open it`,
  hint: "Tab in, then use the arrows to move to the nearest field on screen. Pointing at a field or moving focus to it previews it; Enter or a click opens it into layers by kind. Drag or use Shift+arrows to turn the globe. Inside a field, use the arrows to move between items and Enter to pin one; Esc unpins, and pressing it again returns to the whole view. A few seconds after you leave the map and its panel, it returns to the whole view.",
  explorerHint: "Drag to rotate · wheel or pinch to zoom · Shift+drag to pan",
  overviewTitle: "My knowledge",
  overview: () => "",
  overviewFields: "Fields",
  encoding: "Dot shape shows only the kind of item. Size and link count are not a measure of skill.",
  spokesNote: "Lines from the centre to each field only show how the knowledge is organised — not skill level or achievements.",
  legend: { concept: "Concept", method: "Method I built", tech: "Technology", open: "Interest / stack only" },
  expand: "Wide view",
  expandLabel: "Open the 3D knowledge map in a wide view",
  openMap: "Open the 3D knowledge map",
  unpin: "Unpin",
  modePreview: "Preview",
  modePinned: "Pinned",
  modeOpen: "Opened field",
  previewHint: "Click or press Enter to pin",
  openField: (field) => `Open ${field}`,
  openFieldHint: "Click or press Enter to open",
  openedHint: "Esc · whole view",
  evidenceHint: "Hovered in the home list",
  motion: "Motion",
  motionOn: "on",
  motionOff: "off",
  motionReduced: "off · device setting",
  motionHelp: "Turn automatic motion and pointer response on or off.",
  motionReducedHelp: "Motion is off because your device asks for reduced motion. Views switch instantly and selection cues stay the same.",
  kinds: { concept: "Concept", method: "Method I built", tech: "Technology" },
  statuses: { built: "Built", studied: "Studied", interest: "Interest", listed: "Stack only" },
  statusHelp: {
    built: "Backed by implementation work I did or took part in.",
    studied: "Backed by experiments, comparisons or papers.",
    interest: "A topic I noted to explore next; no work yet.",
    listed: "Listed in my technology stack; no linked work yet.",
  },
  what: "What it is",
  did: "What I did",
  evidence: "Evidence",
  quote: "Source text",
  relations: "Connected knowledge",
  relation: {
    uses: { out: "Uses", in: "Used by" },
    implements: { out: "Implements", in: "Implemented by" },
    applies: { out: "Applied to", in: "Draws on" },
    supports: { out: "Supports", in: "Supported by" },
    prerequisite: { out: "Leads to", in: "Builds on" },
  },
  relationShort: { uses: "uses", implements: "implements", applies: "applied to", supports: "supports", prerequisite: "background", claim: "evidence" },
  twoStep: "One step further",
  shared: (names) => `Through: ${names}`,
  field: "Field",
  fieldNote: "Fields are reading groups, not separate achievements.",
  fieldMembers: (counts) => `${counts.tech} technologies · ${counts.concept} concepts · ${counts.method} methods`,
  fieldOpen: (count) => `${count} interest / stack-only`,
  crossFields: "Links to other fields",
  linkCount: (count) => `${count} ${count === 1 ? "link" : "links"}`,
  evidenceFocus: "Knowledge this work is evidence for",
  evidenceInField: (field) => `Knowledge in ${field} this evidence supports`,
  evidenceElsewhere: "Other fields",
  evidenceKinds: { project: "Project", research: "Research note", paper: "Paper", work: "Job", code: "Read in code", record: "Screen record", site: "This site", stack: "Stack list" },
  openEvidence: "Details",
  noLinks: "No evidence links it to other items yet.",
  nodeName: (node, domain, links) => {
    const status =
      node.status === "interest"
        ? "interest topic, no work yet"
        : node.status === "listed"
          ? "stack only, no work yet"
          : [node.built && "built", node.studied && "studied"].filter(Boolean).join(" and ");
    return `${node.title} — ${domain.label}, ${EN.kinds[node.kind].toLowerCase()}, ${status}, ${links} ${links === 1 ? "link" : "links"}`;
  },
  domainName: (domain) => `${domain.title} — field, ${domain.evidenced} items with evidence`,
  domainOpenName: (domain) => `${domain.title} — field, ${domain.evidenced} items with evidence. Open`,
  pinAnnounce: (title) => `${title} pinned`,
  unpinAnnounce: "Unpinned",
  openAnnounce: (field) => `${field} opened — concept, method, technology and evidence layers`,
  backAnnounce: "Whole view",
  back: "Whole view",
  backLabel: "Back to the whole view",
  detailLabel: (domain) => `${domain.title} — field opened into layers by kind`,
  tiers: { concept: "Concepts", method: "Methods I built", tech: "Technologies", evidence: "Evidence · where it is documented" },
  gutters: { interest: "Interest", listed: "Stack only", paper: "Papers", project: "Projects", research: "Notes", work: "Roles", trace: "Code · records", stack: "Stack list" },
  tierCount: (tier, main, open) => (tier === "evidence" ? `${main + open}` : open ? `${main} · ${open} without work` : `${main}`),
  layerNote: "Layers only group items by kind; up and down is not a dependency or a hierarchy. Lines join documented relations only — choose an item to see each relation's name and its evidence lines.",
  detailLegend: { relation: "documented relation", background: "background (explanatory)", evidence: "evidence", open: "interest / stack only — no work yet" },
  crossNote: (count) => `${count} ${count === 1 ? "link" : "links"} to other fields appear in the panel when you choose an item.`,
  evidenceName: (item, supported) => `${item.title} — evidence, ${EN.evidenceKinds[item.kind].toLowerCase()}${item.status ? `, ${item.status}` : ""}. Evidence for ${supported} ${supported === 1 ? "item" : "items"} in this field`,
  explorerTitle: "My knowledge map — open a field",
  explorerDesc:
    "Choose a field to explore its technologies and my research and development experience.",
  close: "Close",
  views: { space: "Space", list: "List" },
  viewGroup: "View",
  rotateLeft: "Rotate left",
  rotateRight: "Rotate right",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  resetView: "Reset view",
  emptyMap: "There is no knowledge to place yet.",
  outlineOpen: "Interest / stack only (no work yet)",
};

export function graph3dCopy(locale: Locale): Graph3DCopy {
  return locale === "en" ? EN : KO;
}
