import { createContext, Fragment, useContext, useMemo, type ReactNode } from "react";
import { Link } from "wouter";
import { portfolioContent as content } from "@/content";
import type { ProjectEntry } from "@/content/types";
import { projectBlocks, submissionIntroduction } from "@/submission/model";
import { projectDiagram } from "@/submission/presentation";
import {
  aboutParagraphs,
  careers,
  degrees,
  plain,
  print,
  printItems,
  projectBySlug,
  publications,
  readHandoff,
  repoUrl,
  sectionText,
  sheets,
  shortUrl,
  type FlowRow,
  type PrintItem,
  type PrintProject,
  type Sheet as SheetInfo,
} from "./printModel";
import "./PrintPortfolio.css";

const SheetsContext = createContext<SheetInfo[]>(sheets());
const IntroContext = createContext(submissionIntroduction);
const ItemsContext = createContext<PrintItem[]>(printItems());
const pad = (n: number) => String(n).padStart(2, "0");
const repoName = (url: string) => url.replace(/\/$/, "").split("/").pop() ?? url;

function usePages() {
  const list = useContext(SheetsContext);
  return { list, total: list.length, pageOf: (id: string) => list.findIndex(sheet => sheet.id === id) + 1 };
}

function Sheet({ id, section, children, className = "" }: { id: string; section: string; children: ReactNode; className?: string }) {
  const { pageOf, total } = usePages();
  const n = pageOf(id);
  const cover = id === "cover";
  return (
    <section className={`pp-sheet ${className}`} id={`pp-${id}`} aria-label={`${n}쪽 ${section}`}>
      {!cover && (
        <header className="pp-run">
          <span>{content.profile.name} 포트폴리오</span>
          <span>{section}</span>
        </header>
      )}
      <div className="pp-body">{children}</div>
      {!cover && (
        <footer className="pp-foot">
          <span>{shortUrl(content.site.url)}</span>
          <span className="pp-num">
            {pad(n)} / {pad(total)}
          </span>
        </footer>
      )}
    </section>
  );
}

function Node({ title, sub, highlight }: { title: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`pp-node${highlight ? " is-key" : ""}`}>
      <b>{title}</b>
      {sub && <small>{sub}</small>}
    </div>
  );
}

