import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';
import { notifyApp } from './notifications';

const configuredBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || '';
const browserDefaultBaseUrl = (() => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return 'https://smartlearninglab.onrender.com/api/v1';
  const host = String(window.location.hostname || '').toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1';
  return isLocal ? 'http://127.0.0.1:8000/api/v1' : 'https://smartlearninglab.onrender.com/api/v1';
})();
export const BASE_URL = (Platform.OS === 'web' ? browserDefaultBaseUrl : (configuredBaseUrl || browserDefaultBaseUrl)).replace(/\/$/, '');
const TOKEN_KEY='sll_token', USER_KEY='sll_user', OFFLINE_QUEUE_KEY='sll_offline_queue';

// Lightweight client-side cache + request de-duplication.
// MongoDB remains the source of truth; mutations clear the cache.
const GET_CACHE = new Map();
const GET_INFLIGHT = new Map();

function cacheTtlMs(path) {
  const p = path.split('?')[0];
  // Fast-changing user state
  if (p === '/progress' || /^\/courses\/[^/]+\/progress$/.test(p)) return 15 * 1000;
  if (p === '/notifications') return 15 * 1000;
  if (p === '/dashboard') return 30 * 1000;
  if (p === '/home') return 30 * 1000;
  if (p === '/results' || /^\/quizzes\/[^/]+\/results$/.test(p)) return 30 * 1000;
  if (p === '/bookmarks') return 30 * 1000;
  if (/^\/ai\/conversations\/[^/]+\/messages$/.test(p)) return 30 * 1000;
  if (p === '/ai/conversations') return 30 * 1000;

  // Medium-lived learning data
  if (p === '/courses') return 60 * 1000;
  if (/^\/courses\/[^/]+\/overview$/.test(p)) return 5 * 60 * 1000;
  if (/^\/courses\/[^/]+$/.test(p)) return 5 * 60 * 1000;
  if (p === '/quizzes' || p === '/questions') return 60 * 1000;
  if (/^\/quizzes\/[^/]+\/questions$/.test(p)) return 5 * 60 * 1000;
  if (p === '/flashcards' || p === '/flashcards/due') return 60 * 1000;
  if (p === '/analytics') return 60 * 1000;
  if (p === '/analytics/advanced') return 5 * 60 * 1000;
  if (p === '/leaderboard') return 2 * 60 * 1000;
  if (p === '/certificates' || p === '/badges') return 5 * 60 * 1000;
  if (p === '/notes') return 30 * 1000;
  if (p === '/enrollments') return 60 * 1000;
  if (p === '/catalog/categories') return 15 * 60 * 1000;
  if (p === '/catalog/featured') return 5 * 60 * 1000;
  if (p === '/library/categories') return 15 * 60 * 1000;
  if (p === '/library') return 5 * 60 * 1000;
  if (p === '/community/posts') return 30 * 1000;
  if (/^\/community\/posts\/[^/]+\/comments$/.test(p)) return 30 * 1000;
  if (p === '/interview/topics') return 60 * 60 * 1000;
  if (p === '/personalized/path') return 2 * 60 * 1000;
  if (p === '/profile' || p === '/auth/me') return 60 * 1000;
  if (/^\/lessons\/[^/]+$/.test(p)) return 60 * 1000;
  if (/^\/quizzes\/[^/]+\/bundle$/.test(p)) return 60 * 1000;
  if (p === '/learning/summary') return 30 * 1000;
  if (p === '/analytics/summary') return 60 * 1000;

  // Safe default for any other GET
  return 15 * 1000;
}

function invalidateGetCache() {
  GET_CACHE.clear();
}

