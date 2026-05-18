export type PublicationStatus = "draft" | "published" | "archived";

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
  type: "email" | "github" | "website" | "external";
  label: string;
  href: string;
}

export interface ProfileContent {
  name: string;
  romanizedName: string;
  handle: string;
  status: string;
  headline: string;
  summaryLead: string;
  summary: string[];
  contacts: ProfileContact[];
}

export interface EducationEntry {
  degree: string;
  school: string;
  period: string;
  note: string;
  current: boolean;
}

export interface ResearchEntry {
  slug: string;
  title: string;
  desc: string;
  status: PublicationStatus;
  showDiagram: boolean;
  body: string;
  relatedNotes: string[];
}

export interface ProjectEntry {
  slug: string;
  name: string;
  period: string;
  desc: string;
  metric: string;
  tags: string[];
  link: string;
  highlight: boolean;
  private: boolean;
  status: PublicationStatus;
  body: string;
  relatedNotes: string[];
}

export interface SkillGroup {
  label: string;
  items: string[];
}

export interface StarredRepo {
  name: string;
  stars: string;
  desc: string;
}

export interface NoteEntry {
  slug: string;
  title: string;
  status: PublicationStatus;
  date: string;
  summary: string;
  tags: string[];
  relatedProjects: string[];
  relatedResearch: string[];
  body: string;
}

export interface PortfolioContent {
  site: SiteContent;
  profile: ProfileContent;
  education: EducationEntry[];
  research: ResearchEntry[];
  projects: ProjectEntry[];
  skills: SkillGroup[];
  starred: StarredRepo[];
  notes: NoteEntry[];
}
