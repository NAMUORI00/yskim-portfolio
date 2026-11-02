import { OfficialResume } from "./OfficialResume";
import {
  officialTemplatePath,
  introductionBreak,
  type OfficialDetails,
} from "./officialForm";
import { technicalSkills, projectDiagram } from "./presentation";
import React from "react";
import {
  Document,
  Page,
  Text as PdfText,
  type TextProps,
  View,
  Link as PdfLink,
  Font,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type {
  EducationEntry,
  PortfolioContent,
  ProjectEntry,
} from "@/content/types";
import { PROJECT_INSIGHTS } from "@/components/capabilities/projectInsights";
import {
  documentNames,
  selectedItems,
  projectBlocks,
  type Selection,
  type Detail,
  type DocumentKind,
} from "./model";

// Apply submission typography to source-backed text without editing site records.
function submissionText(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, child =>
    typeof child === "string" ? child.replace(/\s*[·ㆍ‧․]\s*/g, ", ") : child
  );
}
function Text({ children, ...props }: React.PropsWithChildren<TextProps>) {
  return <PdfText {...props}>{submissionText(children)}</PdfText>;
}
function Link({ children, ...props }: React.ComponentProps<typeof PdfLink>) {
  return <PdfLink {...props}>{submissionText(children)}</PdfLink>;
}

