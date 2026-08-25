import React, {useEffect, useMemo, useRef, useState} from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AppShell, Badge, Button, Card, Header, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

function Option({ index, text, selected, onPress, disabled }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({
    flexDirection:'row', alignItems:'center', gap:10,
    borderWidth:1.2, borderColor:selected?colors.primary:colors.border,
    backgroundColor:selected?colors.blueSoft:'#fff', borderRadius:13, padding:13, marginBottom:8,
    opacity:pressed?0.8:1,
  })}>
    <View style={{width:30,height:30,borderRadius:9,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.primary:'#F7F7FB',borderWidth:1,borderColor:selected?colors.primary:colors.border}}>
      <Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:selected?'#fff':colors.navy}}>{String.fromCharCode(65+index)}</Text>
    </View>
    <Text style={{flex:1,fontFamily:colors.fontFamily,color:colors.navy,fontSize:13,fontWeight:selected?'900':'700',lineHeight:20}}>{text}</Text>
    {selected&&<Text style={{color:colors.primary,fontSize:17}}>✓</Text>}
  </Pressable>;
}

export default function AdaptiveTestScreen() {
  const [test,setTest]=useState(null),[answers,setAnswers]=useState({}),[current,setCurrent]=useState(0),[result,setResult]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[checking,setChecking]=useState(true);
  const saveTimer=useRef(null); const hydrated=useRef(false);
  const questions=test?.questions||[]; const answered=Object.keys(answers).length; const percentage=questions.length?Math.round(answered/questions.length*100):0; const question=questions[current];

  const hydrate=payload=>{
    if(!payload?.active && !payload?.test_id) return false;
    const next={...payload,questions:payload.questions||[]};
    setTest(next); setAnswers(payload.answers||{}); setCurrent(Math.min(Math.max(0,Number(payload.current_index||0)),Math.max(0,(payload.questions||[]).length-1))); setResult(null); hydrated.current=true; return true;
  };

  useEffect(()=>{
    let alive=true;
    api.adaptiveCurrent().then(payload=>{if(alive)hydrate(payload)}).catch(()=>{}).finally(()=>{if(alive)setChecking(false)});
    return()=>{alive=false;if(saveTimer.current)clearTimeout(saveTimer.current)};
  },[]);

  useEffect(()=>{
    if(!hydrated.current||!test?.test_id||result)return;
    if(saveTimer.current)clearTimeout(saveTimer.current);
    saveTimer.current=setTimeout(()=>api.adaptiveSave({test_id:test.test_id,answers,current_index:current}).catch(()=>{}),450);
    return()=>{if(saveTimer.current)clearTimeout(saveTimer.current)};
  },[test?.test_id,answers,current,result]);

  const start=async()=>{
    setBusy(true);setError('');
    try { const next=await api.adaptiveTest({count:10}); if(!next?.test_id||!Array.isArray(next.questions)||!next.questions.length)throw new Error('No questions are available for the mock test.'); hydrate(next); }
    catch(e){setError(e?.message||'Unable to start mock test.');Alert.alert('Mock Test',e?.message||'Unable to start mock test.');}
    finally{setBusy(false)}
  };

  const submit=async()=>{
    if(!test?.test_id)return;
    if(answered<questions.length){
      const ok=await new Promise(resolve=>Alert.alert('Submit mock test?',`You have answered ${answered} of ${questions.length}. Unanswered questions will receive no marks.`,[{text:'Continue',onPress:()=>resolve(true)},{text:'Cancel',style:'cancel',onPress:()=>resolve(false)}]));
      if(!ok)return;
    }
    setBusy(true);
    try{const r=await api.adaptiveSubmit({test_id:test.test_id,answers});setResult(r);}
    catch(e){Alert.alert('Submit Mock Test',e?.message||'Unable to submit the mock test.');}
    finally{setBusy(false)}
  };

  const reset=()=>{setTest(null);setAnswers({});setCurrent(0);setResult(null);setError('');hydrated.current=false;};

  if(result)return <AppShell><View style={{maxWidth:820,width:'100%',alignSelf:'center'}}><Header eyebrow="Mock test result" title="Mock Test Result" subtitle="Review your performance and continue practising."/><Card style={{alignItems:'center',padding:34}}><View style={{width:96,height:96,borderRadius:48,backgroundColor:result.passed?colors.greenSoft:colors.orangeSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:38}}>{result.passed?'🏆':'📚'}</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:13,color:colors.muted,marginTop:15}}>Mock test completed</Text><Text style={{fontFamily:colors.fontFamily,fontSize:56,fontWeight:'900',color:colors.navy}}>{result.percentage}%</Text><Badge tone={result.passed?'green':'orange'}>{result.passed?'Passed':'Keep practising'}</Badge><Text style={{fontFamily:colors.fontFamily,marginTop:12,color:colors.muted}}>{result.correct} correct · {Math.max(0,result.total-result.correct)} wrong</Text><View style={{width:'100%',marginTop:18}}><ProgressBar value={result.percentage} color={result.passed?colors.success:colors.warning}/></View><Text style={{fontFamily:colors.fontFamily,color:colors.muted,marginTop:12}}>Next recommended level: <Text style={{fontWeight:'900',color:colors.navy}}>{result.next_level}</Text></Text><View style={{flexDirection:'row',gap:9,width:'100%',marginTop:22}}><Button title="New Mock Test" onPress={reset} variant="secondary" style={{flex:1}}/><Button title="Try Again" onPress={start} disabled={busy} style={{flex:1}}/></View></Card></View></AppShell>;

  if(checking)return <AppShell><Header eyebrow="Smart practice" title="Mock Test" subtitle="Checking for an unfinished test…"/><Card><Text style={{fontFamily:colors.fontFamily,color:colors.muted}}>Restoring your saved session…</Text></Card></AppShell>;

  return <AppShell><Header eyebrow="Smart practice" title="Mock Test" subtitle="Take an adaptive mock test. Your answers are saved while you work, so you can leave and continue later."/>{error?<Card style={{borderColor:colors.danger,backgroundColor:'#FFF8F9'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.danger}}>Unable to start mock test</Text><Text style={{fontFamily:colors.fontFamily,color:colors.muted,marginTop:5}}>{error}</Text></Card>:null}
    {!test?<Card style={{maxWidth:900}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',gap:12}}><View style={{flex:1}}><Badge tone="purple">Adaptive practice</Badge><Text style={{fontFamily:colors.fontFamily,fontSize:22,fontWeight:'900',color:colors.navy,marginTop:10}}>Ready for your mock test?</Text><Text style={{fontFamily:colors.fontFamily,color:colors.muted,lineHeight:20,marginTop:5}}>10 questions · saved progress · submit at any point · instant result.</Text></View><Text style={{fontSize:34}}>🎯</Text></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:16}}><Badge tone="purple">10 Questions</Badge><Badge tone="orange">Adaptive Difficulty</Badge><Badge tone="green">60% Pass</Badge></View><Button title={busy?'Preparing Mock Test…':'Start Mock Test'} onPress={start} disabled={busy} style={{marginTop:20}}/></Card>:
      <View style={{maxWidth:980}}><Card style={{backgroundColor:colors.hero,borderColor:colors.hero}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12}}><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontSize:22,fontWeight:'900',color:'#fff'}}>Mock Test</Text><Text style={{fontFamily:colors.fontFamily,color:'#D6D8E2',marginTop:4}}>{test.adaptive_level} level · {questions.length} questions</Text></View><Badge tone="purple">{answered}/{questions.length}</Badge></View><View style={{marginTop:14}}><ProgressBar value={percentage} color="#8B7CFF"/><Text style={{fontFamily:colors.fontFamily,color:'#D6D8F2',fontSize:10,marginTop:5}}>{answered} answered · {questions.length-answered} remaining</Text></View></Card>
        {question&&<Card style={{marginTop:14}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><Badge tone="orange">{question.difficulty||test.adaptive_level}</Badge><Text style={{fontFamily:colors.fontFamily,color:colors.muted,fontSize:11}}>Question {current+1} of {questions.length}</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:20,fontWeight:'900',color:colors.navy,lineHeight:28,marginTop:14}}>{question.question||question.text}</Text><View style={{marginTop:17}}>{(question.options||[]).map((option,index)=>{const label=typeof option==='object'?(option.text||option.label||option.value||''):String(option);const id=api.idOf(question);return <Option key={index} index={index} text={label} selected={String(answers[id])===String(index)} disabled={busy} onPress={()=>setAnswers(prev=>({...prev,[id]:index}))}/>})}</View><View style={{flexDirection:'row',justifyContent:'space-between',gap:10,marginTop:8}}><Button title="← Previous" variant="secondary" onPress={()=>setCurrent(Math.max(0,current-1))} disabled={current===0||busy}/>{current<questions.length-1?<Button title="Next Question →" onPress={()=>setCurrent(Math.min(questions.length-1,current+1))} disabled={busy}/>:<Button title={busy?'Submitting…':'Submit Mock Test'} onPress={submit} disabled={busy}/>}</View><Button title="Save Progress" variant="secondary" onPress={()=>api.adaptiveSave({test_id:test.test_id,answers,current_index:current}).then(()=>Alert.alert('Mock Test','Progress saved. You can leave and resume later.')).catch(e=>Alert.alert('Mock Test',e?.message||'Unable to save progress.'))} disabled={busy} style={{marginTop:10}}/></Card>}
      </View>}
  </AppShell>;
}
