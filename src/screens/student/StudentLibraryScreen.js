import React,{useEffect,useState} from 'react';
import {Linking,Pressable,Text,View} from 'react-native';
import {AppShell,Badge,Button,Card,Empty,ErrorState,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';
const abs=u=>u?.startsWith('http')?u:`${api.BASE_URL.replace('/api/v1','')}${u||''}`;
const icons={pdf:'📄',document:'📑',video:'🎥',audio:'🎧',image:'🖼️',other:'📎',link:'🔗'};
export default function StudentLibraryScreen(){
 const [items,setItems]=useState(null),[categories,setCategories]=useState([]),[active,setActive]=useState(''),[error,setError]=useState('');
 const load=async category=>{try{setError('');const d=await api.studentLibrary(category);setItems(api.listOf(d))}catch(e){setError(e.message)}};
 useEffect(()=>{Promise.allSettled([api.libraryCategories(),api.studentLibrary()]).then(([c,i])=>{if(c.status==='fulfilled')setCategories(api.listOf(c.value?.categories));if(i.status==='fulfilled')setItems(api.listOf(i.value));else setError(i.reason?.message||'Unable to load library')})},[]);
 if(error)return <AppShell><Header title="Student Library"/><ErrorState title="Library could not load" message={error} onRetry={()=>load(active)}/></AppShell>;
 if(!items)return <AppShell><Header title="Student Library"/><Loading label="Loading study material…"/></AppShell>;
 return <AppShell><Header eyebrow="Study material" title="Student Library" subtitle="Useful PDFs, notes, current-affairs material and other resources selected by your learning team."/>
 <View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14}}><Pressable onPress={()=>{setActive('');load('')}} style={{paddingHorizontal:13,paddingVertical:9,borderRadius:22,borderWidth:1,borderColor:!active?colors.primary:colors.border,backgroundColor:!active?colors.pinkSoft:'#fff'}}><Text style={{fontWeight:'800',color:!active?colors.primary:colors.text}}>All</Text></Pressable>{categories.map(c=><Pressable key={c} onPress={()=>{setActive(c);load(c)}} style={{paddingHorizontal:13,paddingVertical:9,borderRadius:22,borderWidth:1,borderColor:active===c?colors.primary:colors.border,backgroundColor:active===c?colors.pinkSoft:'#fff'}}><Text style={{fontWeight:'800',color:active===c?colors.primary:colors.text}}>{c}</Text></Pressable>)}</View>
 {items.length===0?<Empty title="No resources in this category" message="Try another category or check back later."/>:<View style={{flexDirection:'row',flexWrap:'wrap',gap:14}}>{items.map(item=><Card key={api.idOf(item)} style={{width:'100%',minWidth:0}}><Text style={{fontSize:30}}>{icons[item.type]||'📎'}</Text><Text style={{fontSize:17,fontWeight:'900',color:colors.navy,marginTop:8}} numberOfLines={2}>{item.title}</Text><View style={{flexDirection:'row',gap:7,marginTop:8}}><Badge>{item.category||'General'}</Badge><Badge tone="purple">{item.type||'resource'}</Badge></View>{item.description&&<Text style={{fontSize:12,color:colors.muted,lineHeight:18,marginTop:8}}>{item.description}</Text>}<View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:12}}>
 <Button title="Open →" variant="secondary" onPress={()=>Linking.openURL(abs(item.url))}/>
 {item.media_id&&<Button title="⬇ Download" onPress={()=>Linking.openURL(api.downloadMediaUrl(item.media_id))}/>}
</View></Card>)}</View>}
 </AppShell>;
}
