import {build} from 'esbuild';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
import assert from 'node:assert/strict';
const scratch=await fs.mkdtemp(path.join(os.tmpdir(),'study-room-test-'));
await build({stdin:{contents:`export * from './portable/schema';export * from './portable/articles';export * from './portable/generate';`,resolveDir:process.cwd(),loader:'ts'},outfile:path.join(scratch,'core.cjs'),bundle:true,platform:'node',format:'cjs'});
const {studySchema,packSchema,validateStudy,publicAddress,articleURL,extractArticle,readArticle,generateStudy}=await import('file:///'+path.join(scratch,'core.cjs').replaceAll('\\','/'));
let count=0;async function test(name,fn){await fn();count++;console.log('PASS '+name);}
const fixture={title:'Plants',description:'An example study pack',lessons:[{title:'Photosynthesis',summary:'Plants use light to make sugars.',sourceIds:[0],concepts:[{term:'Light',explanation:'An energy source.'},{term:'Chlorophyll',explanation:'A pigment.'},{term:'Sugar',explanation:'Stores chemical energy.'}],sections:[{heading:'Process',text:'Plants capture light and build sugars.'},{heading:'Example',text:'A leaf exposed to light illustrates the process.'}],takeaway:'Light supports sugar production.',selfCheck:'What supplies energy?',selfAnswer:'Light.'}],questions:Array.from({length:10},(_,i)=>({q:'Example question '+i,options:['Light','Rock','Salt','Iron'],answer:i%4,why:'This fixture checks structural behavior, not biology content.',lesson:0,sourceIds:[0]})),matches:Array.from({length:5},(_,i)=>({term:'Term '+i,definition:'Definition '+i,why:'Explanation '+i,sourceIds:[0]}))};
const src={title:'Plants',url:'https://example.org/plants',text:'Plants capture energy from sunlight. '.repeat(30),truncated:false};
await test('block private, link-local, reserved, and mapped addresses',()=>{for(const ip of ['127.0.0.1','10.2.3.4','172.16.0.1','192.168.2.1','169.254.169.254','100.64.0.1','0.0.0.0','::1','::ffff:127.0.0.1','224.1.1.1'])assert.equal(publicAddress(ip),false,ip);assert(publicAddress('8.8.8.8'));});
await test('reject unsafe URL schemes, ports, credentials, and integer loopback',async()=>{for(const s of ['file:///etc/passwd','ftp://example.org','http://name:secret@example.org','http://example.org:445'])assert.throws(()=>articleURL(s));await assert.rejects(()=>readArticle('http://2130706433/'));await assert.rejects(()=>readArticle('http://[::1]/'));});
await test('extract readable content without scripts or navigation',()=>{const s=extractArticle('<html><head><title>Plants</title></head><body><nav>NOISE</nav><main><h1>Plants</h1><p>'+src.text+'</p></main><script>STEAL_SECRET</script></body></html>',src.url);assert(s.text.includes('sunlight'));assert(!s.text.includes('STEAL_SECRET'));assert(!s.text.includes('NOISE'));assert.equal(s.title,'Plants');});
await test('trim long articles and mark truncation',()=>{const s=extractArticle('<html><body><main><p>'+'Readable sentence. '.repeat(4000)+'</p></main></body></html>',src.url);assert.equal(s.text.length,30000);assert(s.truncated);});
await test('reject unreadable pages',()=>assert.throws(()=>extractArticle('<html><body>Sign in</body></html>',src.url)));
await test('validate question indexes, source coverage, and matching uniqueness',()=>{studySchema.parse(fixture);validateStudy(fixture,1);const bad=structuredClone(fixture);bad.questions[0].sourceIds=[7];assert.throws(()=>validateStudy(bad,1));bad.questions[0].sourceIds=[0];bad.matches[1].definition=bad.matches[0].definition;assert.throws(()=>validateStudy(bad,1));const badAnswer=structuredClone(fixture);badAnswer.questions[0].answer=4;assert.throws(()=>studySchema.parse(badAnswer));});
const common={apiKey:'sk-test-not-real',model:'gpt-5-mini',sources:[src],questionCount:10,matchCount:5,depth:'detailed'};
await test('structured generation request, untrusted-source separation, and parsing',async()=>{const pack=await generateStudy({...common,fetcher:async(url,opts)=>{assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(opts.headers.Authorization,'Bearer sk-test-not-real');const b=JSON.parse(opts.body);assert.equal(b.store,false);assert.equal(b.text.format.strict,true);assert.equal(b.text.format.type,'json_schema');assert(!opts.body.includes('sk-test-not-real'));assert(b.instructions.includes('untrusted'));assert(JSON.parse(b.input).sources[0].article===src.text);return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(fixture)}]}]}));}});assert.equal(pack.questions.length,10);});
await test('clear API key and billing errors without exposing provider payloads',async()=>{for(const status of [401,403,429])await assert.rejects(()=>generateStudy({...common,fetcher:async()=>new Response('secret upstream detail',{status})}),e=>!e.message.includes('secret')&&e.message.length>20);});
await test('reject refusals, incomplete generation, invalid JSON, and wrong counts',async()=>{for(const response of [{status:'incomplete'},{status:'completed',output:[{content:[{type:'refusal',text:'No'}]}]},{status:'completed',output:[{content:[{type:'output_text',text:'not json'}]}]},{status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({...fixture,questions:fixture.questions.slice(0,9)})}]}]}])await assert.rejects(()=>generateStudy({...common,fetcher:async()=>new Response(JSON.stringify(response))}));});

