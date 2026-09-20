import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),out=path.join(root,'outputs','Study Room');
await fs.mkdir(path.join(out,'runtime'),{recursive:true});await fs.mkdir(path.join(out,'data','packs'),{recursive:true});
const run=(cmd,args)=>{const result=spawnSync(cmd,args,{cwd:root,stdio:'inherit'});if(result.status!==0)throw new Error(cmd+' failed');};
run(process.execPath,['node_modules/vite/bin/vite.js','build','--config','portable/vite.config.ts']);
await build({entryPoints:['portable/server.ts'],outfile:path.join(out,'server.cjs'),bundle:true,platform:'node',format:'cjs',target:'node22',legalComments:'linked'});
await fs.copyFile(process.execPath,path.join(out,'runtime','node.exe'));
await fs.copyFile('portable/README.txt',path.join(out,'START HERE.txt'));
await fs.writeFile(path.join(out,'Start Study Room.cmd'),'@echo off\r\ncd /d "%~dp0"\r\n"runtime\\node.exe" "server.cjs" --open\r\nif errorlevel 1 pause\r\n');
run('C:/Windows/Microsoft.NET/Framework64/v4.0.30319/csc.exe',['/nologo','/target:winexe','/platform:x64','/reference:System.Windows.Forms.dll','/out:'+path.join(out,'Study Room.exe'),path.join(root,'portable','Launcher.cs')]);
await build({stdin:{contents:`import {topics,questions,matchSets,base} from './app/content';import {deeper} from './app/deeper';export {topics,questions,matchSets,base,deeper};`,resolveDir:root,loader:'ts'},outfile:path.join(root,'outputs','seed.mjs'),bundle:true,platform:'node',format:'esm'});
const {topics,questions,matchSets,base,deeper}=await import('../outputs/seed.mjs?'+Date.now());
const seed={version:1,id:'azure-starter',createdAt:'2026-09-18T17:30:00.000Z',title:'Azure Study Room',description:'Your expanded Azure fundamentals guide, with 60 questions and 40 matching pairs.',sources:topics.map(t=>({title:t.title,url:base+t.source,truncated:false})),lessons:topics.map((t,i)=>({title:t.title,summary:t.lead,sourceIds:[i],concepts:t.rows.map(([term,explanation])=>({term,explanation})),sections:deeper[i].sections.map(([heading,text])=>({heading,text})),takeaway:t.tip,selfCheck:deeper[i].recall,selfAnswer:deeper[i].answer})),questions:questions.map(q=>({q:q.q,options:q.options,answer:q.answer,why:q.why,lesson:q.topic,sourceIds:[q.topic]})),matches:matchSets.flatMap(s=>s.pairs.map(([term,definition])=>({term,definition,why:term+' corresponds to '+definition.toLowerCase()+'.',sourceIds:[s.topic]})))};
await fs.writeFile(path.join(out,'data','packs','azure-starter.json'),JSON.stringify(seed,null,2));
let licenses='STUDY ROOM — THIRD-PARTY NOTICES\n\n';
const packages=['@mozilla/readability','linkedom','zod','react','react-dom','lucide-react','@base-ui/react','class-variance-authority','clsx','tailwind-merge'];
const visited=new Set();
async function includeLicense(pkg,parent=root){
 let current=parent,dir;
 while(true){const candidate=path.join(current,'node_modules',pkg);try{await fs.access(path.join(candidate,'package.json'));dir=candidate;break;}catch{const next=path.dirname(current);if(next===current)break;current=next;}}
 if(!dir||visited.has(dir))return;visited.add(dir);
 const meta=JSON.parse(await fs.readFile(path.join(dir,'package.json'),'utf8'));
 licenses+='\n'+meta.name+' '+meta.version+' ('+(typeof meta.license==='string'?meta.license:'see package notice')+')\n';
 const names=(await fs.readdir(dir)).filter(n=>/^(licen[sc]e|copying|notice)(\.|$)/i.test(n));
 for(const name of names){try{licenses+=await fs.readFile(path.join(dir,name),'utf8')+'\n';}catch{}}
 for(const dependency of Object.keys(meta.dependencies??{}))await includeLicense(dependency,dir);
}
for(const pkg of packages)await includeLicense(pkg);
try{licenses+='\nNODE.JS\n'+await fs.readFile(path.join(path.dirname(process.execPath),'LICENSE'),'utf8');}catch{throw new Error('Node runtime license is missing');}
await fs.writeFile(path.join(out,'THIRD-PARTY-NOTICES.txt'),licenses);
console.log('Portable Windows app built at '+out);
