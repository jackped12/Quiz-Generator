export const MAX_DOCUMENT_BYTES=10_000_000;
export const DOCUMENT_ACCEPT='.doc,.docx,.txt,.md';
export function validateDocument(name:string,size:number){
 if(!/\.(docx?|txt|md)$/i.test(name))throw new Error('Choose a Word document (.doc or .docx), plain text (.txt), or Markdown (.md) file.');
 if(!Number.isSafeInteger(size)||size<=0)throw new Error('The document is empty. Choose a file containing text.');
 if(size>MAX_DOCUMENT_BYTES)throw new Error('Documents must be 10 MB or smaller. Split a large document into smaller files.');
}
