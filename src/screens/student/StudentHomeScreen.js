import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, ProgressBar, SectionTitle, Loading } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const FALLBACK_CATEGORIES = ['SSC', 'Railway', 'Banking', 'UPSC', 'Computer', 'Teaching', 'Defence', 'State Exams'];
const FALLBACK_SUBJECTS = ['English', 'Hindi', 'Math', 'Reasoning', 'General Awareness', 'Science', 'Physics', 'Chemistry', 'Biology', 'Computer', 'Java', 'Python'];
const categoriesOf = item => Array.isArray(item?.categories) && item.categories.length ? item.categories : (item?.category ? [item.category] : ['General']);
const subjectOf = item => item?.subject || 'General';

function Stat({ icon, title, value, delta, tone = 'blue' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'orange' ? colors.orangeSoft : tone === 'pink' ? colors.pinkSoft : colors.blueSoft;
  return <Card style={{ flex: 1, minWidth: 150, marginBottom: 0, padding: 15 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>{icon}</Text></View><Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, flex: 1 }}>{title}</Text></View><Text style={{ fontSize: 24, fontWeight: '900', color: colors.navy, marginTop: 10 }}>{value}</Text><Text style={{ fontSize: 10, fontWeight: '800', color: colors.success, marginTop: 4 }}>{delta}</Text></Card>;
}

function TaxonomyCard({ title, count, icon, active, onPress, label }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: 155, opacity: pressed ? 0.82 : 1 })}><Card style={{ marginBottom: 0, padding: 14, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.blueSoft : '#fff' }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{icon}</Text></View><Text style={{ fontSize: 13, fontWeight: '900', color: colors.navy, marginTop: 10 }} numberOfLines={1}>{title}</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 3 }}>{count} {label}</Text></Card></Pressable>;
}

function CourseCard({ course, onOpen }) {
  return <Pressable onPress={() => onOpen(api.idOf(course))} style={({ pressed }) => ({ width: 280, opacity: pressed ? 0.94 : 1 })}><Card style={{ padding: 0, overflow: 'hidden', marginBottom: 0 }}><View style={{ height: 82, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 34 }}>{course.icon || '📚'}</Text></View><View style={{ padding: 14 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>{categoriesOf(course).slice(0, 2).map(c => <Badge key={c} tone="purple">{c}</Badge>)}<Badge tone="blue">{subjectOf(course)}</Badge></View><Text style={{ fontSize: 15, fontWeight: '900', color: colors.navy, marginTop: 9 }} numberOfLines={2}>{course.name || course.title || 'Course'}</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }} numberOfLines={2}>{course.short_description || course.description || 'Structured learning with lessons and practice.'}</Text><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 11 }}>View Course →</Text></View></Card></Pressable>;
}

function QuizCard({ quiz, onOpen }) {
  const completed = quiz.is_completed === true;
  return <Pressable onPress={() => onOpen(api.idOf(quiz))} style={({ pressed }) => ({ width: 280, opacity: pressed ? 0.94 : 1 })}><Card style={{ padding: 14, marginBottom: 0, minHeight: 165 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><View style={{ width: 42, height: 42, borderRadius: 13, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 19 }}>📝</Text></View><Badge tone={completed ? 'green' : 'orange'}>{completed ? 'COMPLETED' : 'READY'}</Badge></View><Text style={{ fontSize: 15, fontWeight: '900', color: colors.navy, marginTop: 12 }} numberOfLines={2}>{quiz.title || quiz.name || 'Practice Quiz'}</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>{subjectOf(quiz)} · {quiz.question_count || (quiz.question_ids || []).length || 0} Questions · {quiz.duration_minutes || 20} min</Text><View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginTop: 9 }}>{categoriesOf(quiz).slice(0, 2).map(c => <Badge key={c} tone="purple">{c}</Badge>)}</View><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 10 }}>{completed ? 'Review / Retake →' : 'Start Quiz →'}</Text></Card></Pressable>;
}

