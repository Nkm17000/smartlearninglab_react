import React, {useMemo, useState} from 'react';
import {Alert, Text, View, Pressable} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {AppShell, Badge, Button, Card, DropdownSelect, Field, Header} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const CATEGORIES=['SSC','Railway','Banking','UPSC','Teaching','Defence','State Exams','General','English Spoken','Computer','Other'];
const SUBJECTS=['English','Hindi','Math','Reasoning','Aptitude','General Awareness','Current Affairs','Science','Physics','Chemistry','Biology','Java','Python','PHP','SQL','DBMS','Computer','Operating Systems','Networking','Web Development','Spring Boot','Microservices','Other'];
const ENGLISH_CATEGORIES=['SSC','Railway','Banking','UPSC','Teaching','Defence','State Exams','General','English Spoken','Other'];

const SAMPLE_MULTI = [
  {
    title: 'English Grammar - Noun',
    subject: 'English',
    categories: ENGLISH_CATEGORIES,
    description: '10-question practice test on Nouns',
    passing_percentage: 60,
    duration_minutes: 20,
    questions: [
      {
        question: 'Choose the correct plural form.',
        options: ['Phenomenons', 'Phenomena', 'Phenomenas', 'Phenomenae'],
        correct_answer: 1,
        explanation: "Phenomena is the standard plural of phenomenon."
      }
    ]
  },
  {
    title: 'English Grammar - Pronoun',
    subject: 'English',
    categories: ENGLISH_CATEGORIES,
    description: '10-question practice test on Pronouns',
    passing_percentage: 60,
    duration_minutes: 20,
    questions: [
      {
        question: 'Choose the correct relative pronoun: The candidate ___ application was rejected appealed to the board.',
        options: ['who', 'whom', 'whose', 'which'],
        correct_answer: 2,
        explanation: 'Whose indicates possession.'
      }
    ]
  }
];

const SAMPLE_SINGLE=SAMPLE_MULTI[0];

function asQuizList(value){
  if(Array.isArray(value)) return value;
  if(value&&Array.isArray(value.quizzes)) return value.quizzes;
  if(value&&typeof value==='object') return [value];
  return [];
}

function resolveCorrectAnswer(value, options){
  if(typeof value==='number'&&Number.isInteger(value)) return value;
  if(typeof value==='string'){
    const v=value.trim();
    if(/^[A-Za-z]$/.test(v)) return v.toUpperCase().charCodeAt(0)-65;
    if(/^\d+$/.test(v)) return Number(v);
    const index=options.findIndex(x=>String(x).trim()===v);
    if(index>=0)return index;
  }
  return NaN;
}

function validateQuizPayload(payload){
  const quizzes=asQuizList(payload);
  if(!quizzes.length)throw new Error('Paste one quiz object, an array of quiz objects, or {"quizzes":[...]}.' );
  if(quizzes.length>500)throw new Error('Maximum 500 quizzes per upload.');
  const titles=new Set();
  quizzes.forEach((quiz,qi)=>{
    const n=qi+1;
    if(!quiz||typeof quiz!=='object'||Array.isArray(quiz))throw new Error(`Quiz ${n} must be a JSON object.`);
    const title=String(quiz.title||quiz.name||'').trim();
    if(!title)throw new Error(`Quiz ${n}: title is required.`);
    const key=title.toLowerCase();
    if(titles.has(key))throw new Error(`Quiz ${n}: duplicate title '${title}'.`);
    titles.add(key);
    if(!String(quiz.subject||'').trim())throw new Error(`Quiz ${n} (${title}): subject is required.`);
    if(!Array.isArray(quiz.categories)||quiz.categories.length<1)throw new Error(`Quiz ${n} (${title}): categories must be a non-empty array.`);
    const invalid=quiz.categories.find(x=>!CATEGORIES.includes(String(x).trim()));
    if(invalid)throw new Error(`Quiz ${n} (${title}): unsupported category '${invalid}'.`);
    if(!Array.isArray(quiz.questions)||quiz.questions.length<1)throw new Error(`Quiz ${n} (${title}): questions must contain at least one question.`);
    quiz.questions.forEach((q,qi2)=>{
      const qn=qi2+1;
      if(!q||typeof q!=='object')throw new Error(`Quiz ${n}, question ${qn}: invalid question object.`);
      if(!String(q.question||'').trim())throw new Error(`Quiz ${n}, question ${qn}: question text is empty.`);
      if(!Array.isArray(q.options)||q.options.length<2)throw new Error(`Quiz ${n}, question ${qn}: provide at least two options.`);
      if(q.options.some(x=>!String(x).trim()))throw new Error(`Quiz ${n}, question ${qn}: options cannot be empty.`);
      const correct=resolveCorrectAnswer(q.correct_answer??q.answer,q.options);
      if(!Number.isInteger(correct)||correct<0||correct>=q.options.length)throw new Error(`Quiz ${n}, question ${qn}: correct_answer must be a zero-based index, A/B/C..., or an exact option.`);
    });
  });
  return quizzes;
}

