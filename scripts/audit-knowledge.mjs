import { spawnSync } from 'node:child_process';
const result = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['exec','vitest','run','src/content/knowledgeValidation.test.ts'], {stdio:'inherit',shell:process.platform==='win32',env:{...process.env,KNOWLEDGE_AUDIT:'1'}});
process.exit(result.status ?? 1);
