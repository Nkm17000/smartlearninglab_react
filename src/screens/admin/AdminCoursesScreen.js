import React,{useEffect,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {AppShell,Badge,Button,Card,DropdownSelect,Empty,ErrorState,Field,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const CATEGORIES=['SSC','Banking','UPSC','English Spoken','Railway','Teaching','Defence','State Exams','Computer','General','Other'];
const LEVELS=['Beginner','Intermediate','Advanced'];
const LANGUAGES=['English','Hindi','Hinglish'];
const blank={name:'',short_description:'',description:'',category:'SSC',subcategory:'',exam:'',language:'English',level:'Beginner',instructor_name:'Smart Learning Lab',estimated_minutes:'0',tags:''};

export default function AdminCoursesScreen({openCourse}){
 const [courses,setCourses]=useState(null),[error,setError]=useState(''),[show,setShow]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank);
 const load=()=>{setError('');api.courses().then(x=>setCourses(api.listOf(x))).catch(e=>setError(e.message))}; useEffect(load,[]);
 const reset=()=>{setForm({...blank});setEditing(null);setShow(false)};
 const save=async()=>{try{const body={...form,estimated_minutes:Number(form.estimated_minutes)||0,tags:typeof form.tags==='string'?form.tags.split(',').map(x=>x.trim()).filter(Boolean):form.tags,is_free:true,is_published:false};if(!body.name.trim())throw new Error('Course name is required.');if(editing)await api.updateCourse(editing,body);else await api.createCourse(body);reset();load()}catch(e){Alert.alert('Save failed',e.message)}};
 const edit=c=>{setEditing(api.idOf(c));setForm({...blank,...c,estimated_minutes:String(c.estimated_minutes||0),tags:Array.isArray(c.tags)?c.tags.join(', '):(c.tags||'')});setShow(true)};
 const remove=async c=>{try{await api.deleteCourse(api.idOf(c));load()}catch(e){Alert.alert('Delete failed',e.message)}};
 if(error)return <AppShell><Header title="Courses"/><ErrorState title="Courses could not load" message={error} onRetry={load}/></AppShell>;
 return <AppShell><Header eyebrow="Content studio" title="Courses" subtitle="Create structured learning programs for SSC, Banking, UPSC, English Spoken and other categories." right={<Button title={show?'Close':'+ New Course'} onPress={()=>show?reset():setShow(true)}/>}/>
 {show&&<Card><Text style={{fontSize:20,fontWeight:'900',color:colors.navy,marginBottom:14}}>{editing?'Edit course':'Create a new course'}</Text>
 <Field label="Course name *" value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="SSC CGL Complete Preparation"/>
 <Field label="Short description" value={form.short_description} onChangeText={v=>setForm({...form,short_description:v})} placeholder="One-line value proposition"/>
 <Field label="Full description" value={form.description} onChangeText={v=>setForm({...form,description:v})} multiline placeholder="What will students learn?"/>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Category *" value={form.category} onChange={v=>setForm({...form,category:v})} options={CATEGORIES.map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Subcategory" value={form.subcategory} onChangeText={v=>setForm({...form,subcategory:v})} placeholder="CGL / CHSL / Banking PO"/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Exam / Target" value={form.exam} onChangeText={v=>setForm({...form,exam:v})} placeholder="SSC CGL 2026"/></View>
 </View>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Level" value={form.level} onChange={v=>setForm({...form,level:v})} options={LEVELS.map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Language" value={form.language} onChange={v=>setForm({...form,language:v})} options={LANGUAGES.map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Instructor" value={form.instructor_name} onChangeText={v=>setForm({...form,instructor_name:v})}/></View>
 </View>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>{[['Duration (min)','estimated_minutes']].map(([l,k])=><View key={k} style={{flex:1,minWidth:180}}><Field label={l} value={form[k]} onChangeText={v=>setForm({...form,[k]:v})} keyboardType="numeric"/> </View>)}</View>
 <Field label="Tags (comma separated)" value={form.tags} onChangeText={v=>setForm({...form,tags:v})} placeholder="grammar, reasoning, mock test"/>
 <View style={{padding:12,borderRadius:12,backgroundColor:colors.blueSoft,marginBottom:12}}><Text style={{fontWeight:'900',color:colors.navy}}>Next step</Text><Text style={{fontSize:12,color:colors.muted,marginTop:3}}>After creating the course, open Manage Course to add modules, lessons, PDFs, videos, audio and quizzes.</Text></View>
 <View style={{flexDirection:'row',gap:8}}><Button title={editing?'Save Changes':'Create Course'} onPress={save} disabled={!form.name.trim()}/><Button title="Cancel" variant="secondary" onPress={reset}/></View></Card>}
 {!courses?<Loading/>:courses.length===0?<Empty title="No courses yet" message="Start by creating your first course." action={<Button title="+ Create Course" onPress={()=>setShow(true)}/>} />:<>
 <View style={{flexDirection:'row',gap:8,marginBottom:10,flexWrap:'wrap'}}><Badge tone="pink">FREE CATALOG</Badge><Badge>{courses.length} courses</Badge><Badge tone="purple">Category → Course → Lesson → Quiz</Badge></View>
 {courses.map(c=><Card key={api.idOf(c)}><View style={{flexDirection:'row',gap:15,alignItems:'center'}}><View style={{width:58,height:58,borderRadius:14,backgroundColor:colors.pinkSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:27}}>📚</Text></View><View style={{flex:1}}><Text style={{fontSize:19,fontWeight:'900',color:colors.navy}}>{c.name||c.title}</Text><Text style={{color:colors.muted,marginTop:4}} numberOfLines={2}>{c.short_description||c.description||'No description added yet.'}</Text><View style={{flexDirection:'row',gap:7,marginTop:9,flexWrap:'wrap'}}><Badge tone="pink">{c.category||'General'}</Badge>{c.subcategory&&<Badge>{c.subcategory}</Badge>}<Badge>{c.level||'Beginner'}</Badge><Badge tone={c.is_published?'green':'orange'}>{c.is_published?'Published':'Draft'}</Badge></View></View></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14}}><Button title="Manage Course →" onPress={()=>openCourse(api.idOf(c))}/><Button title="Edit" variant="secondary" onPress={()=>edit(c)}/><Button title="Delete" variant="danger" onPress={()=>remove(c)}/></View></Card>)}
 </>}</AppShell>;
}
