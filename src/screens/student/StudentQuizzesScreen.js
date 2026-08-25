import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, SectionTitle } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const EXAM_CATEGORIES = ['SSC', 'Railway', 'Banking', 'UPSC', 'Computer', 'Teaching', 'Defence', 'State Exams', 'General', 'Other'];
const SUBJECTS = ['English', 'Hindi', 'Math', 'Reasoning', 'General Awareness', 'Current Affairs', 'Science', 'Physics', 'Chemistry', 'Biology', 'Computer', 'Java', 'Python', 'PHP', 'SQL', 'DBMS', 'Operating Systems', 'Networking', 'Spring Boot', 'Microservices', 'Aptitude'];
const categoriesOf = item => Array.isArray(item?.categories) && item.categories.length ? item.categories : (item?.category ? [item.category] : ['General']);
const subjectOf = item => item?.subject || 'General';

function Stat({ icon, title, value, delta, tone = 'blue' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'orange' ? colors.orangeSoft : tone === 'pink' ? colors.pinkSoft : colors.blueSoft;
  return <Card style={{ flex: 1, minWidth: 150, marginBottom: 0, padding: 15 }}><View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}><View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 18 }}>{icon}</Text></View><Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, flex: 1 }}>{title}</Text></View><Text style={{ fontSize: 24, fontWeight: '900', color: colors.navy, marginTop: 10 }}>{value}</Text><Text style={{ fontSize: 10, fontWeight: '800', color: colors.success, marginTop: 4 }}>{delta}</Text></Card>;
}

function CategoryCard({ title, count, icon, active, onPress, tone = 'purple' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'pink' ? colors.pinkSoft : tone === 'orange' ? colors.orangeSoft : colors.purpleSoft;
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: 155, opacity: pressed ? 0.82 : 1 })}><Card style={{ marginBottom: 0, padding: 14, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.blueSoft : '#fff' }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{icon}</Text></View><Text style={{ fontSize: 13, fontWeight: '900', color: colors.navy, marginTop: 10 }} numberOfLines={1}>{title}</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 3 }}>{count} Quizzes</Text></Card></Pressable>;
}

function QuizCard({ quiz, onOpen, width }) {
  const title = quiz.title || quiz.name || 'Practice Quiz';
  const questions = Number(quiz.question_count || (quiz.question_ids || []).length || 0);
  const completed = quiz.is_completed === true;
  return <Pressable onPress={() => onOpen(api.idOf(quiz))} style={({ pressed }) => ({ width, opacity: pressed ? 0.94 : 1 })}><Card style={{ padding: 0, overflow: 'hidden', marginBottom: 0, minHeight: 220 }}><View style={{ height: 76, backgroundColor: colors.hero, padding: 13 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, flex: 1 }}>{categoriesOf(quiz).slice(0, 3).map(category => <Badge key={category} tone="purple">{category}</Badge>)}</View><Badge tone={completed ? 'green' : 'orange'}>{completed ? 'COMPLETED' : 'READY'}</Badge></View></View><View style={{ padding: 14, flex: 1 }}><Text style={{ fontSize: 16, fontWeight: '900', color: colors.navy }} numberOfLines={2}>{title}</Text><Text style={{ fontSize: 10, color: colors.muted, marginTop: 4 }}>{subjectOf(quiz)} · {questions} Questions · {quiz.duration_minutes || 20} min</Text><View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 10 }}><Badge tone="purple">{subjectOf(quiz)}</Badge>{completed && <Badge tone="green">Done in any exam category</Badge>}</View><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 'auto', paddingTop: 12 }}>{completed ? 'Review / Retake →' : 'Start Quiz →'}</Text></View></Card></Pressable>;
}

