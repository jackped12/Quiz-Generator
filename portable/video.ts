// Shared by the upload form and local server. Keep this module browser-safe.
export const MAX_VIDEO_BYTES=25_000_000;
export const VIDEO_ACCEPT='.mp4,.webm,.mpeg,.mpg';
export function validateVideo(name:string,size:number){
 if(!/\.(mp4|webm|mpeg|mpg)$/i.test(name))throw new Error('Choose an MP4, WebM, or MPEG video with spoken audio. Convert other formats first.');
 if(!Number.isSafeInteger(size)||size<=0)throw new Error('The video file is empty. Choose a recording with spoken audio.');
 if(size>MAX_VIDEO_BYTES)throw new Error('Videos must be 25 MB or smaller. Compress the video or split it into smaller clips first.');
}
