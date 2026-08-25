import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Alert, Pressable, Text, View, useWindowDimensions} from 'react-native';
import {AppShell, Badge, Button, Card, ErrorState, Loading, ProgressBar} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

function Option({letter,text,selected,onPress,disabled}) {
  return <Pressable disabled={disabled} onPress={onPress} style={({pressed})=>({flexDirection:'row',alignItems:'center',gap:11,borderWidth:1.3,borderColor:selected?colors.primary:colors.border,backgroundColor:selected?colors.blueSoft:'#fff',borderRadius:13,padding:13,marginBottom:9,opacity:pressed?.78:1})}>
    <View style={{width:32,height:32,borderRadius:10,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.primary:'#F7F7FB',borderWidth:1,borderColor:selected?colors.primary:colors.border}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:selected?'#fff':colors.navy}}>{letter}</Text></View>
    <Text style={{fontFamily:colors.fontFamily,flex:1,fontSize:13,fontWeight:selected?'900':'700',color:colors.navy,lineHeight:20}}>{text}</Text>
    {selected&&<Text style={{fontSize:18,color:colors.primary}}>✓</Text>}
  </Pressable>;
}

const formatTime = seconds => `${String(Math.max(0,Math.floor(seconds/60))).padStart(2,'0')}:${String(Math.max(0,seconds%60)).padStart(2,'0')}`;

