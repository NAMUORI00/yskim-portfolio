export interface KnowledgeRecord {
  claims: { node: string; mode: "built" | "studied" | "interest" | "listed"; quote: string }[];
  relations: { from: string; to: string; relation: "uses" | "implements" | "applies" | "supports" | "prerequisite"; quote: string }[];
}
export type PublicationStatus = "draft" | "published" | "archived";
export type TimelineEntryType = "education" | "research" | "publication" | "project" | "award" | "talk" | "work" | "milestone";
export type ProjectCategory = "career" | "toy" | "undergraduate";
export type ProjectFocus = "research" | "product" | "tool" | "experiment";
export type ProjectProofLevel = "core" | "supporting" | "exploration";

export interface ProjectMetric {
  label: string;
  value: string;
  baseline?: string;
  note?: string;
}

export interface ProjectEvaluation {
  baseline?: string;
  dataset?: string;
  method?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
}

export interface SiteContent {
  title: string;
  description: string;
  url: string;
  navigation: NavItem[];
  images: {
    heroTree: string;
    ragDiagram: string;
    dotPattern: string;
  };
}

export interface ProfileContact {
  id: string;
  type: "email" | "github" | "website" | "external";
  label: string;
  href: string;
}

export interface ProfileContent {
  name: string;
  romanizedName: string;
  handle: string;
  status: string;
  avatarUrl?: string;
  headline: string;
  summaryLead: string;
  summary: string[];
  contacts: ProfileContact[];
}

export interface TimelineLink {
  label: string;
  href: string;
}

export interface EducationEntry {
  knowledge?: KnowledgeRecord;
  id?: string;
  type: TimelineEntryType;
  degree: string;
  school: string;
  period: string;
  startDate?: string;
  endDate?: string;
  note: string;
  current: boolean;
  status: PublicationStatus;
  highlight: boolean;
  bullets: string[];
  links: TimelineLink[];
  relatedProjects: string[];
  relatedSkills: string[];
}

export interface ResearchEntry {
  knowledge?: KnowledgeRecord;
  slug: string;
  title: string;
  desc: string;
  status: PublicationStatus;
  coverImage?: string;
  showDiagram: boolean;
  body: string;
}

export interface ProjectEntry {
  knowledge?: KnowledgeRecord;
  slug: string;
  name: string;
  period: string;
  desc: string;
  metric: string;
  category: ProjectCategory;
  focus: ProjectFocus;
  proofLevel: ProjectProofLevel;
  metrics: ProjectMetric[];
  evaluation: ProjectEvaluation;
  tags: string[];
  link: string;
  highlight: boolean;
  private: boolean;
  status: PublicationStatus;
  coverImage?: string;
  body: string;
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface StarredRepo {
  name: string;
  href: string;
  stars: string;
  desc: string;
}

export interface ContentOrder {
  research: string[];
  projects: string[];
}

export interface PortfolioContent {
  site: SiteContent;
  profile: ProfileContent;
  education: EducationEntry[];
  research: ResearchEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  starred: StarredRepo[];
}