export default function StudentHomeScreen({ openCourse, openQuiz, openRoute }) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const home = await api.studentHome();
      setData(home);
      setCatalog(home?.catalog || null);
    } catch (e) {
      setError(e?.message || 'Unable to load your learning home.');
    }
  };

  useEffect(() => { load(); }, []);

  const dashboard = data?.dashboard || {};
  const categories = catalog?.categories?.length ? catalog.categories : FALLBACK_CATEGORIES;
  const subjects = catalog?.subjects?.length ? catalog.subjects : FALLBACK_SUBJECTS;
  const featuredCourses = api.listOf(data?.featured?.courses).slice(0, 5);
  const featuredQuizzes = api.listOf(data?.featured?.quizzes || data?.quizzes).slice(0, 5);
  const enrolled = api.listOf(dashboard.enrolled_courses).slice(0, 5);
  const categoryCounts = useMemo(() => categories.map(name => ({ name, count: Number(catalog?.category_counts?.[name] || 0) })).filter(x => x.count > 0), [categories, catalog]);
  const subjectCounts = useMemo(() => subjects.map(name => ({ name, count: Number(catalog?.subject_counts?.[name] || 0) })).filter(x => x.count > 0), [subjects, catalog]);

  const searchPortal = () => {
    if (!search.trim()) return;
    if (openRoute) openRoute('courses');
  };

  if (error) return <AppShell><ErrorState title="Learning home could not load" message={error} onRetry={load} /></AppShell>;
  if (!data) return <AppShell><Loading label="Preparing your learning home…" /></AppShell>;

  const goal = dashboard.weekly_goal || { target: 5, completed: 0, percentage: 0 };
  const gridWidth = mobile ? '100%' : width < 1050 ? '48.5%' : '31.8%';

  return <AppShell>
    <View style={{ marginBottom: 8 }}><Text style={{ fontSize: mobile ? 24 : 28, fontWeight: '900', color: colors.navy }}>Hello, {dashboard.user?.name || 'Student'}! 👋</Text><Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>What do you want to learn today?</Text></View>

    <Card style={{ padding: 10, marginBottom: 14 }}><Field value={search} onChangeText={setSearch} placeholder="Search courses, quizzes, exams, subjects…" /><Button title="Search" onPress={searchPortal} /></Card>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
      <Stat icon="📚" title="Courses" value={dashboard.courses_available || 0} delta="Explore all courses" tone="blue" />
      <Stat icon="✓" title="Lessons Done" value={dashboard.lessons_completed || 0} delta={`${goal.completed} this week`} tone="green" />
      <Stat icon="🎯" title="Quiz Average" value={`${dashboard.quiz_average || 0}%`} delta={dashboard.quiz_average ? 'Keep improving' : 'Start practicing'} tone="pink" />
      <Stat icon="📝" title="Tests Attempted" value={dashboard.quiz_attempts || 0} delta="View your results" tone="orange" />
    </View>

    <SectionTitle title="Choose Learning Category" subtitle="Start with the exam you are preparing for." />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {(categoryCounts.length ? categoryCounts : categories.slice(0, 8).map(name => ({ name, count: 0 }))).slice(0, 10).map((item, i) => <TaxonomyCard key={item.name} title={item.name} count={item.count} label="Courses" icon={['🎓', '🚆', '🏦', '🏛️', '💻', '📚'][i % 6]} active={false} onPress={() => openRoute && openRoute('courses')} />)}
    </ScrollView>

    <SectionTitle title="Popular Subjects" subtitle="Subjects available across your exam categories." />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
      {(subjectCounts.length ? subjectCounts : subjects.slice(0, 10).map(name => ({ name, count: 0 }))).slice(0, 10).map((item, i) => <TaxonomyCard key={item.name} title={item.name} count={item.count} label="Courses" icon={['⚛️', '🧪', '➗', '🌿', '📖', '🌐'][i % 6]} active={false} onPress={() => openRoute && openRoute('courses')} />)}
    </ScrollView>

    <SectionTitle title="Continue Learning" subtitle="Pick up where you left off." right={<Pressable onPress={() => openRoute && openRoute('courses')}><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>View all →</Text></Pressable>} />
    {enrolled.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>{enrolled.map(course => <CourseCard key={api.idOf(course)} course={course} onOpen={openCourse} />)}</ScrollView> : <Card><Text style={{ fontSize: 15, fontWeight: '900', color: colors.navy }}>No course in progress</Text><Text style={{ fontSize: 11, color: colors.muted, marginTop: 4 }}>Choose a course below and start learning.</Text></Card>}

    <SectionTitle title="Featured Courses" subtitle="Top 5 courses on your dashboard." right={<Pressable onPress={() => openRoute && openRoute('courses')}><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>View all →</Text></Pressable>} />
    {featuredCourses.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{featuredCourses.map(course => <View key={api.idOf(course)} style={{ width: gridWidth }}><CourseCard course={course} onOpen={openCourse} /></View>)}</View> : <Empty title="No published courses yet" message="Published courses will appear here." />}

    <SectionTitle title="Test Series" subtitle="Top 5 quizzes to practice." right={<Pressable onPress={() => openRoute && openRoute('quizzes')}><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>View all →</Text></Pressable>} />
    {featuredQuizzes.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{featuredQuizzes.map(quiz => <View key={api.idOf(quiz)} style={{ width: gridWidth }}><QuizCard quiz={quiz} onOpen={openQuiz} /></View>)}</View> : <Empty title="No published quizzes yet" message="Published quizzes will appear here." />}

    <SectionTitle title="Your Weekly Goal" />
    <Card><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}><Text style={{ fontSize: 11, color: colors.muted }}>Complete {goal.target} lessons this week</Text><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>{goal.completed} / {goal.target}</Text></View><ProgressBar value={goal.percentage} /></Card>
  </AppShell>;
}
