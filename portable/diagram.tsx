import type {Study} from './schema';

type Lesson=Study['lessons'][number];
export function GuideDiagrams({lesson}:{lesson:Lesson}){
 // Older packs can show their existing concepts without inventing relationships.
 const diagrams=lesson.diagrams??[{
  type:'concept-map' as const,title:lesson.title,caption:'Key concepts from this lesson.',
  items:lesson.concepts.slice(0,6).map(c=>({label:c.term,detail:c.explanation}))
 }];
 return <div className="guide-diagrams">{diagrams.map((diagram,index)=><figure className={'guide-diagram diagram-'+diagram.type} key={index}>
  <figcaption><span className="eyebrow">{diagram.type==='flow'?'PROCESS':diagram.type==='comparison'?'COMPARE':'CONCEPT MAP'}</span><h3>{diagram.title}</h3><p>{diagram.caption}</p></figcaption>
  {diagram.type==='concept-map'&&<div className="diagram-root">{lesson.title}</div>}
  <ol className="diagram-items">{diagram.items.map((item,i)=><li key={i}>
   {diagram.type==='flow'&&<span className="diagram-step" aria-label={'Step '+(i+1)}>{i+1}</span>}
   <strong>{item.label}</strong><p>{item.detail}</p>
   {diagram.type==='flow'&&i<diagram.items.length-1&&<span className="diagram-arrow" aria-hidden="true">↓</span>}
  </li>)}</ol>
 </figure>)}</div>;
}