export function registerSubmissionFonts(base = "") {
  Font.register({
    family: "Submission",
    fonts: [
      { src: `${base}/fonts/NanumGothic-Regular.ttf`, fontWeight: 400 },
      { src: `${base}/fonts/NanumGothic-Bold.ttf`, fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback(word =>
    word.length > 40 ? (word.match(/.{1,30}/g) ?? [word]) : [word]
  );
}
const s = StyleSheet.create({
  page: {
    fontFamily: "Submission",
    fontSize: 9.5,
    lineHeight: 1.4,
    paddingTop: 38,
    paddingHorizontal: 40,
    paddingBottom: 48,
    color: "#222222",
  },
  title: {
    fontSize: 23,
    fontWeight: 700,
    textAlign: "center",
    marginBottom: 16,
    letterSpacing: 3,
  },
  projectTitle: {
    fontSize: 18,
    fontWeight: 700,
    lineHeight: 1.45,
    marginBottom: 14,
  },
  section: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 6,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#444444",
  },
  sub: { fontSize: 10, fontWeight: 700, marginTop: 7, marginBottom: 5 },
  p: { marginBottom: 6 },
  table: {
    borderTopWidth: 0.6,
    borderLeftWidth: 0.6,
    borderColor: "#999999",
    marginBottom: 4,
  },
  row: { flexDirection: "row" },
  cell: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRightWidth: 0.6,
    borderBottomWidth: 0.6,
    borderColor: "#999999",
    fontSize: 9,
  },
  label: { backgroundColor: "#f1f1f1", fontWeight: 700 },
  link: { color: "#333333", fontSize: 8.5 },
  footer: {
    position: "absolute",
    bottom: 25,
    left: 40,
    fontSize: 8,
    color: "#666666",
  },
});
function Section({ children }: { children: React.ReactNode }) {
  return (
    <Text style={s.section} minPresenceAhead={95}>
      {children}
    </Text>
  );
}
function Row({
  cells,
  widths,
  heading = false,
}: {
  cells: string[];
  widths: number[];
  heading?: boolean;
}) {
  return (
    <View style={s.row} wrap={false}>
      {cells.map((cell, i) => (
        <Text
          key={i}
          style={[
            s.cell,
            { width: `${widths[i]}%` },
            ...(heading ? [s.label] : []),
          ]}
        >
          {cell}
        </Text>
      ))}
    </View>
  );
}
function Fields({
  rows,
  links = {},
}: {
  rows: [string, string][];
  links?: Record<string, string>;
}) {
  return (
    <View style={s.table}>
      {rows.map(([label, value], i) => (
        <View key={i} style={s.row} wrap={false}>
          <Text style={[s.cell, s.label, { width: "18%" }]}>{label}</Text>
          <View style={[s.cell, { width: "82%" }]}>
            {links[label] ? (
              <Link src={links[label]} style={s.link}>
                {value}
              </Link>
            ) : (
              <Text>{value}</Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}
function RecordTable({
  title,
  entries,
}: {
  title: string;
  entries: EducationEntry[];
}) {
  if (!entries.length) return null;
  return (
    <View wrap={false}>
      <Section>{title}</Section>
      <View style={s.table}>
        <Row heading cells={["기간", "기관", "내용"]} widths={[24, 33, 43]} />
        {entries.map((e, i) => (
          <Row
            key={i}
            cells={[e.period, e.school, e.degree]}
            widths={[24, 33, 43]}
          />
        ))}
      </View>
    </View>
  );
}
function projectSections(p: ProjectEntry, detail: Detail) {
  return projectBlocks(p, detail).filter(
    b => b.text !== p.desc && b.heading !== "사용 기술"
  );
}
function headingName(heading: string) {
  if (/역할/.test(heading)) return "담당 업무";
  if (/구현한 기능/.test(heading)) return "주요 수행 내용";
  if (/결과|실험|성과/.test(heading)) return "성과 및 검증";
  return heading;
}
function ProjectBody({
  project,
  detail,
}: {
  project: ProjectEntry;
  detail: Detail;
}) {
  return (
    <>
      {projectSections(project, detail).map((b, i, blocks) => (
        <React.Fragment key={i}>
          {b.heading && b.heading !== blocks[i - 1]?.heading && (
            <Text style={s.sub} minPresenceAhead={35}>
              {headingName(b.heading)}
            </Text>
          )}
          <Text style={s.p} orphans={2} widows={2}>
            {b.text.replace(/^성과:\s*/, "")}
          </Text>
        </React.Fragment>
      ))}
    </>
  );
}
export interface SubmissionProps {
  content: PortfolioContent;
  selection: Selection;
  kind: DocumentKind;
  detail: Detail;
  introduction: string;
  officialDetails?: OfficialDetails;
}
function CoreDiagram({ project }: { project: ProjectEntry }) {
  const diagram = projectDiagram(project);
  if (!diagram.nodes.length) return null;
  return (
    <View wrap={false} style={{ marginTop: 12, marginBottom: 16 }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {diagram.nodes.map((node, i) => (
          <React.Fragment key={node}>
            {i > 0 && (
              <Text
                style={{ width: 24, textAlign: "center", color: "#777777" }}
              >
                {diagram.sequence ? "→" : ""}
              </Text>
            )}
            <View
              style={{
                flex: 1,
                minHeight: 43,
                justifyContent: "center",
                borderWidth: 0.7,
                borderColor: "#a7b1b8",
                backgroundColor: "#f4f6f7",
                padding: 8,
              }}
            >
              <Text
                style={{ fontSize: 10, fontWeight: 700, textAlign: "center" }}
              >
                {node}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}
export function SubmissionDocument({
  content,
  selection,
  detail,
  introduction,
  officialDetails,
}: SubmissionProps) {
  const { projects, records } = selectedItems(content, selection);
  const { profile } = content;
  const careers = records.filter(
    e => e.type === "work" || e.type === "research"
  );
  const skills = technicalSkills(projects, records);
  const footer = () => (
    <Text fixed style={s.footer}>
      {profile.name}
    </Text>
  );
  return (
    <Document
      title={`${profile.name} 이력서 및 포트폴리오`}
      author={profile.name}
      language="ko-KR"
    >
      <OfficialResume
        content={content}
        careers={careers}
        introduction={introduction}
        details={officialDetails}
      />
      {introduction.length > 180 && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>자기소개 (계속)</Text>
          <Text style={s.p}>
            {introduction.slice(introductionBreak(introduction))}
          </Text>
          {footer()}
        </Page>
      )}
      {careers.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>경력기술서</Text>
          {careers.map((e, i) => (
            <View key={i} style={{ marginBottom: 8 }}>
              <Text style={s.sub} minPresenceAhead={80}>
                {e.school}
              </Text>
              <Fields
                rows={[
                  [
                    e.type === "research" ? "참여 정보" : "근무 정보",
                    `${e.period} · ${e.degree}`,
                  ],
                ]}
              />
              {e.note && <Text style={s.p}>{e.note}</Text>}
              {(detail === "summary" ? e.bullets.slice(0, 2) : e.bullets).map(
                (b, j) => (
                  <Text style={s.p} key={j}>
                    • {b}
                  </Text>
                )
              )}
              {e.links.map(l => (
                <Link src={l.href} key={l.href} style={s.link}>
                  {l.label}
                </Link>
              ))}
            </View>
          ))}
          {footer()}
        </Page>
      )}
      {(skills.length > 0 ||
        records.some(e => !["work", "research"].includes(e.type))) && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>학력 및 연구활동</Text>
          {skills.length > 0 && (
            <>
              <Section>보유기술</Section>
              <Fields rows={skills.map(g => [g.label, g.items.join(", ")])} />
            </>
          )}
          <RecordTable
            title="학력사항"
            entries={records.filter(e => e.type === "education")}
          />
          <RecordTable
            title="논문 및 학술활동"
            entries={records.filter(
              e => e.type === "publication" || e.type === "talk"
            )}
          />
          <RecordTable
            title="수상 및 기타 활동"
            entries={records.filter(
              e =>
                ![
                  "education",
                  "work",
                  "research",
                  "publication",
                  "talk",
                ].includes(e.type)
            )}
          />
          {footer()}
        </Page>
      )}
      {projects.map(p => (
        <Page
          key={p.slug}
          size="A4"
          style={[s.page, { fontSize: 10.5, lineHeight: 1.6 }]}
        >
          <Text style={s.projectTitle}>{p.name}</Text>
          <Fields
            rows={[
              ["수행 기간", p.period],
              ["사용 기술", p.tags.join(", ")],
            ]}
          />
          <Section>프로젝트 개요</Section>
          <Text style={s.p}>{p.desc}</Text>
          <CoreDiagram project={p} />
          <ProjectBody project={p} detail={detail} />
          {detail === "detailed" &&
            PROJECT_INSIGHTS[p.slug]?.modules.map((m, i) => (
              <View key={i} wrap={false}>
                <Text style={s.sub}>{m.name.ko}</Text>
                <Text style={s.p}>{m.role.ko}</Text>
              </View>
            ))}
          <View wrap={false} style={{ marginTop: 14 }}>
            {p.link && (
              <Link
                src={p.link}
                style={[s.link, { fontSize: 8, color: "#666666" }]}
              >
                GitHub
              </Link>
            )}
          </View>
          {footer()}
        </Page>
      ))}
    </Document>
  );
}
export async function generateSubmission(props: SubmissionProps) {
  registerSubmissionFonts(window.location.origin);
  const raw = await pdf(<SubmissionDocument {...props} />).toBlob();
  const response = await fetch(officialTemplatePath);
  if (!response.ok)
    throw new Error("Official resume template could not be loaded");
  return numberPages(
    await raw.arrayBuffer(),
    new Uint8Array(await response.arrayBuffer())
  );
}
export async function numberPages(
  bytes: ArrayBuffer | Uint8Array,
  template: Uint8Array
) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const rendered = await PDFDocument.load(bytes);
  const source = await PDFDocument.load(template);
  if (source.getPageCount() !== 1)
    throw new Error("Expected the one-page official resume form");
  const doc = await PDFDocument.create();
  const [form] = await doc.copyPages(source, [0]);
  doc.addPage(form);
  const overlay = await doc.embedPage(rendered.getPage(0));
  form.drawPage(overlay, { x: 0, y: 0, width: 595, height: 841 });
  const rest = await doc.copyPages(
    rendered,
    rendered.getPageIndices().slice(1)
  );
  rest.forEach(page => doc.addPage(page));
  doc.setTitle(rendered.getTitle() ?? "이력서 및 포트폴리오");
  doc.setAuthor(rendered.getAuthor() ?? "");
  doc.setLanguage("ko-KR");
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, index) =>
    page.drawText(`${index + 1} / ${doc.getPageCount()}`, {
      x: 515,
      y: 25,
      size: 8,
      font,
      color: rgb(0.4, 0.4, 0.4),
    })
  );
  return new Blob([(await doc.save()) as BlobPart], {
    type: "application/pdf",
  });
}
