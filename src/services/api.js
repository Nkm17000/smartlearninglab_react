import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000/api/v1';
const TOKEN_KEY='sll_token', USER_KEY='sll_user';

async function request(path, options={}){
  const token=await AsyncStorage.getItem(TOKEN_KEY);
  const headers={Accept:'application/json',...(options.body!==undefined?{'Content-Type':'application/json'}:{}),...(options.headers||{}),...(token?{Authorization:`Bearer ${token}`}:{})};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),20000);
  let response;
  try{response=await fetch(`${BASE_URL}${path}`,{...options,headers,signal:controller.signal});}
  catch(e){if(e?.name==='AbortError')throw new Error('Backend request timed out. Check FastAPI.');throw new Error(`Cannot reach backend at ${BASE_URL}. ${e?.message||''}`);}
  finally{clearTimeout(timeout)}
  const raw=await response.text(); let data=null; try{data=raw?JSON.parse(raw):null}catch{data=raw}
  if(!response.ok){let m=data?.detail||data?.message||(typeof data==='string'?data:`Request failed (${response.status})`);if(Array.isArray(m))m=m.map(x=>x.msg||String(x)).join(', ');throw new Error(m)}
  return data;
}
const idOf=x=>String(x?._id??x?.id??'');
const listOf=x=>Array.isArray(x)?x:(x?.items||x?.data||[]);