export default function StudentQuizzesScreen({ openQuiz }) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const tablet = width >= 600 && width < 1050;
  const cardWidth = mobile ? '100%' : tablet ? '48.5%' : '31.8%';
  const [items, setItems] = useState([]);
  const [results, setResults] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [quizData, resultData] = await Promise.all([api.studentQuizzes(), api.allResults()]);
      setItems(api.listOf(quizData));
      setResults(api.listOf(resultData));
    } catch (e) {
      setError(e?.message || 'Unable to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const categories = useMemo(() => Array.from(new Set([...EXAM_CATEGORIES, ...items.flatMap(categoriesOf)])), [items]);
  const subjects = useMemo(() => Array.from(new Set([...SUBJECTS, ...items.map(subjectOf)])), [items]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(item => {
      const cats = categoriesOf(item);
      const text = [item.title, item.name, item.description, item.exam, item.subject, ...cats].filter(Boolean).join(' ').toLowerCase();
      return (!q || text.includes(q)) && (!category || cats.some(x => x.toLowerCase() === category.toLowerCase())) && (!subject || subjectOf(item).toLowerCase() === subject.toLowerCase());
    });
  }, [items, search, category, subject]);

  const percentages = results.map(r => Number(r.percentage ?? r.result?.percentage ?? 0)).filter(Number.isFinite);
  const uniqueCompleted = new Set(results.map(r => r.quiz_group_key || r.test_id || r.quiz_id)).size;
  const average = percentages.length ? Math.round(percentages.reduce((a, b) => a + b, 0) / percentages.length) : 0;
  const best = percentages.length ? Math.max(...percentages) : 0;
  const categoryCounts = categories.map(name => ({ name, count: items.filter(x => categoriesOf(x).some(c => c.toLowerCase() === name.toLowerCase())).length })).filter(x => x.count > 0);
  const subjectCounts = subjects.map(name => ({ name, count: items.filter(x => subjectOf(x).toLowerCase() === name.toLowerCase()).length })).filter(x => x.count > 0);
  const continueItems = items.filter(x => !x.is_completed).slice(0, 5);
  const clearFilters = () => { setSearch(''); setCategory(''); setSubject(''); };

  if (error) return <AppShell><ErrorState title="Quizzes could not load" message={error} onRetry={load} /></AppShell>;
  if (loading) return <AppShell><Loading label="Preparing your quiz portal…" /></AppShell>;

  return <AppShell>
    <View style={{ marginBottom: 8 }}><Text style={{ fontSize: mobile ? 24 : 28, fontWeight: '900', color: colors.navy }}>Hello, Student! 👋</Text><Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>What do you want to learn today?</Text></View>
    <Card style={{ padding: 10, marginBottom: 14 }}><Field value={search} onChangeText={setSearch} placeholder="Search quizzes, exams, subjects…" /><Button title="Search" onPress={() => {}} /></Card>

    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}><Stat icon="📝" title="Quizzes Attempted" value={uniqueCompleted} delta={`${results.length} attempts`} tone="blue" /><Stat icon="✓" title="Average Score" value={`${average}%`} delta={average ? '+ Keep improving' : 'Start your first quiz'} tone="green" /><Stat icon="🏆" title="Best Score" value={`${best}%`} delta={best ? 'Personal best' : 'Not attempted'} tone="orange" /><Stat icon="👥" title="Quizzes Available" value={items.length} delta={`${filtered.length} shown`} tone="pink" /></View>

    <SectionTitle title="Choose Quiz" subtitle="Browse quizzes by exam category or subject." />
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}><Pressable onPress={() => { setCategory(''); setSubject(''); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor={!category && !subject ? colors.primary : '#fff', borderWidth: 1, borderColor: !category && !subject ? colors.primary : colors.border, alignItems: 'center' }}><Text style={{ fontSize: 11, fontWeight: '900', color: !category && !subject ? '#fff' : colors.text }}>By Exam Category</Text></Pressable><Pressable onPress={() => { setSubject(subject ? '' : subjects[0] || ''); setCategory(''); }} style={{ flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor={subject ? colors.primary : '#fff'}, borderWidth: 1, borderColor: subject ? colors.primary : colors.border, alignItems: 'center' }}><Text style={{ fontSize: 11, fontWeight: '900', color: subject ? '#fff' : colors.text }}>By Subject</Text></Pressable></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>{categoryCounts.slice(0, 12).map((x, i) => <CategoryCard key={x.name} title={x.name} count={x.count} icon={['🎓', '🚆', '🏦', '🏛️', '💻', '📚'][i % 6]} active={category === x.name} onPress={() => { setCategory(category === x.name ? '' : x.name); setSubject(''); }} tone={['green', 'pink', 'purple', 'orange'][i % 4]} />)}</ScrollView>

    <SectionTitle title="Popular Subjects" subtitle="The same subject quiz can be available for SSC, Railway, Banking and other exams." />
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>{subjectCounts.slice(0, 12).map((x, i) => <CategoryCard key={x.name} title={x.name} count={x.count} icon={['⚛️', '🧪', '➗', '🌿', '📖', '🌐'][i % 6]} active={subject === x.name} onPress={() => { setSubject(subject === x.name ? '' : x.name); setCategory(''); }} tone={['purple', 'green', 'orange', 'pink'][i % 4]} />)}</ScrollView>

    <SectionTitle title="Continue Learning" subtitle="Unfinished quizzes first." right={<Pressable onPress={clearFilters}><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>View all →</Text></Pressable>} />
    {continueItems.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>{continueItems.map(q => <QuizCard key={api.idOf(q)} quiz={q} onOpen={openQuiz} width={280} />)}</ScrollView> : <Empty title="You completed the available quizzes" message="Explore another subject or exam category for more practice." />}

    <SectionTitle title={category || subject ? `${category || subject} Quizzes` : 'All Quizzes'} subtitle={`${filtered.length} published quiz${filtered.length === 1 ? '' : 'zes'} available`} right={(category || subject || search) ? <Button title="Clear" variant="secondary" onPress={clearFilters} /> : null} />
    {filtered.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{filtered.map(q => <View key={api.idOf(q)} style={{ width: cardWidth }}><QuizCard quiz={q} onOpen={openQuiz} width="100%" /></View>)}</View> : <Empty title="No quizzes found" message="Try another exam category, subject or search term." action={<Button title="Clear filters" variant="secondary" onPress={clearFilters} />} />}

    <Card style={{ marginTop: 8, backgroundColor: '#EEF0FF', borderColor: '#E2E0FF' }}><Text style={{ fontSize: 17, fontWeight: '900', color: colors.navy }}>Completion across exams</Text><Text style={{ fontSize: 11, color: colors.muted, lineHeight: 19, marginTop: 5 }}>Complete a quiz under SSC and the matching quiz with the same subject and title under Railway, Banking, UPSC or another exam category is marked completed too.</Text></Card>
  </AppShell>;
}
