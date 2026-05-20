import type {
  EducationEntry,
  NoteEntry,
  PortfolioContent,
  ProfileContent,
  ProjectEntry,
  ResearchEntry,
  SkillGroup,
  StarredRepo,
} from "@/content";

export type Locale = "ko" | "en";

export interface EnglishTranslations {
  locale: "en";
  generatedAt?: string;
  ui?: {
    nav?: Record<string, string>;
    labels?: Record<string, string>;
  };
  profile?: Partial<Pick<ProfileContent, "status" | "headline" | "summaryLead" | "summary">>;
  education?: Array<Partial<Pick<EducationEntry, "degree" | "school" | "period" | "note">>>;
  research?: Record<string, Partial<Pick<ResearchEntry, "title" | "desc" | "body">>>;
  projects?: Record<string, Partial<Pick<ProjectEntry, "name" | "period" | "desc" | "metric" | "tags" | "body">>>;
  skills?: Record<string, Partial<Pick<SkillGroup, "label" | "items">>>;
  starred?: Record<string, Partial<Pick<StarredRepo, "desc">>>;
  notes?: Record<string, Partial<Pick<NoteEntry, "title" | "summary" | "tags" | "body">>>;
  sourceHashes?: Record<string, string>;
}

export function createEnglishTranslations(): EnglishTranslations {
  return { locale: "en", ui: { nav: {}, labels: {} }, sourceHashes: {} };
}

function mergeArray<T>(base: T[], translated?: T[]): T[] {
  if (!translated) return base;
  return base.map((item, index) => translated[index] ?? item);
}

export function uiText(translations: EnglishTranslations, key: string, fallback: string): string {
  return translations.ui?.labels?.[key] || fallback;
}

export function localizePortfolioContent(content: PortfolioContent, translations: EnglishTranslations, locale: Locale): PortfolioContent {
  if (locale === "ko") return content;

  return {
    ...content,
    site: {
      ...content.site,
      navigation: content.site.navigation.map((item) => ({
        ...item,
        label: translations.ui?.nav?.[item.id] || item.label,
      })),
    },
    profile: {
      ...content.profile,
      ...translations.profile,
      summary: mergeArray(content.profile.summary, translations.profile?.summary),
    },
    education: content.education.map((item, index) => ({ ...item, ...(translations.education?.[index] ?? {}) })),
    research: content.research.map((item) => ({ ...item, ...(translations.research?.[item.slug] ?? {}) })),
    projects: content.projects.map((item) => ({ ...item, ...(translations.projects?.[item.slug] ?? {}) })),
    skills: content.skills.map((item) => {
      const translated = translations.skills?.[item.label];
      return translated ? { ...item, ...translated, items: mergeArray(item.items, translated.items) } : item;
    }),
    starred: content.starred.map((item) => ({ ...item, ...(translations.starred?.[item.name] ?? {}) })),
    notes: content.notes.map((item) => ({ ...item, ...(translations.notes?.[item.slug] ?? {}) })),
  };
}
