import { localizePortfolioContent } from "@/lib/i18nContent";
import { englishTranslations } from "./index";
import {readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {describe,it,expect} from 'vitest';
import {portfolioContent} from './index';
import {validateKnowledge} from './knowledgeValidation';
import {materializeKnowledge,knowledgeSkills,knowledgeCatalog} from './knowledge';
import {buildKnowledgeGraph} from '../components/knowledgeGraph3d/graph3dModel';
const read=(path:string)=>readFileSync(fileURLToPath(new URL(`../../../${path}`,import.meta.url)),'utf8');
describe('single source knowledge contract',()=>{
 it('validates source text without counting the annotation as its own proof',()=>expect(validateKnowledge(portfolioContent,read)).toEqual([]));
 it('removes a private draft source, its claims and edges from all views',()=>{
  const c=structuredClone(portfolioContent); c.projects.find(p=>p.slug==='aerospace-rag')!.status='draft';
  const graph=buildKnowledgeGraph(c,c,'ko');
  expect(graph.evidence.has('project:aerospace-rag')).toBe(false);
  expect(graph.nodes.flatMap(n=>n.claims).some(c=>c.evidence.id==='project:aerospace-rag')).toBe(false);
  expect(graph.links.some(e=>e.evidence.id==='project:aerospace-rag')).toBe(false);
 });
 it('updates descriptions and stack from changed source annotations',()=>{
  const c=structuredClone(portfolioContent); const p=c.projects.find(p=>p.slug==='aerospace-rag')!;
  const claim=p.knowledge!.claims.find(c=>c.node==='qdrant')!;claim.quote='Updated source work';
  expect(buildKnowledgeGraph(c,c,'ko').byId.get('qdrant')!.did).toContain('Updated source work');
  for(const p of [...c.projects,...c.research,...c.education]) if(p.knowledge) p.knowledge.claims=p.knowledge.claims.filter(x=>x.node!=='qdrant');
  expect(knowledgeSkills(c).flatMap(g=>g.items)).not.toContain('Qdrant');
 });
 it('fails closed on orphan IDs and stale claims',()=>{
  const c=structuredClone(portfolioContent);c.projects[0].knowledge!.claims.push({node:'unknown',mode:'built',quote:'invented fact'});
  const errors=validateKnowledge(c,read); expect(errors.some(e=>e.includes('unknown node'))).toBe(true);expect(errors.some(e=>e.includes('stale quote'))).toBe(true);
 });
 it('uses stable timeline IDs when paper titles or statuses change',()=>{
  const c=structuredClone(portfolioContent); const paper=c.education.find(e=>e.id==='paper:ieee')!;
  paper.degree='Changed title';paper.school='Updated venue/status';
  const en=localizePortfolioContent(c,englishTranslations,'en');
  expect(en.education.find(e=>e.id==='paper:ieee')!.school).toBe('Updated venue/status');
  expect(buildKnowledgeGraph(c,c,'ko').evidence.get('paper:ieee')).toMatchObject({title:'Changed title',status:expect.stringContaining('Updated venue/status')});
 });
});

if (process.env.KNOWLEDGE_AUDIT) {
 const graph=buildKnowledgeGraph(portfolioContent,portfolioContent,'ko');
 const known=new Set(knowledgeCatalog.nodes.flatMap(n=>[n.label.ko,n.label.en,n.stack??'']).map(s=>s.toLowerCase()));
 const report={counts:graph.counts,errors:validateKnowledge(portfolioContent,read),
   unmappedTags:portfolioContent.projects.filter(p=>p.status==='published').flatMap(p=>p.tags.filter(t=>!known.has(t.toLowerCase())).map(tag=>({project:p.slug,tag,status:'review candidate; not evidence of implementation'}))),
   policy:'Structured source claims create knowledge; free-text mentions and unmatched tags never establish proficiency.',
   sources: Array.from(graph.evidence.values()).map(e=>({id:e.id,title:e.title,status:e.status}))};
 writeFileSync(fileURLToPath(new URL('../../../docs/knowledge-audit.json',import.meta.url)),JSON.stringify(report,null,2)+'\n');
}
