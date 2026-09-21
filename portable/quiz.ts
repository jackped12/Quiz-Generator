import type {Study} from './schema';

function shuffle<T>(items:T[],random:()=>number):T[]{
 const result=[...items];
 for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}
 return result;
}

// Balance positions across the whole attempt, then shuffle their order.
// Move the answer key with its option so grading remains correct.
export function randomizeAnswers(questions:Study['questions'],random=Math.random):Study['questions']{
 const letters=shuffle([0,1,2,3],random);
 const positions=shuffle(questions.map((_,i)=>letters[i%4]),random);
 return questions.map((q,index)=>{
  const answer=positions[index];
  const order=shuffle([0,1,2,3].filter(i=>i!==q.answer),random);
  order.splice(answer,0,q.answer);
  const why=q.why.replace(/\b([Oo]ption|[Cc]hoice|[Aa]nswer)\s+([A-D])\b/g,(_match,prefix:string,letter:string)=>`${prefix} ${'ABCD'[order.indexOf('ABCD'.indexOf(letter.toUpperCase()))]}`);
  return {...q,options:order.map(i=>q.options[i]),answer,why};
 });
}