function Flow({ figure }: { figure: PrintProject["figure"] }) {
  const rows = figure.rows.map((row: FlowRow, r) => (
    <div className="pp-flow-row" key={r}>
      {row.label && <div className="pp-flow-label">{row.label}</div>}
      <div className="pp-flow">
        {row.nodes.map((node, i) => (
          <Fragment key={i}>
            {i > 0 && <span className="pp-arrow" aria-hidden="true" />}
            <div className="pp-node-wrap">
              <Node {...node} />
              {figure.fallback && figure.fallback.row === r && figure.fallback.node === i && (
                <div className="pp-fallback">
                  <span className="pp-down" aria-hidden="true" />
                  <div>
                    <b>{figure.fallback.title}</b>
                    <small>{figure.fallback.text}</small>
                  </div>
                </div>
              )}
            </div>
          </Fragment>
        ))}
        {figure.outcomes && r === figure.rows.length - 1 && (
          <>
            <span className="pp-arrow" aria-hidden="true" />
            <div className="pp-fork">
              {figure.outcomeLabel && <span className="pp-fork-label">{figure.outcomeLabel}</span>}
              {figure.outcomes.map((outcome, k) => (
                <div className={`pp-outcome${k === 0 ? " is-yes" : " is-no"}`} key={outcome.title}>
                  <b>{outcome.title}</b>
                  <small>{outcome.text}</small>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  ));
  return figure.boundary ? (
    <div className="pp-boundary">
      <span className="pp-boundary-label">{figure.boundary}</span>
      {rows}
    </div>
  ) : (
    <>{rows}</>
  );
}

function Example({ example }: { example: NonNullable<PrintProject["figure"]["example"]> }) {
  return (
    <table className="pp-table pp-example">
      <thead>
        <tr>
          <th>센서</th>
          <th>전체 재생성</th>
          <th>선택적 수정</th>
        </tr>
      </thead>
      <tbody>
        {example.sentences.map(sentence => {
          const changed = sentence.sensor === example.changed;
          const next = sentence.after ?? sentence.before;
          return (
            <tr key={sentence.sensor}>
              <td className="pp-when">{sentence.sensor}</td>
              <td className="is-rewritten">{next}</td>
              <td className={changed ? "is-rewritten" : "is-kept"}>{changed ? next : sentence.before}</td>
            </tr>
          );
        })}
      </tbody>
      <caption>
        예시. {example.changed} 값이 바뀐 경우. 굵게 표시한 문장이 다시 쓴 문장이고, 선택적 수정은 {example.changed} 문장만 다시 씁니다.
      </caption>
    </table>
  );
}

function Results({ project, no }: { project: PrintProject; no: number }) {
  return (
    <table className="pp-table pp-results">
      <caption>표 {no}. 결과</caption>
      <thead>
        <tr>
          <th>지표</th>
          <th>비교 기준</th>
          <th className="pp-num-col">기존</th>
          <th className="pp-num-col">결과</th>
        </tr>
      </thead>
      <tbody>
        {project.results.map(row => (
          <tr key={row.metric}>
            <td>{row.metric}</td>
            <td>{row.baseline}</td>
            <td className="pp-num-col">{row.before ?? ""}</td>
            <td className="pp-num-col pp-result">{row.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ProjectHead({ index, title, status, summary }: { index: number; title: string; status: string; summary: string }) {
  return (
    <>
      <div className="pp-kicker">프로젝트 {index + 1}</div>
      <h1 className="pp-title">{title}</h1>
      <p className="pp-status">{status}</p>
      <p className="pp-lead">{summary}</p>
    </>
  );
}

function Meta({ period, role, tags, repo, privateRepo }: { period?: string; role?: string; tags: string[]; repo?: string; privateRepo?: boolean }) {
  return (
    <aside className="pp-meta">
      {period && (
        <dl>
          <dt>기간</dt>
          <dd>{period}</dd>
        </dl>
      )}
      {role && (
        <dl>
          <dt>맡은 역할</dt>
          <dd>{role}</dd>
        </dl>
      )}
      <dl>
        <dt>사용 기술</dt>
        <dd>{tags.join(", ")}</dd>
      </dl>
      {repo && (
        <dl>
          <dt>GitHub 저장소</dt>
          <dd className="pp-url">{repoName(repo)}</dd>
        </dl>
      )}
      {!repo && privateRepo && (
        <dl>
          <dt>GitHub 저장소</dt>
          <dd>비공개</dd>
        </dl>
      )}
    </aside>
  );
}

function ProjectSheet({ project, index }: { project: PrintProject; index: number }) {
  const source = projectBySlug(project.slug);
  const role = source ? sectionText(source.body, "맡은 역할") : "";
  const repo = repoUrl(project);
  const fig = index + 2;
  return (
    <Sheet id={`project-${index + 1}`} section={`프로젝트 ${index + 1}`}>
      <ProjectHead index={index} title={project.title} status={project.status} summary={project.summary} />
      <div className="pp-cols">
        <Meta period={source?.period} role={role} tags={source?.tags ?? []} repo={repo} privateRepo={source?.private} />
        <div className="pp-main">
          <h3>문제</h3>
          <p>{project.problem}</p>
          <h3>접근</h3>
          <p>{project.approach}</p>
        </div>
      </div>
      <figure className="pp-figure">
        <Flow figure={project.figure} />
        {project.figure.example && <Example example={project.figure.example} />}
        <figcaption>
          그림 {fig}. {project.figure.caption}
        </figcaption>
      </figure>
      <Results project={project} no={index + 1} />
      {project.evaluation && (
        <table className="pp-table pp-compact pp-plain">
          <caption>평가 설계</caption>
          <tbody>
            {project.evaluation.map(row => (
              <tr key={row.title}>
                <td className="pp-label-col">{row.title}</td>
                <td>{row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {project.checks && (
        <table className="pp-table pp-compact pp-plain">
          <caption>검증 범위</caption>
          <thead>
            <tr>
              <th>구분</th>
              <th>실행 환경</th>
              <th>확인한 내용</th>
            </tr>
          </thead>
          <tbody>
            {project.checks.map(row => (
              <tr key={row.title}>
                <td className="pp-label-col">{row.title}</td>
                <td>{row.env}</td>
                <td>{row.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="pp-notes">
        {project.scope && (
          <p>
            <b>검증 범위</b> {project.scope}
          </p>
        )}
        {project.paper && (
          <p>
            <b>논문</b> {project.paper}
          </p>
        )}
        {repo && (
          <p>
            <b>저장소</b> <span className="pp-url">{shortUrl(repo)}</span>
          </p>
        )}
      </div>
    </Sheet>
  );
}

function GenericProjectSheet({ project, index }: { project: ProjectEntry; index: number }) {
  const blocks = projectBlocks(project, "standard");
  const role = blocks
    .filter(b => /역할/.test(b.heading ?? ""))
    .map(b => b.text)
    .join(" ");
  const sections = new Map<string, string[]>();
  for (const block of blocks) {
    const heading = block.heading || "개요";
    if (/역할|사용 기술/.test(heading) || /^성과:|^Metric:/.test(block.text)) continue;
    sections.set(heading, [...(sections.get(heading) ?? []), block.text]);
  }
  const diagram = projectDiagram(project);
  return (
    <Sheet id={`project-${index + 1}`} section={`프로젝트 ${index + 1}`}>
      <ProjectHead index={index} title={project.name} status={project.period} summary={project.desc} />
      <div className="pp-cols">
        <Meta role={role} tags={project.tags} repo={project.link} />
        <div className="pp-main">
          {Array.from(sections).map(([heading, texts]) => (
            <Fragment key={heading}>
              <h3>{heading}</h3>
              {texts.map(text => (
                <p key={text}>{text}</p>
              ))}
            </Fragment>
          ))}
        </div>
      </div>
      {diagram.nodes.length > 0 && (
        <figure className="pp-figure">
          <Flow figure={{ caption: "", rows: [{ label: diagram.sequence ? "" : "주요 구성", nodes: diagram.nodes.map(title => ({ title })) }] }} />
          <figcaption>
            그림 {index + 2}. {diagram.sequence ? "처리 흐름" : "주요 구성"}
          </figcaption>
        </figure>
      )}
      <div className="pp-notes">
        {project.metric && (
          <p>
            <b>결과</b> {project.metric}
          </p>
        )}
        {project.link && (
          <p>
            <b>저장소</b> <span className="pp-url">{shortUrl(project.link)}</span>
          </p>
        )}
      </div>
    </Sheet>
  );
}

function Cover() {
  const { profile } = content;
  const { list, pageOf } = usePages();
  const introduction = useContext(IntroContext);
  return (
    <Sheet id="cover" section="표지" className="pp-cover">
      <div className="pp-cover-top">
        <span>포트폴리오</span>
        <span>{print.edition}</span>
      </div>
      <h1 className="pp-name">{profile.name}</h1>
      <p className="pp-roman">{profile.romanizedName}</p>
      <p className="pp-role">{print.cover.role}</p>
      <p className="pp-aff">{print.cover.affiliation}</p>
      <p className="pp-cover-intro">{introduction || profile.summaryLead}</p>
      <div className="pp-facts">
        {print.cover.facts.map(fact => (
          <div key={fact.label}>
            <div className="pp-fact-v">
              {fact.value}
              <small>{fact.unit}</small>
            </div>
            <b>{fact.label}</b>
            <span>{fact.note}</span>
          </div>
        ))}
      </div>
      <div className="pp-toc">
        <h2>차례</h2>
        <ol>
          {list.slice(1).map(sheet => (
            <li key={sheet.id}>
              <span>{sheet.title}</span>
              <span className="pp-dots" aria-hidden="true" />
              <span className="pp-num">{pad(pageOf(sheet.id))}</span>
            </li>
          ))}
        </ol>
      </div>
      <div className="pp-cover-bottom">
        <div>
          <ul className="pp-contacts">
            {profile.contacts.map(contact => (
              <li key={contact.id}>{contact.label}</li>
            ))}
          </ul>
          <p className="pp-cover-note">웹사이트 {shortUrl(content.site.url)}의 내용을 인쇄용으로 정리했습니다.</p>
        </div>
        <div className="pp-qrs">
          <figure>
            <img src="/print/qr-site.svg" alt="namuori.net QR 코드" />
            <figcaption>웹사이트</figcaption>
          </figure>
          <figure>
            <img src="/print/qr-github.svg" alt="GitHub QR 코드" />
            <figcaption>GitHub</figcaption>
          </figure>
        </div>
      </div>
    </Sheet>
  );
}

function About() {
  return (
    <Sheet id="about" section="자기소개와 이력">
      <h1 className="pp-title">자기소개</h1>
      <div className="pp-about">
        <div className="pp-about-text">
          {aboutParagraphs().map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        <aside className="pp-principles">
          <h3>일하는 방식</h3>
          {print.about.principles.map(item => (
            <div key={item.title}>
              <b>{item.title}</b>
              <p>{item.text}</p>
            </div>
          ))}
        </aside>
      </div>
      <h2 className="pp-h2">이력</h2>
      <table className="pp-table pp-timeline">
        <tbody>
          {print.about.timeline.map(item => (
            <tr key={item.what}>
              <td className="pp-when">{item.when}</td>
              <td>
                <b>{item.what}</b>
              </td>
              <td>{item.detail}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Sheet>
  );
}

function Research() {
  const r = print.research;
  const items = useContext(ItemsContext);
  const projectNo = (slug: string) => items.findIndex(item => item.slug === slug) + 1;
  return (
    <Sheet id="research" section={r.title}>
      <h1 className="pp-title">{r.title}</h1>
      <p className="pp-lead">{r.lead}</p>
      <figure className="pp-figure">
        <div className="pp-sys">
          <div className="pp-sys-q">
            <b>{r.question.title}</b>
            <span>{r.question.text}</span>
          </div>
          <div className="pp-sys-h is-in">입력</div>
          <div className="pp-sys-h is-mod">답을 만드는 모듈</div>
          <div className="pp-sys-h is-out">실행</div>
          {r.lanes.map((lane, k) => {
            const n = projectNo(lane.module.project);
            return (
              <Fragment key={lane.module.title}>
                <div className="pp-sys-box is-in" style={{ gridRow: k + 3 }}>
                  <b>{lane.input.title}</b>
                  <span>{lane.input.text}</span>
                </div>
                <span className="pp-arrow pp-sys-arrow" style={{ gridRow: k + 3 }} aria-hidden="true" />
                <div className="pp-sys-box is-mod" style={{ gridRow: k + 3 }}>
                  <b>{lane.module.title}</b>
                  <span>{lane.module.text}</span>
                  <em>{n > 0 ? `프로젝트 ${n}, ${lane.module.status}` : lane.module.status}</em>
                </div>
              </Fragment>
            );
          })}
          <div className="pp-sys-merge" aria-hidden="true" />
          <div className="pp-sys-out">
            {r.outputs.map((item, k) => (
              <Fragment key={item.title}>
                {k > 0 && <span className="pp-down" aria-hidden="true" />}
                <div className={`pp-sys-box${k === 1 ? " is-dark" : ""}`}>
                  <b>{item.title}</b>
                  <span>{item.text}</span>
                </div>
              </Fragment>
            ))}
          </div>
        </div>
        <p className="pp-fnote">배포와 운영: FastAPI, Docker, GitHub Actions 자동 테스트</p>
        <figcaption>그림 1. {r.caption}</figcaption>
      </figure>
      <h2 className="pp-h2">{r.areasTitle}</h2>
      <ol className="pp-areas">
        {r.areas.map(area => (
          <li key={area.title}>
            <b>{area.title}</b>
            <p>{area.text}</p>
          </li>
        ))}
      </ol>
    </Sheet>
  );
}

function Engineering() {
  const e = print.engineering;
  const shown = new Set(useContext(ItemsContext).map(item => item.slug));
  return (
    <Sheet id="engineering" section={e.title}>
      <h1 className="pp-title">{e.title}</h1>
      <div className="pp-entries">
        {e.items
          .filter(item => !shown.has(item.slug))
          .map(item => (
            <article className="pp-entry" key={item.slug}>
              <aside className="pp-entry-meta">{item.meta}</aside>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
                {item.steps.length > 0 && (
                  <p className="pp-steps">
                    {item.steps.map((step, i) => (
                      <Fragment key={step}>
                        {i > 0 && <span aria-hidden="true"> → </span>}
                        <span>{step}</span>
                      </Fragment>
                    ))}
                  </p>
                )}
              </div>
            </article>
          ))}
      </div>
    </Sheet>
  );
}

function Undergraduate() {
  const u = print.undergraduate;
  const shown = new Set(useContext(ItemsContext).map(item => item.slug));
  return (
    <Sheet id="undergraduate" section={u.title}>
      <h1 className="pp-title">{u.title}</h1>
      <p className="pp-lead">{u.lead}</p>
      <h2 className="pp-h2">수상</h2>
      <table className="pp-table pp-awards">
        <thead>
          <tr>
            <th>연월</th>
            <th>수상</th>
            <th>프로젝트와 맡은 일</th>
            <th>기술</th>
          </tr>
        </thead>
        <tbody>
          {u.awards.map(award => (
            <tr key={award.date + award.prize}>
              <td className="pp-when">{award.date}</td>
              <td>
                <b>{award.prize}</b>
                <small>{award.event}</small>
              </td>
              <td>
                <b>{award.title}</b>
                <small>{award.role}</small>
              </td>
              <td className="pp-tech">{award.tech}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h2 className="pp-h2">그 밖의 프로젝트</h2>
      <div className="pp-others">
        {u.others
          .filter(item => !shown.has(item.slug))
          .map(item => (
            <div key={item.title}>
              <b>{item.title}</b>
              <p>{item.text}</p>
              <span className="pp-tech">{item.tech}</span>
            </div>
          ))}
      </div>
    </Sheet>
  );
}

function Records() {
  const rec = print.records;
  return (
    <Sheet id="records" section="논문, 경력, 학력, 기술" className="pp-records">
      <h1 className="pp-title">논문, 경력, 학력, 기술</h1>
      <h2 className="pp-h2">논문 (모두 제1저자)</h2>
      <ol className="pp-papers">
        {publications().map(paper => (
          <li key={paper.degree}>
            <b>{paper.degree}</b>
            <span>
              {plain(paper.school).replace(/, 제1저자$/, "")}, {paper.period}
            </span>
          </li>
        ))}
        <li>
          <b>{rec.thesis.title}</b>
          <span>
            {rec.thesis.venue}, {rec.thesis.status}
          </span>
        </li>
      </ol>
      <div className="pp-two">
        <div>
          <h2 className="pp-h2">경력</h2>
          <table className="pp-table pp-compact">
            <tbody>
              {careers().map(row => (
                <tr key={row.role + row.period}>
                  <td className="pp-when">{row.period}</td>
                  <td>
                    <b>{row.org}</b>
                    <small>{row.role}</small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h2 className="pp-h2">학력과 어학</h2>
          <table className="pp-table pp-compact">
            <tbody>
              {degrees().map(entry => (
                <tr key={entry.degree}>
                  <td className="pp-when">{entry.period.replace(" — ", " ~ ")}</td>
                  <td>
                    <b>
                      {entry.school}, {entry.degree}
                    </b>
                    <small>
                      {[entry.note.match(/[^,.]*복수전공/)?.[0].trim(), ...entry.bullets.filter(b => b.startsWith("학점"))]
                        .filter(Boolean)
                        .join(", ")}
                    </small>
                  </td>
                </tr>
              ))}
              <tr>
                <td className="pp-when">어학</td>
                <td>
                  <b>{rec.language}</b>
                </td>
              </tr>
            </tbody>
          </table>
          <h2 className="pp-h2">기술</h2>
          <table className="pp-table pp-compact pp-skills">
            <tbody>
              {rec.skills.map(group => (
                <tr key={group.label}>
                  <td>
                    <b>{group.label}</b>
                  </td>
                  <td className="pp-tech">{group.items.join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="pp-repos-wrap">
        <div>
          <h2 className="pp-h2">공개 저장소 (github.com/NAMUORI00)</h2>
          <ul className="pp-repos">
            {rec.repos.map(repo => (
              <li key={repo.name}>
                <span className="pp-url">{repo.name}</span>
                <span>{repo.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="pp-qrs">
          <figure>
            <img src="/print/qr-github.svg" alt="GitHub QR 코드" />
            <figcaption>GitHub</figcaption>
          </figure>
        </div>
      </div>
    </Sheet>
  );
}

export default function PrintPortfolio() {
  const handoff = useMemo(() => readHandoff(), []);
  const items: PrintItem[] = useMemo(() => printItems(handoff?.projects), [handoff]);
  const list = useMemo(() => sheets(items), [items]);
  const introduction = handoff?.introduction ?? submissionIntroduction;
  return (
    <SheetsContext.Provider value={list}>
      <IntroContext.Provider value={introduction}>
        <ItemsContext.Provider value={items}>
          <div className="pp-root">
            <div className="pp-toolbar">
              <div>
                <b>디자인 포트폴리오 인쇄본</b>
                <span>
                  A4 {list.length}쪽. {handoff ? "제출용 편집기에서 고른 프로젝트 순서와 소개 문구를 따릅니다." : "기본 구성입니다."} 인쇄
                  창에서 PDF로 저장, 여백 없음, 배경 그래픽 켬으로 저장하면 인터넷 없이도 볼 수 있습니다.
                </span>
              </div>
              <div className="pp-toolbar-actions">
                <Link href="/insights">제출용 편집기에서 구성 바꾸기</Link>
                <Link href="/">사이트로 돌아가기</Link>
                <button type="button" onClick={() => window.print()}>
                  PDF로 저장
                </button>
              </div>
            </div>
            <main className="pp-pages">
              <Cover />
              <About />
              <Research />
              {items.map((item, index) =>
                item.kind === "curated" ? (
                  <ProjectSheet key={item.slug} project={item.project} index={index} />
                ) : (
                  <GenericProjectSheet key={item.slug} project={item.project} index={index} />
                )
              )}
              <Engineering />
              <Undergraduate />
              <Records />
            </main>
          </div>
        </ItemsContext.Provider>
      </IntroContext.Provider>
    </SheetsContext.Provider>
  );
}
