import React,{useEffect,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {AppShell,Button,Card,Header,Loading,Badge} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';
export default function PersonalizedLearningScreen({openCourse,openAdaptive}){
 const [path,setPath]=useState(null),[adaptive,setAdaptive]=useState(null),[busy,setBusy]=useState(false);
 const load=async()=>{try{setPath(await api.personalizedPath())}catch(e){Alert.alert('Learning plan',e.message)}};
 useEffect(()=>{load()},[]);
 const startAdaptive=async()=>{setBusy(true);try{setAdaptive(await api.adaptiveTest({count:10}))}catch(e){Alert.alert('Adaptive test',e.message)}finally{setBusy(false)}};
 if(!path)return <AppShell><Header title="Personalized Learning" subtitle="Your next best lessons and adaptive practice"/><Loading/></AppShell>;
 return <AppShell><Header eyebrow="For you" title="Your Learning Plan" subtitle="Recommendations are based on your progress and recent assessment performance."/>
  <Card><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><View><Text style={{fontSize:20,fontWeight:'900',color:colors.navy}}>Today's goal</Text><Text style={{color:colors.muted,marginTop:4}}>{path.daily_goal_minutes} minutes of focused learning</Text></View><Badge tone="green">Personalized</Badge></View></Card>
  <Card><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Weak areas</Text>{path.weak_areas.length?path.weak_areas.map((x,i)=><Text key={i} style={{marginTop:8,color:colors.text}}>• Quiz {x.quiz_id}: {x.score}% — review this topic</Text>):<Text style={{color:colors.muted,marginTop:8}}>No weak areas detected yet. Keep practicing.</Text>}</Card>
  <Card><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Recommended next steps</Text>{path.next_steps.map((l,i)=><View key={api.idOf(l)||i} style={{marginTop:10,padding:12,borderRadius:12,backgroundColor:'#F8FAFC'}}><Text style={{fontWeight:'900'}}>{l.title}</Text><Text style={{color:colors.muted,marginTop:4}}>{l.description}</Text>{openCourse&&l.course_id&&<View style={{marginTop:8}}><Button title="Open course" onPress={()=>openCourse(l.course_id)}/></View>}</View>)}</Card>
  <Card><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Adaptive test</Text><Text style={{color:colors.muted,marginTop:5}}>The difficulty is selected from your recent performance.</Text><View style={{marginTop:12}}><View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title={busy?'Preparing...':'Preview adaptive level'} onPress={startAdaptive} disabled={busy}/>{openAdaptive&&<Button title="Take adaptive test" variant="secondary" onPress={openAdaptive}/>}</View></View>{adaptive&&<View style={{marginTop:14}}><Badge tone="orange">Level: {adaptive.adaptive_level}</Badge><Text style={{fontWeight:'800',marginTop:8}}>Prior average: {adaptive.prior_average}%</Text><Text style={{color:colors.muted,marginTop:6}}>{adaptive.questions.length} questions prepared.</Text></View>}</Card>
 </AppShell>
}
