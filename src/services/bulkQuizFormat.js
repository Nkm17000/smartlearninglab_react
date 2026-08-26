// Shared quiz JSON validation/normalization used by the admin bulk importer.
// Supports simple and English + Hindi bilingual formats.
export function asQuizList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.quizzes)) return value.quizzes;
  if (value && Array.isArray(value.items)) return value.items;
  if (value && typeof value === 'object') return [value];
  return [];
}
function text(value, language='english') {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const preferred = language === 'hindi' ? ['hindi','hi'] : ['english','en'];
    for (const key of preferred) if (value[key] != null) return String(value[key]).trim();
    for (const key of ['english','en','hindi','hi']) if (value[key] != null) return String(value[key]).trim();
    return '';
  }
  return String(value ?? '').trim();
}
function arr(values) { return Array.isArray(values) ? values.map(x => String(x ?? '').trim()) : []; }
export function getQuestionTexts(q) {
  const object = q?.question && typeof q.question === 'object' && !Array.isArray(q.question);
  const english = object ? text(q.question,'english') : text(q?.question,'english');
  const hindi = q?.question_hindi != null ? text(q.question_hindi,'hindi') : (object ? text(q.question,'hindi') : '');
  return {english,hindi,bilingual:Boolean(object || q?.question_hindi != null)};
}
export function getOptionArrays(q) {
  const options=q?.options; let english=[], hindi=[], bilingual=false;
  if (Array.isArray(options)) { english=arr(options); if (Array.isArray(q?.options_hindi)) { hindi=arr(q.options_hindi); bilingual=true; } }
  else if (options && typeof options==='object') { english=arr(options.english ?? options.en); hindi=arr(options.hindi ?? options.hi); bilingual=['english','en','hindi','hi'].some(k=>Object.prototype.hasOwnProperty.call(options,k)); }
  if (Array.isArray(q?.options_hindi)) { hindi=arr(q.options_hindi); bilingual=true; }
  if (Array.isArray(q?.options_bilingual) && q.options_bilingual.length) { english=q.options_bilingual.map(x=>text(x,'english')); hindi=q.options_bilingual.map(x=>text(x,'hindi')); bilingual=true; }
  return {english,hindi,bilingual};
}
export function resolveCorrectAnswer(value, english=[], hindi=[]) {
  if (typeof value==='number' && Number.isInteger(value)) return value;
  const raw=String(value ?? '').trim();
  if (/^[A-Da-d]$/.test(raw)) return raw.toUpperCase().charCodeAt(0)-65;
  if (/^\d+$/.test(raw)) return Number(raw);
  const key=raw.toLocaleLowerCase();
  const ei=english.findIndex(x=>String(x).trim().toLocaleLowerCase()===key); if(ei>=0) return ei;
  return hindi.findIndex(x=>String(x).trim().toLocaleLowerCase()===key);
}
function four(values,label) {
  if(!Array.isArray(values)||values.length!==4) throw new Error(`exactly four ${label} options are required.`);
  if(values.some(x=>!String(x??'').trim())) throw new Error(`${label} options cannot be empty.`);
  const n=values.map(x=>String(x).trim().toLocaleLowerCase()); if(new Set(n).size!==n.length) throw new Error(`duplicate ${label} options are not allowed.`);
}
export function normalizeQuestionForBackend(q) {
  const qt=getQuestionTexts(q), op=getOptionArrays(q); let en=[...op.english], hi=[...op.hindi];
  if(!en.length) en=[...hi]; if(!hi.length) hi=[...en];
  const ex=q?.explanation; const exEn=text(ex,'english'); const exHi=q?.explanation_hindi!=null?text(q.explanation_hindi,'hindi'):text(ex,'hindi');
  return {...q,question:qt.english||qt.hindi,question_hindi:qt.hindi||qt.english,question_i18n:{english:qt.english||qt.hindi,hindi:qt.hindi||qt.english},options:en,options_hindi:hi,options_bilingual:en.map((v,i)=>({english:v,hindi:hi[i]})),explanation:exEn||exHi,explanation_hindi:exHi||exEn,explanation_i18n:{english:exEn||exHi,hindi:exHi||exEn}};
}
export function validateQuizItem(quiz,sourceIndex=1) {
  if(!quiz||typeof quiz!=='object'||Array.isArray(quiz)) throw new Error(`Quiz ${sourceIndex} must be a JSON object.`);
  const title=String(quiz.title||quiz.name||'').trim(); if(!title) throw new Error(`Quiz ${sourceIndex}: title is required.`);
  if(!Array.isArray(quiz.questions)||quiz.questions.length<1) throw new Error(`Quiz ${sourceIndex} (${title}): questions must contain at least one question.`);
  const seen=new Set();
  quiz.questions.forEach((q,i)=>{ try {
    const qt=getQuestionTexts(q); if(!qt.english&&!qt.hindi) throw new Error('question text is empty.');
    const op=getOptionArrays(q); const bilingual=qt.bilingual||op.bilingual;
    four(op.english,'English');
    if(bilingual){ if(!qt.hindi) throw new Error('Hindi question is required for bilingual content.'); four(op.hindi,'Hindi'); }
    else if(op.hindi.length) four(op.hindi,'Hindi');
    const hi=op.hindi.length?op.hindi:op.english; const c=resolveCorrectAnswer(q?.correct_answer??q?.answer,op.english,hi);
    if(!Number.isInteger(c)||c<0||c>3) throw new Error('correct_answer must be 0–3, A/B/C/D, or an exact option text.');
    const key=(qt.english||qt.hindi).replace(/\s+/g,' ').trim().toLocaleLowerCase(); if(seen.has(key)) throw new Error('duplicate question is not allowed.'); seen.add(key);
  } catch(e){ throw new Error(`Quiz ${sourceIndex}, question ${i+1}: ${e.message}`); }});
  return quiz;
}
export function validateQuizPayload(payload){ const quizzes=asQuizList(payload); if(!quizzes.length) throw new Error('Paste one quiz object, an array of quiz objects, or {"quizzes":[...]}.' ); const titles=new Set(); quizzes.forEach((q,i)=>{validateQuizItem(q,i+1);const t=String(q.title||q.name||'').trim().toLocaleLowerCase();if(titles.has(t))throw new Error(`Quiz ${i+1}: duplicate title.`);titles.add(t);}); return quizzes; }
export function validateQuizBatch(quizzes,sourceOffset=0){ const valid=[],failures=[],titles=new Set(); quizzes.forEach((q,i)=>{const sourceIndex=sourceOffset+i+1;try{validateQuizItem(q,sourceIndex);const title=String(q.title||q.name||'').trim(),key=title.toLocaleLowerCase();if(titles.has(key))throw new Error(`duplicate title '${title}'.`);titles.add(key);valid.push({...q,_bulk_source_index:sourceIndex});}catch(e){failures.push({source_index:sourceIndex,title:String(q?.title||q?.name||''),error:e.message||'Invalid quiz.'});}});return {valid,failures}; }
export function taxonomyFields(taxonomy,categoryIds,subcategoryIds){const categories=taxonomy.filter(x=>categoryIds.includes(x.id)).map(x=>x.name);const allowed=taxonomy.filter(x=>categoryIds.includes(x.id)).flatMap(x=>x.subcategories||[]);const subs=allowed.filter(x=>subcategoryIds.includes(x.id));return {category_ids:categoryIds,categories,subcategory_ids:subs.map(x=>x.id),subcategories:subs.map(x=>x.name)};}
