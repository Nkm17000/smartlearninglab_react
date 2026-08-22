import React,{useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {AppShell,Badge,Button,Card,DropdownSelect,Empty,ErrorState,Field,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const CATEGORIES=['SSC','Banking','UPSC','English Spoken','Railway','Teaching','Defence','State Exams','Computer','General','Other'];
const TYPES=[{value:'pdf',label:'PDF'},{value:'document',label:'Document'},{value:'video',label:'Video'},{value:'audio',label:'Audio'},{value:'image',label:'Image'},{value:'other',label:'Other'}];
const icons={pdf:'📄',document:'📑',video:'🎥',audio:'🎧',image:'🖼️',other:'📎'};
const abs=u=>u?.startsWith('http')?u:`${api.BASE_URL.replace('/api/v1','')}${u||''}`;

export default function AdminLibraryScreen({onBack}){
 const [items,setItems]=useState(null),[error,setError]=useState(''),[mode,setMode]=useState('upload');
 const [file,setFile]=useState(null),[title,setTitle]=useState(''),[description,setDescription]=useState(''),[category,setCategory]=useState('General'),[type,setType]=useState('pdf'),[url,setUrl]=useState(''),[tags,setTags]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>{setError('');api.adminLibrary().then(x=>setItems(api.listOf(x))).catch(e=>setError(e.message))};
 useEffect(load,[]);
 const pick=async()=>{const r=await DocumentPicker.getDocumentAsync({type:'*/*',copyToCacheDirectory:true});if(!r.canceled&&r.assets?.[0]){const f=r.assets[0];setFile(f);setTitle(title||f.name);setType(f.mimeType==='application/pdf'?'pdf':f.mimeType?.startsWith('video/')?'video':f.mimeType?.startsWith('audio/')?'audio':f.mimeType?.startsWith('image/')?'image':'document')}};
 const save=async()=>{try{setBusy(true);let d;if(mode==='upload'){if(!file)throw new Error('Please choose a file.');d=await api.uploadLibraryFile(file,{title:title||file.name,description,category,tags})}else{if(!url.trim())throw new Error('Please enter a URL.');d=await api.addLibraryLink({title:title||url,description,category,tags:tags.split(',').map(x=>x.trim()).filter(Boolean),type,url})}setItems(x=>[d,...(x||[])]);setFile(null);setTitle('');setDescription('');setUrl('');setTags('');}catch(e){Alert.alert('Library',e.message)}finally{setBusy(false)}};
 const remove=async id=>{try{await api.deleteLibraryItem(id);setItems(x=>(x||[]).filter(i=>api.idOf(i)!==id))}catch(e){Alert.alert('Library',e.message)}};
 if(error)return <AppShell><Header title="Learning Library" right={<Button title="← Dashboard" variant="secondary" onPress={onBack}/>} /><ErrorState title="Library could not load" message={error} onRetry={load}/></AppShell>;
 if(!items)return <AppShell><Header title="Learning Library"/><Loading label="Loading library…"/></AppShell>;
 return <AppShell><Header eyebrow="Admin content" title="Learning Library" subtitle="Upload useful PDFs, notes, current-affairs material, videos and other resources that students can access from one place." right={<Button title="← Dashboard" variant="secondary" onPress={onBack}/>}/>
 <Card style={{backgroundColor:colors.navy,borderColor:colors.navy}}><Text style={{fontSize:22,fontWeight:'900',color:'#fff'}}>📚 Student Resource Library</Text><Text style={{color:'#CBD5E1',marginTop:5,lineHeight:20}}>Upload once and make the material available to all students. Great for PDFs, practice sheets, current affairs and reference material.</Text></Card>
 <Card><View style={{flexDirection:'row',gap:8,marginBottom:12}}><Button title="Upload file" onPress={()=>setMode('upload')}/><Button title="Add web link" variant="secondary" onPress={()=>setMode('url')}/></View>
 {mode==='upload'?<Button title={file?`Selected: ${file.name}`:'Choose PDF / file'} variant="secondary" onPress={pick}/>:<Field label="Resource URL" value={url} onChangeText={setUrl} placeholder="https://..."/>}
 <DropdownSelect label="Resource type" value={type} onChange={setType} options={TYPES}/>
 <Field label="Title" value={title} onChangeText={setTitle} placeholder="SSC General Awareness Notes"/>
 <Field label="Description" value={description} onChangeText={setDescription} multiline placeholder="Why is this useful for students?"/>
 <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}><View style={{flex:1,minWidth:230}}><DropdownSelect label="Category" value={category} onChange={setCategory} options={CATEGORIES.map(x=>({value:x,label:x}))}/></View>{mode==='url'&&<View style={{flex:1,minWidth:230}}><DropdownSelect label="Type" value={type} onChange={setType} options={TYPES}/></View>}</View>
 <Field label="Tags (comma separated)" value={tags} onChangeText={setTags} placeholder="current affairs, SSC, practice"/>
 <Button title={busy?'Saving…':'Publish to Student Library'} onPress={save} disabled={busy}/></Card>
 <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:10}}><View><Text style={{fontSize:20,fontWeight:'900',color:colors.navy}}>Published resources</Text><Text style={{fontSize:12,color:colors.muted}}>Visible to every student account.</Text></View><Badge>{items.length}</Badge></View>
 {items.length===0?<Empty title="No library resources" message="Upload your first useful student resource."/>:items.map(item=><Card key={api.idOf(item)}><View style={{flexDirection:'row',gap:12,alignItems:'center'}}><View style={{width:48,height:48,borderRadius:13,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22}}>{icons[item.type]||'📎'}</Text></View><View style={{flex:1}}><Text style={{fontSize:16,fontWeight:'900',color:colors.navy}}>{item.title}</Text><View style={{flexDirection:'row',gap:7,marginTop:5}}><Badge>{item.category||'General'}</Badge><Badge tone="purple">{item.type||'resource'}</Badge></View>{item.description&&<Text style={{fontSize:12,color:colors.muted,marginTop:6}}>{item.description}</Text>}</View></View><View style={{flexDirection:'row',gap:8,marginTop:12}}><Button title="Open" variant="secondary" onPress={()=>Linking.openURL(abs(item.url))}/>{item.media_id&&<Button title="Download" onPress={()=>Linking.openURL(api.downloadMediaUrl(item.media_id))}/>}<Button title="Delete" variant="danger" onPress={()=>remove(api.idOf(item))}/></View></Card>)}
 </AppShell>;
}
