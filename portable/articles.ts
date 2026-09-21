import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import https from 'node:https';
import http from 'node:http';
import {parseHTML} from 'linkedom';
import {Readability} from '@mozilla/readability';
import type {Source} from './schema';

export function publicAddress(address:string){
 if(isIP(address)!==4)return false; // Only public IPv4 targets; avoid mapped/transition address bypasses.
 const [a,b]=address.split('.').map(Number);
 return !(a===0||a===10||a===127||a>=224||a===169&&b===254||a===172&&b>=16&&b<=31||a===192&&(b===168||b===0||b===2)||a===100&&b>=64&&b<=127||a===198&&(b===18||b===19||b===51)||a===203&&b===0);
}
export function articleURL(value:string){const u=new URL(value);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.port&&!['80','443'].includes(u.port))throw new Error('Use a public http or https article URL without a custom port or login details.');u.hash='';return u;}
export async function fetchArticleHTML(value:string,signal?:AbortSignal,redirects=0):Promise<{html:string,url:string}>{
 const u=articleURL(value);const host=u.hostname.replace(/^\[|\]$/g,'');
 const results=isIP(host)?[{address:host,family:isIP(host)}]:await lookup(host,{all:true,family:4});
 if(!results.length||results.some(r=>!publicAddress(r.address)))throw new Error('Only public internet articles can be read; local and private addresses are blocked.');
 const chosen=results[0];
 return new Promise((resolve,reject)=>{
  // Pin DNS resolution into the actual connection, and validate again on every redirect.
  const req=(u.protocol==='https:'?https:http).get(u,{signal,timeout:20000,...{autoSelectFamily:false},headers:{'User-Agent':'StudyRoom/1.0 (article study tool)','Accept':'text/html, text/plain','Accept-Encoding':'identity'},lookup:(_h,_o,cb)=>cb(null,chosen.address,4)},res=>{
   const status=res.statusCode??500;
   if([301,302,303,307,308].includes(status)&&res.headers.location){res.resume();if(redirects>=5){reject(new Error('Too many redirects.'));return;}fetchArticleHTML(new URL(res.headers.location,u).href,signal,redirects+1).then(resolve,reject);return;}
   if(status<200||status>=300){res.resume();reject(new Error(`The site returned HTTP ${status}. Paste the article text instead.`));return;}
   const kind=res.headers['content-type']??'';if(!/text\/html|application\/xhtml|text\/plain/.test(kind)){res.resume();reject(new Error('This is not an HTML or text article. Paste text from the document instead.'));return;}
   let size=0;const chunks:Buffer[]=[];res.on('data',chunk=>{size+=chunk.length;if(size>3_000_000){res.destroy();reject(new Error('Article exceeds the 3 MB download limit. Paste the important text instead.'));}else chunks.push(chunk);});
   res.on('error',reject);res.on('end',()=>{const raw=Buffer.concat(chunks).toString('utf8');resolve({html:kind.includes('text/plain')?`<html><body><article>${raw.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</article></body></html>`:raw,url:u.href});});
  });req.on('timeout',()=>req.destroy(new Error('The article site timed out. Paste its text instead.')));req.on('error',reject);
 });
}
export function extractArticle(html:string,url:string):Source{
 const {document}=parseHTML(html);
 document.querySelectorAll('script,style,nav,header,footer,aside,form,iframe,noscript,svg').forEach(n=>n.remove());
 const title=document.querySelector('h1')?.textContent?.trim()||document.title||new URL(url).hostname;
 let text='';
 const main=document.querySelector('main article,main [class*=content],main,article');
 if(main&&main.textContent!.length>500)text=main.textContent??'';
 else {try{text=new Readability(document as unknown as Document).parse()?.textContent??'';}catch{/* Some publishers use unusual DOM structures. */}}
 text=text.replace(/[\t ]+/g,' ').replace(/\n\s*\n+/g,'\n\n').trim();
 if(text.length<300)throw new Error('Not enough readable article text. This may be a login page or JavaScript-only site; paste the article text instead.');
 return {title:title.slice(0,500),url,text:text.slice(0,30000),truncated:text.length>30000};
}
export function learnUnitURLs(html:string,url:string){
 const base=articleURL(url);
 if(base.hostname!=='learn.microsoft.com'||!/^\/[\w-]+\/training\/modules\/[^/]+\/?$/.test(base.pathname))return [];
 base.pathname=base.pathname.replace(/\/?$/,'/');
 const {document}=parseHTML(html);const links=new Set<string>();
 for(const a of document.querySelectorAll('a[href]')){
  const unit=new URL(a.getAttribute('href')!,base);
  const tail=unit.pathname.slice(base.pathname.length);
  if(unit.origin===base.origin&&unit.pathname.startsWith(base.pathname)&&/^\d+[a-z]*-[^/]+\/?$/.test(tail)&&!/knowledge-check|check-knowledge|assessment/.test(tail)){
   unit.search='';unit.hash='';links.add(unit.href);
  }
 }
 return [...links].slice(0,30);
}
export async function readArticle(url:string,signal?:AbortSignal,budget=30000,loader=fetchArticleHTML){
 const normalized=articleURL(url);
 // A common copied marketplace link has an accidental trailing /m.
 if(normalized.hostname==='learn.microsoft.com'&&normalized.pathname==='/en-us/training/modules/intro-commercial-marketplace/m')normalized.pathname='/en-us/training/modules/intro-commercial-marketplace/';
 const page=await loader(normalized.href,signal);const source=extractArticle(page.html,page.url);
 const units=learnUnitURLs(page.html,page.url);
 if(!units.length)return {...source,text:source.text.slice(0,budget),truncated:source.truncated||source.text.length>budget};
 const articles:Source[]=[];
 for(const unit of units){
  signal?.throwIfAborted();
  try{const lesson=await loader(unit,signal);articles.push(extractArticle(lesson.html,lesson.url));}
  catch(e){signal?.throwIfAborted();throw new Error(`Could not read module lesson ${unit}. ${e instanceof Error?e.message:'Please retry.'}`);}
 }
 const sections=articles.map(s=>`${s.title}\n${s.url}\n${s.text}`);
 const allocations=sections.map(()=>0);
 let remaining=budget-2*(sections.length-1);
 // Short introductions keep only what they need; redistribute space to longer lessons.
 const order=sections.map((s,i)=>i).sort((a,b)=>sections[a].length-sections[b].length);
 order.forEach((index,position)=>{const take=Math.min(sections[index].length,Math.floor(remaining/(order.length-position)));allocations[index]=take;remaining-=take;});
 let truncated=false;
 const text=sections.map((s,i)=>{truncated ||= articles[i].truncated||s.length>allocations[i];return s.slice(0,allocations[i]);}).join('\n\n');
 return {...source,text,truncated,unitUrls:articles.map(s=>s.url)};
}