function humanizeApiMessage(path, method, data) {
  const p = path.split('?')[0];
  const exact = [
    [/^\/auth\/register$/, 'Registration request created successfully. Please confirm your email to complete registration.'],
    [/^\/auth\/login$/, 'Login successful.'],
    [/^\/auth\/forgot-password$/, 'Password reset email sent successfully.'],
    [/^\/auth\/reset-password$/, 'Password reset successfully.'],
    [/^\/auth\/register\/resend$/, 'Confirmation email sent successfully.'],
    [/^\/auth\/verify-email\/request$/, 'Verification email sent successfully.'],
    [/^\/auth\/verify-email$/, 'Email verified successfully.'],
    [/^\/courses\/[^/]+\/enroll$/, 'Course enrollment completed successfully.'],
    [/^\/lessons\/[^/]+\/complete$/, 'Lesson completed successfully.'],
    [/^\/quizzes\/[^/]+\/start$/, 'Quiz started successfully.'],
    [/^\/quizzes\/[^/]+\/submit$/, 'Quiz submitted successfully.'],
    [/^\/adaptive\/tests$/, 'Mock test started successfully.'],
    [/^\/adaptive\/tests\/submit$/, 'Mock test submitted successfully.'],
    [/^\/certificates\/course\/[^/]+\/issue$/, 'Certificate generated successfully.'],
    [/^\/notes$/, 'Note saved successfully.'],
    [/^\/flashcards$/, 'Flashcard saved successfully.'],
    [/^\/flashcards\/[^/]+\/review$/, 'Flashcard review saved successfully.'],
    [/^\/bookmarks$/, 'Bookmark saved successfully.'],
    [/^\/courses\/[^/]+\/reviews$/, 'Review submitted successfully.'],
    [/^\/community\/posts$/, 'Post published successfully.'],
    [/^\/community\/posts\/[^/]+\/comments$/, 'Comment added successfully.'],
    [/^\/community\/posts\/[^/]+\/like$/, 'Like updated successfully.'],
    [/^\/device-tokens$/, 'Device registered successfully.'],
    [/^\/offline\/sync$/, 'Offline learning actions synced successfully.'],
    [/^\/ai\/tutor\/rag$/, 'AI Tutor response generated successfully.'],
    [/^\/ai\/speaking\/evaluate$/, 'Speaking evaluation completed successfully.'],
    [/^\/ai\/mock-interview$/, 'Mock interview generated successfully.'],
    [/^\/ai\/mock-interview\/evaluate$/, 'Interview evaluation completed successfully.'],
    [/^\/ai\/personalized-quiz$/, 'Personalized quiz generated successfully.'],
    [/^\/ai\/study-plan$/, 'Study plan generated successfully.'],
    [/^\/admin\/ai\/course-from-pdf$/, 'PDF course generated successfully.'],
    [/^\/admin\/ai\/course-from-pdf\/save$/, 'PDF course saved successfully.'],
    [/^\/admin\/ai\/generate-course$/, 'AI course generated successfully.'],
    [/^\/admin\/ai\/generate-course\/save$/, 'AI course saved successfully.'],
    [/^\/admin\/ai\/generate-quiz$/, 'AI quiz generated successfully.'],
    [/^\/admin\/ai\/generate-quiz\/save$/, 'AI quiz saved successfully.'],
    [/^\/admin\/courses\/[^/]+\/publish$/, 'Course published successfully.'],
    [/^\/admin\/courses\/[^/]+\/unpublish$/, 'Course unpublished successfully.'],
    [/^\/admin\/quizzes\/[^/]+\/publish$/, 'Quiz published successfully.'],
    [/^\/admin\/quizzes\/[^/]+\/unpublish$/, 'Quiz unpublished successfully.'],
    [/^\/admin\/courses$/, 'Course created successfully.'],
    [/^\/admin\/quizzes$/, 'Quiz created successfully.'],
    [/^\/admin\/questions$/, 'Question saved successfully.'],
    [/^\/admin\/users\/admins$/, 'Admin user saved successfully.'],
    [/^\/admin\/students\/[^/]+\/status$/, 'Student status updated successfully.'],
  ];
  for (const [re, msg] of exact) if (re.test(p)) return msg;
  if (method === 'DELETE') return 'Deleted successfully.';
  if (method === 'PUT' || method === 'PATCH') return 'Updated successfully.';
  if (method === 'POST') return data?.message || 'Operation completed successfully.';
  return data?.message || 'Operation completed successfully.';
}

function errorMessage(data, status) {
  let m = data?.detail || data?.message || (typeof data === 'string' ? data : `Request failed (${status})`);
  if (Array.isArray(m)) m = m.map(x => x?.msg || String(x)).join(', ');
  if (status === 409 && /email/i.test(String(m))) return String(m) || 'Email already exists. Please login or use another email.';
  return String(m);
}

