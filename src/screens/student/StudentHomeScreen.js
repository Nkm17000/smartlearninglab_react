import React,{useEffect,useMemo,useState} from 'react';
import {Pressable,Text,View,useWindowDimensions} from 'react-native';
import {AppShell,Badge,Button,Card,Empty,ErrorState,Field,ProgressBar,SectionTitle,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const exams=['General','SSC','Banking','Railway','Teaching','UPSC','Defence','State Exams','Computer'];
const fallbackCats=['English Spoken','General','Banking','Railway','Teaching','Defence','SSC','UPSC','Computer'];

function Stat({icon,title,value,delta,tone='blue'}){
 const bg=tone==='green'?colors.greenSoft:tone==='orange'?colors.orangeSoft:tone==='pink'?colors.pinkSoft:colors.blueSoft;
 return <Card style={{flex:1,minWidth:145,marginBottom:0,padding:14}}>
   <View style={{flexDirection:'row',alignItems:'center',gap:9}}><View style={{width:36,height:36,borderRadius:11,backgroundColor:bg,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:17}}>{icon}</Text></View><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'800',color:colors.muted}}>{title}</Text></View>
   <Text style={{fontFamily:colors.fontFamily,fontSize:22,fontWeight:'900',color:colors.navy,marginTop:10}}>{value}</Text>
   {delta&&<Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'800',color:delta.startsWith('-')?colors.warning:colors.success,marginTop:4}}>{delta}</Text>}
 </Card>;
}

function CourseCard({c,onOpen}){
 const name=c.name||c.title||'Course';
 return <Pressable onPress={()=>onOpen(api.idOf(c))} style={({pressed})=>({width:220,minWidth:210,opacity:pressed?.84:1})}>
   <Card style={{padding:0,overflow:'hidden',marginBottom:0}}>
     <View style={{height:94,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center',position:'relative'}}>
       <View style={{width:66,height:66,borderRadius:17,backgroundColor:'#fff',alignItems:'center',justifyContent:'center',shadowColor:colors.shadow,shadowOpacity:.08,shadowRadius:8}}><Text style={{fontSize:34}}>📚</Text></View>
       <View style={{position:'absolute',top:9,left:9}}><Badge tone="pink">{c.is_free===false?'PAID':'FREE'}</Badge></View>
     </View>
     <View style={{padding:13}}>
       <View style={{flexDirection:'row',gap:5,marginBottom:7}}><Badge>{c.level||'Beginner'}</Badge></View>
       <Text style={{fontFamily:colors.fontFamily,fontSize:15,fontWeight:'900',color:colors.navy}} numberOfLines={2}>{name}</Text>
       <Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:4}} numberOfLines={2}>{c.short_description||c.description||'Structured learning with practice built in.'}</Text>
       <View style={{flexDirection:'row',gap:9,marginTop:10}}><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted}}>◫ {c.video_count||0}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted}}>▷ {c.mock_test_count||0}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted}}>▤ {c.pdf_count||0}</Text></View>
       <Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.primary,fontWeight:'900',marginTop:11}}>View Course →</Text>
     </View>
   </Card>
 </Pressable>;
}

function QuizCard({q,onOpen}){const cats=Array.isArray(q.categories)&&q.categories.length?q.categories:(q.category?[q.category]:['General']);const completed=q.is_completed===true;return <Card style={{width:255,minWidth:230,marginBottom:0}}><View style={{flexDirection:'row',gap:10,alignItems:'center'}}><View style={{width:42,height:42,borderRadius:13,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:18}}>📝</Text></View><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.navy}} numberOfLines={2}>{q.title||q.name}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:3}}>{q.subject||'General'} · {q.duration_minutes||15} min · {(q.question_ids||[]).length||q.question_count||0} questions</Text></View></View><View style={{flexDirection:'row',gap:5,flexWrap:'wrap',marginTop:9}}>{cats.slice(0,2).map(x=><Badge key={x} tone="purple">{x}</Badge>)}{completed&&<Badge tone="green">Completed</Badge>}</View><Button title={completed?'Review / Retake':'Take Test'} onPress={()=>onOpen(api.idOf(q))} style={{marginTop:12}}/></Card>}

