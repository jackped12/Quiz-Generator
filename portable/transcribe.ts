import {sourceSchema,type Source} from './schema';
import {validateVideo} from './video';

export async function transcribeVideo({apiKey,name,bytes,signal,fetcher=fetch}:{apiKey:string;name:string;bytes:Uint8Array;signal?:AbortSignal;fetcher?:typeof fetch}):Promise<Source>{
 validateVideo(name,bytes.byteLength);
 signal?.throwIfAborted();
 const ext=name.split('.').pop()!.toLowerCase();
 const form=new FormData();
 form.append('file',new Blob([new Uint8Array(bytes)],{type:ext==='webm'?'video/webm':ext==='mp4'?'video/mp4':'video/mpeg'}),ext==='mpg'?name.replace(/\.mpg$/i,'.mpeg'):name);
 form.append('model','gpt-4o-mini-transcribe');
 form.append('response_format','json');
 let response:Response;
 try{
  response=await fetcher('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:`Bearer ${apiKey}`},body:form,signal:AbortSignal.any([AbortSignal.timeout(300000),...(signal?[signal]:[])])});
 }catch(error){
  signal?.throwIfAborted();
  if(error instanceof Error&&error.name==='TimeoutError')throw new Error('Video transcription timed out. Try a shorter clip.');
  throw new Error('Could not reach OpenAI to transcribe the video. Check your connection and try again.');
 }
 if(!response.ok){
  const messages:Record<number,string>={400:'The video could not be transcribed. Check that it contains spoken audio, or convert it to MP4 and try again.',401:'The API key was rejected. Check it in Settings.',403:'Your API project does not have access to video transcription.',413:'The video is too large. Compress it or split it into smaller clips.',429:'OpenAI reported a rate or billing limit. Check your API billing and retry later.'};
  throw new Error(messages[response.status]??`Video transcription failed (HTTP ${response.status}). Try again later or use a shorter clip.`);
 }
 const result=await response.json() as {text?:unknown};
 const transcript=typeof result.text==='string'?result.text.trim():'';
 if(transcript.length<100)throw new Error('Not enough speech was found to make a study guide. Try a longer spoken recording or paste a transcript with at least 100 characters.');
 return sourceSchema.parse({title:name,url:'',kind:'video',text:transcript.slice(0,30000),truncated:transcript.length>30000});
}
