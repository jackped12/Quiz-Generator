import {z} from 'zod';
const text=z.string().min(1).max(16000);
const ids=z.array(z.number().int().min(0).max(19)).min(1).max(20);
export const studySchema=z.object({
 title:text,description:text,
 lessons:z.array(z.object({title:text,summary:text,sourceIds:ids,
 concepts:z.array(z.object({term:text,explanation:text})).min(3).max(16),
 sections:z.array(z.object({heading:text,text})).min(2).max(8),
 takeaway:text,selfCheck:text,selfAnswer:text})).min(1).max(20),
 questions:z.array(z.object({q:text,options:z.array(text).length(4),answer:z.number().int().min(0).max(3),why:text,lesson:z.number().int().min(0).max(19),sourceIds:ids})).min(1).max(60),
 matches:z.array(z.object({term:text,definition:text,why:text,sourceIds:ids})).min(5).max(40)
});
export const sourceSchema=z.object({title:text,url:z.string().max(4096).refine(u=>!u||/^https?:\/\//i.test(u),'Invalid source URL'),text:z.string().min(100).max(30000),truncated:z.boolean().default(false)});
export const packSchema=studySchema.extend({version:z.literal(1),id:z.string().regex(/^[a-zA-Z0-9-]{1,80}$/),createdAt:z.string(),sources:z.array(sourceSchema.omit({text:true})).min(1).max(20)});
export type Study=z.infer<typeof studySchema>;
export type Pack=z.infer<typeof packSchema>;
export type Source=z.infer<typeof sourceSchema>;
export function validateStudy(study:Study,sourceCount:number){
 for(const item of [...study.lessons,...study.questions,...study.matches])if(item.sourceIds.some(id=>id>=sourceCount))throw new Error('The generated source references were invalid. Please try again.');
 if(study.questions.some(q=>q.lesson>=study.lessons.length||new Set(q.options.map(x=>x.toLowerCase().trim())).size!==4))throw new Error('The generated question choices were invalid. Please try again.');
 if(new Set(study.questions.map(q=>q.q.toLowerCase().trim())).size!==study.questions.length)throw new Error('The model repeated a question. Please try again.');
 if(new Set(study.matches.map(m=>m.term.toLowerCase().trim())).size!==study.matches.length||new Set(study.matches.map(m=>m.definition.toLowerCase().trim())).size!==study.matches.length)throw new Error('The generated matching pairs were not unique. Please try again.');
 const covered=new Set(study.lessons.flatMap(l=>l.sourceIds));if(covered.size!==sourceCount)throw new Error('The model did not cover every source. Please try again with fewer articles.');
}
