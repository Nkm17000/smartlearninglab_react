import React,{useEffect,useState} from 'react';
import {Alert,Pressable,Text,View,useWindowDimensions,Platform} from 'react-native';
import {AppShell,Badge,Button,Card,ErrorState,Field,Header,Loading,Empty} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

function StickyCard({card,index,revealed,onFlip,onDelete,onReview,cardWidth}){
  const id=api.idOf(card);
  const colorsByIndex=[colors.purpleSoft,colors.orangeSoft,colors.blueSoft];
  const paper=colorsByIndex[index%colorsByIndex.length];
  return <View style={{width:cardWidth,marginBottom:8}}>
    <View style={{position:'absolute',zIndex:4,top:-6,left:'45%',width:54,height:14,borderRadius:4,backgroundColor:'#F4D98B',opacity:.85,transform:[{rotate:'-3deg'}]}} />
    <Card style={{minHeight:260,backgroundColor:paper,borderColor:'#E8E2D4',padding:18,shadowOpacity:.08,shadowRadius:14,transform:[{rotate:index===1?'1deg':index===2?'-1deg':'0deg'}],position:'relative'}}>
      <Pressable onPress={()=>onDelete(card)} onStartShouldSetResponder={()=>true} hitSlop={10} accessibilityRole="button" accessibilityLabel="Delete flashcard" pointerEvents="auto" style={({pressed})=>({position:'absolute',right:10,top:10,width:32,height:32,borderRadius:16,backgroundColor:pressed?'#FFF0F3':'#fff',borderWidth:1,borderColor:'#EADFE2',alignItems:'center',justifyContent:'center',zIndex:50,elevation:8,shadowColor:'#000',shadowOpacity:.12,shadowRadius:5,opacity:pressed?.72:1})}>
        <Text style={{fontFamily:colors.fontFamily,fontWeight:'900',fontSize:14,color:colors.danger}}>×</Text>
      </Pressable>
      <Badge tone="purple">FLASHCARD</Badge>
      <Text style={{fontFamily:colors.fontFamily,fontSize:18,fontWeight:'900',color:colors.navy,lineHeight:25,marginTop:18,paddingRight:25}}>📝 {card.front}</Text>
      <Pressable onPress={()=>onFlip(id)} style={{marginTop:18,borderRadius:14,borderWidth:1,borderColor:'#D9D2F7',backgroundColor:'rgba(255,255,255,.68)',padding:14,minHeight:72,justifyContent:'center'}}>
        {revealed===id ? <><Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'900',color:colors.primary}}>ANSWER</Text><Text style={{fontFamily:colors.fontFamily,color:colors.text,lineHeight:19,marginTop:5}}>{card.back}</Text></> : <View style={{alignItems:'center'}}><Text style={{fontSize:22}}>↻</Text><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.primary,marginTop:4}}>Tap to flip</Text></View>}
      </Pressable>
      {revealed===id&&<View style={{marginTop:12}}><Text style={{fontFamily:colors.fontFamily,fontSize:10,fontWeight:'900',color:colors.muted}}>How well did you remember?</Text><View style={{flexDirection:'row',gap:6,marginTop:7,flexWrap:'wrap'}}>{[['Again',1],['Hard',2],['Good',4],['Easy',5]].map(([label,q])=><Button key={label} title={label} variant="secondary" onPress={()=>onReview(id,q)}/>)}</View></View>}
    </Card>
  </View>;
}

export default function FlashcardsScreen(){
 const {width}=useWindowDimensions();
 const cardWidth=width>=1100?'31.8%':width>=720?'48.5%':'100%';
 const [cards,setCards]=useState(null),[showAdd,setShowAdd]=useState(false),[revealed,setRevealed]=useState(null),[front,setFront]=useState(''),[back,setBack]=useState(''),[error,setError]=useState(''),[deleting,setDeleting]=useState('');
 const load=async()=>{try{setError('');setCards(api.listOf(await api.flashcards()))}catch(e){setError(e?.message||'Unable to load flashcards.')}};
 useEffect(()=>{load()},[]);
 const add=async()=>{try{await api.createFlashcard({front,back});setFront('');setBack('');setShowAdd(false);setRevealed(null);load()}catch(e){Alert.alert('Flashcard',e.message)}};
 const review=async(id,q)=>{try{await api.reviewFlashcard(id,{quality:q});setRevealed(null);load()}catch(e){Alert.alert('Review',e.message)}};
 const remove=async(card)=>{const id=api.idOf(card);const message=`Remove "${card.front||'this card'}" from your deck?`;const doDelete=async()=>{try{setDeleting(id);await api.deleteFlashcard(id);setRevealed(null);await load()}catch(e){Alert.alert('Delete flashcard',e.message)}finally{setDeleting('')}};if(Platform.OS==='web'&&typeof window!=='undefined'){if(window.confirm(`Delete flashcard?\n\n${message}`))await doDelete();return;}Alert.alert('Delete flashcard?',message,[{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:doDelete}]);};
 if(error)return <AppShell><Header eyebrow="Revision" title="Flashcards" subtitle="Sticky-note revision for long-term memory"/><ErrorState title="Flashcards could not load" message={error} onRetry={load}/></AppShell>;
 if(!cards)return <AppShell><Header title="Flashcards" subtitle="Sticky-note revision for long-term memory"/><Loading label="Loading your flashcards…"/></AppShell>;
 return <AppShell>
   <Header eyebrow="Revision" title="Flashcards" subtitle="Flip a note, recall the answer, and keep your memory sharp." right={<Button title={showAdd?'Close':'+ Add Card'} onPress={()=>setShowAdd(!showAdd)}/>}/>
   {showAdd&&<Card style={{backgroundColor:'#FFFDF4',borderColor:'#F1E5B8'}}><Text style={{fontFamily:colors.fontFamily,fontSize:17,fontWeight:'900',color:colors.navy,marginBottom:12}}>Create a new sticky note</Text><Field label="Front" value={front} onChangeText={setFront} placeholder="What is polymorphism?"/><Field label="Back" value={back} onChangeText={setBack} multiline placeholder="The ability of an object to take many forms…"/><Button title="Create flashcard" onPress={add} disabled={!front.trim()||!back.trim()}/></Card>}
   {cards.length===0?<Empty title="No flashcards yet" message="Create your first card and it will appear here as a sticky note."/>:<>
     <View style={{marginBottom:12}}><Text style={{fontFamily:colors.fontFamily,fontSize:18,fontWeight:'900',color:colors.navy}}>Your study desk</Text><Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted,marginTop:3}}>{cards.length} flashcard{cards.length===1?'':'s'} · Up to 3 cards per row</Text></View>
     <View style={{flexDirection:'row',flexWrap:'wrap',gap:14,alignItems:'stretch'}}>{cards.map((c,i)=><StickyCard key={api.idOf(c)} card={c} index={i%3} revealed={revealed} onFlip={setRevealed} onDelete={remove} onReview={review} cardWidth={cardWidth}/>)}</View>
   </>}
 </AppShell>;
}
