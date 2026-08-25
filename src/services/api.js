import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://127.0.0.1:8000/api/v1';

const TOKEN_KEY = 'sll_token';
const USER_KEY = 'sll_user';
const OFFLINE_QUEUE_KEY = 'sll_offline_queue';

async function request(path, options = {}) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);

  const headers = {
    Accept: 'application/json',
    ...(options.body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  let response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Backend request timed out. Check FastAPI.');
    }

    throw new Error(
      `Cannot reach backend at ${BASE_URL}. ${error?.message || ''}`
    );
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    let message =
      data?.detail ||
      data?.message ||
      (typeof data === 'string'
        ? data
        : `Request failed (${response.status})`);

    if (Array.isArray(message)) {
      message = message.map((item) => item.msg || String(item)).join(', ');
    }

    throw new Error(message);
  }

  return data;
}

async function uploadRequest(path, formData) {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Upload timed out. Check backend and storage.');
    throw new Error(`Cannot reach backend at ${BASE_URL}. ${error?.message || ''}`);
  } finally {
    clearTimeout(timeout);
  }
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
  if (!response.ok) {
    let message = data?.detail || data?.message || (typeof data === 'string' ? data : `Request failed (${response.status})`);
    if (Array.isArray(message)) message = message.map((item) => item.msg || String(item)).join(', ');
    throw new Error(message);
  }
  return data;
}

const idOf = (value) => String(value?._id ?? value?.id ?? '');

const listOf = (value) =>
  Array.isArray(value) ? value : value?.items || value?.data || [];