function Hero({search,setSearch,onSearch}){
 return <View style={{borderRadius:20,overflow:'hidden',backgroundColor:colors.hero,padding:22,position:'relative'}}>
   <View style={{position:'absolute',right:-20,top:-25,width:180,height:180,borderRadius:90,backgroundColor:'rgba(91,75,255,.22)'}}/>
   <View style={{position:'absolute',right:35,bottom:-45,width:150,height:150,borderRadius:75,backgroundColor:'rgba(139,92,246,.16)'}}/>
   <View style={{maxWidth:760}}>
     <Badge tone="purple">FREE LEARNING PLATFORM</Badge>
     <Text style={{fontFamily:colors.fontFamily,fontSize:30,fontWeight:'900',color:'#fff',marginTop:10}}>Prepare smarter. Learn every day.</Text>
     <Text style={{fontFamily:colors.fontFamily,color:'#D6D8F2',fontSize:14,lineHeight:22,marginTop:5}}>Courses, topic-wise lessons, mock tests, question practice and progress — all in one place.</Text>
     <View style={{flexDirection:'row',gap:8,marginTop:18,alignItems:'center'}}><View style={{flex:1,minWidth:220}}><Field value={search} onChangeText={setSearch} placeholder="Search courses, exams, topics…"/></View><Button title="Search" onPress={onSearch}/></View>
   </View>
 </View>;
}

