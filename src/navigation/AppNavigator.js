import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import LoginScreen from '../screens/LoginScreen';

import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminCoursesScreen from '../screens/admin/AdminCoursesScreen';
import AdminCourseBuilderScreen from '../screens/admin/AdminCourseBuilderScreen';
import AdminQuestionsScreen from '../screens/admin/AdminQuestionsScreen';
import AdminQuizzesScreen from '../screens/admin/AdminQuizzesScreen';
import AdminManualQuizScreen from '../screens/admin/AdminManualQuizScreen';
import AdminStudentsScreen from '../screens/admin/AdminStudentsScreen';
import AdminAnalyticsScreen from '../screens/admin/AdminAnalyticsScreen';
import AdminStaffScreen from '../screens/admin/AdminStaffScreen';
import AdminAILabScreen from '../screens/admin/AdminAILabScreen';
import AdminLibraryScreen from '../screens/admin/AdminLibraryScreen';
import AdminBulkContentScreen from '../screens/admin/AdminBulkContentScreen';

import StudentNotesScreen from '../screens/student/StudentNotesScreen';
import AIChatScreen from '../screens/student/AIChatScreen';
import StudentHomeScreen from '../screens/student/StudentHomeScreen';
import StudentCourseScreen from '../screens/student/StudentCourseScreen';
import StudentLessonScreen from '../screens/student/StudentLessonScreen';
import StudentQuizScreen from '../screens/student/StudentQuizScreen';
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
import InterviewPrepScreen from '../screens/student/InterviewPrepScreen';
import CommunityScreen from '../screens/student/CommunityScreen';
import StudentLibraryScreen from '../screens/student/StudentLibraryScreen';

import ErrorBoundary from '../components/ErrorBoundary';
import { api } from '../services/api';
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
    api
      .getStoredUser()
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  if (user === undefined) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={{ fontWeight: '900', color: colors.navy }}>
          Loading Smart Learning Lab...
        </Text>
      </View>
    );
  }

  if (!user) {
    return (
      <ErrorBoundary>
        <LoginScreen
          onLoggedIn={(loggedInUser) => {
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
      setUser(null);
      setRoute('home');
    }
  };

  let page = null;

  // ============================================================
  // ADMIN
  // ============================================================
  if (isAdmin) {
    if (route === 'home') {
      page = <AdminHomeScreen navigate={setRoute} />;
    } else if (route === 'courses') {
      page = (
        <AdminCoursesScreen
          openCourse={(courseId) => setRoute(`course:${courseId}`)}
        />
      );
    } else if (route.startsWith('course:')) {
      const courseId = route.split(':')[1];

      page = (
        <AdminCourseBuilderScreen
          courseId={courseId}
          onBack={() => setRoute('courses')}
        />
      );
    } else if (route === 'bulk-content') {
      page = (
        <AdminBulkContentScreen
          onBack={() => setRoute('home')}
        />
      );
    } else if (route === 'library-admin') {
      page = (
        <AdminLibraryScreen
          onBack={() => setRoute('home')}
        />
      );
    } else if (route === 'questions') {
      page = <AdminQuestionsScreen />;
    } else if (route === 'quizzes') {
      page = <AdminQuizzesScreen onCreateManual={() => setRoute('manual-quiz')} />;
    } else if (route === 'manual-quiz') {
      page = <AdminManualQuizScreen onBack={() => setRoute('quizzes')} />;
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
        <HybridNavigation
          route={route}
          setRoute={setRoute}
          logout={logout}
          admin
          root={isRoot}
        >
          {page}
        </HybridNavigation>
      </ErrorBoundary>
    );
  }

  // ============================================================
  // STUDENT
  // ============================================================

  if (route.startsWith('course:')) {
    const courseId = route.split(':')[1];

    page = (
      <StudentCourseScreen
        courseId={courseId}
        onBack={() => setRoute('home')}
        openQuiz={(quizId) => setRoute(`quiz:${quizId}`)}
        openLesson={(lessonId, currentCourseId) => {
          const activeCourseId = currentCourseId || courseId;
          setRoute(`lesson:${lessonId}:${activeCourseId}`);
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
        onNextLesson={(nextLessonId, nextCourseId) => {
          const activeCourseId = nextCourseId || courseId;

          if (nextLessonId) {
            setRoute(`lesson:${nextLessonId}:${activeCourseId}`);
          } else {
            setRoute(`course:${courseId}`);
          }
        }}
        onPreviousLesson={(previousLessonId, previousCourseId) => {
          const activeCourseId = previousCourseId || courseId;

          if (previousLessonId) {
            setRoute(`lesson:${previousLessonId}:${activeCourseId}`);
          } else {
            setRoute(`course:${courseId}`);
          }
        }}
        openQuiz={(quizId) => setRoute(`quiz:${quizId}`)}
        openAI={() => setRoute('ai')}
      />
    );
  } else if (route.startsWith('quiz:')) {
    page = (
      <StudentQuizScreen
        quizId={route.split(':')[1]}
        onBack={() => setRoute('home')}
      />
    );
  } else if (route === 'plan') {
    page = (
      <PersonalizedLearningScreen
        openCourse={(courseId) => setRoute(`course:${courseId}`)}
        openAdaptive={() => setRoute('adaptive')}
      />
    );
  } else if (route === 'adaptive') {
    page = <AdaptiveTestScreen />;
  } else if (route === 'flashcards') {
    page = <FlashcardsScreen />;
  } else if (route === 'interview') {
    page = <InterviewPrepScreen />;
  } else if (route === 'community') {
    page = <CommunityScreen />;
  } else if (route === 'progress') {
    page = <StudentProgressScreen />;
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
        openCourse={(courseId) => setRoute(`course:${courseId}`)}
        openQuiz={(quizId) => setRoute(`quiz:${quizId}`)}
      />
    );
  }

  return (
    <ErrorBoundary>
      <HybridNavigation
        route={route}
        setRoute={setRoute}
        logout={logout}
      >
        {page}
      </HybridNavigation>
    </ErrorBoundary>
  );
}
