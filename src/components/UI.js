import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from '../theme';

const ff = colors.fontFamily;

export function AppShell({ children, refreshing = false }) {
  return (
    <ScrollView
      style={s.root}
      contentContainerStyle={s.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {refreshing && <View style={s.refreshBar}><ActivityIndicator size="small" color={colors.primary}/><Text style={s.refreshText}>Updating…</Text></View>}
      {children}
    </ScrollView>
  );
}

export function Header({ title, subtitle, right, eyebrow }) {
  return <View style={s.header}>
    <View style={{flex:1,minWidth:220}}>
      {eyebrow && <Text style={s.eyebrow}>{eyebrow}</Text>}
      <Text style={s.h1}>{title}</Text>
      {subtitle && <Text style={s.sub}>{subtitle}</Text>}
    </View>
    {right && <View style={{marginTop:4}}>{right}</View>}
  </View>;
}

export function Breadcrumbs({ items = [] }) {
  return <View style={s.breadcrumbs}>{items.map((item,i)=><React.Fragment key={`${item}-${i}`}>
    {i>0 && <Text style={s.crumbSep}>›</Text>}
    <Text style={[s.crumb, i===items.length-1 && s.crumbActive]}>{item}</Text>
  </React.Fragment>)}</View>;
}

export function Card({ children, style }) { return <View style={[s.card, style]}>{children}</View>; }

export function Button({ title, onPress, variant='primary', disabled=false, style }) {
  const bg = variant==='primary' ? colors.primary : variant==='danger' ? colors.danger : variant==='success' ? colors.success : variant==='soft' ? colors.blueSoft : '#fff';
  const fg = variant==='primary' || variant==='danger' || variant==='success' ? '#fff' : colors.primary;
  return <Pressable onPress={onPress} disabled={disabled} style={({pressed})=>[
    s.button,
    {backgroundColor:bg,borderColor:variant==='primary'||variant==='danger'||variant==='success'?bg:'#DDD9FF',opacity: disabled ? 0.45 : (pressed ? 0.78 : 1)},
    style
  ]}><Text style={{color:fg,fontFamily:ff,fontWeight:'800',fontSize:14}}>{title}</Text></Pressable>;
}

export function IconButton({ label, onPress, danger=false }) {
  return <Pressable onPress={onPress} style={({pressed})=>[s.iconButton,{backgroundColor:danger?'#FFF0F6':'#F7F7FD',borderColor:danger?'#FFD4DE':colors.border,opacity: pressed ? 0.75 : 1}]}>
    <Text style={{fontFamily:ff,fontSize:13,fontWeight:'800',color:danger?colors.danger:colors.text}}>{label}</Text>
  </Pressable>;
}

export function Field({ label, value, onChangeText, placeholder, multiline=false, keyboardType, secureTextEntry }) {
  return <View style={{marginBottom:12}}>{label && <Text style={s.label}>{label}</Text>}<TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.subtle} multiline={multiline} keyboardType={keyboardType} secureTextEntry={secureTextEntry} style={[s.input,multiline&&{minHeight:105,textAlignVertical:'top'}]}/></View>;
}

export function Select({ label, value, options, onChange }) {
  return <View style={{marginBottom:12}}><Text style={s.label}>{label}</Text><View style={s.wrap}>{options.map(o=><Pressable key={String(o.value)} onPress={()=>onChange(o.value)} style={[s.chip,value===o.value&&s.chipActive]}><Text style={{fontFamily:ff,fontWeight:'700',color:value===o.value?colors.primary:colors.text}}>{o.label}</Text></Pressable>)}</View></View>;
}

export function DropdownSelect({ label, value, options = [], onChange, placeholder = 'Select' }) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find(o => String(o.value) === String(value));
  return <View style={{marginBottom:12}}>
    {label && <Text style={s.label}>{label}</Text>}
    <Pressable onPress={()=>setOpen(!open)} style={[s.input,{minHeight:46,justifyContent:'center',flexDirection:'row',alignItems:'center',gap:8}]}>
      <Text style={{flex:1,color:selected?colors.text:colors.subtle,fontFamily:ff,fontWeight:'700'}}>{selected?.label || placeholder}</Text>
      <Text style={{color:colors.muted,fontSize:16}}>{open?'▲':'▼'}</Text>
    </Pressable>
    {open && <View style={{borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:'#fff',marginTop:5,overflow:'hidden'}}>
      <ScrollView style={{maxHeight:230}} nestedScrollEnabled>
        {options.map(o=><Pressable key={String(o.value)} onPress={()=>{onChange(o.value);setOpen(false)}} style={{paddingHorizontal:14,paddingVertical:12,borderBottomWidth:1,borderBottomColor:'#F7F7FB',backgroundColor:String(o.value)===String(value)?colors.blueSoft:'#fff'}}>
          <Text style={{fontFamily:ff,fontWeight:String(o.value)===String(value)?'900':'700',color:String(o.value)===String(value)?colors.primary:colors.text}}>{o.label}</Text>
        </Pressable>)}
      </ScrollView>
    </View>}
  </View>;
}

