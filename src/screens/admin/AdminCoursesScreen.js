import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  AppShell,
  Badge,
  Button,
  Card,
  DropdownSelect,
  Empty,
  ErrorState,
  Field,
  Header,
  Loading,
} from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const CATEGORIES = ['All','SSC','Banking','UPSC','English Spoken','Railway','Teaching','Defence','State Exams','Computer','General','Other'];
const LEVELS = ['All','Beginner','Intermediate','Advanced'];
const LANGUAGES = ['All','English','Hindi','Hinglish'];
const STATUS = ['All','Published','Unpublished'];
const blank = {name:'',short_description:'',description:'',category:'SSC',subcategory:'',exam:'',language:'English',level:'Beginner',instructor_name:'Smart Learning Lab',estimated_minutes:'0',tags:''};

export default function AdminCoursesScreen({openCourse}){
 const [courses,setCourses]=useState(null),[error,setError]=useState(''),[show,setShow]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(blank);
 const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[status,setStatus]=useState('All'),[level,setLevel]=useState('All'),[language,setLanguage]=useState('All'),[busyId,setBusyId]=useState('');
 const load=()=>{setError('');api.courses().then(x=>setCourses(api.listOf(x))).catch(e=>setError(e.message))}; useEffect(load,[]);
 const reset=()=>{setForm({...blank});setEditing(null);setShow(false)};
 const clearFilters=()=>{setSearch('');setCategory('All');setStatus('All');setLevel('All');setLanguage('All')};
 const filtered=useMemo(()=>{
   const q=search.trim().toLowerCase();
   return (courses||[]).filter(c=>{
     const text=[c.name,c.title,c.short_description,c.description,c.category,c.subcategory,c.exam,c.language,c.level,Array.isArray(c.tags)?c.tags.join(' '):c.tags].filter(Boolean).join(' ').toLowerCase();
     return (!q||text.includes(q)) && (category==='All'||String(c.category||'General')===category) && (status==='All'||(status==='Published'?c.is_published===true:c.is_published!==true)) && (level==='All'||String(c.level||'Beginner')===level) && (language==='All'||String(c.language||'English')===language);
   });
 },[courses,search,category,status,level,language]);
 const save=async()=>{try{const body={...form,estimated_minutes:Number(form.estimated_minutes)||0,tags:typeof form.tags==='string'?form.tags.split(',').map(x=>x.trim()).filter(Boolean):form.tags,is_free:true,is_published:false};if(!body.name.trim())throw new Error('Course name is required.');if(editing)await api.updateCourse(editing,body);else await api.createCourse(body);reset();load()}catch(e){Alert.alert('Save failed',e.message)}};
 const edit=c=>{setEditing(api.idOf(c));setForm({...blank,...c,estimated_minutes:String(c.estimated_minutes||0),tags:Array.isArray(c.tags)?c.tags.join(', '):(c.tags||'')});setShow(true)};
 const remove=async c=>{try{await api.deleteCourse(api.idOf(c));load()}catch(e){Alert.alert('Delete failed',e.message)}};
 const togglePublish=async c=>{const id=api.idOf(c);if(!id)return;setBusyId(id);try{if(c.is_published)await api.unpublishCourse(id);else await api.publishCourse(id);await load()}catch(e){Alert.alert(c.is_published?'Unpublish course':'Publish course',e.message)}finally{setBusyId('')}};
 if(error)return <AppShell><Header title="Courses"/><ErrorState title="Courses could not load" message={error} onRetry={load}/></AppShell>;
 return <AppShell><Header eyebrow="Content studio" title="Courses" subtitle="Create, search, filter and manage learning programs." right={<Button title={show?'Close':'+ New Course'} onPress={()=>show?reset():setShow(true)}/>}/>
 {show&&<Card><Text style={{fontSize:20,fontWeight:'900',color:colors.navy,marginBottom:14}}>{editing?'Edit course':'Create a new course'}</Text>
 <Field label="Course name *" value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="SSC CGL Complete Preparation"/>
 <Field label="Short description" value={form.short_description} onChangeText={v=>setForm({...form,short_description:v})} placeholder="One-line value proposition"/>
 <Field label="Full description" value={form.description} onChangeText={v=>setForm({...form,description:v})} multiline placeholder="What will students learn?"/>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Category *" value={form.category} onChange={v=>setForm({...form,category:v})} options={CATEGORIES.filter(x=>x!=='All').map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Subcategory" value={form.subcategory} onChangeText={v=>setForm({...form,subcategory:v})} placeholder="CGL / CHSL / Banking PO"/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Exam / Target" value={form.exam} onChangeText={v=>setForm({...form,exam:v})} placeholder="SSC CGL 2026"/></View>
 </View>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Level" value={form.level} onChange={v=>setForm({...form,level:v})} options={LEVELS.filter(x=>x!=='All').map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><DropdownSelect label="Language" value={form.language} onChange={v=>setForm({...form,language:v})} options={LANGUAGES.filter(x=>x!=='All').map(x=>({value:x,label:x}))}/></View>
   <View style={{flex:1,minWidth:230}}><Field label="Instructor" value={form.instructor_name} onChangeText={v=>setForm({...form,instructor_name:v})}/></View>
 </View>
 <Field label="Duration (min)" value={form.estimated_minutes} onChangeText={v=>setForm({...form,estimated_minutes:v})} keyboardType="numeric"/>
 <Field label="Tags (comma separated)" value={form.tags} onChangeText={v=>setForm({...form,tags:v})} placeholder="grammar, reasoning, mock test"/>
 <View style={{padding:12,borderRadius:12,backgroundColor:colors.blueSoft,marginBottom:12}}><Text style={{fontWeight:'900',color:colors.navy}}>Next step</Text><Text style={{fontSize:12,color:colors.muted,marginTop:3}}>After creating the course, open Manage Course to add modules, lessons, PDFs, videos, audio and quizzes.</Text></View>
 <View style={{flexDirection:'row',gap:8}}><Button title={editing?'Save Changes':'Create Course'} onPress={save} disabled={!form.name.trim()}/><Button title="Cancel" variant="secondary" onPress={reset}/></View></Card>}
 {!courses?<Loading/>:courses.length===0?<Empty title="No courses yet" message="Start by creating your first course." action={<Button title="+ Create Course" onPress={()=>setShow(true)}/>} />:<>
 <Card style={{backgroundColor:'#FBFBFE'}}>
   <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginBottom:4}}>Find a course</Text>
   <Text style={{fontSize:12,color:colors.muted,marginBottom:12}}>Use search plus the dropdowns to quickly find content that needs attention.</Text>
   <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search name, exam, description, tag..."/>
   <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
     <View style={{flex:1,minWidth:180}}><DropdownSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES.map(x=>({value:x,label:x}))}/></View>
     <View style={{flex:1,minWidth:180}}><DropdownSelect label="Publish status" value={status} onChange={setStatus} options={STATUS.map(x=>({value:x,label:x}))}/></View>
     <View style={{flex:1,minWidth:180}}><DropdownSelect label="Level" value={level} onChange={setLevel} options={LEVELS.map(x=>({value:x,label:x}))}/></View>
     <View style={{flex:1,minWidth:180}}><DropdownSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGES.map(x=>({value:x,label:x}))}/></View>
   </View>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title="Reset filters" variant="secondary" onPress={clearFilters}/><Button title="↻ Refresh" variant="secondary" onPress={load}/></View>
 </Card>
 <View style={{flexDirection:'row',gap:8,marginBottom:10,flexWrap:'wrap'}}><Badge tone="pink">COURSE CATALOG</Badge><Badge>{filtered.length} of {courses.length} courses</Badge><Badge tone="green">{courses.filter(c=>c.is_published).length} Published</Badge><Badge tone="orange">{courses.filter(c=>!c.is_published).length} Unpublished</Badge></View>
 {filtered.length===0?<Empty title="No matching courses" message="Try another search or reset the filters."/>:filtered.map(c=><Card key={api.idOf(c)}><View style={{flexDirection:'row',gap:15,alignItems:'center'}}><View style={{width:58,height:58,borderRadius:14,backgroundColor:colors.pinkSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:27}}>📚</Text></View><View style={{flex:1}}><Text style={{fontSize:19,fontWeight:'900',color:colors.navy}}>{c.name||c.title}</Text><Text style={{color:colors.muted,marginTop:4}} numberOfLines={2}>{c.short_description||c.description||'No description added yet.'}</Text><View style={{flexDirection:'row',gap:7,marginTop:9,flexWrap:'wrap'}}><Badge tone="pink">{c.category||'General'}</Badge>{c.subcategory&&<Badge>{c.subcategory}</Badge>}<Badge>{c.level||'Beginner'}</Badge><Badge>{c.language||'English'}</Badge><Badge tone={c.is_published?'green':'orange'}>{c.is_published?'Published':'Unpublished'}</Badge></View></View></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14}}><Button title="Manage Course →" onPress={()=>openCourse(api.idOf(c))}/><Button title="Edit" variant="secondary" onPress={()=>edit(c)}/><Button title={busyId===api.idOf(c)?'Updating...':c.is_published?'Unpublish':'Publish'} variant={c.is_published?'secondary':'success'} onPress={()=>togglePublish(c)} disabled={busyId===api.idOf(c)}/><Button title="Delete" variant="danger" onPress={()=>remove(c)}/></View></Card>)}
 </>}</AppShell>;
}
