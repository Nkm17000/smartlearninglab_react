import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { AppShell, Badge, Button, Card, DropdownSelect, Empty, ErrorState, Field, Header, Loading } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const STATUS=['All','Published','Unpublished'];
const TYPES=['All','Standalone','Course Quiz'];
const QUESTION_STATE=['All','Ready','Empty'];
const CATEGORIES=['SSC','Railway','Banking','UPSC','Computer','Teaching','Defence','State Exams','General','English Spoken','Other'];
const SUBJECTS=['English','Hindi','Math','Reasoning','General Awareness','Current Affairs','Science','Physics','Chemistry','Biology','Computer','Java','Python','PHP','SQL','DBMS','Operating Systems','Networking','Spring Boot','Microservices','Aptitude','Other'];
const catsOf=q=>Array.isArray(q?.categories)&&q.categories.length?q.categories:(q?.category?[q.category]:['General']);

export default function AdminQuizzesScreen() {
  const [items,setItems]=useState([]),[search,setSearch]=useState(''),[category,setCategory]=useState('All'),[subject,setSubject]=useState('All'),[status,setStatus]=useState('All'),[type,setType]=useState('All'),[questionState,setQuestionState]=useState('All');
  const [loading,setLoading]=useState(true),[busyId,setBusyId]=useState(''),[error,setError]=useState('');
  const load=async()=>{setLoading(true);setError('');try{setItems(api.listOf(await api.quizzes()));}catch(e){setError(e?.message||'Unable to load quizzes.')}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const categories=useMemo(()=>['All',...Array.from(new Set(items.flatMap(x=>catsOf(x))))].sort((a,b)=>a.localeCompare(b)),[items]);
  const filtered=useMemo(()=>{const q=search.trim().toLowerCase();return items.filter(quiz=>{const questions=Array.isArray(quiz.question_ids)?quiz.question_ids.length:Number(quiz.question_count||0);const standalone=!quiz.course_id;const cats=catsOf(quiz);const text=[quiz.title,quiz.name,quiz.description,quiz.exam,quiz.subject,cats.join(' ')].filter(Boolean).join(' ').toLowerCase();return (!q||text.includes(q))&&(category==='All'||cats.some(x=>String(x).toLowerCase()===category.toLowerCase()))&&(subject==='All'||String(quiz.subject||'General').toLowerCase()===subject.toLowerCase())&&(status==='All'||(status==='Published'?quiz.is_published===true:quiz.is_published!==true))&&(type==='All'||(type==='Standalone'?standalone:!standalone))&&(questionState==='All'||(questionState==='Ready'?questions>0:questions===0));})},[items,search,category,subject,status,type,questionState]);
  const reset=()=>{setSearch('');setCategory('All');setSubject('All');setStatus('All');setType('All');setQuestionState('All')};
  const togglePublish=async quiz=>{const id=api.idOf(quiz);if(!id)return;const published=quiz.is_published===true;const questions=Array.isArray(quiz.question_ids)?quiz.question_ids.length:Number(quiz.question_count||0);if(!published&&questions===0){Alert.alert('Cannot publish quiz','Add at least one question before publishing this quiz.');return;}setBusyId(id);try{if(published)await api.unpublishQuiz(id);else await api.publishQuiz(id);await load()}catch(e){Alert.alert(published?'Unpublish quiz':'Publish quiz',e?.message||'Unable to update quiz status.')}finally{setBusyId('')}};
  const removeQuiz=quiz=>{const id=api.idOf(quiz);if(!id)return;Alert.alert('Delete quiz?',`This will delete "${quiz.title||quiz.name||'this quiz'}".`,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:async()=>{setBusyId(id);try{await api.deleteQuiz(id);await load()}catch(e){Alert.alert('Delete quiz',e?.message||'Unable to delete quiz.')}finally{setBusyId('')}}}])};
  if(error)return <AppShell><ErrorState title="Quizzes could not load" message={error} onRetry={load}/></AppShell>;
  if(loading)return <AppShell><Loading label="Loading quizzes..."/></AppShell>;
  return <AppShell>
    <Header eyebrow="Test Series" title="Quiz Management" subtitle="Search, filter, review and publish quizzes without changing the existing quiz workflow."/>
    <Card style={{backgroundColor:colors.navy,borderColor:colors.navy}}><View style={{flexDirection:'row',alignItems:'center',gap:12}}><Text style={{fontSize:32}}>📝</Text><View style={{flex:1}}><Text style={{color:'#fff',fontSize:22,fontWeight:'900'}}>Quiz catalog</Text><Text style={{color:'#E9EAF3',marginTop:4}}>Quickly find drafts, published tests, course quizzes and quizzes that still need questions.</Text></View><Badge tone="green">{items.filter(x=>x.is_published).length} Published</Badge></View></Card>
    <Card style={{backgroundColor:'#FBFBFE'}}>
      <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginBottom:4}}>Find a quiz</Text>
      <Text style={{fontSize:12,color:colors.muted,marginBottom:12}}>Search by title, exam category or subject and narrow the list with simple filters.</Text>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search title, exam category, subject..."/>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <View style={{flex:1,minWidth:190}}><DropdownSelect label="Category" value={category} onChange={setCategory} options={categories.map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:190}}><DropdownSelect label="Subject" value={subject} onChange={setSubject} options={['All',...SUBJECTS].map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:190}}><DropdownSelect label="Publish status" value={status} onChange={setStatus} options={STATUS.map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:190}}><DropdownSelect label="Quiz type" value={type} onChange={setType} options={TYPES.map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:190}}><DropdownSelect label="Question readiness" value={questionState} onChange={setQuestionState} options={QUESTION_STATE.map(x=>({value:x,label:x}))}/></View>
      </View>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title="Reset filters" variant="secondary" onPress={reset}/><Button title="↻ Refresh" variant="secondary" onPress={load}/></View>
    </Card>
    <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10,gap:10}}><View style={{flex:1}}><Text style={{fontSize:20,fontWeight:'900',color:colors.navy}}>All quizzes</Text><Text style={{color:colors.muted,marginTop:3}}>{filtered.length} of {items.length} quiz{filtered.length===1?'':'zes'}</Text></View></View>
    {filtered.length===0?<Empty title="No matching quizzes" message="Try another search or reset the filters."/>:filtered.map(quiz=>{const id=api.idOf(quiz),published=quiz.is_published===true,questions=Array.isArray(quiz.question_ids)?quiz.question_ids.length:Number(quiz.question_count||0),standalone=!quiz.course_id;return <Card key={id} style={{backgroundColor:'#FBFBFE'}}><View style={{flexDirection:'row',alignItems:'flex-start',gap:12}}><Text style={{fontSize:28}}>📝</Text><View style={{flex:1}}><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>{quiz.title||quiz.name||'Untitled Quiz'}</Text><Text style={{color:colors.muted,marginTop:4}}>{quiz.description||'No description'}</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:6,marginTop:9}}><Badge tone={published?'green':'orange'}>{published?'Published':'Unpublished'}</Badge>{catsOf(quiz).map(x=><Badge key={x} tone="purple">{x}</Badge>)}<Badge tone="blue">{quiz.subject||'General'}</Badge><Badge>{questions} question{questions===1?'':'s'}</Badge><Badge>{quiz.duration_minutes||15} min</Badge><Badge tone={standalone?'green':'purple'}>{standalone?'Standalone Test':'Course Quiz'}</Badge></View></View></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14}}><Button title={busyId===id?'Updating...':published?'Unpublish':'Publish Quiz'} variant={published?'secondary':'success'} onPress={()=>togglePublish(quiz)} disabled={busyId===id}/><Button title="Delete" variant="danger" onPress={()=>removeQuiz(quiz)} disabled={busyId===id}/></View>{!published&&<Text style={{marginTop:9,color:colors.muted,fontSize:12}}>{questions===0?'Add questions before publishing.':'This quiz is unpublished. Publish it when it is ready for students.'}</Text>}</Card>})}
  </AppShell>;
}