await test('custom counts and 120-question batching return exactly the requested total',async()=>{
 for(const requested of [1,37,40,41,81,120]){
  let calls=0,total=0;
  const pack=await generateStudy({...common,questionCount:requested,fetcher:async(_url,opts)=>{
   const body=JSON.parse(opts.body);const amount=Math.min(40,requested-total);
   if(calls>0){assert.equal(body.text.format.name,'question_batch');const data=JSON.parse(body.input);assert.equal(data.excludedQuestions.length,total);assert.equal(data.lessons[0].id,0);}
   const questions=Array.from({length:amount},(_,i)=>({...fixture.questions[0],q:'Distinct question '+(total+i)}));
   const result=calls===0?{...fixture,questions}:{questions};total+=amount;calls++;
   return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}));
  }});
  assert.equal(pack.questions.length,requested);assert.equal(calls,Math.ceil(requested/40));studySchema.parse(pack);validateStudy(pack,1);
 }
});
await test('reject out-of-range and fractional counts before any API call',async()=>{for(const questionCount of [0,-1,121,5.5,NaN])await assert.rejects(()=>generateStudy({...common,questionCount,fetcher:async()=>{throw Error('should not request');}}),e=>!e.message.includes('should not request'));});
await test('reject duplicates across batches and respect cancellation between batches',async()=>{
 const first={...fixture,questions:Array.from({length:40},(_,i)=>({...fixture.questions[0],q:'Question '+i}))};let calls=0;
 await assert.rejects(()=>generateStudy({...common,questionCount:41,fetcher:async()=>new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(calls++===0?first:{questions:[first.questions[0]]})}]}]}))}),/repeated/);
 const controller=new AbortController();calls=0;
 await assert.rejects(()=>generateStudy({...common,questionCount:120,signal:controller.signal,fetcher:async()=>{calls++;controller.abort();return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(first)}]}]}));}}));assert.equal(calls,1);
});
await test('included Azure pack imports with all 60 questions and 40 pairs',async()=>{const p=packSchema.parse(JSON.parse(await fs.readFile('outputs/Study Room/data/packs/azure-starter.json','utf8')));assert.equal(p.questions.length,60);assert.equal(p.matches.length,40);validateStudy(p,p.sources.length);});
await test('real Microsoft Learn article extraction',async()=>{const s=await readArticle('https://learn.microsoft.com/en-us/training/modules/describe-cloud-compute/4-describe-shared-responsibility-model');assert(s.text.length>1000);assert(/responsib/i.test(s.title));assert(/physical/i.test(s.text));console.log('  Read '+s.text.length+' characters from Microsoft Learn.');});
// Run the exact packaged backend in an isolated folder with no user data.
await fs.cp('outputs/Study Room/web',path.join(scratch,'web'),{recursive:true});
await fs.mkdir(path.join(scratch,'data','packs'),{recursive:true});
await fs.copyFile('outputs/Study Room/data/packs/azure-starter.json',path.join(scratch,'data','packs','azure-starter.json'));
const child=spawn(process.execPath,[path.resolve('outputs/Study Room/server.cjs')],{cwd:scratch,env:{...process.env,STUDY_ROOM_DIR:scratch},stdio:['ignore','pipe','pipe'],windowsHide:true});let logs='';child.stderr.on('data',b=>logs+=b);child.stdout.on('data',b=>logs+=b);
try{
 let state;for(let i=0;i<100;i++){try{state=JSON.parse(await fs.readFile(path.join(scratch,'data','running.json'),'utf8'));break;}catch{await new Promise(r=>setTimeout(r,100));}}assert(state,'Server startup failed: '+logs);
 const call=(route,body,headers={})=>fetch(state.origin+route,{method:body===undefined?'GET':'POST',headers:{'X-Study-Token':state.token,...(body===undefined?{}:{'Content-Type':'application/json'}),...headers},body:body===undefined?undefined:JSON.stringify(body)});
 await test('portable server serves app and enforces local session',async()=>{assert.equal((await fetch(state.origin+'/')).status,200);assert.equal((await fetch(state.origin+'/api/packs')).status,403);assert.equal((await call('/api/packs',undefined,{Origin:'https://evil.example'})).status,403);assert.equal((await call('/api/packs')).status,200);const r=await call('/api/session',{});assert(r.headers.get('set-cookie').includes('HttpOnly'));});
 await test('import, persistence, reload, invalid import, and safe path handling',async()=>{const pack={...fixture,version:1,id:'fixture',createdAt:new Date().toISOString(),sources:[{title:src.title,url:src.url,truncated:false}]};const r=await call('/api/import',pack);assert.equal(r.status,200);const imported=await r.json();assert(imported.id!=='fixture');const disk=await fs.readFile(path.join(scratch,'data','packs',imported.id+'.json'),'utf8');assert(!disk.includes('sk-test'));const reopened=await (await call('/api/packs/'+imported.id)).json();assert.equal(reopened.title,'Plants');assert.equal((await call('/api/import',{bad:true})).status,400);assert.equal((await call('/api/packs/%2e%2e%2fsecret')).status,400);});
 await test('read failures report per URL and generation rejects missing key',async()=>{const r=await call('/api/read',{urls:['http://127.0.0.1/']});const body=await r.json();assert.equal(body.results[0].ok,false);assert.equal((await call('/api/generate',{})).status,400);});
 await test('save and reload a 120-question pack, reject 121',async()=>{const pack={...fixture,questions:Array.from({length:120},(_,i)=>({...fixture.questions[0],q:'Saved question '+i})),version:1,id:'large-test',createdAt:new Date().toISOString(),sources:[{title:src.title,url:src.url,truncated:false}]};const saved=await call('/api/import',pack);assert.equal(saved.status,200);const p=await saved.json();assert.equal((await (await call('/api/packs/'+p.id)).json()).questions.length,120);pack.questions.push({...fixture.questions[0],q:'Too many'});assert.equal((await call('/api/import',pack)).status,400);for(const n of [0,121,3.5])assert.equal((await call('/api/generate',{...common,questionCount:n})).status,400);});
 await test('quit stops the packaged backend',async()=>{assert.equal((await call('/api/quit',{})).status,200);await new Promise(r=>setTimeout(r,500));assert(child.exitCode!==null);});
}finally{if(child.exitCode===null)child.kill();}
console.log('\n'+count+' tests passed. Live paid OpenAI generation was not run; no API key was supplied.');