export const api={
 idOf,listOf,
 login:async(email,password)=>{const d=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});await AsyncStorage.setItem(TOKEN_KEY,d.access_token);await AsyncStorage.setItem(USER_KEY,JSON.stringify(d.user));return d},
 register:async p=>{const d=await request('/auth/register',{method:'POST',body:JSON.stringify(p)});await AsyncStorage.setItem(TOKEN_KEY,d.access_token);await AsyncStorage.setItem(USER_KEY,JSON.stringify(d.user));return d},
 forgotPassword:email=>request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}),
 resetPassword:(token,password)=>request('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})}),
 logout:()=>AsyncStorage.multiRemove([TOKEN_KEY,USER_KEY]),
 getStoredUser:async()=>{const v=await AsyncStorage.getItem(USER_KEY);return v?JSON.parse(v):null},
 get:p=>request(p),post:(p,b)=>request(p,{method:'POST',body:JSON.stringify(b)}),put:(p,b)=>request(p,{method:'PUT',body:JSON.stringify(b)}),del:p=>request(p,{method:'DELETE'}),

 adminDashboard:()=>request('/admin/dashboard'),
 courses:()=>request('/admin/courses'),
 course:id=>request(`/admin/courses/${id}`),
 createCourse:b=>request('/admin/courses',{method:'POST',body:JSON.stringify(b)}),
 updateCourse:(id,b)=>request(`/admin/courses/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteCourse:id=>request(`/admin/courses/${id}`,{method:'DELETE'}),
 publishCourse:id=>request(`/admin/courses/${id}/publish`,{method:'POST'}),
 unpublishCourse:id=>request(`/admin/courses/${id}/unpublish`,{method:'POST'}),
 modules:cid=>request(`/admin/courses/${cid}/modules`),
 createModule:(cid,b)=>request(`/admin/courses/${cid}/modules`,{method:'POST',body:JSON.stringify(b)}),
 updateModule:(id,b)=>request(`/admin/modules/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteModule:id=>request(`/admin/modules/${id}`,{method:'DELETE'}),
 lessons:mid=>request(`/admin/modules/${mid}/lessons`),
 createLesson:(mid,b)=>request(`/admin/modules/${mid}/lessons`,{method:'POST',body:JSON.stringify(b)}),
 updateLesson:(id,b)=>request(`/admin/lessons/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteLesson:id=>request(`/admin/lessons/${id}`,{method:'DELETE'}),

 questions:(p={})=>{const q=new URLSearchParams();if(p.search)q.set('search',p.search);if(p.difficulty)q.set('difficulty',p.difficulty);return request(`/admin/questions${q.toString()?`?${q}`:''}`)},
 createQuestion:b=>request('/admin/questions',{method:'POST',body:JSON.stringify(b)}),
 updateQuestion:(id,b)=>request(`/admin/questions/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteQuestion:id=>request(`/admin/questions/${id}`,{method:'DELETE'}),

 quizzes:()=>request('/admin/quizzes'),
 quiz:id=>request(`/admin/quizzes/${id}`),
 createQuiz:b=>request('/admin/quizzes',{method:'POST',body:JSON.stringify(b)}),
 updateQuiz:(id,b)=>request(`/admin/quizzes/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteQuiz:id=>request(`/admin/quizzes/${id}`,{method:'DELETE'}),
 publishQuiz:id=>request(`/admin/quizzes/${id}/publish`,{method:'POST'}),
 unpublishQuiz:id=>request(`/admin/quizzes/${id}/unpublish`,{method:'POST'}),
 addQuizQuestions:(id,ids)=>request(`/admin/quizzes/${id}/questions`,{method:'POST',body:JSON.stringify({question_ids:ids})}),
 removeQuizQuestion:(id,qid)=>request(`/admin/quizzes/${id}/questions/${qid}`,{method:'DELETE'}),
 createQuizQuestion:(id,b)=>request(`/admin/quizzes/${id}/questions/create`,{method:'POST',body:JSON.stringify(b)}),
 students:()=>request('/admin/students'),
 studentStatus:(id,active)=>request(`/admin/students/${id}/status`,{method:'PUT',body:JSON.stringify({is_active:active})}),

 studentDashboard:()=>request('/dashboard'),
 analytics:()=>request('/analytics'),
 leaderboard:(limit=20)=>request(`/leaderboard?limit=${limit}`),
 notifications:()=>request('/notifications'),
 markNotificationsRead:(id)=>request('/notifications/read',{method:'POST',body:JSON.stringify(id?{id}: {})}),
 bookmarks:()=>request('/bookmarks'),
 addBookmark:(b)=>request('/bookmarks',{method:'POST',body:JSON.stringify(b)}),
 deleteBookmark:(id)=>request(`/bookmarks/${id}`,{method:'DELETE'}),
 reviews:(courseId)=>request(`/courses/${courseId}/reviews`),
 addReview:(courseId,b)=>request(`/courses/${courseId}/reviews`,{method:'POST',body:JSON.stringify(b)}),
 certificates:()=>request('/certificates'),
 issueCertificate:(courseId)=>request(`/certificates/course/${courseId}/issue`,{method:'POST'}),
 certificatePdfUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/pdf`,
 badges:()=>request('/badges'),
 adminAnalytics:()=>request('/admin/analytics'),
 adminList:()=>request('/admin/users/admins'),
 adminCreate:(b)=>request('/admin/users/admins',{method:'POST',body:JSON.stringify(b)}),
 adminStatus:(id,active)=>request(`/admin/users/admins/${id}/status`,{method:'PUT',body:JSON.stringify({is_active:active})}),
 adminDelete:id=>request(`/admin/users/admins/${id}`,{method:'DELETE'}),

 studentCourses:(params={})=>{const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')q.set(k,String(v))});return request(`/courses${q.toString()?`?${q}`:''}`)},
 catalogCategories:()=>request('/catalog/categories'),
 featuredCatalog:(limit=8)=>request(`/catalog/featured?limit=${limit}`),
 courseOverview:id=>request(`/courses/${id}/overview`),
 studentCourse:id=>request(`/courses/${id}`),
 studentModules:id=>request(`/courses/${id}/modules`),
 studentLessons:mid=>request(`/modules/${mid}/lessons`),
 studentLesson:id=>request(`/lessons/${id}`),
 enroll:id=>request(`/courses/${id}/enroll`,{method:'POST'}),
 enrollments:()=>request('/enrollments'),
 progress:()=>request('/progress'),
 courseProgress:id=>request(`/courses/${id}/progress`),
 completeLesson:id=>request(`/lessons/${id}/complete`,{method:'POST'}),
 quizzesForCourse:id=>request(`/quizzes?course_id=${encodeURIComponent(id)}`),
 studentQuizzes:()=>request('/quizzes'),
 studentQuiz:id=>request(`/quizzes/${id}`),
 quizQuestions:id=>request(`/quizzes/${id}/questions`),
 startQuiz:id=>request(`/quizzes/${id}/start`,{method:'POST'}),
 submitQuiz:(id,b)=>request(`/quizzes/${id}/submit`,{method:'POST',body:JSON.stringify(b)}),
 quizResults:id=>request(`/quizzes/${id}/results`),
 allResults:()=>request('/results'),
 notes:()=>request('/notes'),
 addNote:b=>request('/notes',{method:'POST',body:JSON.stringify(b)}),
 updateNote:(id,b)=>request(`/notes/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteNote:id=>request(`/notes/${id}`,{method:'DELETE'}),
 conversations:()=>request('/ai/conversations'),
 createConversation:b=>request('/ai/conversations',{method:'POST',body:JSON.stringify(b)}),
 messages:id=>request(`/ai/conversations/${id}/messages`),
 saveMessage:b=>request('/ai/messages',{method:'POST',body:JSON.stringify(b)})
};
