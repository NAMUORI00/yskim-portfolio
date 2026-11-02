import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  Link,
  Font,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";
import type { PortfolioContent } from "@/content/types";
import { PROJECT_INSIGHTS } from "@/components/capabilities/projectInsights";
import {
  documentNames,
  selectedItems,
  typeNames,
  projectBlocks,
  type Selection,
  type Detail,
  type DocumentKind,
} from "./model";

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
    fontSize: 10,
    lineHeight: 1.4,
    paddingTop: 36,
    paddingHorizontal: 44,
    paddingBottom: 48,
    color: "#202a25",
  },
  eyebrow: { fontSize: 9, color: "#2d6a4f", marginBottom: 10 },
  title: { fontSize: 25, fontWeight: 700, lineHeight: 1.35, marginBottom: 10 },
  subtitle: { fontSize: 12, marginBottom: 8 },
  h2: {
    fontSize: 15,
    fontWeight: 700,
    color: "#24563f",
    marginTop: 10,
    marginBottom: 6,
  },
  h3: { fontSize: 11, fontWeight: 700, marginTop: 8, marginBottom: 4 },
  p: { marginBottom: 7 },
  meta: { fontSize: 9, color: "#59665f", marginBottom: 6 },
  rule: {
    borderBottomWidth: 1,
    borderBottomColor: "#adc2b4",
    paddingBottom: 8,
    marginBottom: 8,
  },
  row: {
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: "#dbe3dd",
  },
  link: { fontSize: 9, color: "#2d6a4f", marginBottom: 5 },
  footer: {
    position: "absolute",
    top: 805,
    left: 44,
    width: 500,
    height: 16,
    fontSize: 8,
    color: "#65736b",
  },
  module: {
    backgroundColor: "#f0f5f1",
    padding: 8,
    marginBottom: 5,
    borderLeftWidth: 2,
    borderLeftColor: "#2d6a4f",
  },
});
export interface SubmissionProps {
  content: PortfolioContent;
  selection: Selection;
  kind: DocumentKind;
  detail: Detail;
  introduction: string;
}
export function SubmissionDocument({
  content,
  selection,
  kind,
  detail,
  introduction,
}: SubmissionProps) {
  const { projects, records } = selectedItems(content, selection);
  const { profile } = content;
  const detailedRecords = records.filter(
    e => detail === "detailed" || e.type === "work" || e.type === "research"
  );
  const tags = Array.from(new Set(projects.flatMap(p => p.tags)));
  const footer = () => (
    <Text
      fixed
      style={{ position: "absolute", bottom: 25, left: 44, fontSize: 8 }}
    >
      김유석 · namuori.net
    </Text>
  );
  const head = (
    <View style={s.rule}>
      <Text style={s.eyebrow}>
        {documentNames[kind]} · {profile.romanizedName}
      </Text>
      <Text style={s.title}>{profile.name}</Text>
      <Text style={s.subtitle}>{profile.headline}</Text>
      <Text style={s.meta}>{profile.status}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {profile.contacts.map(c => (
          <Link key={c.id} src={c.href} style={s.link}>
            {c.label}
          </Link>
        ))}
      </View>
    </View>
  );
  return (
    <Document
      title={`${profile.name} ${documentNames[kind]}`}
      author={profile.name}
      language="ko-KR"
    >
      <Page size="A4" style={s.page}>
        {head}
        <Text style={s.h2}>소개</Text>
        <Text style={s.p}>{introduction}</Text>
        {tags.length > 0 && (
          <>
            <Text style={s.h2}>주요 기술 · 선정 프로젝트 기준</Text>
            <Text style={s.p}>{tags.join(" · ")}</Text>
          </>
        )}
        <Text style={s.h2} minPresenceAhead={60}>
          {kind === "resume" ? "이력 요약" : "대표 프로젝트"}
        </Text>
        {kind === "resume"
          ? records.map((e, index) => (
              <View
                key={index}
                style={{
                  paddingVertical: 3,
                  borderBottomWidth: 0.5,
                  borderBottomColor: "#dbe3dd",
                }}
                wrap={false}
              >
                <Text style={{ fontSize: 9, fontWeight: 700 }}>
                  {e.degree} · {e.period}
                </Text>
                <Text style={{ fontSize: 8, color: "#59665f" }}>
                  {typeNames[e.type]} · {e.school}
                  {e.current ? " · 진행 중" : ""}
                </Text>
              </View>
            ))
          : projects.map((p, index) => (
              <View key={p.slug} style={s.row} wrap={false}>
                <Text style={s.h3}>
                  {String(index + 1).padStart(2, "0")} {p.name}
                </Text>
                <Text>{p.desc}</Text>
                <Text style={s.meta}>{p.metric}</Text>
              </View>
            ))}
        {footer()}
      </Page>
      {kind === "resume" && detailedRecords.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.eyebrow}>EXPERIENCE & RESEARCH</Text>
          <Text style={s.title}>경력·연구 상세</Text>
          {detailedRecords.map((e, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View wrap={false}>
                <Text style={s.meta}>
                  {typeNames[e.type]} · {e.period}
                  {e.current ? " · 진행 중" : ""}
                </Text>
                <Text style={s.h3}>{e.degree}</Text>
                <Text style={s.meta}>{e.school}</Text>
              </View>
              {e.note && <Text style={s.p}>{e.note}</Text>}
              {(detail === "summary" ? e.bullets.slice(0, 2) : e.bullets).map(
                (b, i) => (
                  <Text key={i} style={s.p}>
                    • {b}
                  </Text>
                )
              )}
              {e.relatedSkills.length > 0 && (
                <Text style={s.meta}>{e.relatedSkills.join(" · ")}</Text>
              )}
              {e.links.map(l => (
                <Link key={l.href} style={s.link} src={l.href}>
                  {l.label}
                </Link>
              ))}
            </View>
          ))}
          {footer()}
        </Page>
      )}
      {kind === "resume" && projects.length > 0 && (
        <Page size="A4" style={s.page}>
          <Text style={s.title}>주요 프로젝트 기여</Text>
          {projects.map(p => (
            <View key={p.slug} style={{ marginBottom: 20 }}>
              <Text style={s.h2} minPresenceAhead={60}>
                {p.name}
              </Text>
              <Text style={s.meta}>
                {p.period} · {p.tags.join(" · ")}
              </Text>
              <Text style={s.p}>{p.desc}</Text>
              {projectBlocks(p, "summary").map((b, i) => (
                <Text style={s.p} key={i}>
                  {b.text}
                </Text>
              ))}
              <Link
                src={`https://namuori.net/projects/${p.slug}`}
                style={s.link}
              >
                프로젝트 상세 · namuori.net/projects/{p.slug}
              </Link>
            </View>
          ))}
          {footer()}
        </Page>
      )}
      {kind === "portfolio" &&
        projects.map((p, index) => {
          const insight = PROJECT_INSIGHTS[p.slug];
          return (
            <Page size="A4" style={s.page} key={p.slug}>
              <Text style={s.eyebrow}>
                PROJECT {String(index + 1).padStart(2, "0")} · {p.period}
              </Text>
              <Text style={s.title}>{p.name}</Text>
              <Text style={s.meta}>{p.tags.join(" · ")}</Text>
              <Text style={s.p}>{p.desc}</Text>
              {projectBlocks(p, detail)
                .filter(b => b.text !== p.desc && b.heading !== "사용 기술")
                .map((b, i, blocks) => (
                  <React.Fragment key={i}>
                    {b.heading && b.heading !== blocks[i - 1]?.heading && (
                      <Text style={s.h3} minPresenceAhead={35}>
                        {b.heading}
                      </Text>
                    )}
                    <Text style={s.p} orphans={2} widows={2}>
                      {b.text}
                    </Text>
                  </React.Fragment>
                ))}
              {detail !== "summary" && insight?.modules.length > 0 && (
                <>
                  <Text style={s.h2} minPresenceAhead={70}>
                    구현 구성
                  </Text>
                  {insight.modules.map((m, i) => (
                    <View key={i} style={s.module} wrap={false}>
                      <Text style={s.h3}>{m.name.ko}</Text>
                      <Text>{m.role.ko}</Text>
                    </View>
                  ))}
                </>
              )}
              {detail === "detailed" &&
                insight?.comparisons.map((c, i) => (
                  <View key={i} style={s.row}>
                    <Text style={s.h3} minPresenceAhead={45}>
                      {c.topic.ko}
                    </Text>
                    <Text style={s.meta}>
                      {c.basis === "illustrative"
                        ? "이해를 위한 비교 예시 · 실험 결과 아님"
                        : "프로젝트 기록에 따른 비교"}
                    </Text>
                    <Text style={s.p}>
                      {c.before.title.ko}: {c.before.text.ko}
                    </Text>
                    <Text style={s.p}>
                      {c.after.title.ko}: {c.after.text.ko}
                    </Text>
                    {c.note && <Text style={s.meta}>{c.note.ko}</Text>}
                  </View>
                ))}
              {insight && (
                <Text style={s.meta}>
                  {insight.status.map(v => v.text.ko).join(" · ")}
                </Text>
              )}
              <Link
                src={`https://namuori.net/projects/${p.slug}`}
                style={s.link}
              >
                프로젝트 원문 · namuori.net/projects/{p.slug}
              </Link>
              {p.link && (
                <Link src={p.link} style={s.link}>
                  {p.link}
                </Link>
              )}
              {footer()}
            </Page>
          );
        })}
    </Document>
  );
}
export async function generateSubmission(props: SubmissionProps) {
  registerSubmissionFonts(window.location.origin);
  const raw = await pdf(<SubmissionDocument {...props} />).toBlob();
  return numberPages(await raw.arrayBuffer());
}

// Number the finalized pages, after automatic wrapping has established their count.
export async function numberPages(bytes: ArrayBuffer | Uint8Array) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(bytes);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.getPages().forEach((page, index) => {
    page.drawText(`${index + 1} / ${doc.getPageCount()}`, {
      x: 515,
      y: 25,
      size: 8,
      font,
      color: rgb(0.35, 0.4, 0.37),
    });
  });
  return new Blob([(await doc.save()) as BlobPart], {
    type: "application/pdf",
  });
}