async function request(path, options={}) {
  const token=await AsyncStorage.getItem(TOKEN_KEY);
  const method=String(options.method||'GET').toUpperCase();
  const isGet = method === 'GET';
  const notifySuccess = options.notifySuccess !== false && !isGet;
  const notifyError = options.notifyError !== false;
  const cleanOptions={...options};
  delete cleanOptions.notifySuccess;
  delete cleanOptions.notifyError;

  const cacheKey = isGet ? `${token ? token.slice(-16) : 'anon'}:${path}` : null;
  if (isGet) {
    const hit = GET_CACHE.get(cacheKey);
    if (hit && hit.expiresAt > Date.now()) return hit.data;
    if (hit) GET_CACHE.delete(cacheKey);
    const pending = GET_INFLIGHT.get(cacheKey);
    if (pending) return pending;
  }

  const execute = async () => {
    const headers={
      Accept:'application/json',
      ...(cleanOptions.body!==undefined?{'Content-Type':'application/json'}:{}),
      ...(cleanOptions.headers||{}),
      ...(token?{Authorization:`Bearer ${token}`}:{})
    };

    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),20000);
    let response;

    try {
      response=await fetch(`${BASE_URL}${path}`,{...cleanOptions,headers,signal:controller.signal});
    } catch(e) {
      const msg=e?.name==='AbortError'
        ? 'Backend request timed out. Check FastAPI.'
        : `Cannot reach backend at ${BASE_URL}. ${e?.message||''}`;
      if(notifyError) notifyApp('error',msg,5000);
      throw new Error(msg);
    } finally {
      clearTimeout(timeout);
    }

    const raw=await response.text();
    let data=null;
    try { data=raw?JSON.parse(raw):null; } catch { data=raw; }

    if(!response.ok) {
      const m=errorMessage(data,response.status);
      if(notifyError) notifyApp('error',m,5000);
      throw new Error(m);
    }

    if(isGet) {
      GET_CACHE.set(cacheKey,{data,expiresAt:Date.now()+cacheTtlMs(path)});
    } else {
      invalidateGetCache();
    }

    if(notifySuccess) notifyApp('success',humanizeApiMessage(path,method,data));
    return data;
  };

  if (isGet) {
    const pending = execute();
    GET_INFLIGHT.set(cacheKey, pending);
    try {
      return await pending;
    } finally {
      GET_INFLIGHT.delete(cacheKey);
    }
  }

  return execute();
}

