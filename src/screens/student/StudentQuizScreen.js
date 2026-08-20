import React,{useEffect,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {AppShell,Badge,Button,Card,ErrorState,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

export default function StudentQuizScreen({quizId,onBack}){
 const [quiz,setQuiz]=useState(null),[questions,setQuestions]=useState([]),[answers,setAnswers]=useState({}),[attempt,setAttempt]=useState(null),[result,setResult]=useState(null),[error,setError]=useState('');
 const load=async()=>{try{setError('');const r=await Promise.allSettled([api.studentQuiz(quizId),api.quizQuestions(quizId)]);if(r[0].status!=='fulfilled')throw r[0].reason||new Error('Quiz could not be loaded.');setQuiz(r[0].value);setQuestions(r[1].status==='fulfilled'?api.listOf(r[1].value):[])}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[quizId]);
 if(error)return <AppShell><ErrorState title="Quiz could not load" message={error} onRetry={load}/></AppShell>;
 if(!quiz)return <AppShell><Loading label="Opening quiz…"/></AppShell>;
 const start=async()=>{try{const a=await api.startQuiz(quizId);setAttempt(a)}catch(e){Alert.alert('Quiz',e.message)}};
 const submit=async()=>{try{if(!attempt){Alert.alert('Quiz','Start the quiz first.');return}const r=await api.submitQuiz(quizId,{attempt_id:attempt.attempt_id,answers});setResult(r)}catch(e){Alert.alert('Submit failed',e.message)}};
 if(result)return <AppShell><Header title="Quiz Result" right={<Button title="← Back" variant="secondary" onPress={onBack}/>}/><Card style={{alignItems:'center',padding:28}}><Text style={{fontSize:18,color:colors.muted}}>Your score</Text><Text style={{fontSize:52,fontWeight:'900',color:colors.navy}}>{result.percentage}%</Text><Badge tone={result.passed?'green':'red'}>{result.passed?'Passed':'Needs practice'}</Badge><Text style={{marginTop:12,color:colors.muted}}>{result.correct_count} correct · {result.wrong_count} wrong</Text><View style={{marginTop:18}}><Button title="Back to course" onPress={onBack}/></View></Card></AppShell>;
 return <AppShell><Header eyebrow="Quiz" title={quiz.title||quiz.name} subtitle={`${quiz.duration_minutes||15} minutes · Passing ${quiz.passing_percentage||60}%`} right={<Button title="← Back" variant="secondary" onPress={onBack}/>}/>
 {!attempt&&<Card><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Ready?</Text><Text style={{color:colors.muted,marginTop:5}}>{questions.length} questions. Your answers will be scored after submission.</Text><View style={{marginTop:14}}><Button title="Start Quiz" onPress={start}/></View></Card>}
 {attempt&&questions.map((q,i)=><Card key={api.idOf(q)}><Text style={{fontSize:16,fontWeight:'900',color:colors.navy}}>{i+1}. {q.question}</Text><View style={{marginTop:10,gap:7}}>{(q.options||[]).map((o,oi)=><Button key={oi} title={`${String.fromCharCode(65+oi)}. ${o}`} variant={String(answers[api.idOf(q)])===String(oi)?'primary':'secondary'} onPress={()=>setAnswers({...answers,[api.idOf(q)]:oi})}/>)}</View></Card>)}
 {attempt&&<Button title="Submit Quiz" onPress={submit}/>}
 </AppShell>
}