export default function StudentQuizScreen({quizId,onBack,backLabel='Back to Quizzes'}) {
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
  const [remaining,setRemaining]=useState(null);
  const hydrated=useRef(false);
  const saveTimer=useRef(null);
  const latestRef=useRef({answers:{},current:0,attempt:null});

  const load=async()=>{
    try {
      setError('');
      const bundle=await api.quizBundle(quizId);
      const qs=api.listOf(bundle?.questions);
      const active=bundle?.active_attempt;
      const restoredAnswers=active?.answers||{};
      const restoredCurrent=Math.min(Math.max(0,Number(active?.current_index||0)),Math.max(0,qs.length-1));
      setQuiz(bundle?.quiz||null);
      setQuestions(qs);
      setAttemptMeta(bundle||null);
      setAnswers(restoredAnswers);
      setCurrent(restoredCurrent);
      setAttempt(active ? {attempt_id:String(active._id),quiz_id:quizId,duration_minutes:bundle?.quiz?.duration_minutes||15,started_at:active.started_at,resumed:true} : null);
      setResult(null);
      hydrated.current=true;
    } catch(e) {
      setError(e?.message||'Unable to open this quiz.');
    }
  };

  useEffect(()=>{hydrated.current=false;load();return()=>{if(saveTimer.current)clearTimeout(saveTimer.current)}},[quizId]);

  useEffect(()=>{latestRef.current={answers,current,attempt}},[answers,current,attempt]);

  // Persist answers/current position automatically. This is the important
  // recovery path for refresh, tab close, navigation, or temporary network loss.
  useEffect(()=>{
    if(!hydrated.current || !attempt?.attempt_id || result) return;
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(async()=>{
      try { await api.saveQuizAttempt(quizId,{attempt_id:attempt.attempt_id,answers,current_index:current}); }
      catch(_) { /* keep local state; next change retries */ }
    },450);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current)};
  },[quizId,answers,current,attempt?.attempt_id,result]);

  // Server timestamp is authoritative enough for a client-side countdown.
  useEffect(()=>{
    if(!attempt?.started_at || !quiz?.duration_minutes || result) { setRemaining(null); return; }
    const duration=Number(quiz.duration_minutes||15)*60;
    const started=Date.parse(attempt.started_at);
    const tick=()=>{
      const left=Math.max(0,duration-Math.floor((Date.now()-started)/1000));
      setRemaining(left);
      if(left===0 && latestRef.current.attempt?.attempt_id) {
        api.submitQuiz(quizId,{attempt_id:latestRef.current.attempt.attempt_id,answers:latestRef.current.answers||{}})
          .then(setResult)
          .catch(()=>{})
          .finally(()=>setBusy(false));
      }
    };
    tick();
    const id=setInterval(tick,1000);
    return()=>clearInterval(id);
  },[attempt?.attempt_id,attempt?.started_at,quiz?.duration_minutes,result]);

  const answered=useMemo(()=>Object.keys(answers).length,[answers]);
  const completion=questions.length?Math.round(answered/questions.length*100):0;
  const q=questions[current];

  const start=async()=>{
    if(attempt) return;
    if(attemptMeta && attemptMeta.can_start===false && !attemptMeta.active_attempt){Alert.alert('Quiz','Maximum attempts reached for this quiz.');return;}
    setBusy(true);
    try {
      const a=await api.startQuiz(quizId);
      setAttempt(a);
      setAnswers(a.answers||{});
      setCurrent(Math.min(Number(a.current_index||0),Math.max(0,questions.length-1)));
      setAttemptMeta(prev=>({...prev,active_attempt:a,can_start:true}));
    } catch(e) { Alert.alert('Quiz',e.message); }
    finally {setBusy(false);}
  };

  const submit=async(force=false)=>{
    if(!attempt?.attempt_id){if(!force)Alert.alert('Quiz','Start the quiz first.');return;}
    if(!force && answered<questions.length){
      // Partial submission is intentionally supported. Unanswered questions are
      // graded as unanswered/wrong rather than blocking the student.
      const ok=await new Promise(resolve=>Alert.alert('Submit quiz?',`You have answered ${answered} of ${questions.length}. Unanswered questions will receive no marks.`,[{text:'Continue',onPress:()=>resolve(true)},{text:'Cancel',style:'cancel',onPress:()=>resolve(false)}]));
      if(!ok)return;
    }
    setBusy(true);
    try {
      const r=await api.submitQuiz(quizId,{attempt_id:attempt.attempt_id,answers});
      setResult(r);
    } catch(e) { if(!force)Alert.alert('Submit failed',e.message); }
    finally {setBusy(false);}
  };

  const handleBack=async()=>{
    if(attempt&&!result){
      try { await api.saveQuizAttempt(quizId,{attempt_id:attempt.attempt_id,answers,current_index:current}); } catch(_) {}
    }
    onBack?.();
  };

  if(error)return <AppShell><ErrorState title="Quiz could not load" message={error} onRetry={load}/></AppShell>;
  if(!quiz)return <AppShell><Loading label="Opening quiz…"/></AppShell>;

  if(result){
    const details=Array.isArray(result.details)?result.details:[];
    const optionLabel=(d,v)=>{
      if(v===undefined||v===null||v==='') return 'Not answered';
      const opts=d.options||[]; const n=Number(v);
      if(Number.isInteger(n)&&n>=0&&n<opts.length){const o=opts[n];return typeof o==='object'?(o.text||o.label||o.value||String(o)):String(o)}
      return String(v);
    };
    return <AppShell><View style={{maxWidth:900,width:'100%',alignSelf:'center'}}>
      <Pressable onPress={handleBack} style={{marginBottom:10}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>‹ {backLabel}</Text></Pressable>
      <Card style={{alignItems:'center',padding:30}}><View style={{width:92,height:92,borderRadius:46,backgroundColor:result.passed?colors.greenSoft:colors.orangeSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:38}}>{result.passed?'🏆':'📚'}</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:13,color:colors.muted,marginTop:15}}>Quiz completed</Text><Text style={{fontFamily:colors.fontFamily,fontSize:56,fontWeight:'900',color:colors.navy}}>{result.percentage}%</Text><Badge tone={result.passed?'green':'orange'}>{result.passed?'Passed':'Keep practicing'}</Badge><Text style={{fontFamily:colors.fontFamily,marginTop:12,color:colors.muted}}>{result.correct_count} correct · {result.wrong_count} wrong</Text><View style={{width:'100%',marginTop:18}}><ProgressBar value={result.percentage} color={result.passed?colors.success:colors.warning}/></View></Card>
      <View style={{marginTop:16}}><Text style={{fontFamily:colors.fontFamily,fontSize:21,fontWeight:'900',color:colors.navy,marginBottom:10}}>Answer Review</Text>{details.map((d,i)=><Card key={d.question_id||i} style={{marginBottom:12,borderColor:d.correct?colors.green:colors.orange}}><View style={{flexDirection:'row',justifyContent:'space-between',gap:10}}><Text style={{fontFamily:colors.fontFamily,flex:1,fontSize:15,fontWeight:'900',color:colors.navy}}>Q{i+1}. {d.question}</Text><Badge tone={d.correct?'green':'orange'}>{d.correct?'Correct':'Not correct'}</Badge></View><View style={{marginTop:12,gap:7}}><Text style={{fontFamily:colors.fontFamily,fontSize:12,color:colors.muted}}>Your answer: <Text style={{fontWeight:'900',color:d.correct?colors.success:colors.orange}}>{optionLabel(d,d.submitted)}</Text></Text><Text style={{fontFamily:colors.fontFamily,fontSize:12,color:colors.muted}}>Correct answer: <Text style={{fontWeight:'900',color:colors.success}}>{d.correct_answer_text||optionLabel(d,d.correct_answer)}</Text></Text>{d.explanation?<View style={{marginTop:5,padding:11,borderRadius:11,backgroundColor:colors.purpleSoft}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>Explanation</Text><Text style={{fontFamily:colors.fontFamily,fontSize:12,lineHeight:18,color:colors.navy,marginTop:3}}>{d.explanation}</Text></View>:null}</View></Card>)}</View>
      <Button title={backLabel} onPress={handleBack} style={{marginTop:8,width:'100%'}}/>
    </View></AppShell>;
  }

  return <AppShell>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><Pressable onPress={handleBack}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>‹ {backLabel}</Text></Pressable><View style={{flexDirection:'row',gap:8}}><Badge tone="purple">{quiz.category||'Practice'}</Badge><Badge tone="orange">{remaining==null?`${quiz.duration_minutes||20}:00`:formatTime(remaining)}</Badge></View></View>
    <View style={{flexDirection:mobile?'column':'row',gap:14,alignItems:'stretch'}}>
      <View style={{flex:1}}>
        <Card style={{backgroundColor:colors.hero,borderColor:colors.hero,padding:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:10}}><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'900',color:'#AFA8FF',letterSpacing:1.1}}>TEST SERIES • QUIZ</Text><Text style={{fontFamily:colors.fontFamily,fontSize:24,fontWeight:'900',color:'#fff',marginTop:5}}>{quiz.title||quiz.name}</Text><Text style={{fontFamily:colors.fontFamily,color:'#D6D8E2',fontSize:11,marginTop:5}}>{questions.length} Questions · Pass {quiz.passing_percentage||60}%</Text></View>{attempt&&<Button title={busy?'Submitting…':'Submit Quiz'} onPress={()=>submit(false)} disabled={busy}/>}</View></Card>
        {!attempt&&<Card><Text style={{fontFamily:colors.fontFamily,fontSize:19,fontWeight:'900',color:colors.navy}}>{attemptMeta?.active_attempt?'Continue your quiz':'Ready to test your knowledge?'}</Text><Text style={{fontFamily:colors.fontFamily,color:colors.muted,lineHeight:20,marginTop:5}}>{attemptMeta?.active_attempt?'Your answers are saved on the server. You can safely continue after leaving or refreshing the page.':'Answer as many questions as you want and submit whenever you are ready.'}</Text><View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:14}}><Badge tone="purple">{questions.length} Questions</Badge><Badge tone="orange">{quiz.duration_minutes||20} Minutes</Badge><Badge tone="green">{quiz.passing_percentage||60}% Pass</Badge></View><Button title={busy?'Starting…':attemptMeta?.active_attempt?'Resume Quiz':'Start Quiz'} onPress={start} disabled={busy||(!attemptMeta?.active_attempt&&attemptMeta?.can_start===false)} style={{marginTop:18,width:'100%'}}/></Card>}
        {attempt&&q&&<Card style={{padding:20}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted}}>Question {current+1} of {questions.length}</Text><Badge tone="purple">{answered}/{questions.length} answered</Badge></View><Text style={{fontFamily:colors.fontFamily,fontSize:20,fontWeight:'900',color:colors.navy,lineHeight:28,marginTop:14}}>{q.question||q.text}</Text><View style={{marginTop:17}}>{(q.options||[]).map((option,index)=>{const label=typeof option==='object'?(option.text||option.label||option.value||''):String(option);return <Option key={index} letter={String.fromCharCode(65+index)} text={label} selected={String(answers[api.idOf(q)])===String(index)} disabled={busy} onPress={()=>setAnswers(prev=>({...prev,[api.idOf(q)]:index}))}/>})}</View><View style={{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:8}}><Button title="← Previous" variant="secondary" onPress={()=>setCurrent(Math.max(0,current-1))} disabled={current===0||busy}/>{current<questions.length-1?<Button title="Next Question →" onPress={()=>setCurrent(Math.min(questions.length-1,current+1))} disabled={busy}/>:<Button title={busy?'Submitting…':'Submit Quiz'} onPress={()=>submit(false)} disabled={busy}/>}</View></Card>}
      </View>
      <View style={{width:mobile?'100%':250}}><Card><Text style={{fontFamily:colors.fontFamily,fontSize:14,fontWeight:'900',color:colors.navy}}>Progress</Text><View style={{marginTop:12}}><ProgressBar value={completion}/><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted,marginTop:6}}>{answered} answered · {questions.length-answered} remaining</Text></View><Button title="Save & Exit" variant="secondary" onPress={handleBack} disabled={busy} style={{marginTop:14,width:'100%'}}/></Card></View>
    </View>
  </AppShell>;
}