function toggle(values,value){return values.includes(value)?values.filter(x=>x!==value):[...values,value];}

export default function AdminBulkContentScreen({onBack}){
  const [tab,setTab]=useState('quiz');
  const [quizJson,setQuizJson]=useState(JSON.stringify(SAMPLE_MULTI,null,2));
  const [quizFile,setQuizFile]=useState(null);
  const [file,setFile]=useState(null),[title,setTitle]=useState(''),[subject,setSubject]=useState('English'),[categories,setCategories]=useState([...ENGLISH_CATEGORIES]),[level,setLevel]=useState('Beginner'),[language,setLanguage]=useState('English');
  const [busy,setBusy]=useState(false),[result,setResult]=useState(null);

  const quizPreview=useMemo(()=>{try{const parsed=JSON.parse(quizJson);const list=asQuizList(parsed);const questions=list.reduce((sum,x)=>sum+(Array.isArray(x?.questions)?x.questions.length:0),0);return{count:list.length,questions,error:null};}catch(e){return{count:0,questions:0,error:e.message};}},[quizJson]);

  const pickQuizJson=async()=>{const r=await DocumentPicker.getDocumentAsync({type:['application/json','text/plain'],copyToCacheDirectory:true,multiple:false});if(!r.canceled&&r.assets?.[0])setQuizFile(r.assets[0]);};
  const loadSelectedQuizFile=async()=>{if(!quizFile)return;try{const response=await fetch(quizFile.uri);if(!response.ok)throw new Error('Unable to read the selected JSON file.');const text=await response.text();JSON.parse(text);setQuizJson(text);setResult(null);}catch(e){Alert.alert('JSON file',e.message||'Unable to read the selected file.');}};
  const pickPdf=async()=>{const r=await DocumentPicker.getDocumentAsync({type:'application/pdf',copyToCacheDirectory:true,multiple:false});if(!r.canceled&&r.assets?.[0]){setFile(r.assets[0]);setTitle(title||r.assets[0].name.replace(/\.pdf$/i,''));}};

  const createQuiz=async()=>{try{setBusy(true);setResult(null);let data;try{data=JSON.parse(quizJson);}catch(e){throw new Error(`Invalid JSON: ${e.message}`);}validateQuizPayload(data);const d=await api.bulkQuiz(data);setResult({kind:'quiz',...d});Alert.alert('Quiz drafts created',d.message||`${d.quiz_count||1} quiz draft(s) created.`);}catch(e){Alert.alert('Bulk quiz',e.message||'Unable to create quiz drafts.');}finally{setBusy(false);}};
  const uploadQuizFile=async()=>{try{setBusy(true);setResult(null);if(!quizFile)throw new Error('Choose a JSON file first.');const d=await api.bulkQuizFile(quizFile);setResult({kind:'quiz',...d});Alert.alert('Quiz drafts created',d.message||`${d.quiz_count||1} quiz draft(s) created.`);}catch(e){Alert.alert('JSON upload',e.message||'Unable to create quiz drafts.');}finally{setBusy(false);}};
  const createCourse=async()=>{try{setBusy(true);setResult(null);if(!file)throw new Error('Choose a PDF first.');if(!subject)throw new Error('Select a course subject.');if(!categories.length)throw new Error('Select at least one course category.');const d=await api.bulkCoursePdf(file,{title,subject,categories:categories.join(','),level,language});setResult({kind:'course',...d});Alert.alert('Course created',`${d.module_count} topics and ${d.lesson_count} lessons were created as a draft.`);}catch(e){Alert.alert('PDF course',e.message);}finally{setBusy(false);}};

  return <AppShell>
    <Header eyebrow="Nitin Mittal Innovation" title="Bulk Content Studio" subtitle="Create one quiz per topic from JSON, or create a course draft from a study PDF." right={<Button title="← Dashboard" variant="secondary" onPress={onBack}/>}/>
    <Card style={{backgroundColor:'#F4F1FF',borderColor:'#DDD6FE'}}><Text style={{fontSize:16,fontWeight:'900',color:colors.navy}}>Content workflow</Text><Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>Use subject for the learning topic and categories for the exams/domains where the content applies. Existing draft and publish workflows remain unchanged.</Text></Card>
    <View style={{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'}}><Button title="📝 Bulk Quiz" onPress={()=>setTab('quiz')} variant={tab==='quiz'?'primary':'secondary'}/><Button title="📄 PDF → Course" onPress={()=>setTab('course')} variant={tab==='course'?'primary':'secondary'}/></View>

    {tab==='quiz'?<>
      <Card>
        <Text style={{fontSize:21,fontWeight:'900',color:colors.navy}}>Bulk Quiz JSON</Text>
        <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>You can paste one quiz or many quizzes. Every quiz object becomes a separate quiz draft. If your English file has 18 topics, the backend creates 18 English quizzes.</Text>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:12}}><Button title="📂 Choose JSON file" variant="secondary" onPress={pickQuizJson}/>{quizFile&&<Button title="Load selected file" variant="secondary" onPress={loadSelectedQuizFile}/>}</View>
        {quizFile&&<Badge tone="green">Selected: {quizFile.name}</Badge>}
        <Field label="Quiz JSON" value={quizJson} onChangeText={setQuizJson} multiline placeholder="Paste one quiz object or an array of quiz objects..."/>
        <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title={busy?'Creating…':'Create Quiz Drafts'} onPress={createQuiz} disabled={busy}/><Button title={busy?'Uploading…':'Upload JSON & Create'} variant="secondary" onPress={uploadQuizFile} disabled={busy||!quizFile}/><Button title="Reset to Multiple Quiz Format" variant="secondary" onPress={()=>{setQuizJson(JSON.stringify(SAMPLE_MULTI,null,2));setQuizFile(null);setResult(null)}} disabled={busy}/><Button title="Reset to Single Quiz Format" variant="secondary" onPress={()=>{setQuizJson(JSON.stringify(SAMPLE_SINGLE,null,2));setQuizFile(null);setResult(null)}} disabled={busy}/></View>
        <View style={{marginTop:10,flexDirection:'row',gap:8,flexWrap:'wrap'}}><Badge tone={quizPreview.error?'red':'blue'}>{quizPreview.error?'Invalid JSON':`${quizPreview.count} quiz${quizPreview.count===1?'':'zes'} · ${quizPreview.questions} question${quizPreview.questions===1?'':'s'}`}</Badge>{!quizPreview.error&&quizPreview.count>1&&<Badge tone="purple">1 quiz per topic</Badge>}</View>
      </Card>
      <Card style={{backgroundColor:'#F8F9FD'}}>
        <Text style={{fontWeight:'900',color:colors.navy}}>Required quiz format</Text>
        <Text style={{fontFamily:'monospace',fontSize:11,color:colors.text,marginTop:8}}>{`{
  "title": "English Grammar - Noun",
  "subject": "English",
  "categories": ["SSC", "Railway", "Banking", "UPSC", "Teaching", "Defence", "State Exams", "General", "English Spoken", "Other"],
  "description": "10-question practice test",
  "passing_percentage": 60,
  "duration_minutes": 20,
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 1,
      "explanation": "Why the answer is correct"
    }
  ]
}`}</Text>
        <Text style={{color:colors.muted,lineHeight:20,marginTop:10}}>For multiple topics, use an array of the same objects. One object creates one quiz. Java example: subject = Java and categories = [Computer].</Text>
      </Card>
    </>:<Card>
      <Text style={{fontSize:21,fontWeight:'900',color:colors.navy}}>PDF → Course Generator</Text>
      <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>Upload an educational PDF. The importer creates the course and topic/lesson structure as a draft. Subject and categories are saved separately so the same course can belong to multiple exam categories.</Text>
      <Button title={file?`Selected: ${file.name}`:'Choose PDF'} variant="secondary" onPress={pickPdf} style={{marginTop:14}}/>
      <Field label="Course title (optional)" value={title} onChangeText={setTitle} placeholder="Auto-detect from PDF if blank"/>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><View style={{flex:1,minWidth:220}}><DropdownSelect label="Subject *" value={subject} onChange={setSubject} options={SUBJECTS.map(x=>({value:x,label:x}))}/></View><View style={{flex:1,minWidth:220}}><DropdownSelect label="Level" value={level} onChange={setLevel} options={['Beginner','Intermediate','Advanced'].map(x=>({value:x,label:x}))}/></View><View style={{flex:1,minWidth:220}}><DropdownSelect label="Language" value={language} onChange={setLanguage} options={['English','Hindi','Hinglish','Other'].map(x=>({value:x,label:x}))}/></View></View>
      <Text style={{fontSize:12,fontWeight:'800',color:colors.text,marginBottom:7}}>Exam / Domain Categories *</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:14}}>{CATEGORIES.map(x=><Pressable key={x} onPress={()=>setCategories(toggle(categories,x))} style={{borderWidth:1,borderColor:categories.includes(x)?'#B9B1FF':colors.border,borderRadius:20,paddingHorizontal:12,paddingVertical:8,backgroundColor:categories.includes(x)?colors.blueSoft:'#fff'}}><Text style={{fontWeight:'800',fontSize:12,color:categories.includes(x)?colors.primary:colors.text}}>{x}</Text></Pressable>)}</View>
      <Card style={{backgroundColor:'#F8F9FD',marginTop:0}}><Text style={{fontWeight:'900',color:colors.navy}}>Course metadata format</Text><Text style={{fontFamily:'monospace',fontSize:11,color:colors.text,marginTop:7}}>{`{
  "subject": "English",
  "categories": ["SSC", "Railway", "Banking", "UPSC", "Teaching", "Defence", "State Exams", "General", "English Spoken", "Other"]
}`}</Text></Card>
      <Button title={busy?'Processing PDF…':'Generate Course Draft'} onPress={createCourse} disabled={busy||!file||!subject||!categories.length}/>
      <Card style={{marginTop:14,backgroundColor:'#F8F9FD'}}><Text style={{fontWeight:'900',color:colors.navy}}>PDF format — no fixed template required</Text><Text style={{color:colors.text,lineHeight:21,marginTop:7}}>✓ Normal text PDF, textbook, tutorial, study guide or manual{`\n`}✓ PDF outline/bookmarks are preferred when available{`\n`}✓ Contents/Table of Contents is helpful but not mandatory{`\n`}✓ Numbered chapters and sections are supported{`\n`}✓ Original PDF is stored and lessons retain source page ranges{`\n`}✕ Scanned/image-only PDFs require OCR</Text></Card>
    </Card>}

    {result&&<Card style={{marginTop:14,borderColor:colors.success}}><Badge tone="green">Drafts created</Badge><Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginTop:8}}>{result.kind==='quiz'?'Quiz drafts ready for review':'Course ready for review'}</Text><Text style={{color:colors.muted,marginTop:5}}>{result.message}</Text>{result.kind==='quiz'&&<><Text style={{marginTop:8,fontWeight:'900'}}>{result.quiz_count||1} quiz{(result.quiz_count||1)===1?'':'zes'} · {result.question_count||0} questions</Text>{Array.isArray(result.created_quizzes)&&<View style={{marginTop:8}}>{result.created_quizzes.slice(0,30).map((x,i)=><Text key={`${x.source_index}-${i}`} style={{color:colors.text,lineHeight:20}}>✓ {x.quiz?.title||`Quiz ${x.source_index}`} — {x.question_count} questions</Text>)}</View>}</>}{result.kind==='course'&&<><Text style={{marginTop:8,fontWeight:'800'}}>{result.module_count} topics · {result.lesson_count} lessons</Text><Text style={{fontSize:11,color:colors.muted,marginTop:8}}>Open Courses → Course Builder to review and publish the course.</Text></>}</Card>}
  </AppShell>;
}
