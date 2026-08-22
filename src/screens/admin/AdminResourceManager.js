import React,{useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {Badge,Button,Card,DropdownSelect,Empty,Field,Loading,Header} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const TYPES=[
 {value:'pdf',label:'PDF'}, {value:'video',label:'Video'}, {value:'audio',label:'Audio'},
 {value:'document',label:'Document'}, {value:'image',label:'Image'}, {value:'link',label:'Web Link'}, {value:'other',label:'Other'}
];
const icon={pdf:'📄',video:'🎥',audio:'🎧',document:'📑',image:'🖼️',link:'🔗',other:'📎'};

export default function AdminResourceManager({scope,id,compact=false,onClose,managerTitle}){
 const [items,setItems]=useState(null),[mode,setMode]=useState('upload'),[type,setType]=useState('pdf');
 const [title,setTitle]=useState(''),[description,setDescription]=useState(''),[url,setUrl]=useState(''),[file,setFile]=useState(null),[busy,setBusy]=useState(false);
 const load=async()=>{try{const d=scope==='course'?await api.courseResources(id):await api.lessonResources(id);setItems(api.listOf(d))}catch(e){setItems([])}};
 useEffect(()=>{load()},[scope,id]);
 const pick=async()=>{try{const r=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true,multiple:false});if(!r.canceled&&r.assets?.[0]){const f=r.assets[0];setFile(f);setTitle(title||f.name);setType(f.mimeType==='application/pdf'?'pdf':type)}}catch(e){Alert.alert('File',e.message)}};
 const save=async()=>{try{setBusy(true);if(mode==='upload'){
   if(!file)throw new Error('Choose a file first.');
   const fields={title:title||file.name,description,resource_type:type};
   const d=scope==='course'?await api.uploadCourseResource(id,file,fields):await api.uploadLessonResource(id,file,fields);
   setItems(x=>[d,...(x||[])]);
 }else{
   if(!url.trim())throw new Error('Enter a URL.');
   const d=scope==='course'?await api.addCourseResource(id,{title:title||url,description,url,type}):await api.post(`/admin/lessons/${id}/resources`,{title:title||url,description,url,type});
   setItems(x=>[d,...(x||[])]);
 }
 setTitle('');setDescription('');setUrl('');setFile(null);
 }catch(e){Alert.alert('Resource',e.message)}finally{setBusy(false)}};
 const remove=async item=>{try{if(scope==='course')await api.deleteCourseResource(id,api.idOf(item));else await api.del(`/admin/lessons/${id}/resources/${api.idOf(item)}`);setItems(x=>(x||[]).filter(r=>api.idOf(r)!==api.idOf(item)))}catch(e){Alert.alert('Resource',e.message)}};
 if(items===null)return <Loading label="Loading resources…"/>;
 const heading=managerTitle|| (scope==='course'?'Course resources':'Lesson resources');
 const openItem=item=>{if(!item?.url)return;const base=api.BASE_URL?api.BASE_URL.replace('/api/v1',''):'';Linking.openURL(item.url.startsWith('http')?item.url:`${base}${item.url}`)};
 const list=items.length>0?items.map(item=><View key={api.idOf(item)} style={{flexDirection:'row',alignItems:'center',gap:10,borderTopWidth:1,borderTopColor:colors.border,paddingTop:10,marginTop:10}}><Text style={{fontSize:22}}>{icon[item.type]||'📎'}</Text><View style={{flex:1}}><Text style={{fontWeight:'900',color:colors.navy}}>{item.title}</Text><Text style={{fontSize:11,color:colors.muted}}>{item.type} · {item.filename||item.url||''}</Text></View><Button title="Open" variant="secondary" onPress={()=>openItem(item)}/>{!compact&&<Button title="Delete" variant="danger" onPress={()=>remove(item)}/>}</View>):null;
 if(compact){return <Card style={{backgroundColor:'#F8FAFC',marginTop:8}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1}}><Text style={{fontWeight:'900',color:colors.navy}}>{heading}</Text><Text style={{fontSize:12,color:colors.muted,marginTop:3}}>{items.length?`${items.length} resource${items.length===1?'':'s'} added.`:'No resources added.'}</Text></View><Badge tone="purple">{items.length}</Badge></View>{list}</Card>}
 return <View style={{flex:1}}><Header eyebrow="Resource manager" title={heading} subtitle="Upload or link learning material. Resources are shown only after they are added." right={onClose?<Button title="← Back to course" variant="secondary" onPress={onClose}/>:null}/><Card><View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}><View style={{flex:1}}><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Add learning resource</Text><Text style={{fontSize:12,color:colors.muted,marginTop:3}}>PDF, video, audio, document, image, link or other file.</Text></View><Badge tone="purple">{items.length} existing</Badge></View><View style={{flexDirection:'row',gap:8,marginTop:12}}><Button title="Upload file" onPress={()=>setMode('upload')} /><Button title="Add URL" variant="secondary" onPress={()=>setMode('url')} /></View><DropdownSelect label="Resource type" value={type} onChange={setType} options={TYPES}/>{mode==='upload'?<Button title={file?`Selected: ${file.name}`:'Choose file'} variant="secondary" onPress={pick}/>:<Field label="Resource URL" value={url} onChangeText={setUrl} placeholder="https://..."/>}<Field label="Title" value={title} onChangeText={setTitle} placeholder="Useful study material"/><Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="What will students learn from this resource?"/><Button title={busy?'Saving…':'Add Resource'} onPress={save} disabled={busy}/></Card><Card><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Added resources</Text>{items.length===0?<Empty title="No resources yet" message="Resources you add here will appear in the course/lesson resource section."/>:list}</Card></View>;
}
