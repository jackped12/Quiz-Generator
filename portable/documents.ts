import WordExtractor from 'word-extractor';
import {sourceSchema,type Source} from './schema';
import {validateDocument} from './document-upload';

export async function extractDocument(name:string,bytes:Buffer):Promise<Source>{
 validateDocument(name,bytes.length);
 let text:string;
 try{
  if(/\.docx?$/i.test(name)){
   const doc=await new WordExtractor().extract(bytes);
   text=[doc.getBody(),doc.getTextboxes({includeHeadersAndFooters:false}),doc.getFootnotes(),doc.getEndnotes()].filter(Boolean).join('\n\n');
  }else{
   // UTF-8 and BOM-marked UTF-16 text exported from Word/Notepad.
   const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
   text=new TextDecoder(encoding,{fatal:true}).decode(bytes);
   if(text.includes('\0'))throw new Error('Binary text');
  }
 }catch{throw new Error('Could not read this document. It may be damaged, encrypted, or in an unsupported format. Save a new .docx or UTF-8 .txt copy and try again.');}
 text=text.replace(/\r\n?/g,'\n').replace(/[\t ]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
 if(text.length<100)throw new Error('The document needs at least 100 characters of readable text. Images and scanned pages are not read; paste their text instead.');
 return sourceSchema.parse({title:name,url:'',kind:'document',text:text.slice(0,30000),truncated:text.length>30000});
}
