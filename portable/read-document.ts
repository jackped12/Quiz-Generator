import {Worker} from 'node:worker_threads';
import path from 'node:path';
import type {Source} from './schema';

// Isolate parsers so damaged/compressed documents cannot block the local server.
export function readDocument(name:string,bytes:Buffer,signal:AbortSignal):Promise<Source>{
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  let settled=false;
  const worker=new Worker(path.join(__dirname,'document-worker.cjs'),{workerData:{name,bytes},resourceLimits:{maxOldGenerationSizeMb:128}});
  const finish=(error?:Error,source?:Source)=>{
   if(settled)return;settled=true;
   clearTimeout(timer);signal.removeEventListener('abort',cancel);void worker.terminate();
   if(error)reject(error);else if(source)resolve(source);
  };
  const cancel=()=>finish(new DOMException('Document upload cancelled.','AbortError'));
  const timer=setTimeout(()=>finish(new Error('Reading this document timed out. Try a smaller document or a text export.')),30000);
  signal.addEventListener('abort',cancel,{once:true});
  worker.once('message',(result:{source?:Source;error?:string})=>finish(result.error?new Error(result.error):undefined,result.source));
  worker.once('error',()=>finish(new Error('Could not read this document within the memory limit. Try a smaller file or a text export.')));
  worker.once('exit',code=>{if(code!==0)finish(new Error('Document reader stopped. Try a smaller file or a text export.'));});
 });
}
