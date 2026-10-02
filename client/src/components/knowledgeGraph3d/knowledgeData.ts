// Compatibility exports. Author knowledge in content/ and source entries, never here.
import { portfolioContent } from "@/content";
import { materializeKnowledge, knowledgeCatalog } from "@/content/knowledge";
export type * from "@/content/knowledgeTypes";
export { RELATIONS } from "@/content/knowledgeTypes";
export const DOMAINS = knowledgeCatalog.domains;
export const EVIDENCE_SOURCES = knowledgeCatalog.sources;
export const { nodes: NODES, edges: EDGES } = materializeKnowledge(portfolioContent);
