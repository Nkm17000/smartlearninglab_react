import React,{useCallback,useEffect,useState} from 'react';
import {Text,View} from 'react-native';
import {AppShell,Badge,Card,Empty,ErrorState,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

export default function LeaderboardScreen(){
 const [data,setData]=useState(null),[error,setError]=useState('');
 const load=useCallback(async()=>{
   try{
     setError('');
     const response=await api.leaderboard(20);
     if(!response || typeof response !== 'object') throw new Error('Invalid leaderboard response from backend.');
     const items=Array.isArray(response)?response:(Array.isArray(response?.items)?response.items:[]);
     setData({
       items,
       me:response?.me || null,
       total_students:Number(response?.total_students)||items.length,
     });
   }catch(e){setError(e?.message||'Unable to load leaderboard.');}
 },[]);
 useEffect(()=>{load()},[load]);
 if(error)return <AppShell><Header title="Leaderboard"/><ErrorState title="Leaderboard could not load" message={error} onRetry={load}/></AppShell>;
 if(!data)return <AppShell><Loading label="Loading leaderboard…"/></AppShell>;
 return <AppShell>
   <Header eyebrow="Community" title="Leaderboard" subtitle="Learn, practice and climb the rankings."/>
   {data.me&&<Card style={{backgroundColor:colors.pinkSoft,borderColor:'#F9A8D4'}}>
     <Text style={{fontSize:12,color:colors.primary,fontWeight:'900'}}>YOUR RANK</Text>
     <Text style={{fontSize:28,fontWeight:'900',color:colors.navy,marginTop:5}}>#{data.me.rank}</Text>
     <Text style={{color:colors.muted}}>{data.me.xp} XP · {data.me.lessons} lessons · {data.me.tests} tests</Text>
   </Card>}
   {!data.me && data.total_students>0 && <Card style={{backgroundColor:'#F8F9FD'}}>
     <Text style={{fontWeight:'900',color:colors.navy}}>Your rank is outside the top 20</Text>
     <Text style={{color:colors.muted,marginTop:5}}>Keep learning and completing assessments to climb the leaderboard.</Text>
   </Card>}
   {data.items.length===0?<Empty title="No students yet" message="The leaderboard will appear once student activity is available."/>:
     data.items.map((row,index)=><Card key={row.id || `${row.rank}-${index}`} style={{paddingVertical:13}}>
       <View style={{flexDirection:'row',alignItems:'center',gap:12}}>
         <View style={{width:38,height:38,borderRadius:19,backgroundColor:row.rank===1?'#FEF3C7':row.rank===2?'#F7F7FB':row.rank===3?'#FFEDD5':'#F8F9FD',alignItems:'center',justifyContent:'center'}}>
           <Text style={{fontWeight:'900'}}>#{row.rank}</Text>
         </View>
         <View style={{flex:1}}>
           <Text style={{fontWeight:'900',color:colors.navy}}>{row.name || 'Student'}</Text>
           <Text style={{fontSize:12,color:colors.muted}}>{Number(row.lessons)||0} lessons · {Number(row.tests)||0} tests</Text>
         </View>
         <Badge tone={row.rank<=3?'orange':'blue'}>{Number(row.xp)||0} XP</Badge>
       </View>
     </Card>)}
 </AppShell>;
}
