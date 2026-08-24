import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminCoursesScreen from '../screens/admin/AdminCoursesScreen';
import AdminCourseBuilderScreen from '../screens/admin/AdminCourseBuilderScreen';
import AdminQuestionsScreen from '../screens/admin/AdminQuestionsScreen';
import AdminQuizzesScreen from '../screens/admin/AdminQuizzesScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen';
import AdminAILabScreen from '../screens/admin/AdminAILabScreen';
import AdminLibraryScreen from '../screens/admin/AdminLibraryScreen';
import AdminBulkContentScreen from '../screens/admin/AdminBulkContentScreen';

import StudentNotesScreen from '../screens/student/StudentNotesScreen';
import AIChatScreen from '../screens/student/AIChatScreen';
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentCoursesScreen from '../screens/student/StudentCoursesScreen';
import StudentCourseScreen from '../screens/student/StudentCourseScreen';
import StudentLessonScreen from '../screens/student/StudentLessonScreen';
import StudentQuizScreen from '../screens/student/StudentQuizScreen';
import StudentQuizzesScreen from '../screens/student/StudentQuizzesScreen';
import StudentProgressScreen from '../screens/student/StudentProgressScreen';
import StudentAnalyticsScreen from '../screens/student/StudentAnalyticsScreen';
import LeaderboardScreen from '../screens/student/LeaderboardScreen';
import StudentCertificatesScreen from '../screens/student/StudentCertificatesScreen';
import StudentNotificationsScreen from '../screens/student/StudentNotificationsScreen';
import StudentBookmarksScreen from '../screens/student/StudentBookmarksScreen';
import StudentSpeakingScreen from '../screens/student/StudentSpeakingScreen';
import PersonalizedLearningScreen from '../screens/student/PersonalizedLearningScreen';
import AdaptiveTestScreen from '../screens/student/AdaptiveTestScreen';
import FlashcardsScreen from '../screens/student/FlashcardsScreen';
import GamificationScreen from '../screens/student/GamificationScreen';
import InterviewPrepScreen from '../screens/student/InterviewPrepScreen';
import CommunityScreen from '../screens/student/CommunityScreen';
import StudentLibraryScreen from '../screens/student/StudentLibraryScreen';

import ErrorBoundary from '../components/ErrorBoundary';
import { api, setPortalRole } from '../services/api';
import { subscribeSessionExpired } from '../services/notifications';
import { colors } from '../theme';
import HybridNavigation from './HybridNavigation';

const ADMIN_ROLES = [
  'root_admin',
  'admin',
  'content_admin',
  'instructor',
  'support_admin',
];

