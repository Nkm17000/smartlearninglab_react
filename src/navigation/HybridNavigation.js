import React, {useState} from 'react';
import {Pressable, ScrollView, Text, View, useWindowDimensions} from 'react-native';
import {colors} from '../theme';

const Icon = ({name}) => <Text style={{fontSize:16,width:22,textAlign:'center',fontFamily:colors.fontFamily}}>{name}</Text>;

export default function HybridNavigation({route,setRoute,logout,admin=false,root=false,children}) {
  const {width} = useWindowDimensions();
  const compact = width < 950;
  const [drawer,setDrawer] = useState(false);

  const top = admin
    ? [['home','⌂','Dashboard'],['courses','▣','Courses'],['quizzes','✓','Test Series'],['ai-lab','✦','AI Lab'],['students','♙','Students'],['library-admin','▤','Resource Library'],['bulk-content','⚡','Bulk Content']]
    : [['home','⌂','Home'],['courses','▣','Courses'],['quizzes','✓','Quizzes'],['progress','◉','My Learning'],['study','✦','Study Assistance'],['flashcards','▤','Flashcards']];

  const side = admin
    ? [['questions','Question Bank','Questions and content'],['taxonomy','Taxonomy','Manage categories and subcategories'],['analytics','Analytics','Platform performance'],...(root?[['staff','Admin & Staff','Manage administrators']]:[])]
    : [['analytics','Analytics','Performance insights'],['bookmarks','Bookmarks','Saved items'],['leaderboard','Leaderboard','Compare & improve'],['certificates','Certificates','Your achievements'],['notes','Notes','Your personal notes'],['library','Study Library','PDFs & resources'],['community','Community','Learn with others'],['notifications','Notifications','Updates & alerts'],['gamification','Gamification','Learning games & XP'],['mock-test','Mock Test','Adaptive practice tests']];

  const active = route.startsWith('course:') ? 'courses' : route.startsWith('quiz:') ? 'quizzes' : route;
  const go = (r) => { setDrawer(false); setRoute(r); };

  const renderMenuItem = ([r,icon,label]) => (
    <Pressable key={r} onPress={()=>go(r)} style={{flexDirection:'row',alignItems:'center',gap:8,padding:11,borderRadius:12,marginBottom:4,backgroundColor:active===r?colors.blueSoft:'#fff'}}>
      <View style={{width:25,height:25,borderRadius:8,backgroundColor:active===r?colors.purpleSoft:'#F7F7FB',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:13}}>{icon}</Text></View>
      <Text style={{fontFamily:colors.fontFamily,fontSize:12,fontWeight:'900',color:active===r?colors.primary:colors.navy}}>{label}</Text>
    </Pressable>
  );

  const renderSideItem = ([r,label,desc]) => (
    <Pressable key={r} onPress={()=>go(r)} style={{padding:11,borderRadius:12,marginBottom:4,backgroundColor:active===r?colors.blueSoft:'#fff'}}>
      <View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{width:25,height:25,borderRadius:8,backgroundColor:active===r?colors.purpleSoft:'#F7F7FB',alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:13}}>•</Text></View><View style={{flex:1}}><Text style={{fontFamily:colors.fontFamily,fontSize:12,fontWeight:'900',color:active===r?colors.primary:colors.navy}}>{label}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:9,color:colors.muted,marginTop:2}}>{desc}</Text></View></View>
    </Pressable>
  );

  return <View style={{flex:1,backgroundColor:colors.background}}>
    <View style={{backgroundColor:colors.surface,borderBottomWidth:1,borderBottomColor:colors.border,zIndex:10}}>
      <View style={{maxWidth:1440,width:'100%',alignSelf:'center',paddingHorizontal:20,paddingVertical:10,flexDirection:'row',alignItems:'center',gap:10}}>
        {compact && <Pressable onPress={()=>setDrawer(true)} style={{width:42,height:42,borderRadius:12,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:22,color:colors.navy}}>☰</Text></Pressable>}
        <Pressable onPress={()=>go('home')} style={{width:compact?155:admin?250:215}}>
          <View style={{flexDirection:'row',alignItems:'center',gap:8}}>
            <View style={{width:34,height:34,borderRadius:11,backgroundColor:colors.purpleSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:19}}>📚</Text></View>
            <View><Text style={{fontFamily:colors.fontFamily,fontSize:17,fontWeight:'900',color:colors.navy}}>Smart <Text style={{color:colors.primary}}>Learning Lab</Text></Text>{!compact&&<Text style={{fontFamily:colors.fontFamily,fontSize:8,color:colors.muted,fontWeight:'900',letterSpacing:1}}>LEARN • PRACTICE • GROW</Text>}</View>
          </View>
        </Pressable>
        {/* Student top navigation is unchanged. Admin navigation has moved completely into the left menu. */}
        {!admin && !compact && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{gap:5,alignItems:'center',flexGrow:1}}>{top.map(([r,icon,label])=><Pressable key={r} onPress={()=>go(r)} style={{flexDirection:'row',alignItems:'center',gap:5,paddingHorizontal:14,paddingVertical:10,borderRadius:12,backgroundColor:active===r?colors.blueSoft:'#fff'}}><Icon name={icon}/><Text style={{fontFamily:colors.fontFamily,fontSize:12,fontWeight:'900',color:active===r?colors.primary:colors.text}}>{label}</Text></Pressable>)}</ScrollView>}
        {compact && <View style={{flex:1}}/>}
        {!admin && <Pressable onPress={()=>go('notifications')} style={{width:40,height:40,borderRadius:12,alignItems:'center',justifyContent:'center'}}><Text style={{fontSize:20}}>♧</Text></Pressable>}
        <View style={{width:38,height:38,borderRadius:19,backgroundColor:colors.blueSoft,alignItems:'center',justifyContent:'center'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.primary}}>{admin?'RA':'ST'}</Text></View>
        {!compact && <View style={{paddingRight:6}}><Text style={{fontFamily:colors.fontFamily,fontSize:11,fontWeight:'900',color:colors.navy}}>{root?'Root Admin':admin?'Admin':'Student'}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:9,color:colors.muted}}>Account</Text></View>}
        {!compact && <Pressable onPress={logout} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:10,backgroundColor:'#FFF0F6'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',fontSize:12,color:colors.danger}}>Logout</Text></Pressable>}
      </View>
    </View>

    <View style={{flex:1,flexDirection:'row',maxWidth:1440,width:'100%',alignSelf:'center'}}>
      {!compact && <View style={{width:245,borderRightWidth:1,borderRightColor:colors.border,backgroundColor:colors.surface,padding:12}}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:30}}>
          {admin ? <>
            <Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginHorizontal:8,marginBottom:9,marginTop:4}}>MAIN MENU</Text>
            {top.map(renderMenuItem)}
            <View style={{height:1,backgroundColor:colors.border,marginVertical:10}}/>
            <Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginHorizontal:8,marginBottom:9}}>LEARNING MENU</Text>
            {side.map(renderSideItem)}
          </> : <>
            <Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginHorizontal:8,marginBottom:9,marginTop:4}}>LEARNING MENU</Text>
            {side.map(renderSideItem)}
            <View style={{marginTop:12,padding:14,borderRadius:16,backgroundColor:colors.orangeSoft}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.navy,fontSize:13}}>Streak on fire! 🔥</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:4}}>Keep learning daily</Text><View style={{height:7,backgroundColor:'#FCE4D0',borderRadius:10,marginTop:10}}><View style={{width:'45%',height:7,backgroundColor:colors.warning,borderRadius:10}}/></View><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.warning,fontWeight:'900',marginTop:7}}>3 / 7 days</Text></View>
          </>}
          <Pressable onPress={logout} style={{padding:12,borderRadius:12,marginTop:14,backgroundColor:'#FFF0F6'}}><Text style={{fontFamily:colors.fontFamily,fontSize:12,fontWeight:'900',color:colors.danger}}>Logout</Text></Pressable>
        </ScrollView>
      </View>}
      <View style={{flex:1,minWidth:0}}>{children}</View>
    </View>

    {compact && drawer && <View style={{position:'absolute',top:0,left:0,right:0,bottom:0,zIndex:50,flexDirection:'row'}}>
      <Pressable onPress={()=>setDrawer(false)} style={{flex:1,backgroundColor:'rgba(15,18,50,0.35)'}} />
      <View style={{position:'absolute',left:0,top:0,bottom:0,width:310,backgroundColor:colors.surface,padding:18,shadowColor:'#000',shadowOpacity:0.15,shadowRadius:20}}>
        <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:18}}><Text style={{fontFamily:colors.fontFamily,fontSize:19,fontWeight:'900',color:colors.navy}}>{admin?'Admin Menu':'Learning Menu'}</Text><Pressable onPress={()=>setDrawer(false)}><Text style={{fontSize:22,color:colors.muted}}>×</Text></Pressable></View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {admin && <><Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginBottom:8}}>MAIN MENU</Text>{top.map(([r,icon,label])=><Pressable key={r} onPress={()=>go(r)} style={{padding:13,borderRadius:12,marginBottom:6,backgroundColor:active===r?colors.blueSoft:'#fff'}}><View style={{flexDirection:'row',alignItems:'center',gap:9}}><Text style={{fontSize:16,width:22,textAlign:'center'}}>{icon}</Text><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:active===r?colors.primary:colors.navy}}>{label}</Text></View></Pressable>)}<View style={{height:1,backgroundColor:colors.border,marginVertical:10}}/></>}
          {!admin && <><Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginBottom:8}}>MAIN MENU</Text>{top.map(([r,icon,label])=><Pressable key={r} onPress={()=>go(r)} style={{padding:13,borderRadius:12,marginBottom:6,backgroundColor:active===r?colors.blueSoft:'#fff'}}><View style={{flexDirection:'row',alignItems:'center',gap:9}}><Text style={{fontSize:16,width:22,textAlign:'center'}}>{icon}</Text><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:active===r?colors.primary:colors.navy}}>{label}</Text></View></Pressable>)}<View style={{height:1,backgroundColor:colors.border,marginVertical:10}}/></>}
          <Text style={{fontFamily:colors.fontFamily,fontSize:9,fontWeight:'900',color:colors.subtle,letterSpacing:1.2,marginBottom:8}}>{admin?'LEARNING MENU':'LEARNING MENU'}</Text>
          {side.map(([r,label,desc])=><Pressable key={r} onPress={()=>go(r)} style={{padding:13,borderRadius:12,marginBottom:6,backgroundColor:active===r?colors.blueSoft:'#fff'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:active===r?colors.primary:colors.navy}}>{label}</Text><Text style={{fontFamily:colors.fontFamily,fontSize:10,color:colors.muted,marginTop:3}}>{desc}</Text></Pressable>)}
          <Pressable onPress={logout} style={{padding:13,borderRadius:12,marginTop:8,backgroundColor:'#FFF0F6'}}><Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.danger}}>Logout</Text></Pressable>
        </ScrollView>
      </View>
    </View>}
  </View>;
}
