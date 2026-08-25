import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AppShell, Badge, Button, Card, DropdownSelect, Empty, ErrorState, Field, Header, Loading } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const CATEGORIES = ['SSC','Railway','Banking','UPSC','Teaching','Defence','State Exams','General','English Spoken','Computer','Other'];
const SUBJECTS = ['English','Hindi','Math','Reasoning','Aptitude','General Awareness','Current Affairs','Science','Physics','Chemistry','Biology','Java','Python','PHP','SQL','DBMS','Computer','Operating Systems','Networking','Web Development','Spring Boot','Microservices','Other'];
const LEVELS = ['All','Beginner','Intermediate','Advanced'];
const LANGUAGES = ['All','English','Hindi','Hinglish'];
const STATUS = ['All','Published','Unpublished'];
const DEFAULT_FORM = {name:'',short_description:'',description:'',subject:'English',categories:['SSC','Railway','Banking','UPSC','Teaching','Defence','State Exams','General','English Spoken','Other'],subcategory:'',exam:'',language:'English',level:'Beginner',instructor_name:'Smart Learning Lab',estimated_minutes:'0',tags:''};

function hasCategory(course, category) {
  const values = Array.isArray(course?.categories) ? course.categories : (course?.category ? [course.category] : []);
  return values.some(x => String(x).toLowerCase() === String(category).toLowerCase());
}

function toggleValue(values, value) {
  return values.includes(value) ? values.filter(x => x !== value) : [...values, value];
}

