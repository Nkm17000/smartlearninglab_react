import React,{useState} from 'react';
import {Alert,Linking,ScrollView,Text,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {AppShell,Badge,Button,Card,DropdownSelect,Field,Header} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const CATEGORIES=['SSC','Banking','UPSC','English Spoken','Railway','Teaching','Defence','State Exams','Computer','General','Other'];

const SAMPLE = {
  title: "English Grammar - Bulk Quiz",
  category: "English",
  description: "10-question English grammar practice test",
  passing_percentage: 60,
  duration_minutes: 20,
  questions: [
    {
      question: "Choose the correct sentence.",
      options: [
        "He go to school every day.",
        "He goes to school every day.",
        "He going to school every day.",
        "He gone to school every day."
      ],
      correct_answer: 1,
      explanation: "With the singular subject 'He', the present simple verb takes 's': 'He goes'."
    },
    {
      question: "Identify the noun in the sentence: 'The boy is reading a book.'",
      options: ["The", "is", "boy", "reading"],
      correct_answer: 2,
      explanation: "'Boy' is a noun because it names a person."
    },
    {
      question: "Choose the correct article: 'She is ___ honest woman.'",
      options: ["a", "an", "the", "no article"],
      correct_answer: 1,
      explanation: "'Honest' begins with a vowel sound, so 'an' is used."
    },
    {
      question: "Choose the correct plural form of 'child'.",
      options: ["childs", "childes", "children", "childrens"],
      correct_answer: 2,
      explanation: "'Children' is the irregular plural form of 'child'."
    },
    {
      question: "Which word is a pronoun in: 'Ravi said that he would help me.'?",
      options: ["Ravi", "said", "he", "help"],
      correct_answer: 2,
      explanation: "'He' is a pronoun because it replaces the noun 'Ravi'."
    },
    {
      question: "Choose the correct preposition: 'She is good ___ mathematics.'",
      options: ["in", "at", "on", "for"],
      correct_answer: 1,
      explanation: "The standard expression is 'good at' something."
    },
    {
      question: "What is the past tense of 'go'?",
      options: ["goed", "gone", "went", "going"],
      correct_answer: 2,
      explanation: "'Went' is the simple past tense of 'go'."
    },
    {
      question: "Choose the correct passive voice: 'The teacher praised the student.'",
      options: [
        "The student praised the teacher.",
        "The student was praised by the teacher.",
        "The student is praised by the teacher.",
        "The teacher was praised by the student."
      ],
      correct_answer: 1,
      explanation: "The object becomes the subject in passive voice: 'The student was praised by the teacher'."
    },
    {
      question: "Choose the correct indirect speech: He said, 'I am tired.'",
      options: [
        "He said that I am tired.",
        "He said that he was tired.",
        "He says that he was tired.",
        "He said that he is tired."
      ],
      correct_answer: 1,
      explanation: "In reported speech, 'I' changes to 'he' and 'am' changes to 'was'."
    },
    {
      question: "Choose the correctly spelled word.",
      options: [
        "Accomodation",
        "Acommodation",
        "Accommodation",
        "Accommadation"
      ],
      correct_answer: 2,
      explanation: "'Accommodation' is the correct spelling."
    }
  ]
};

export default function AdminBulkContentScreen({onBack}){
 const [tab,setTab]=useState('quiz');
 const [quizJson,setQuizJson]=useState(JSON.stringify(SAMPLE,null,2));
 const [file,setFile]=useState(null),[title,setTitle]=useState(''),[category,setCategory]=useState('General'),[level,setLevel]=useState('Beginner'),[language,setLanguage]=useState('English');
 const [busy,setBusy]=useState(false),[result,setResult]=useState(null);

 const pickPdf=async()=>{
   const r=await DocumentPicker.getDocumentAsync({type:'application/pdf',copyToCacheDirectory:true,multiple:false});
   if(!r.canceled&&r.assets?.[0]){setFile(r.assets[0]);setTitle(title||r.assets[0].name.replace(/\.pdf$/i,''));}
 };

 const createQuiz=async()=>{
   try{
     setBusy(true);
     setResult(null);

     let data;
     try{
       data=JSON.parse(quizJson);
     }catch(e){
       throw new Error(`Invalid JSON: ${e.message}`);
     }

     if(!data || typeof data!=='object' || Array.isArray(data)){
       throw new Error('The quiz JSON must be a JSON object.');
     }
     if(!String(data.title||'').trim()){
       throw new Error('Quiz title is required.');
     }
     if(!Array.isArray(data.questions)||data.questions.length<1){
       throw new Error('questions must contain at least one question.');
     }

     data.questions.forEach((q,i)=>{
       const n=i+1;
       if(!q || typeof q!=='object') throw new Error(`Question ${n} must be an object.`);
       if(!String(q.question||'').trim()) throw new Error(`Question ${n}: question text is empty.`);
       if(!Array.isArray(q.options)||q.options.length<2) throw new Error(`Question ${n}: provide at least two options.`);
       if(q.options.some(x=>!String(x).trim())) throw new Error(`Question ${n}: options cannot be empty.`);
       const correct=Number(q.correct_answer);
       if(!Number.isInteger(correct)||correct<0||correct>=q.options.length){
         throw new Error(`Question ${n}: correct_answer must be a zero-based index from 0 to ${q.options.length-1}.`);
       }
     });

     const d=await api.bulkQuiz(data);
     setResult({kind:'quiz',...d});
     Alert.alert('Quiz created',`${d.question_count} questions were saved as a draft.`);
   }catch(e){
     Alert.alert('Bulk quiz',e.message||'Unable to create quiz.');
   }finally{
     setBusy(false);
   }
 };

 const createCourse=async()=>{
   try{
     setBusy(true);setResult(null);
     if(!file) throw new Error('Choose a PDF first.');
     const d=await api.bulkCoursePdf(file,{title,category,level,language});
     setResult({kind:'course',...d});
     Alert.alert('Course created',`${d.module_count} modules and ${d.lesson_count} lessons were created as a draft.`);
   }catch(e){Alert.alert('PDF course',e.message);}
   finally{setBusy(false);}
 };

 return <AppShell>
   <Header eyebrow="Admin only" title="Bulk Content Studio" subtitle="Create a complete quiz from JSON or turn a study PDF into a reviewable course draft." right={<Button title="← Dashboard" variant="secondary" onPress={onBack}/>}/>
   <View style={{flexDirection:'row',gap:8,marginBottom:14,flexWrap:'wrap'}}>
     <Button title="📝 Bulk Quiz" onPress={()=>setTab('quiz')} variant={tab==='quiz'?'primary':'secondary'}/>
     <Button title="📄 PDF → Course" onPress={()=>setTab('course')} variant={tab==='course'?'primary':'secondary'}/>
   </View>

   {tab==='quiz' ? <Card>
     <Text style={{fontSize:21,fontWeight:'900',color:colors.navy}}>Bulk Quiz JSON</Text>
     <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>Paste 1, 10, 50 or more MCQs. The backend validates every option and correct answer, then saves the quiz as a draft.</Text>
     <Field label="Quiz JSON" value={quizJson} onChangeText={setQuizJson} multiline placeholder="Paste JSON here..." style={{minHeight:420}}/>
     <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title={busy?'Creating…':'Create Quiz Draft'} onPress={createQuiz} disabled={busy}/><Button title="Reset Sample" variant="secondary" onPress={()=>setQuizJson(JSON.stringify(SAMPLE,null,2))}/></View>
     <Card style={{marginTop:14,backgroundColor:'#F8F9FD'}}>
       <Text style={{fontWeight:'900',color:colors.navy}}>Required format</Text>
       <Text style={{fontFamily:'monospace',fontSize:11,color:colors.text,marginTop:8}}>{`{
  "title": "English Grammar - Bulk Quiz",
  "category": "English",
  "description": "10-question practice test",
  "passing_percentage": 60,
  "duration_minutes": 20,
  "questions": [
    {
      "question": "Question text",
      "options": ["A", "B", "C", "D"],
      "correct_answer": 1,
      "explanation": "Why option B is correct"
    }
  ]
}`}</Text>
       <Text style={{color:colors.muted,lineHeight:20,marginTop:10}}>correct_answer is zero-based: 0 = first option, 1 = second option, 2 = third option, 3 = fourth option. Quiz categories are flexible, so values such as English, Grammar, CAT, Java or Banking are accepted.</Text>
     </Card>
   </Card> : <Card>
     <Text style={{fontSize:21,fontWeight:'900',color:colors.navy}}>PDF → Course Generator</Text>
     <Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>Upload an educational PDF in almost any normal textbook/tutorial layout. The importer first uses the PDF outline, then a detected Contents/Table of Contents, then heading typography/numbering as a fallback. It preserves source order and page ranges, keeps the original PDF, and never invents missing content.</Text>
     <Button title={file?`Selected: ${file.name}`:'Choose PDF'} variant="secondary" onPress={pickPdf} style={{marginTop:14}}/>
     <Field label="Course title (optional)" value={title} onChangeText={setTitle} placeholder="Auto-detect from PDF if blank"/>
     <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
       <View style={{flex:1,minWidth:220}}><DropdownSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES.map(x=>({value:x,label:x}))}/></View>
       <View style={{flex:1,minWidth:220}}><DropdownSelect label="Level" value={level} onChange={setLevel} options={['Beginner','Intermediate','Advanced'].map(x=>({value:x,label:x}))}/></View>
       <View style={{flex:1,minWidth:220}}><DropdownSelect label="Language" value={language} onChange={setLanguage} options={['English','Hindi','Hinglish','Other'].map(x=>({value:x,label:x}))}/></View>
     </View>
     <Button title={busy?'Processing PDF…':'Generate Course Draft'} onPress={createCourse} disabled={busy}/>
     <Card style={{marginTop:14,backgroundColor:'#F8F9FD'}}><Text style={{fontWeight:'900',color:colors.navy}}>PDF format — no fixed template required</Text><Text style={{color:colors.text,lineHeight:21,marginTop:7}}>✓ Normal text PDF, textbook, tutorial, study guide or manual is supported{`\n`}✓ A PDF outline/bookmark tree is preferred when available{`\n`}✓ A Contents/Table of Contents page is helpful but not mandatory{`\n`}✓ Numbered chapters/sections such as 1, 1.1, 1.2 are understood{`\n`}✓ Publisher-specific layouts are supported; the importer does not depend on one exact design{`\n`}✓ Bullets, examples, exercises, rules and paragraphs are preserved as source text{`\n`}✓ The original PDF is stored and each lesson keeps its source page range{`\n`}✓ If the uploaded PDF is incomplete, missing topics are not replaced with invented text{`\n`}✕ A scanned/image-only PDF needs OCR before editable text lessons can be generated</Text></Card>
     <Card style={{marginTop:10,backgroundColor:'#F0EEFF',borderColor:'#C7D2FE'}}><Text style={{fontWeight:'900',color:colors.navy}}>AI prompt for creating a course PDF</Text><Text style={{color:colors.text,lineHeight:21,marginTop:7}}>“Create a complete educational course PDF. Use a clear learning hierarchy such as chapters and sections, but do not depend on a specific template. If a Contents/Table of Contents or PDF outline is used, make sure every listed chapter/section has its full body later in the document. Keep headings consistent enough to be recognized, preserve examples, tables, exercises and code, and do not omit or merge educational sections.”</Text></Card>
     <Card style={{marginTop:10,backgroundColor:'#FFF7ED',borderColor:'#FED7AA'}}><Text style={{fontWeight:'900',color:'#9A3412'}}>Important</Text><Text style={{color:'#9A3412',lineHeight:20,marginTop:5}}>The importer does not invent missing chapter content. If a topic is present in the TOC but its body is absent from the uploaded PDF, that lesson remains a draft and clearly shows that source content is missing.</Text></Card>
   </Card>}

   {result&&<Card style={{marginTop:14,borderColor:colors.success}}>
     <Badge tone="green">Draft created</Badge>
     <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginTop:8}}>{result.kind==='quiz'?'Quiz ready for review':'Course ready for review'}</Text>
     <Text style={{color:colors.muted,marginTop:5}}>{result.message}</Text>
     {result.kind==='quiz'&&<Text style={{marginTop:8,fontWeight:'800'}}>{result.question_count} questions</Text>}
     {result.kind==='course'&&<><Text style={{marginTop:8,fontWeight:'800'}}>{result.module_count} topics · {result.lesson_count} lessons</Text>{result.source_topic_count!=null&&<Text style={{fontSize:12,color:colors.muted,marginTop:5}}>PDF TOC topics: {result.source_topic_count} · detailed source content found: {result.source_topics_with_content||0}</Text>}</>}
     <Text style={{fontSize:11,color:colors.muted,marginTop:8}}>Open Courses → Course Builder to review, edit and publish topics/lessons.</Text>
   </Card>}
 </AppShell>
}
