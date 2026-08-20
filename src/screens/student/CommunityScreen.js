import React,{useEffect,useState} from 'react';
import {Alert,Text,View} from 'react-native';
import {AppShell,Button,Card,Field,Header,Loading,Empty,ErrorState} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';
export default function CommunityScreen(){
 const [posts,setPosts]=useState(null),[error,setError]=useState(''),[show,setShow]=useState(false),[title,setTitle]=useState(''),[content,setContent]=useState('');
 const load=()=>api.communityPosts().then(x=>{setError('');setPosts(api.listOf(x))}).catch(e=>setError(e.message));useEffect(load,[]);
 const add=async()=>{try{await api.createCommunityPost({title,content});setTitle('');setContent('');setShow(false);load()}catch(e){Alert.alert('Community',e.message)}};
 if(error)return <AppShell><Header title="Community"/><ErrorState title="Community could not load" message={error} onRetry={load}/></AppShell>;
 if(!posts)return <AppShell><Header title="Community" subtitle="Ask questions, share ideas and learn together"/><Loading/></AppShell>;
 return <AppShell><Header eyebrow="Community" title="Learning Community" subtitle="Discuss courses, interview questions and study strategies." right={<Button title={show?'Close':'+ New Post'} onPress={()=>setShow(!show)}/>}/>{show&&<Card><Field label="Title" value={title} onChangeText={setTitle} placeholder="How do I improve my speaking fluency?"/><Field label="Message" value={content} onChangeText={setContent} multiline placeholder="Share your question or tip..."/><Button title="Publish post" onPress={add} disabled={!title.trim()||!content.trim()}/></Card>}{posts.length===0?<Empty title="No discussions yet" message="Start the first discussion."/>:posts.map(p=><Card key={api.idOf(p)}><View style={{flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontSize:17,fontWeight:'900',color:colors.navy,flex:1}}>{p.title}</Text><Text style={{color:colors.primary,fontWeight:'900'}}>♥ {p.likes||0}</Text></View><Text style={{color:colors.muted,marginTop:7}}>{p.author_name}</Text><Text style={{color:colors.text,lineHeight:20,marginTop:10}}>{p.content}</Text><View style={{marginTop:10}}><Button title="Like" variant="secondary" onPress={async()=>{await api.likeCommunityPost(api.idOf(p));load()}}/></View></Card>)}</AppShell>
}
