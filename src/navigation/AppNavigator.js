import React,{useEffect,useState} from 'react';
import {Pressable,Text,View} from 'react-native';
import LoginScreen from '../screens/LoginScreen';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminCoursesScreen from '../screens/admin/AdminCoursesScreen';
import AdminCourseBuilderScreen from '../screens/admin/AdminCourseBuilderScreen';
import AdminQuestionsScreen from '../screens/admin/AdminQuestionsScreen';
import AdminQuizzesScreen from '../screens/admin/AdminQuizzesScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen';
import StudentNotesScreen from '../screens/student/StudentNotesScreen';
import AIChatScreen from '../screens/student/AIChatScreen';
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentCourseScreen from '../screens/student/StudentCourseScreen';
import StudentQuizScreen from '../screens/student/StudentQuizScreen';
import StudentProgressScreen from '../screens/student/StudentProgressScreen';
import StudentAnalyticsScreen from '../screens/student/StudentAnalyticsScreen';
import LeaderboardScreen from '../screens/student/LeaderboardScreen';
import StudentCertificatesScreen from '../screens/student/StudentCertificatesScreen';
import StudentNotificationsScreen from '../screens/student/StudentNotificationsScreen';
import StudentBookmarksScreen from '../screens/student/StudentBookmarksScreen';
import ErrorBoundary from '../components/ErrorBoundary';
import {api} from '../services/api';
import {colors} from '../theme';

const adminRoles = ['root_admin','admin','content_admin','instructor','support_admin'];

function Nav({route,setRoute,logout,admin,root}){
 const items=admin
  ? [['home','Dashboard'],['courses','Courses'],['questions','Question Bank'],['quizzes','Test Series'],['students','Students'],['analytics','Analytics'],...(root?[['staff','Admin & Staff']]:[])]
  : [['home','Home'],['progress','My Learning'],['analytics','Analytics'],['bookmarks','Bookmarks'],['leaderboard','Leaderboard'],['certificates','Certificates'],['ai','AI Tutor'],['notes','Notes'],['notifications','🔔']];
 const active=route.startsWith('course:')?'courses':route.startsWith('quiz:')?'home':route;
 return <View style={{backgroundColor:'#fff',borderBottomWidth:1,borderBottomColor:colors.border}}>
  <View style={{maxWidth:1320,width:'100%',alignSelf:'center',paddingHorizontal:22,paddingVertical:13,flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap'}}>
   <Pressable onPress={()=>setRoute('home')} style={{marginRight:12,minWidth:190}}><Text style={{fontSize:21,fontWeight:'900',color:colors.navy}}>Smart <Text style={{color:colors.primary}}>Learning Lab</Text></Text><Text style={{fontSize:9,color:colors.muted,fontWeight:'800',letterSpacing:1}}>LEARN • PRACTICE • GROW</Text></Pressable>
   {items.map(([r,l])=><Pressable key={r} onPress={()=>setRoute(r)} style={{paddingHorizontal:12,paddingVertical:9,borderRadius:9,backgroundColor:active===r?colors.pinkSoft:'#fff'}}><Text style={{fontWeight:'800',fontSize:12,color:active===r?colors.primary:colors.text}}>{l}</Text></Pressable>)}
   <View style={{flex:1}}/><View style={{paddingHorizontal:11,paddingVertical:9,borderRadius:9,backgroundColor:'#F9FAFB'}}><Text style={{fontSize:11,color:colors.muted,fontWeight:'700'}}>{root?'ROOT ADMIN':admin?'ADMIN':'STUDENT'}</Text></View>
   <Pressable onPress={logout} style={{paddingHorizontal:14,paddingVertical:10,borderRadius:9,backgroundColor:'#FFF1F2'}}><Text style={{fontWeight:'800',color:colors.danger}}>Logout</Text></Pressable>
  </View>
 </View>;
}

export default function AppNavigator(){
 const [user,setUser]=useState(undefined),[route,setRoute]=useState('home');
 useEffect(()=>{api.getStoredUser().then(setUser).catch(()=>setUser(null))},[]);
 if(user===undefined)return <View style={{flex:1,backgroundColor:colors.background,alignItems:'center',justifyContent:'center'}}><Text style={{fontWeight:'900',color:colors.navy}}>Loading Smart Learning Lab…</Text></View>;
 if(!user)return <ErrorBoundary><LoginScreen onLoggedIn={u=>{setUser(u);setRoute('home')}}/></ErrorBoundary>;
 const isAdmin=adminRoles.includes(user.role), isRoot=user.role==='root_admin';
 const logout=async()=>{await api.logout();setUser(null);setRoute('home')};
 if(isAdmin){
  let page;
  if(route==='home') page=<AdminHomeScreen navigate={setRoute}/>;
  else if(route==='courses') page=<AdminCoursesScreen openCourse={id=>setRoute(`course:${id}`)}/>;
  else if(route.startsWith('course:')) page=<AdminCourseBuilderScreen courseId={route.split(':')[1]} onBack={()=>setRoute('courses')}/>;
  else if(route==='questions') page=<AdminQuestionsScreen/>;
  else if(route==='quizzes') page=<AdminQuizzesScreen/>;
  else if(route==='students') page=<AdminStudentsScreen/>;
  else if(route==='analytics') page=<AdminAnalyticsScreen/>;
  else if(route==='staff' && isRoot) page=<AdminStaffScreen/>;
  else page=<AdminHomeScreen navigate={setRoute}/>;
  return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout} admin root={isRoot}/><View style={{flex:1,backgroundColor:colors.background}}>{page}</View></ErrorBoundary>;
 }
 if(route.startsWith('course:'))return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentCourseScreen courseId={route.split(':')[1]} onBack={()=>setRoute('home')} openQuiz={id=>setRoute(`quiz:${id}`)}/></ErrorBoundary>;
 if(route.startsWith('quiz:'))return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentQuizScreen quizId={route.split(':')[1]} onBack={()=>setRoute('home')}/></ErrorBoundary>;
 if(route==='progress')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentProgressScreen/></ErrorBoundary>;
 if(route==='analytics')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentAnalyticsScreen/></ErrorBoundary>;
 if(route==='bookmarks')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentBookmarksScreen/></ErrorBoundary>;
 if(route==='leaderboard')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><LeaderboardScreen/></ErrorBoundary>;
 if(route==='certificates')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentCertificatesScreen/></ErrorBoundary>;
 if(route==='notifications')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentNotificationsScreen/></ErrorBoundary>;
 if(route==='notes')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentNotesScreen/></ErrorBoundary>;
 if(route==='ai')return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><AIChatScreen/></ErrorBoundary>;
 return <ErrorBoundary><Nav route={route} setRoute={setRoute} logout={logout}/><StudentHomeScreen user={user} onLogout={logout} openCourse={id=>setRoute(`course:${id}`)} openQuiz={id=>setRoute(`quiz:${id}`)}/></ErrorBoundary>;
}