export default function AppNavigator() {
  const [user, setUser] = useState(undefined);
  const [route, setRoute] = useState('home');

  useEffect(() => {
    let mounted = true;

    const unsubscribe = subscribeSessionExpired(() => {
      if (!mounted) return;
      setPortalRole('unknown');
      setUser(null);
      setRoute('home');
    });

    (async () => {
      try {
        const storedUser = await api.getStoredUser();
        if (!mounted) return;

        if (!storedUser) {
          setPortalRole('unknown');
          setUser(null);
          return;
        }

        setPortalRole(storedUser.role || 'student');

        // Validate the persisted JWT at startup. A 401 is handled centrally.
        try {
          const serverUser = await api.profile();
          if (mounted) setUser(serverUser || storedUser);
        } catch (error) {
          if (error?.code === 'SESSION_EXPIRED') return;
          // Keep the cached user if the backend is temporarily unreachable.
          if (mounted) setUser(storedUser);
        }
      } catch (_) {
        if (mounted) setUser(null);
      }
    })();

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontWeight: '900', color: colors.navy }}>Loading Smart Learning Lab…</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginScreen
          onLoggedIn={(loggedInUser) => {
            setPortalRole(loggedInUser?.role || 'student');
            setUser(loggedInUser);
            setRoute('home');
          }}
        />
      </ErrorBoundary>
    );
  }

  const isAdmin = ADMIN_ROLES.includes(user.role);
  const isRoot = user.role === 'root_admin';

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      setPortalRole('unknown');
      setUser(null);
      setRoute('home');
    }
  };

  let page = null;

  // ==========================================================
  // ADMIN ROUTES
  // ==========================================================
  if (isAdmin) {
    if (route === 'home') {
      page = <AdminHomeScreen navigate={setRoute} />;
    } else if (route === 'courses') {
      page = <AdminCoursesScreen openCourse={(id) => setRoute(`course:${id}`)} />;
    } else if (route === 'quizzes') {
      page = <AdminQuizzesScreen />;
    } else if (route.startsWith('course:')) {
      const courseId = route.split(':')[1];
      page = (
        <AdminCourseBuilderScreen
          courseId={courseId}
          onBack={() => setRoute('courses')}
        />
      );
    } else if (route === 'bulk-content') {
      page = <AdminBulkContentScreen onBack={() => setRoute('home')} />;
    } else if (route === 'library-admin') {
      page = <AdminLibraryScreen onBack={() => setRoute('home')} />;
    } else if (route === 'questions') {
      page = <AdminQuestionsScreen />;
    } else if (route === 'students') {
      page = <AdminStudentsScreen />;
    } else if (route === 'ai-lab') {
      page = <AdminAILabScreen />;
    } else if (route === 'analytics') {
      page = <AdminAnalyticsScreen />;
    } else if (route === 'staff' && isRoot) {
      page = <AdminStaffScreen />;
    } else {
      page = <AdminHomeScreen navigate={setRoute} />;
    }

    return (
      <ErrorBoundary>
        <HybridNavigation route={route} setRoute={setRoute} logout={logout} admin root={isRoot}>
          {page}
        </HybridNavigation>
      </ErrorBoundary>
    );
  }

  // ==========================================================
  // STUDENT ROUTES
  // ==========================================================
  if (route === 'courses') {
    page = <StudentCoursesScreen openCourse={(id) => setRoute(`course:${id}`)} />;
  } else if (route === 'quizzes') {
    page = <StudentQuizzesScreen openQuiz={(id) => setRoute(`quiz:${id}`)} />;
  } else if (route.startsWith('course:')) {
    const courseId = route.split(':')[1];
    page = (
      <StudentCourseScreen
        courseId={courseId}
        onBack={() => setRoute('courses')}
        openQuiz={(quizId) => setRoute(`quiz:${quizId}:${courseId}`)}
        openLesson={(lessonId, currentCourseId) => {
          setRoute(`lesson:${lessonId}:${currentCourseId || courseId}`);
        }}
      />
    );
  } else if (route.startsWith('lesson:')) {
    const [, lessonId, courseId] = route.split(':');
    page = (
      <StudentLessonScreen
        lessonId={lessonId}
        courseId={courseId}
        onBack={() => setRoute(`course:${courseId}`)}
        onOpenLesson={(nextLessonId, nextCourseId = courseId) => {
          if (nextLessonId) {
            setRoute(`lesson:${nextLessonId}:${nextCourseId}`);
          }
        }}
      />
    );
  } else if (route.startsWith('quiz:')) {
    const [, quizId, parentCourseId] = route.split(':');
    page = (
      <StudentQuizScreen
        quizId={quizId}
        onBack={() => setRoute(parentCourseId ? `course:${parentCourseId}` : 'quizzes')}
        backLabel={parentCourseId ? 'Back to Course' : 'Back to Quizzes'}
      />
    );
  } else if (route === 'plan') {
    page = (
      <PersonalizedLearningScreen
        openCourse={(id) => setRoute(`course:${id}`)}
        openAdaptive={() => setRoute('mock-test')}
      />
    );
  } else if (route === 'mock-test') {
    page = <AdaptiveTestScreen />;
  } else if (route === 'flashcards') {
    page = <FlashcardsScreen />;
  } else if (route === 'gamification') {
    page = <GamificationScreen openRoute={setRoute} />;
  } else if (route === 'interview') {
    page = <InterviewPrepScreen />;
  } else if (route === 'community') {
    page = <CommunityScreen />;
  } else if (route === 'progress') {
    page = <StudentProgressScreen
      openCourse={(id) => setRoute(`course:${id}`)}
      openQuiz={(id) => setRoute(`quiz:${id}`)}
      openRoute={setRoute}
    />;
  } else if (route === 'analytics') {
    page = <StudentAnalyticsScreen />;
  } else if (route === 'bookmarks') {
    page = <StudentBookmarksScreen />;
  } else if (route === 'leaderboard') {
    page = <LeaderboardScreen />;
  } else if (route === 'certificates') {
    page = <StudentCertificatesScreen />;
  } else if (route === 'notifications') {
    page = <StudentNotificationsScreen />;
  } else if (route === 'notes') {
    page = <StudentNotesScreen />;
  } else if (route === 'library') {
    page = <StudentLibraryScreen />;
  } else if (route === 'speaking') {
    page = <StudentSpeakingScreen />;
  } else if (route === 'ai') {
    page = <AIChatScreen />;
  } else {
    page = (
      <StudentHomeScreen
        user={user}
        onLogout={logout}
        openCourse={(id) => setRoute(`course:${id}`)}
        openQuiz={(id) => setRoute(`quiz:${id}`)}
        openRoute={(r) => setRoute(r)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <HybridNavigation route={route} setRoute={setRoute} logout={logout}>
        {page}
      </HybridNavigation>
    </ErrorBoundary>
  );
}
