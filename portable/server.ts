import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {z} from 'zod';
import {readArticle} from './articles';
import {generateStudy} from './generate';
import {sourceSchema,packSchema,validateStudy,questionCountSchema} from './schema';
const folder=path.resolve(process.env.STUDY_ROOM_DIR||process.cwd());
const data=path.join(folder,'data','packs');const runfile=path.join(folder,'data','running.json');
const token=randomBytes(32).toString('hex');let origin='';let activity=Date.now();let busy=false;
function json(res:http.ServerResponse,status:number,value:unknown){res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));}
async function input(req:http.IncomingMessage){let size=0;const parts:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>2_000_000)throw new Error('Input is too large. Limit article text or use fewer sources.');parts.push(chunk);}return JSON.parse(Buffer.concat(parts).toString('utf8'));}
async function save(pack:unknown){const p=packSchema.parse(pack);validateStudy(p,p.sources.length);const dest=path.join(data,p.id+'.json');const tmp=dest+'.tmp';await fs.writeFile(tmp,JSON.stringify(p,null,2));await fs.rename(tmp,dest);return p;}
export const server=http.createServer(async(req,res)=>{
 try{
  if(req.headers.host!==origin.replace('http://','')){json(res,403,{error:'Invalid host.'});return;}
  const url=new URL(req.url??'/',origin);const route=url.pathname;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; object-src 'none'");
  if(route==='/api/health'){json(res,200,{app:'Study Room',version:1});return;}
  if(route==='/api/session'&&req.method==='POST'){
   if(req.headers['x-study-token']!==token||req.headers.origin&&req.headers.origin!==origin){json(res,403,{error:'Open Study Room.exe to start a session.'});return;}
   res.setHeader('Set-Cookie',`study_session=${token}; HttpOnly; SameSite=Strict; Path=/`);json(res,200,{ok:true});return;
  }
  if(route.startsWith('/api/')){
   const auth=req.headers.cookie?.split(';').some(c=>c.trim()===`study_session=${token}`)||req.headers['x-study-token']===token;
   if(!auth||req.headers.origin&&req.headers.origin!==origin){json(res,403,{error:'Session expired. Reopen Study Room.exe.'});return;}
   activity=Date.now();
   if(req.method==='POST'&&req.headers['content-type']!=='application/json'){json(res,415,{error:'JSON required.'});return;}
   if(route==='/api/heartbeat'){json(res,200,{ok:true});return;}
   if(route==='/api/quit'&&req.method==='POST'){json(res,200,{ok:true});setTimeout(async()=>{await fs.rm(runfile,{force:true});process.exit(0);},200);return;}
   if(route==='/api/packs'&&req.method==='GET'){
    const files=(await fs.readdir(data)).filter(f=>f.endsWith('.json'));const packs=[];
    for(const file of files){try{const p=packSchema.parse(JSON.parse(await fs.readFile(path.join(data,file),'utf8')));packs.push({id:p.id,title:p.title,description:p.description,createdAt:p.createdAt,questions:p.questions.length,matches:p.matches.length});}catch{/* Preserve but skip damaged files. */}}
    json(res,200,packs.sort((a,b)=>b.createdAt.localeCompare(a.createdAt)));return;
   }
   if(route.startsWith('/api/packs/')&&req.method==='GET'){const id=route.slice('/api/packs/'.length);if(!/^[a-zA-Z0-9-]{1,80}$/.test(id))throw new Error('Invalid pack ID.');const pack=await fs.readFile(path.join(data,id+'.json'),'utf8');json(res,200,packSchema.parse(JSON.parse(pack)));return;}
   if(route==='/api/import'&&req.method==='POST'){const p=packSchema.parse(await input(req));p.id=randomUUID();p.createdAt=new Date().toISOString();json(res,200,await save(p));return;}
   if(route==='/api/read'&&req.method==='POST'){
    const {urls}=z.object({urls:z.array(z.string().max(4096)).min(1).max(10)}).parse(await input(req));
    const controller=new AbortController();res.on('close',()=>controller.abort());const results=[];
    for(const url of [...new Set(urls)]){if(controller.signal.aborted)return;try{results.push({ok:true,source:await readArticle(url,controller.signal)});}catch(e){results.push({ok:false,url,error:e instanceof Error?e.message:'Unable to read article.'});}}
    json(res,200,{results});return;
   }
   if(route==='/api/generate'&&req.method==='POST'){
    if(busy){json(res,409,{error:'A generation is already running. Wait for it to finish.'});return;}
    const args=z.object({apiKey:z.string().min(10).max(500),model:z.string().regex(/^[a-zA-Z0-9._:-]{1,100}$/),sources:z.array(sourceSchema).min(1).max(10),questionCount:questionCountSchema,matchCount:z.union([z.literal(5),z.literal(10),z.literal(15),z.literal(20)]),depth:z.enum(['concise','detailed'])}).parse(await input(req));
    if(args.sources.reduce((n,s)=>n+s.text.length,0)>160000)throw new Error('Keep the combined article text below 160,000 characters.');
    busy=true;const controller=new AbortController();res.on('close',()=>controller.abort());
    try{const study=await generateStudy({...args,signal:controller.signal});const pack=await save({...study,version:1,id:randomUUID(),createdAt:new Date().toISOString(),sources:args.sources.map(({text,...s})=>s)});json(res,200,pack);}finally{args.apiKey='';busy=false;activity=Date.now();}return;
   }
   json(res,404,{error:'Not found.'});return;
  }
  if(req.method!=='GET'){json(res,405,{error:'Method not allowed.'});return;}
  const rel=decodeURIComponent(route).replace(/^\/+/, '')||'index.html';const root=path.join(folder,'web');const file=path.resolve(root,rel);
  if(!file.startsWith(root+path.sep)){json(res,403,{error:'Invalid path.'});return;}
  const bytes=await fs.readFile(file);const ext=path.extname(file);const types:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};res.writeHead(200,{'Content-Type':types[ext]??'application/octet-stream','Cache-Control':'no-cache'});res.end(bytes);
 }catch(error){if(res.destroyed||res.writableEnded)return;const message=error instanceof z.ZodError?'Some input is missing or invalid. Check the URLs, source text, and settings.':error instanceof Error?error.message:'Something went wrong.';json(res,400,{error:message.includes('ENOENT')?'The requested file was not found.':message});}
});
async function launch(){
 await fs.mkdir(data,{recursive:true});
 try{const prev=JSON.parse(await fs.readFile(runfile,'utf8'));if(/^http:\/\/127\.0\.0\.1:\d+$/.test(prev.origin)&&/^[a-f0-9]{64}$/.test(prev.token)){const r=await fetch(prev.origin+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&(await r.json() as {app:string}).app==='Study Room'){if(process.argv.includes('--open'))spawn('explorer.exe',[prev.origin+'/#'+prev.token],{windowsHide:true,detached:true,stdio:'ignore'}).unref();return;}}}catch{/* Previous run is absent or no longer active. */}
 server.listen(0,'127.0.0.1',async()=>{const address=server.address();if(!address||typeof address==='string')throw new Error('Cannot start local app.');origin=`http://127.0.0.1:${address.port}`;await fs.writeFile(runfile,JSON.stringify({origin,token,pid:process.pid}));if(process.argv.includes('--open'))spawn('explorer.exe',[origin+'/#'+token],{windowsHide:true,detached:true,stdio:'ignore'}).unref();console.log('Study Room is ready.');});
 const timer=setInterval(()=>{if(!busy&&Date.now()-activity>30*60*1000)process.exit(0);},60000);timer.unref();
}
launch().catch(()=>{console.error('Study Room could not start. Extract the full folder into a writable location and try again.');process.exit(1);});