export const api = {
  idOf,
  listOf,

  // Authentication
  login: async (email, password) => {
    const data = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data?.access_token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    }

    if (data?.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  },

  register: async (payload) => {
    const data = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (data?.access_token) {
      await AsyncStorage.setItem(TOKEN_KEY, data.access_token);
    }

    if (data?.user) {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(data.user));
    }

    return data;
  },

  forgotPassword: (email) =>
    request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token, password) =>
    request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    }),

  logout: () => AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]),

  getStoredUser: async () => {
    const value = await AsyncStorage.getItem(USER_KEY);
    return value ? JSON.parse(value) : null;
  },

  // Generic HTTP
  get: (path) => request(path),

  post: (path, body) =>
    request(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: (path, body) =>
    request(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  del: (path) =>
    request(path, {
      method: 'DELETE',
    }),

  // Admin dashboard / courses
  adminDashboard: () => request('/admin/dashboard'),

  courses: () => request('/admin/courses'),

  course: (id) => request(`/admin/courses/${id}`),

  createCourse: (body) =>
    request('/admin/courses', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateCourse: (id, body) =>
    request(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteCourse: (id) =>
    request(`/admin/courses/${id}`, {
      method: 'DELETE',
    }),

  publishCourse: (id) =>
    request(`/admin/courses/${id}/publish`, {
      method: 'POST',
    }),

  unpublishCourse: (id) =>
    request(`/admin/courses/${id}/unpublish`, {
      method: 'POST',
    }),

  // Modules
  modules: (courseId) =>
    request(`/admin/courses/${courseId}/modules`),

  createModule: (courseId, body) =>
    request(`/admin/courses/${courseId}/modules`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateModule: (id, body) =>
    request(`/admin/modules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteModule: (id) =>
    request(`/admin/modules/${id}`, {
      method: 'DELETE',
    }),

  // Lessons
  lessons: (moduleId) =>
    request(`/admin/modules/${moduleId}/lessons`),

  createLesson: (moduleId, body) =>
    request(`/admin/modules/${moduleId}/lessons`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateLesson: (id, body) =>
    request(`/admin/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteLesson: (id) =>
    request(`/admin/lessons/${id}`, {
      method: 'DELETE',
    }),

  // Questions
  questions: (params = {}) => {
    const query = new URLSearchParams();

    if (params.search) query.set('search', params.search);
    if (params.difficulty) query.set('difficulty', params.difficulty);

    return request(
      `/admin/questions${query.toString() ? `?${query.toString()}` : ''}`
    );
  },

  createQuestion: (body) =>
    request('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQuestion: (id, body) =>
    request(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteQuestion: (id) =>
    request(`/admin/questions/${id}`, {
      method: 'DELETE',
    }),

  // Admin quizzes
  adminTaxonomy: () => request('/admin/taxonomy'),

  adminSubcategories: (categoryId) =>
    request(`/admin/categories/${encodeURIComponent(categoryId)}/subcategories`),

  quizzes: (params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v && String(v).toLowerCase() !== 'all') q.set(k, String(v)); });
    return request(`/admin/quizzes${q.toString() ? `?${q.toString()}` : ''}`);
  },

  quiz: (id) => request(`/admin/quizzes/${id}`),

  createQuiz: (body) =>
    request('/admin/quizzes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateQuiz: (id, body) =>
    request(`/admin/quizzes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteQuiz: (id) =>
    request(`/admin/quizzes/${id}`, {
      method: 'DELETE',
    }),

  publishQuiz: (id) =>
    request(`/admin/quizzes/${id}/publish`, {
      method: 'POST',
    }),

  publishAllQuizzes: () => request('/admin/quizzes/publish-all', { method: 'POST' });
    form.append('file', { uri: file.uri, name: file.name || 'upload', type: file.type || 'application/octet-stream' });
    Object.entries(meta).forEach(([k, v]) => {
      if (v !== undefined && v !== null) form.append(k, Array.isArray(v) ? v.join(',') : String(v));
    });
    return uploadRequest('/admin/library/upload', form);
  },
  studentLibrary: (category) => request(`/library${category && category !== 'All' ? `?category=${encodeURIComponent(category)}` : ''}`),
  libraryCategories: () => request('/library/categories'),
  downloadMediaUrl: (mediaId) => `${BASE_URL}/media/${encodeURIComponent(mediaId)}/download`,
  courseResources: (id) => request(`/admin/courses/${encodeURIComponent(id)}/resources`),
  uploadCourseResource: (id, file, meta = {}) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'upload', type: file.type || 'application/octet-stream' });
    Object.entries(meta).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, String(v)); });
    return uploadRequest(`/admin/courses/${encodeURIComponent(id)}/resources/upload`, form);
  },
  addCourseResource: (id, body) => request(`/admin/courses/${encodeURIComponent(id)}/resources`, { method: 'POST', body: JSON.stringify(body) }),
  deleteCourseResource: (id, resourceId) => request(`/admin/courses/${encodeURIComponent(id)}/resources/${encodeURIComponent(resourceId)}`, { method: 'DELETE' }),
  uploadLessonResource: (id, file, meta = {}) => {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name || 'upload', type: file.type || 'application/octet-stream' });
    Object.entries(meta).forEach(([k, v]) => { if (v !== undefined && v !== null) form.append(k, String(v)); });
    return uploadRequest(`/admin/lessons/${encodeURIComponent(id)}/resources/upload`, form);
  },

  // Admin students
  students: () => request('/admin/students'),

  studentStatus: (id, active) =>
    request(`/admin/students/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: active }),
    }),

  // Student dashboard
  studentDashboard: () => request('/dashboard'),

  lessonResources: (id) => request(`/lessons/${id}/resources`),

  watchProgress: (id, body) =>
    request(`/lessons/${id}/watch-progress`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  getWatchProgress: (id) =>
    request(`/lessons/${id}/watch-progress`),

  gamification: () => request('/gamification'),

  registerDevice: (body) =>
    request('/device-tokens', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  removeDevice: (token) =>
    request(`/device-tokens/${encodeURIComponent(token)}`, {
      method: 'DELETE',
    }),

  requestEmailVerification: () =>
    request('/auth/verify-email/request', {
      method: 'POST',
    }),

  verifyEmail: (token) =>
    request('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // AI Tutor
  tutor: (body) =>
    request('/ai/tutor/rag', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  ragTutor: (body) =>
    request('/ai/tutor/rag', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  evaluateSpeaking: (body) =>
    request('/ai/speaking/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  conversations: () => request('/ai/conversations'),

  createConversation: (body) =>
    request('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  messages: (id) =>
    request(`/ai/conversations/${id}/messages`),

  saveMessage: (body) =>
    request('/ai/messages', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Quiz attempts
  myAttempts: (id) =>
    request(`/quizzes/${id}/attempts/me`),

  reviewAttempt: (id, attemptId) =>
    request(`/quizzes/${id}/review/${attemptId}`),

  // Analytics
  analytics: () => request('/analytics'),

  advancedAnalytics: () => request('/analytics/advanced'),

  detailedAdminAnalytics: () =>
    request('/admin/analytics/detailed'),

  adminAnalytics: () => request('/admin/analytics'),

  adminAdvancedAnalytics: () =>
    request('/admin/analytics/advanced'),

  auditLogs: () => request('/admin/audit-logs'),

  // Leaderboard
  leaderboard: (limit = 20) =>
    request(`/leaderboard?limit=${limit}`),

  // Notifications
  notifications: () => request('/notifications'),

  markNotificationsRead: (id) =>
    request('/notifications/read', {
      method: 'POST',
      body: JSON.stringify(id ? { id } : {}),
    }),

  // Bookmarks
  bookmarks: () => request('/bookmarks'),

  addBookmark: (body) =>
    request('/bookmarks', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  deleteBookmark: (id) =>
    request(`/bookmarks/${id}`, {
      method: 'DELETE',
    }),

  // Reviews
  reviews: (courseId) =>
    request(`/courses/${courseId}/reviews`),

  addReview: (courseId, body) =>
    request(`/courses/${courseId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Certificates
  certificates: () => request('/certificates'),

  issueCertificate: (courseId) =>
    request(`/certificates/course/${courseId}/issue`, {
      method: 'POST',
    }),

  certificatePdfUrl: (certificateId) =>
    `${BASE_URL}/certificates/${encodeURIComponent(certificateId)}/pdf`,

  // Badges
  badges: () => request('/badges'),

  // Admin management
  adminList: () =>
    request('/admin/users/admins'),

  adminCreate: (body) =>
    request('/admin/users/admins', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adminStatus: (id, active) =>
    request(`/admin/users/admins/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ is_active: active }),
    }),

  adminDelete: (id) =>
    request(`/admin/users/admins/${id}`, {
      method: 'DELETE',
    }),

  // Course catalog
  studentCourses: (params = {}) => {
    const query = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        query.set(key, String(value));
      }
    });

    return request(
      `/courses${query.toString() ? `?${query.toString()}` : ''}`
    );
  },

  catalogCategories: () =>
    request('/catalog/categories'),

  featuredCatalog: (limit = 8) =>
    request(`/catalog/featured?limit=${limit}`),

  courseOverview: (id) =>
    request(`/courses/${id}/overview`),

  studentCourse: (id) =>
    request(`/courses/${id}`),

  studentModules: (id) =>
    request(`/courses/${id}/modules`),

  studentLessons: (moduleId) =>
    request(`/modules/${moduleId}/lessons`),

  studentLesson: (id) =>
    request(`/lessons/${id}`),

  enroll: (id) =>
    request(`/courses/${id}/enroll`, {
      method: 'POST',
    }),

  enrollments: () => request('/enrollments'),

  progress: () => request('/progress'),

  courseProgress: (id) =>
    request(`/courses/${id}/progress`),

  // Offline lesson completion
  completeLesson: async (id) => {
    try {
      return await request(`/lessons/${id}/complete`, {
        method: 'POST',
      });
    } catch (error) {
      const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
      const queue = JSON.parse(stored || '[]');

      queue.push({
        id: `lesson-${id}-${Date.now()}`,
        type: 'complete_lesson',
        payload: {
          lesson_id: id,
        },
        created_at: new Date().toISOString(),
      });

      await AsyncStorage.setItem(
        OFFLINE_QUEUE_KEY,
        JSON.stringify(queue)
      );

      return {
        queued: true,
        lesson_id: id,
        message:
          'Saved offline. It will sync when you reconnect.',
      };
    }
  },

  // Student quizzes
  quizzesForCourse: (id) =>
    request(`/quizzes?course_id=${encodeURIComponent(id)}`),

  studentQuizzes: () => request('/quizzes'),

  studentQuiz: (id) =>
    request(`/quizzes/${id}`),

  quizQuestions: (id) =>
    request(`/quizzes/${id}/questions`),

  startQuiz: (id) =>
    request(`/quizzes/${id}/start`, {
      method: 'POST',
    }),

  submitQuiz: (id, body) =>
    request(`/quizzes/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  quizResults: (id) =>
    request(`/quizzes/${id}/results`),

  allResults: () => request('/results'),

  // Notes
  notes: () => request('/notes'),

  addNote: (body) =>
    request('/notes', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateNote: (id, body) =>
    request(`/notes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  deleteNote: (id) =>
    request(`/notes/${id}`, {
      method: 'DELETE',
    }),

  // Admin AI content generation
  aiGenerateCourse: (body) =>
    request('/admin/ai/generate-course', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  aiSaveCourse: (body) =>
    request('/admin/ai/generate-course/save', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  aiGenerateQuiz: (body) =>
    request('/admin/ai/generate-quiz', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  aiSaveQuiz: (body) =>
    request('/admin/ai/generate-quiz/save', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Personalized learning
  personalizedPath: () =>
    request('/personalized/path'),

  aiCoach: () =>
    request('/ai/coach'),

  personalizedQuiz: (body = {}) =>
    request('/ai/personalized-quiz', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  studyPlan: (body = {}) =>
    request('/ai/study-plan', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // PDF -> AI course
  uploadPdfCourse: async (file) => {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    const form = new FormData();

    form.append('file', file);

    const response = await fetch(
      `${BASE_URL}/admin/ai/course-from-pdf`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          ...(token
            ? { Authorization: `Bearer ${token}` }
            : {}),
        },
        body: form,
      }
    );

    const raw = await response.text();
    let data = null;

    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = raw;
    }

    if (!response.ok) {
      throw new Error(
        data?.detail ||
          data?.message ||
          `Request failed (${response.status})`
      );
    }

    return data;
  },

  savePdfCourse: (body) =>
    request('/admin/ai/course-from-pdf/save', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // At-risk students
  atRiskStudents: () =>
    request('/admin/students/at-risk'),

  // Career roadmap
  careerRoadmap: (role = 'AI Engineer') =>
    request(
      `/career/roadmap?role=${encodeURIComponent(role)}`
    ),

  // Mock interview
  mockInterview: (body = {}) =>
    request('/ai/mock-interview', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  evaluateMockInterview: (body = {}) =>
    request('/ai/mock-interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Course health
  courseHealth: (id) =>
    request(`/admin/courses/${id}/health`),

  // Global search
  globalSearch: (query, limit = 20) =>
    request(
      `/search?q=${encodeURIComponent(query)}&limit=${limit}`
    ),

  // Offline synchronization
  syncOffline: async () => {
    const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = JSON.parse(stored || '[]');

    if (!queue.length) {
      return {
        synced: [],
        failed: [],
        remaining: 0,
      };
    }

    try {
      const response = await request('/offline/sync', {
        method: 'POST',
        body: JSON.stringify({
          actions: queue,
        }),
      });

      const failed = response?.failed || [];

      const failedIds = new Set(
        failed.map((item) => item.id)
      );

      const remaining = queue.filter(
        (item) => failedIds.has(item.id)
      );

      await AsyncStorage.setItem(
        OFFLINE_QUEUE_KEY,
        JSON.stringify(remaining)
      );

      return {
        ...response,
        remaining: remaining.length,
      };
    } catch (error) {
      return {
        synced: [],
        failed: [],
        remaining: queue.length,
        offline: true,
        message:
          error?.message || 'Offline sync failed.',
      };
    }
  },

  offlineQueueSize: async () => {
    const stored = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
    const queue = JSON.parse(stored || '[]');
    return queue.length;
  },

  // Adaptive test
  adaptiveTest: (body) =>
    request('/adaptive/tests', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  adaptiveSubmit: (body) =>
    request('/adaptive/tests/submit', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Flashcards
  flashcards: () => request('/flashcards'),

  createFlashcard: (body) =>
    request('/flashcards', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  dueFlashcards: () =>
    request('/flashcards/due'),

  reviewFlashcard: (id, body) =>
    request(`/flashcards/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Interview
  interviewTopics: () =>
    request('/interview/topics'),

  interviewSession: (body) =>
    request('/interview/session', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  interviewEvaluate: (body) =>
    request('/interview/evaluate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Community
  communityPosts: () =>
    request('/community/posts'),

  createCommunityPost: (body) =>
    request('/community/posts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  communityComments: (id) =>
    request(`/community/posts/${id}/comments`),

  addCommunityComment: (id, body) =>
    request(`/community/posts/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  likeCommunityPost: (id) =>
    request(`/community/posts/${id}/like`, {
      method: 'POST',
    }),
};