export default function AdminCoursesScreen({openCourse}) {
  const [courses,setCourses]=useState(null),[error,setError]=useState(''),[show,setShow]=useState(false),[editing,setEditing]=useState(null),[form,setForm]=useState(DEFAULT_FORM);
  const [search,setSearch]=useState(''),[category,setCategory]=useState('All'),[subject,setSubject]=useState('All'),[status,setStatus]=useState('All'),[level,setLevel]=useState('All'),[language,setLanguage]=useState('All'),[busyId,setBusyId]=useState('');

  const load=()=>{setError('');api.courses().then(x=>setCourses(api.listOf(x))).catch(e=>setError(e.message));};
  useEffect(load,[]);
  const reset=()=>{setForm({...DEFAULT_FORM,categories:[...DEFAULT_FORM.categories]});setEditing(null);setShow(false);};
  const clearFilters=()=>{setSearch('');setCategory('All');setSubject('All');setStatus('All');setLevel('All');setLanguage('All');};

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    return (courses||[]).filter(c=>{
      const cats=Array.isArray(c.categories)?c.categories:(c.category?[c.category]:[]);
      const text=[c.name,c.title,c.short_description,c.description,c.subject,c.category,c.subcategory,c.exam,c.language,c.level,categoriesText(cats),Array.isArray(c.tags)?c.tags.join(' '):c.tags].filter(Boolean).join(' ').toLowerCase();
      return (!q||text.includes(q)) && (category==='All'||hasCategory(c,category)) && (subject==='All'||String(c.subject||'Other')===subject) && (status==='All'||(status==='Published'?c.is_published===true:c.is_published!==true)) && (level==='All'||String(c.level||'Beginner')===level) && (language==='All'||String(c.language||'English')===language);
    });
  },[courses,search,category,subject,status,level,language]);

  const save=async()=>{
    try{
      const categories=form.categories.length?form.categories:['Other'];
      const body={...form,subject:String(form.subject||'Other').trim()||'Other',categories,category:categories[0],estimated_minutes:Number(form.estimated_minutes)||0,tags:typeof form.tags==='string'?form.tags.split(',').map(x=>x.trim()).filter(Boolean):form.tags,is_free:true,is_published:editing?Boolean(form.is_published):false};
      if(!body.name.trim())throw new Error('Course name is required.');
      if(!body.subject.trim())throw new Error('Subject is required.');
      if(editing)await api.updateCourse(editing,body);else await api.createCourse(body);
      reset();load();
    }catch(e){Alert.alert('Save failed',e.message);}
  };

  const edit=c=>{setEditing(api.idOf(c));setForm({...DEFAULT_FORM,...c,subject:c.subject||'Other',categories:Array.isArray(c.categories)&&c.categories.length?c.categories:(c.category?[c.category]:['Other']),estimated_minutes:String(c.estimated_minutes||0),tags:Array.isArray(c.tags)?c.tags.join(', '):(c.tags||'')});setShow(true);};
  const remove=async c=>{try{await api.deleteCourse(api.idOf(c));load();}catch(e){Alert.alert('Delete failed',e.message);}};
  const togglePublish=async c=>{const id=api.idOf(c);if(!id)return;setBusyId(id);try{if(c.is_published)await api.unpublishCourse(id);else await api.publishCourse(id);await load();}catch(e){Alert.alert(c.is_published?'Unpublish course':'Publish course',e.message);}finally{setBusyId('');}};

  if(error)return <AppShell><Header title="Courses"/><ErrorState title="Courses could not load" message={error} onRetry={load}/></AppShell>;

  return <AppShell>
    <Header eyebrow="Content studio" title="Courses" subtitle="Manage courses by subject and exam category. One course can belong to many exam categories." right={<Button title={show?'Close':'+ New Course'} onPress={()=>show?reset():setShow(true)}/>}/>

    {show&&<Card>
      <Text style={{fontSize:20,fontWeight:'900',color:colors.navy,marginBottom:14}}>{editing?'Edit course':'Create a new course'}</Text>
      <Field label="Course name *" value={form.name} onChangeText={v=>setForm({...form,name:v})} placeholder="English Grammar - Complete Course"/>
      <Field label="Subject *" value={form.subject} onChangeText={v=>setForm({...form,subject:v})} placeholder="English, Java, Math..."/>
      <Text style={{fontSize:12,fontWeight:'800',color:colors.text,marginBottom:7}}>Exam / Domain Categories *</Text>
      <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginBottom:14}}>
        {CATEGORIES.map(x=><Pressable key={x} onPress={()=>setForm({...form,categories:toggleValue(form.categories,x)})} style={{borderWidth:1,borderColor:form.categories.includes(x)?'#B9B1FF':colors.border,borderRadius:20,paddingHorizontal:12,paddingVertical:8,backgroundColor:form.categories.includes(x)?colors.blueSoft:'#fff'}}><Text style={{fontWeight:'800',fontSize:12,color:form.categories.includes(x)?colors.primary:colors.text}}>{x}</Text></Pressable>)}
      </View>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <View style={{flex:1,minWidth:230}}><Field label="Subcategory / Exam" value={form.subcategory} onChangeText={v=>setForm({...form,subcategory:v})} placeholder="CGL / CHSL / Banking PO"/></View>
        <View style={{flex:1,minWidth:230}}><Field label="Exam / Target" value={form.exam} onChangeText={v=>setForm({...form,exam:v})} placeholder="SSC CGL 2026"/></View>
      </View>
      <Field label="Short description" value={form.short_description} onChangeText={v=>setForm({...form,short_description:v})} placeholder="One-line value proposition"/>
      <Field label="Full description" value={form.description} onChangeText={v=>setForm({...form,description:v})} multiline placeholder="What will students learn?"/>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Level" value={form.level} onChange={v=>setForm({...form,level:v})} options={LEVELS.filter(x=>x!=='All').map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Language" value={form.language} onChange={v=>setForm({...form,language:v})} options={LANGUAGES.filter(x=>x!=='All').map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><Field label="Duration (min)" value={form.estimated_minutes} onChangeText={v=>setForm({...form,estimated_minutes:v})} keyboardType="numeric"/></View>
      </View>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><View style={{flex:1,minWidth:230}}><Field label="Instructor" value={form.instructor_name} onChangeText={v=>setForm({...form,instructor_name:v})}/></View><View style={{flex:1,minWidth:230}}><Field label="Tags" value={form.tags} onChangeText={v=>setForm({...form,tags:v})} placeholder="grammar, exam, practice"/></View></View>
      <View style={{padding:12,borderRadius:12,backgroundColor:colors.blueSoft,marginBottom:12}}><Text style={{fontWeight:'900',color:colors.navy}}>Taxonomy</Text><Text style={{fontSize:12,color:colors.muted,marginTop:3}}>Subject is the learning topic. Categories are the exams/domains where the course applies. Example: English → SSC, Railway, Banking, UPSC, Teaching, Defence, State Exams, General, English Spoken, Other.</Text></View>
      <View style={{flexDirection:'row',gap:8}}><Button title={editing?'Save Changes':'Create Course'} onPress={save} disabled={!form.name.trim()||!form.subject.trim()}/><Button title="Cancel" variant="secondary" onPress={reset}/></View>
    </Card>}

    <Card style={{backgroundColor:'#FBFBFE'}}>
      <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginBottom:4}}>Find a course</Text>
      <Text style={{fontSize:12,color:colors.muted,marginBottom:12}}>Filter by category, subject, publish state, level and language.</Text>
      <Field label="Search" value={search} onChangeText={setSearch} placeholder="Search course, subject, category, exam..."/>
      <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Category" value={category} onChange={setCategory} options={['All',...CATEGORIES].map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Subject" value={subject} onChange={setSubject} options={['All',...SUBJECTS].map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Publish status" value={status} onChange={setStatus} options={STATUS.map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Level" value={level} onChange={setLevel} options={LEVELS.map(x=>({value:x,label:x}))}/></View>
        <View style={{flex:1,minWidth:180}}><DropdownSelect label="Language" value={language} onChange={setLanguage} options={LANGUAGES.map(x=>({value:x,label:x}))}/></View>
      </View>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}><Button title="Reset filters" variant="secondary" onPress={clearFilters}/><Button title="↻ Refresh" variant="secondary" onPress={load}/></View>
    </Card>

    {!courses?<Loading/>:courses.length===0?<Empty title="No courses yet" message="Start by creating your first course." action={<Button title="+ Create Course" onPress={()=>setShow(true)}/>} />:<>
      <View style={{flexDirection:'row',gap:8,marginBottom:10,flexWrap:'wrap'}}><Badge tone="pink">COURSE CATALOG</Badge><Badge>{filtered.length} of {courses.length} courses</Badge><Badge tone="green">{courses.filter(c=>c.is_published).length} Published</Badge><Badge tone="orange">{courses.filter(c=>!c.is_published).length} Unpublished</Badge></View>
      {filtered.length===0?<Empty title="No matching courses" message="Try another search or reset the filters."/>:filtered.map(c=>{const cats=Array.isArray(c.categories)?c.categories:(c.category?[c.category]:[]);return <Card key={api.idOf(c)}><View style={{flexDirection:'row',gap:15,alignItems:'center'}}><View style={{width:58,height:58,borderRadius:14,backgroundColor:colors.pinkSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:27}}>📚</Text></View><View style={{flex:1}}><Text style={{fontSize:19,fontWeight:'900',color:colors.navy}}>{c.name||c.title}</Text><Text style={{color:colors.muted,marginTop:4}} numberOfLines={2}>{c.short_description||c.description||'No description added yet.'}</Text><View style={{flexDirection:'row',gap:7,marginTop:9,flexWrap:'wrap'}}><Badge tone="purple">Subject: {c.subject||'Other'}</Badge>{cats.slice(0,6).map(x=><Badge key={x} tone="pink">{x}</Badge>)}{cats.length>6&&<Badge>+{cats.length-6} more</Badge>}<Badge>{c.level||'Beginner'}</Badge><Badge>{c.language||'English'}</Badge><Badge tone={c.is_published?'green':'orange'}>{c.is_published?'Published':'Unpublished'}</Badge></View></View></View><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginTop:14}}><Button title="Manage Course →" onPress={()=>openCourse(api.idOf(c))}/><Button title="Edit" variant="secondary" onPress={()=>edit(c)}/><Button title={busyId===api.idOf(c)?'Updating...':c.is_published?'Unpublish':'Publish'} variant={c.is_published?'secondary':'success'} onPress={()=>togglePublish(c)} disabled={busyId===api.idOf(c)}/><Button title="Delete" variant="danger" onPress={()=>remove(c)}/></View></Card>})}
    </>}
  </AppShell>;
}

function categoriesText(cats){return Array.isArray(cats)?cats.join(' '):'';}
