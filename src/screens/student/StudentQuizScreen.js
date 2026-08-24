import React,{useEffect,useMemo,useState} from 'react';
import {Alert,Pressable,ScrollView,Text,View,useWindowDimensions} from 'react-native';
import {AppShell,Badge,Button,Card,ErrorState,Loading,ProgressBar} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

function Option({letter,text,selected,onPress,disabled}){return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:11,borderWidth:1.3,borderColor:selected?colors.primary:colors.border,backgroundColor:selected?colors.blueSoft:'#fff',borderRadius:13,padding:13,marginBottom:9,opacity:pressed?.78:1})}><View style={{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.primary:'#F7F7FB',borderWidth:1,borderColor:selected?colors.primary:colors.border}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:selected?'#fff':colors.navy}}>{letter}</Text></View><Text style={{fontFamily:colors.fontFamily,flex:1,fontSize:13,fontWeight:selected?'900':'700',color:colors.navy,lineHeight:20}}>{text}</Text>{selected&&<Text style={{fontSize:18,color:colors.primary}}>✓</Text>}</Pressable>}

export default function StudentQuizScreen({quizId,onBack,backLabel="Back to Quizzes"}) {
 const {width}=useWindowDimensions();
 const mobile=width<820;
 const [quiz,setQuiz]=useState(null);
 const [questions,setQuestions]=useState([]);
 const [attemptMeta,setAttemptMeta]=useState(null);
 const [answers,setAnswers]=useState({});
 const [current,setCurrent]=useState(0);
 const [attempt,setAttempt]=useState(null);
 const [result,setResult]=useState(null);
 const [error,setError]=useState('');
 const [busy,setBusy]=useState(false);
 const load=async()=>{
   try{
     setError('');
     const bundle=await api.quizBundle(quizId);
     setQuiz(bundle?.quiz||null);
     setQuestions(api.listOf(bundle?.questions));
     setAttemptMeta(bundle||null);
     setAnswers({});
     setCurrent(0);
     setAttempt(null);
     setResult(null);
   }catch(e){
     setError(e?.message||'Unable to open this quiz.');
   }
 };
 useEffect(()=>{load()},[quizId]);
 const answered=useMemo(()=>Object.keys(answers).length,[answers]); const completion=questions.length?Math.round(answered/questions.length*100):0; const q=questions[current];
 if(error)return <AppShell><ErrorState title="Quiz could not load" message={error} onRetry={load}/></AppShell>;
 if(!quiz)return <AppShell><Loading label="Opening quiz…"/></AppShell>;
 const start=async()=>{if(attemptMeta && attemptMeta.can_start===false){Alert.alert('Quiz','Maximum attempts reached for this quiz.');return;}setBusy(true);try{const a=await api.startQuiz(quizId);setAttempt(a)}catch(e){console.warn('[Student API] Quiz:', e?.message || e)}finally{setBusy(false)}};
 const submit=async()=>{try{if(!attempt){Alert.alert('Quiz','Start the quiz first.');return}if(answered<questions.length){Alert.alert('Almost there',`Please answer all ${questions.length} questions before submitting.`);return}setBusy(true);const r=await api.submitQuiz(quizId,{attempt_id:attempt.attempt_id,answers});setResult(r)}catch(e){console.warn('[Student API] Quiz submit:', e?.message || e)}finally{setBusy(false)}};
 if(result){
  const details=Array.isArray(result.details)?result.details:[];
  const optionLabel=(d,v)=>{
    if(v===undefined||v===null||v==='') return 'Not answered';
    if(v===d.correct_answer && d.correct_answer_text) return d.correct_answer_text;
    if(v===d.submitted && d.submitted_text) return d.submitted_text;
    const opts=d.options||[]; const n=Number(v);
    if(Number.isInteger(n)&&n>=0&&n<opts.length){const o=opts[n];return typeof o==='object'?(o.text||o.label||o.value||String(o)):String(o)}
    return String(v);
  };
  return <AppShell><View style={{maxWidth:900,width:'100%',alignSelf:'center'}}>
    <Pressable onPress={onBack} style={{marginBottom:10}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>‹  {backLabel}</Text></Pressable>
    <Card style={{alignItems:'center',padding:30}}><View style={{width:92,height:92,borderRadius:46,backgroundColor:result.passed?colors.greenSoft:colors.orangeSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:38}}>{result.passed?'🏆':'📚'}</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:13,color:colors.muted,marginTop:15}}>Quiz completed</Text><Text style={{fontFamily:colors.fontFamily,fontSize:56,fontWeight:'900',color:colors.navy}}>{result.percentage}%</Text><Badge tone={result.passed?'green':'orange'}>{result.passed?'Passed':'Keep practicing'}</Badge><Text style={{fontFamily:colors.fontFamily,marginTop:12,color:colors.muted}}>{result.correct_count} correct · {result.wrong_count} wrong</Text><View style={{width:'100%',marginTop:18}}><ProgressBar value={result.percentage} color={result.passed?colors.success:colors.warning}/></View></Card>
    <View style={{marginTop:16}}><Text style={{fontFamily:colors.fontFamily,fontSize:21,fontWeight:'900',color:colors.navy,marginBottom:10}}>Answer Review</Text>{details.map((d,i)=><Card key={d.question_id||i} style={{marginBottom:12,borderColor:d.correct?colors.green:colors.orange}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{fontFamily:colors.fontFamily,flex:1,fontSize:15,fontWeight:'900',color:colors.navy}}>Q{i+1}. {d.question}</Text><Badge tone={d.correct?'green':'orange'}>{d.correct?'Correct':'Incorrect'}</Badge></View><View style={{marginTop:12,gap:7}}><Text style={{fontFamily:colors.fontFamily,fontSize:12,color:colors.muted}}>Your answer: <Text style={{fontWeight:'900',color:d.correct?colors.success:colors.orange}}>{optionLabel(d,d.submitted)}</Text></Text><Text style={{fontFamily:colors.fontFamily,fontSize:12,color:colors.muted}}>Correct answer: <Text style={{fontWeight:'900',color:colors.success}}>{d.correct_answer_text||optionLabel(d,d.correct_answer)}</Text></Text>{d.explanation?<View style={{marginTop:5,padding:11,borderRadius:11,backgroundColor:colors.purpleSoft}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>Explanation</Text><Text style={{fontFamily:colors.fontFamily,fontSize:12,lineHeight:18,color:colors.navy,marginTop:3}}>{d.explanation}</Text></View>:null}</View></Card>)}</View>
    <Button title={backLabel} onPress={onBack} style={{marginTop:8,width:'100%'}}/>
  </View></AppShell>;
}
 return <AppShell>
   <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Pressable onPress={onBack}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>‹  {backLabel}</Text></Pressable><View style={{flexDirection:'row',gap:8}}><Badge tone="purple">{quiz.category||'Practice'}</Badge><Badge tone="orange">⏱ {quiz.duration_minutes||20}:00</Badge></View></View>
   <View style={{flexDirection:mobile?'column':'row',gap:14,alignItems:'stretch'}}>
     <View style={{flex:1}}>
       <Card style={{backgroundColor:colors.hero,borderColor:colors.hero,padding:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10}}><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'900',color:'#AFA8FF',letterSpacing:1.1}}>TEST SERIES • QUIZ</Text><Text style={{fontFamily:colors.fontFamily,fontSize:24,fontWeight:'900',color:'#fff',marginTop:5}}>{quiz.title||quiz.name}</Text><Text style={{fontFamily:colors.fontFamily,color:'#D6D8E2',fontSize:11,marginTop:5}}>{questions.length} Questions · Pass {quiz.passing_percentage||60}%</Text></View>{attempt&&<Button title={busy?'Submitting…':'Submit Quiz'} onPress={submit} disabled={busy}/>}</View></Card>
       {!attempt&&<Card><Text style={{fontFamily:colors.fontFamily,fontSize:19,fontWeight:'900',color:colors.navy}}>Ready to test your knowledge?</Text><Text style={{fontFamily:colors.fontFamily,color:colors.muted,lineHeight:20,marginTop:5}}>Answer every question and submit when you are ready.</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:14}}><Badge tone="purple">{questions.length} Questions</Badge><Badge tone="orange">{quiz.duration_minutes||20} Minutes</Badge><Badge tone="green">{quiz.passing_percentage||60}% Pass</Badge></View><Button title={attemptMeta?.can_start===false?'Maximum attempts reached':(busy?'Starting…':'Start Quiz')} onPress={start} disabled={busy||attemptMeta?.can_start===false} style={{marginTop:18,width:'100%'}}/></Card>}
       {attempt&&q&&<Card style={{padding:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted}}>Question {current+1} of {questions.length}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>1 Point</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:19,fontWeight:'900',color:colors.navy,lineHeight:27,marginTop:14}}>{q.question}</Text><View style={{marginTop:16}}>{(q.options||[]).map((o,oi)=>{const label=typeof o==='object'?(o.text||o.label||o.value||'Option'):String(o);return <Option key={oi} letter={String.fromCharCode(65+oi)} text={label} selected={String(answers[api.idOf(q)])===String(oi)} onPress={()=>setAnswers(prev=>({...prev,[api.idOf(q)]:oi}))}/>})}</View><View style={{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:8}}><Button title="← Previous" variant="secondary" onPress={()=>setCurrent(Math.max(0,current-1))} disabled={current===0}/>{current<questions.length-1?<Button title="Next Question →" onPress={()=>setCurrent(Math.min(questions.length-1,current+1))}/>:<Button title={busy?'Submitting…':'Submit Quiz'} onPress={submit} disabled={busy||answered<questions.length}/>}</View></Card>}
     </View>
     <View style={{width:mobile?'100%':250}}>
       {attempt&&<Card><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'900',color:colors.navy}}>Question Navigator</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:13}}>{questions.map((x,i)=>{const done=answers[api.idOf(x)]!==undefined;return <Pressable key={api.idOf(x)} onPress={()=>setCurrent(i)} style={{width:38,height:38,borderRadius:11,alignItems:'center',justifyContent:'center',backgroundColor:i===current?colors.primary:done?colors.greenSoft:'#F4F4F8',borderWidth:1,borderColor:i===current?colors.primary:colors.border}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:i===current?'#fff':done?colors.success:colors.navy}}>{i+1}</Text></Pressable>})}</View><View style={{marginTop:16}}><ProgressBar value={completion}/><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:6}}>{answered} answered · {questions.length-answered} remaining</Text></View></Card>}
       <Card><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'900',color:colors.navy}}>Quiz Summary</Text><View style={{flexDirection:'row',gap:8,marginTop:12}}><View style={{flex:1,backgroundColor:colors.purpleSoft,borderRadius:13,padding:10}}><Text style={{fontFamily:colors.fontFamily,fontSize:20,fontWeight:'900',color:colors.primary}}>{questions.length}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:9,color:colors.muted}}>Total</Text></View><View style={{flex:1,backgroundColor:colors.greenSoft,borderRadius:13,padding:10}}><Text style={{fontFamily:colors.fontFamily,fontSize:20,fontWeight:'900',color:colors.success}}>{answered}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:9,color:colors.muted}}>Answered</Text></View></View></Card>
     </View>
   </View>
 </AppShell>;
}