async function upload(path, file, fields={}) {
  const token=await AsyncStorage.getItem(TOKEN_KEY);
  const form=new FormData();
  Object.entries(fields).forEach(([k,v])=>{if(v!==undefined&&v!==null)form.append(k,String(v))});

  if (Platform.OS === 'web') {
    let webFile=file?.file;
    if (!(webFile instanceof Blob)) {
      if (!file?.uri) throw new Error('The selected file has no URI. Please choose the file again.');
      const blobResponse=await fetch(file.uri);
      if (!blobResponse.ok) throw new Error('Unable to read the selected file in the browser.');
      webFile=await blobResponse.blob();
    }
    const mime=file.mimeType||file.type||webFile.type||'application/octet-stream';
    if (typeof File !== 'undefined' && !(webFile instanceof File)) {
      webFile=new File([webFile],file.name||'upload',{type:mime});
    }
    form.append('file',webFile,file.name||'upload');
  } else {
    form.append('file',{
      uri:file.uri,
      name:file.name||'upload',
      type:file.mimeType||file.type||'application/octet-stream'
    });
  }

  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),120000);
  try {
    const response=await fetch(`${BASE_URL}${path}`,{
      method:'POST',
      headers:{
        Accept:'application/json',
        ...(token?{Authorization:`Bearer ${token}`}:{})
      },
      body:form,
      signal:controller.signal
    });
    const raw=await response.text();
    let data=null;
    try { data=raw?JSON.parse(raw):null; } catch { data=raw; }

    if(!response.ok) {
      const m=errorMessage(data,response.status);
      notifyApp('error',m,5000);
      throw new Error(m);
    }

    invalidateGetCache();
    notifyApp('success',humanizeApiMessage(path,'POST',data));
    return data;
  } catch(e) {
    if(e?.name==='AbortError') {
      const msg='Upload timed out. Please try a smaller file or check the backend.';
      notifyApp('error',msg,5000);
      throw new Error(msg);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

const idOf=x=>String(x?._id??x?.id??'');
const listOf=x=>Array.isArray(x)?x:(x?.items||x?.data||[]);

// Authentication storage helpers are exported both as named functions and
// through `api` so older screens/callbacks continue to work.
export async function setStoredAuth(token, user=null) {
  if (!token || typeof token !== 'string') throw new Error('OAuth login did not return a valid access token.');
  await AsyncStorage.setItem(TOKEN_KEY, token);
  if (user) await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return token;
}

export async function clearStoredAuth() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}

export const api={
 BASE_URL,idOf,listOf,
 login:async(email,password)=>{const d=await request('/auth/login',{method:'POST',body:JSON.stringify({email,password})});await AsyncStorage.setItem(TOKEN_KEY,d.access_token);await AsyncStorage.setItem(USER_KEY,JSON.stringify(d.user));return d},
 // Store an OAuth-issued access token returned by the backend callback.
 setStoredAuth,
 clearStoredAuth,
 getStoredToken:async()=>AsyncStorage.getItem(TOKEN_KEY),
 profile:async()=>request('/profile',{notifySuccess:false,notifyError:false}),
 register:p=>request('/auth/register',{method:'POST',body:JSON.stringify(p)}),
 registerResend:email=>request('/auth/register/resend',{method:'POST',body:JSON.stringify({email})}),
 resendRegistration:email=>request('/auth/register/resend',{method:'POST',body:JSON.stringify({email})}),
 forgotPassword:email=>request('/auth/forgot-password',{method:'POST',body:JSON.stringify({email})}),
 resetPassword:(token,password)=>request('/auth/reset-password',{method:'POST',body:JSON.stringify({token,password})}),
 logout:async()=>{await AsyncStorage.multiRemove([TOKEN_KEY,USER_KEY]);notifyApp('success','Logged out successfully.');},
 getStoredUser:async()=>{const v=await AsyncStorage.getItem(USER_KEY);return v?JSON.parse(v):null},
 get:p=>request(p),post:(p,b)=>request(p,{method:'POST',body:JSON.stringify(b)}),put:(p,b)=>request(p,{method:'PUT',body:JSON.stringify(b)}),del:p=>request(p,{method:'DELETE'}),

 storageHealth:()=>request('/storage/health'),
 adminDashboard:()=>request('/admin/dashboard'),
 courses:()=>request('/admin/courses'),
 course:id=>request(`/admin/courses/${id}`),
 createCourse:b=>request('/admin/courses',{method:'POST',body:JSON.stringify(b)}),
 updateCourse:(id,b)=>request(`/admin/courses/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteCourse:id=>request(`/admin/courses/${id}`,{method:'DELETE'}),
 courseCategories:()=>request('/admin/course-categories'),
 courseResources:id=>request(`/admin/courses/${id}/resources`),
 addCourseResource:(id,b)=>request(`/admin/courses/${id}/resources`,{method:'POST',body:JSON.stringify(b)}),
 uploadCourseResource:(id,file,fields={})=>upload(`/admin/courses/${id}/resources/upload`,file,fields),
 deleteCourseResource:(id,rid)=>request(`/admin/courses/${id}/resources/${rid}`,{method:'DELETE'}),
 publishCourse:id=>request(`/admin/courses/${id}/publish`,{method:'POST'}),
 unpublishCourse:id=>request(`/admin/courses/${id}/unpublish`,{method:'POST'}),
 modules:cid=>request(`/admin/courses/${cid}/modules`),
 createModule:(cid,b)=>request(`/admin/courses/${cid}/modules`,{method:'POST',body:JSON.stringify(b)}),
 updateModule:(id,b)=>request(`/admin/modules/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 publishModule:id=>request(`/admin/modules/${id}/publish`,{method:'POST'}),
 unpublishModule:id=>request(`/admin/modules/${id}/unpublish`,{method:'POST'}),
 deleteModule:id=>request(`/admin/modules/${id}`,{method:'DELETE'}),
 lessons:mid=>request(`/admin/modules/${mid}/lessons`),
 createLesson:(mid,b)=>request(`/admin/modules/${mid}/lessons`,{method:'POST',body:JSON.stringify(b)}),
 updateLesson:(id,b)=>request(`/admin/lessons/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 publishLesson:id=>request(`/admin/lessons/${id}/publish`,{method:'POST'}),
 unpublishLesson:id=>request(`/admin/lessons/${id}/unpublish`,{method:'POST'}),
 deleteLesson:id=>request(`/admin/lessons/${id}`,{method:'DELETE'}),
 uploadLessonResource:(id,file,fields={})=>upload(`/admin/lessons/${id}/resources/upload`,file,fields),

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
 lessonResources:id=>request(`/lessons/${id}/resources`),
 watchProgress:(id,b)=>request(`/lessons/${id}/watch-progress`,{method:'POST',body:JSON.stringify(b)}),
 getWatchProgress:id=>request(`/lessons/${id}/watch-progress`),
 gamification:()=>request('/gamification'),
 gamificationStart:(slug,b={})=>request(`/gamification/games/${encodeURIComponent(slug)}/start`,{method:'POST',body:JSON.stringify(b)}),
 gamificationAnswer:(sessionId,b)=>request(`/gamification/sessions/${encodeURIComponent(sessionId)}/answer`,{method:'POST',body:JSON.stringify(b)}),
 gamificationFinish:(sessionId)=>request(`/gamification/sessions/${encodeURIComponent(sessionId)}/finish`,{method:'POST'}),
 registerDevice:b=>request('/device-tokens',{method:'POST',body:JSON.stringify(b)}),
 removeDevice:t=>request(`/device-tokens/${encodeURIComponent(t)}`,{method:'DELETE'}),
 requestEmailVerification:()=>request('/auth/verify-email/request',{method:'POST'}),
 verifyEmail:t=>request('/auth/verify-email',{method:'POST',body:JSON.stringify({token:t})}),
 tutor:(b)=>request('/ai/tutor/rag',{method:'POST',body:JSON.stringify(b)}),
 evaluateSpeaking:(b)=>request('/ai/speaking/evaluate',{method:'POST',body:JSON.stringify(b)}),
 myAttempts:id=>request(`/quizzes/${id}/attempts/me`),
 reviewAttempt:(id,a)=>request(`/quizzes/${id}/review/${a}`),
 detailedAdminAnalytics:()=>request('/admin/analytics/detailed'),
 auditLogs:()=>request('/admin/audit-logs'),

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
 certificateAccess:(certificateId)=>request(`/certificates/${encodeURIComponent(certificateId)}/access`,{method:'POST'}),
 certificatePdfUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/pdf`,
 previewCertificateUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/preview`,
 downloadCertificateUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/pdf`,
 badges:()=>request('/badges'),
 adminAnalytics:()=>request('/admin/analytics'),
 adminList:()=>request('/admin/users/admins'),
 adminCreate:(b)=>request('/admin/users/admins',{method:'POST',body:JSON.stringify(b)}),
 adminStatus:(id,active)=>request(`/admin/users/admins/${id}/status`,{method:'PUT',body:JSON.stringify({is_active:active})}),
 adminDelete:id=>request(`/admin/users/admins/${id}`,{method:'DELETE'}),

 studentHome:()=>request('/home'),
 studentCourses:(params={})=>{const q=new URLSearchParams();Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')q.set(k,String(v))});return request(`/courses${q.toString()?`?${q}`:''}`)},
 catalogCategories:()=>request('/catalog/categories'),
 featuredCatalog:(limit=8)=>request(`/catalog/featured?limit=${limit}`),
 courseOverview:id=>request(`/courses/${id}/overview`),
 studentCourse:id=>request(`/courses/${id}`),
 studentModules:id=>request(`/courses/${id}/modules`),
 studentLessons:mid=>request(`/modules/${mid}/lessons`),
 studentLesson:id=>request(`/lessons/${id}`),
 lessonView:id=>request(`/lessons/${id}`),
 enroll:id=>request(`/courses/${id}/enroll`,{method:'POST'}),
 enrollments:()=>request('/enrollments'),
 progress:()=>request('/progress'),
 courseProgress:id=>request(`/courses/${id}/progress`),
 completeLesson:id=>request(`/lessons/${id}/complete`,{method:'POST'}),
 quizzesForCourse:id=>request(`/quizzes?course_id=${encodeURIComponent(id)}`),
 studentQuizzes:()=>request('/quizzes'),
 studentQuiz:id=>request(`/quizzes/${id}`),
 quizBundle:id=>request(`/quizzes/${id}/bundle`),
 quizQuestions:id=>request(`/quizzes/${id}/questions`),
 startQuiz:id=>request(`/quizzes/${id}/start`,{method:'POST'}),
 submitQuiz:(id,b)=>request(`/quizzes/${id}/submit`,{method:'POST',body:JSON.stringify(b)}),
 quizResults:id=>request(`/quizzes/${id}/results`),
 allResults:()=>request('/results'),
 learningSummary:()=>request('/learning/summary'),
 notes:()=>request('/notes'),
 addNote:b=>request('/notes',{method:'POST',body:JSON.stringify(b)}),
 updateNote:(id,b)=>request(`/notes/${id}`,{method:'PUT',body:JSON.stringify(b)}),
 deleteNote:id=>request(`/notes/${id}`,{method:'DELETE'}),
 conversations:()=>request('/ai/conversations'),
 createConversation:b=>request('/ai/conversations',{method:'POST',body:JSON.stringify(b)}),
 messages:id=>request(`/ai/conversations/${id}/messages`),
 saveMessage:b=>request('/ai/messages',{method:'POST',body:JSON.stringify(b)}),
 aiGenerateCourse:b=>request('/admin/ai/generate-course',{method:'POST',body:JSON.stringify(b)}),
 aiSaveCourse:b=>request('/admin/ai/generate-course/save',{method:'POST',body:JSON.stringify(b)}),
 aiGenerateQuiz:b=>request('/admin/ai/generate-quiz',{method:'POST',body:JSON.stringify(b)}),
 aiSaveQuiz:b=>request('/admin/ai/generate-quiz/save',{method:'POST',body:JSON.stringify(b)}),
 ragTutor:b=>request('/ai/tutor/rag',{method:'POST',body:JSON.stringify(b)}),
 personalizedPath:()=>request('/personalized/path'),
 adaptiveTest:b=>request('/adaptive/tests',{method:'POST',body:JSON.stringify(b)}),
 adaptiveSubmit:b=>request('/adaptive/tests/submit',{method:'POST',body:JSON.stringify(b)}),
 flashcards:()=>request('/flashcards'),
 createFlashcard:b=>request('/flashcards',{method:'POST',body:JSON.stringify(b)}),
 dueFlashcards:()=>request('/flashcards/due'),
 reviewFlashcard:(id,b)=>request(`/flashcards/${id}/review`,{method:'POST',body:JSON.stringify(b)}),
 deleteFlashcard:id=>request(`/flashcards/${id}`,{method:'DELETE'}),
 advancedAnalytics:()=>request('/analytics/advanced'),
 analyticsSummary:async()=>{
    try {
      return await request('/analytics/summary');
    } catch (e) {
      // Backward-compatible fallback during rolling deployments.
      const [basic, advanced] = await Promise.all([request('/analytics'), request('/analytics/advanced')]);
      return {basic, advanced};
    }
  },
 interviewTopics:()=>request('/interview/topics'),
 interviewSession:b=>request('/interview/session',{method:'POST',body:JSON.stringify(b)}),
 interviewEvaluate:b=>request('/interview/evaluate',{method:'POST',body:JSON.stringify(b)}),
 communityPosts:()=>request('/community/posts'),
 createCommunityPost:b=>request('/community/posts',{method:'POST',body:JSON.stringify(b)}),
 communityComments:id=>request(`/community/posts/${id}/comments`),
 addCommunityComment:(id,b)=>request(`/community/posts/${id}/comments`,{method:'POST',body:JSON.stringify(b)}),
 likeCommunityPost:id=>request(`/community/posts/${id}/like`,{method:'POST'}),
 adminAdvancedAnalytics:()=>request('/admin/analytics/advanced'),
 adminLibrary:()=>request('/admin/library'),
 uploadLibraryFile:(file,fields={})=>upload('/admin/library/upload',file,fields),
 addLibraryLink:b=>request('/admin/library',{method:'POST',body:JSON.stringify(b)}),
 deleteLibraryItem:id=>request(`/admin/library/${id}`,{method:'DELETE'}),
 studentLibrary:(category='')=>request(`/library${category?`?category=${encodeURIComponent(category)}`:''}`),
 libraryCategories:()=>request('/library/categories'),
 downloadMediaUrl:(mediaId)=>`${BASE_URL}/media/${encodeURIComponent(mediaId)}/download`,
 previewCertificateUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/preview`,
 downloadCertificateUrl:(certificateId)=>`${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/pdf`,
 bulkQuiz:(b)=>request('/admin/bulk/quiz',{method:'POST',body:JSON.stringify(b)}),
 bulkCoursePdf:(file,fields={})=>upload('/admin/bulk/course-pdf',file,fields),
  syncOffline:async()=>{
    const q=JSON.parse(await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');
    if(!q.length)return {synced:[],failed:[],remaining:0};
    try{
      const r=await request('/offline/sync',{method:'POST',body:JSON.stringify({actions:q})});
      const failed=r.failed||[];
      const failedIds=new Set(failed.map(x=>x.id));
      const remaining=q.filter(x=>failedIds.has(x.id));
      await AsyncStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(remaining));
      return {...r,remaining:remaining.length};
    }catch(e){
      return {synced:[],failed:[],remaining:q.length,offline:true,message:e.message};
    }
  },
  offlineQueueSize:async()=>JSON.parse(await AsyncStorage.getItem(OFFLINE_QUEUE_KEY)||'[]').length,


};
