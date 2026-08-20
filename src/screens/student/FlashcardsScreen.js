import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,View} from 'react-native';
import {AppShell,Button,Card,Field,Header,Loading,Empty,ErrorState} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';
export default function FlashcardsScreen(){
 const [cards,setCards]=useState(null),[error,setError]=useState(''),[show,setShow]=useState(false),[front,setFront]=useState(''),[back,setBack]=useState('');
 const load=()=>api.flashcards().then(x=>{setError('');setCards(api.listOf(x))}).catch(e=>setError(e.message)); useEffect(load,[]);
 const add=async()=>{try{await api.createFlashcard({front,back});setFront('');setBack('');setShow(false);load()}catch(e){Alert.alert('Flashcard',e.message)}};
 const review=async(id,q)=>{try{await api.reviewFlashcard(id,{quality:q});load()}catch(e){Alert.alert('Review',e.message)}};
 if(error)return <AppShell><Header title="Flashcards"/><ErrorState title="Flashcards could not load" message={error} onRetry={load}/></AppShell>;
 if(!cards)return <AppShell><Header title="Flashcards" subtitle="Spaced repetition for long-term memory"/><Loading/></AppShell>;
 return <AppShell><Header eyebrow="Revision" title="Flashcards + Spaced Repetition" subtitle="Review due cards and build a memory habit." right={<Button title={show?'Close':'+ Add Card'} onPress={()=>setShow(!show)}/>}/>
 {show&&<Card><Field label="Front" value={front} onChangeText={setFront} placeholder="Present perfect"/><Field label="Back" value={back} onChangeText={setBack} multiline placeholder="Have/has + past participle"/><Button title="Create flashcard" onPress={add} disabled={!front.trim()||!back.trim()}/></Card>}
 {cards.length===0?<Empty title="No flashcards yet" message="Create your first card or generate a deck from your course."/>:cards.map(c=><Card key={api.idOf(c)}><Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>{c.front}</Text><Pressable onPress={()=>setShow(c._id)}><Text style={{color:colors.primary,fontWeight:'800',marginTop:10}}>{show===c._id?'Answer':'Tap to reveal'}</Text></Pressable>{show===c._id&&<><Text style={{marginTop:10,color:colors.text,lineHeight:20}}>{c.back}</Text><Text style={{fontSize:12,color:colors.muted,marginTop:12}}>How well did you remember?</Text><View style={{flexDirection:'row',gap:7,marginTop:8,flexWrap:'wrap'}}>{[['Again',1],['Hard',2],['Good',4],['Easy',5]].map(([label,q])=><Button key={label} title={label} variant="secondary" onPress={()=>{setShow(false);review(api.idOf(c),q)}}/>)}</View></>}</Card>)}
 </AppShell>
}