export default function StudentHomeScreen({user,openCourse,openQuiz,openRoute}){
 const {width}=useWindowDimensions();
 const wide=width>=1180;
 const [search,setSearch]=useState(''),[activeCategory,setActiveCategory]=useState(''),[activeExam,setActiveExam]=useState(''),[data,setData]=useState(null),[cats,setCats]=useState(null),[error,setError]=useState('');
 const load=async()=>{try{setError('');const h=await api.studentHome();const featured=api.listOf(h?.featured?.courses);const featuredQuizzes=api.listOf(h?.featured?.quizzes);const allQuizzes=api.listOf(h?.quizzes);setData({dashboard:h?.dashboard,featured,quizzes:featuredQuizzes.length?featuredQuizzes:allQuizzes});setCats(h?.catalog||null)}catch(e){setError(e?.message||'Unable to load your learning home.')}};
 useEffect(()=>{load()},[]);
 const searchCourses=async(category=activeCategory,exam=activeExam)=>{try{const query=[search,exam].filter(Boolean).join(' ');const c=await api.studentCourses({search:query,category,level:'',language:''});setData(x=>({...x,searchResults:api.listOf(c)}))}catch(e){setData(x=>({...x,searchResults:[]}));}};
 if(error)return <AppShell><ErrorState title="Learning data could not load" message={error} onRetry={load}/></AppShell>;
 if(!data)return <AppShell><Loading label="Preparing your learning home…"/></AppShell>;
 const d=data.dashboard||{}; const goal=d.weekly_goal||{target:5,completed:0,percentage:0}; const cont=d.continue_learning; const courses=data.searchResults||data.featured||[]; const categories=(cats?.categories?.length?cats.categories:fallbackCats);
 const stats=[['📖','Courses',d.courses_available||0,'+1 this week','blue'],['✓','Lessons Done',d.lessons_completed||0,'+5 this week','blue'],['🎯','Quiz Average',`${d.quiz_average||0}%`,d.quiz_average?'+4.2%':'Start practicing','pink'],['▤','Tests Attempted',d.quiz_attempts||0,'+2 this week','blue'],['🔥','Current Streak',`${d.streak?.current||0} days`,d.streak?.current?'Keep it up!':'Start today','orange'],['★','XP Points',d.xp||0,'+120 this week','pink']];
 return <AppShell>
   <View style={{flexDirection:wide?'row':'column',gap:14,alignItems:'stretch'}}>
     <View style={{flex:1,minWidth:0}}>
       <Hero search={search} setSearch={setSearch} onSearch={()=>searchCourses(activeCategory,activeExam)}/>
       <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:14}}>{stats.map(([i,t,v,delta,tone])=><Stat key={t} icon={i} title={t} value={v} delta={delta} tone={tone}/>)}</View>
     </View>
     {wide&&<View style={{width:275}}>
       <Card style={{padding:16,minHeight:210}}><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'900',color:colors.navy}}>Continue Learning</Text><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted,marginTop:3}}>Pick up where you left off</Text>{cont?<><View style={{flexDirection:'row',gap:10,marginTop:15}}><View style={{width:62,height:62,borderRadius:14,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:28}}>📚</Text></View><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontSize:13,fontWeight:'900',color:colors.navy}} numberOfLines={2}>{cont.course_title}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:4}} numberOfLines={1}>{cont.lesson_title||'Next lesson'}</Text><View style={{marginTop:9}}><ProgressBar value={cont.progress_percentage}/></View><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:3}}>{cont.progress_percentage}% complete</Text></View></View><Button title="▶  Continue" onPress={()=>cont.lesson_id && openRoute ? openRoute(`lesson:${cont.lesson_id}:${cont.course_id}`) : openCourse(cont.course_id)} style={{marginTop:14,width:'100%'}}/></>:<Empty title="Nothing waiting" message="Start a course and we’ll remember your place."/>}</Card>
       <Card style={{padding:16}}><View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center'}}><View><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'900',color:colors.navy}}>Weekly Goal</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:4}}>Learn {goal.target} lessons this week</Text></View><View style={{width:44,height:44,borderRadius:22,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20}}>🏆</Text></View></View><View style={{marginTop:17}}><ProgressBar value={goal.percentage}/></View><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'800',color:colors.text,marginTop:6,textAlign:'right'}}>{goal.completed} / {goal.target}</Text></Card>
       <Card style={{padding:16}}><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'900',color:colors.navy}}>Quick Actions</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:12}}>{[['📝','Take a Test',()=>data.quizzes?.[0]&&openQuiz(api.idOf(data.quizzes[0]))],['▣','Flashcards',()=>openRoute&&openRoute('flashcards')],['✦','Study Help',()=>openRoute&&openRoute('study')],['📄','Study Notes',()=>openRoute&&openRoute('notes')]].map(([i,t,fn])=><Pressable key={t} onPress={()=>fn&&fn()} style={{width:'48%',minHeight:72,borderRadius:14,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20}}>{i}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'900',color:colors.primary,marginTop:5}}>{t}</Text></Pressable>)}</View></Card>
     </View>}
   </View>

   <SectionTitle title="Explore by Category" />
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{categories.slice(0,10).map(x=><Pressable key={x} onPress={()=>{const next=activeCategory===x?'':x;setActiveCategory(next);setActiveExam('');searchCourses(next,'')}} style={{paddingHorizontal:14,paddingVertical:10,borderRadius:13,borderWidth:1,borderColor:activeCategory===x?colors.primary:colors.border,backgroundColor:activeCategory===x?colors.primary:'#fff'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',fontSize:11,color:activeCategory===x?'#fff':colors.text}}>{x}</Text></Pressable>)}</View>
   <SectionTitle title="Explore by Exam" />
   <View style={{flexDirection:'row',flexWrap:'wrap',gap:8}}>{[...(cats?.exams||[]),...exams.filter(x=>!(cats?.exams||[]).includes(x))].slice(0,10).map(x=><Pressable key={x} onPress={()=>{const next=activeExam===x?'':x;setActiveExam(next);setActiveCategory('');searchCourses('',next)}} style={{paddingHorizontal:14,paddingVertical:10,borderRadius:13,borderWidth:1,borderColor:activeExam===x?colors.primary:colors.border,backgroundColor:activeExam===x?colors.primary:'#fff'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',fontSize:11,color:activeExam===x?'#fff':colors.text}}>{x}</Text></Pressable>)}</View>

   <SectionTitle title={data.searchResults?'Search Results':'Featured Courses'} subtitle="Top 5 courses for your dashboard." right={<Pressable onPress={()=>openRoute&&openRoute('courses')}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>View all →</Text></Pressable>}/>
   {courses.length===0?<Empty title="No courses found" message="Try another search or exam category."/>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{courses.slice(0,5).map(c=><CourseCard key={api.idOf(c)} c={c} onOpen={openCourse}/>)}</View>}

   <SectionTitle title="Test Series" subtitle="Top 5 quizzes for your dashboard." right={<Pressable onPress={()=>openRoute&&openRoute('quizzes')}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary}}>View all →</Text></Pressable>}/>
   {data.quizzes?.length?<View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>{data.quizzes.slice(0,5).map(q=><QuizCard key={api.idOf(q)} q={q} onOpen={openQuiz}/>)}</View>:<Empty title="No published tests yet" message="Published quizzes will appear here."/>}

   {!wide&&<View style={{marginTop:6}}><SectionTitle title="Your weekly goal"/><Card><ProgressBar value={goal.percentage}/><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.navy,marginTop:7}}>{goal.completed} / {goal.target} lessons this week</Text></Card></View>}

   <Card style={{marginTop:6,backgroundColor:'#EEF0FF',borderColor:'#E2E0FF',minHeight:145,justifyContent:'center'}}><Text style={{fontFamily:colors.fontFamily,fontSize:29,color:colors.primary}}>“</Text><Text style={{fontFamily:colors.fontFamily,fontSize:16,fontWeight:'700',color:colors.navy,lineHeight:24}}>The beautiful thing about learning is nobody can take it away from you.</Text><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted,marginTop:7}}>— B. B. King</Text></Card>
 </AppShell>;
}