export function Badge({ children, tone='blue' }) {
  const map={blue:[colors.blueSoft,colors.primary],green:[colors.greenSoft,colors.success],orange:[colors.orangeSoft,colors.warning],purple:[colors.purpleSoft,colors.purple],pink:[colors.pinkSoft,'#D72F75'],red:['#FFF0F6',colors.danger]};
  const [bg,fg]=map[tone]||map.blue;
  return <View style={{backgroundColor:bg,paddingHorizontal:10,paddingVertical:6,borderRadius:20,alignSelf:'flex-start'}}><Text style={{fontFamily:ff,color:fg,fontSize:11,fontWeight:'900'}}>{children}</Text></View>;
}

export function Loading({ label='Loading…' }) { return <Card style={s.loading}><ActivityIndicator size="large" color={colors.primary}/><Text style={s.loadingText}>{label}</Text><Text style={s.loadingHint}>Connecting to your learning data</Text></Card>; }

export function ErrorState({ title='Could not load this screen', message='Please check the backend connection and try again.', onRetry }) {
  return <Card style={s.errorCard}><Text style={{fontFamily:ff,fontSize:18,fontWeight:'900',color:colors.navy}}>{title}</Text><Text style={{fontFamily:ff,color:colors.muted,lineHeight:20,marginTop:6}}>{message}</Text>{onRetry&&<View style={{marginTop:14}}><Button title="Try again" onPress={onRetry}/></View>}</Card>;
}

export function SectionTitle({ title, subtitle, right }) {
  return <View style={{flexDirection:'row',alignItems:'flex-end',justifyContent:'space-between',gap:10,marginTop:6,marginBottom:10}}>
    <View style={{flex:1}}>
      <Text style={{fontFamily:ff,fontSize:20,fontWeight:'900',color:colors.navy}}>{title}</Text>
      {subtitle && <Text style={{fontFamily:ff,fontSize:12,color:colors.muted,marginTop:3,lineHeight:18}}>{subtitle}</Text>}
    </View>
    {right}
  </View>;
}

export function ProgressBar({ value=0, height=9, color=colors.primary }) {
  const safe=Math.max(0,Math.min(100,Number(value)||0));
  return <View style={{height,width:'100%',backgroundColor:'#ECECF4',borderRadius:99,overflow:'hidden'}}>
    <View style={{height,width:`${safe}%`,backgroundColor:color,borderRadius:99}}/>
  </View>;
}

export function Empty({title,message,action}){return <Card style={{alignItems:'center',padding:30}}><Text style={{fontFamily:ff,fontSize:18,fontWeight:'900',color:colors.navy}}>{title}</Text>{message&&<Text style={{fontFamily:ff,color:colors.muted,textAlign:'center',marginTop:6,maxWidth:520}}>{message}</Text>}{action&&<View style={{marginTop:15}}>{action}</View>}</Card>;}

export const s=StyleSheet.create({
 root:{flex:1,backgroundColor:colors.background},
 content:{paddingHorizontal:22,paddingTop:20,paddingBottom:55,width:'100%',maxWidth:1280,alignSelf:'center',minHeight:600},
 header:{flexDirection:'row',alignItems:'center',marginBottom:18,gap:12},
 eyebrow:{fontFamily:ff,fontSize:11,fontWeight:'900',color:colors.primary,textTransform:'uppercase',letterSpacing:1.2,marginBottom:5},
 h1:{fontFamily:ff,fontSize:28,fontWeight:'900',color:colors.navy},
 sub:{fontFamily:ff,color:colors.muted,marginTop:5,lineHeight:20},
 breadcrumbs:{flexDirection:'row',alignItems:'center',flexWrap:'wrap',gap:5,marginBottom:12},
 crumb:{fontFamily:ff,fontSize:12,color:colors.subtle,fontWeight:'700'},
 crumbActive:{color:colors.text},
 crumbSep:{color:colors.subtle,fontSize:18},
 card:{backgroundColor:'#fff',borderRadius:18,borderWidth:1,borderColor:colors.border,padding:18,marginBottom:14,shadowColor:colors.shadow,shadowOpacity:0.045,shadowRadius:12,shadowOffset:{width:0,height:4}},
 button:{minHeight:44,borderRadius:12,borderWidth:1,paddingHorizontal:16,paddingVertical:10,alignItems:'center',justifyContent:'center'},
 iconButton:{borderWidth:1,borderRadius:10,paddingHorizontal:11,paddingVertical:8},
 input:{borderWidth:1,borderColor:colors.border,borderRadius:12,backgroundColor:'#fff',paddingHorizontal:13,paddingVertical:11,color:colors.text,fontFamily:ff},
 label:{fontFamily:ff,fontSize:12,fontWeight:'800',color:colors.text,marginBottom:6},
 wrap:{flexDirection:'row',flexWrap:'wrap',gap:8},
 chip:{borderWidth:1,borderColor:colors.border,borderRadius:20,paddingHorizontal:12,paddingVertical:8,backgroundColor:'#fff'},
 chipActive:{backgroundColor:colors.blueSoft,borderColor:'#B9B1FF'},
 loading:{minHeight:190,alignItems:'center',justifyContent:'center'},
 loadingText:{fontFamily:ff,fontWeight:'900',fontSize:16,color:colors.navy,marginTop:12},
 loadingHint:{fontFamily:ff,color:colors.subtle,fontSize:12,marginTop:4},
 errorCard:{backgroundColor:'#FFF7F9',borderColor:'#FFD4DE'},
 refreshBar:{flexDirection:'row',alignItems:'center',gap:7,marginBottom:10},
 refreshText:{fontFamily:ff,fontSize:12,color:colors.muted,fontWeight:'700'}
});
