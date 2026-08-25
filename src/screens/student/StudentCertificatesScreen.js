import React,{useEffect,useState} from 'react';
import {Alert,Linking,Text,View} from 'react-native';
import {AppShell,Badge,Button,Card,Empty,ErrorState,Header,Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

export default function StudentCertificatesScreen(){
 const [items,setItems]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState('');
 const load=async()=>{try{setError('');setItems(api.listOf(await api.certificates()))}catch(e){setError(e.message)}};
 useEffect(()=>{load()},[]);

 const issue=async courseId=>{
   try{setBusy(courseId);await api.issueCertificate(courseId);await load();Alert.alert('Certificate','Certificate issued successfully.');}
   catch(e){Alert.alert('Certificate',e.message)}
   finally{setBusy('')}
 };

 const open=async(certificateId,mode)=>{
   try{
     setBusy(certificateId);
     const access=await api.certificateAccess(certificateId);
     const base=api.BASE_URL;
     const path=mode==='preview'
       ? `/certificates/public/${encodeURIComponent(certificateId)}/preview`
       : `/certificates/public/${encodeURIComponent(certificateId)}/download`;
     await Linking.openURL(`${base}${path}?token=${encodeURIComponent(access.preview_token)}`);
   }catch(e){
     Alert.alert('Certificate',`Unable to open certificate. ${e.message}`);
   }finally{setBusy('')}
 };

 if(error)return <AppShell><Header title="Certificates"/><ErrorState title="Certificates could not load" message={error} onRetry={load}/></AppShell>;
 if(!items)return <AppShell><Loading label="Loading certificates…"/></AppShell>;

 return <AppShell>
   <Header eyebrow="Achievements" title="Certificates" subtitle="Preview your verified certificate before downloading it."/>
   {items.length===0?<Empty title="No certificates yet" message="Complete all published lessons in a course to unlock its certificate."/>:
    items.map(c=><Card key={api.idOf(c)} style={{borderColor:'#F9A8D4',padding:20}}>
      <View style={{borderWidth:3,borderColor:colors.primary,borderRadius:14,padding:22,backgroundColor:'#FDF2F8',alignItems:'center'}}>
        <Text style={{fontSize:28}}>🏆</Text>
        <Text style={{fontSize:11,fontWeight:'900',letterSpacing:2,color:colors.navy,marginTop:8}}>SMART LEARNING LAB</Text>
        <Text style={{fontSize:20,fontWeight:'900',color:colors.primary,marginTop:12}}>CERTIFICATE OF COMPLETION</Text>
        <Text style={{fontSize:12,color:colors.muted,marginTop:12}}>This certificate is proudly presented to</Text>
        <Text style={{fontSize:23,fontWeight:'900',color:colors.navy,marginTop:5,textAlign:'center'}}>{c.student_name}</Text>
        <Text style={{fontSize:12,color:colors.muted,marginTop:10}}>for successfully completing</Text>
        <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginTop:4,textAlign:'center'}}>{c.course_name}</Text>
        <Badge tone="green" style={{marginTop:12}}>Verified</Badge>
      </View>
      <Text style={{fontSize:12,color:colors.muted,marginTop:12}}>Certificate ID: {c.certificate_id}</Text>
      <Text style={{fontSize:12,color:colors.muted,marginTop:4}}>Issued: {c.issued_at ? String(c.issued_at).slice(0,10) : '-'}</Text>
      <View style={{flexDirection:'row',gap:8,flexWrap:'wrap',marginTop:14}}>
        <Button title="👁 Preview PDF" variant="secondary" onPress={()=>open(c.certificate_id,'preview')}/>
        <Button title="⬇ Download PDF" onPress={()=>open(c.certificate_id,'download')}/>
      </View>
    </Card>)}
 </AppShell>
}
