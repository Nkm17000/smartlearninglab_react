import React, { useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, SectionTitle, StatCard, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const exams = ['SSC', 'Banking', 'Railway', 'Teaching', 'UPSC', 'Defence', 'State Exams', 'Computer'];
function CourseCard({ c, onOpen, featured = false }) {
    const name = c.name || c.title || 'Course';
    return <Pressable onPress={() => onOpen(api.idOf(c))} style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1, flex: 1, minWidth: 270, maxWidth: 330 })}>
        <Card style={{ padding: 0, overflow: 'hidden', height: '100%' }}>
            <View style={{ height: 122, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', left: 15, top: 14 }}><Badge tone={c.is_free === false ? 'orange' : 'pink'}>{c.is_free === false ? 'PREMIUM' : 'FREE'}</Badge></View>
                <Text style={{ fontSize: 42 }}>📚</Text>
                {featured && <View style={{ position: 'absolute', right: 14, top: 14 }}><Badge tone="orange">★ Featured</Badge></View>}
            </View>
            <View style={{ padding: 16, flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}><Badge>{c.level || 'Beginner'}</Badge><Badge tone="purple">{c.category || 'General'}</Badge></View>
                <Text style={{ fontSize: 17, fontWeight: '900', color: colors.navy }} numberOfLines={2}>{name}</Text>
                <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6, lineHeight: 18 }} numberOfLines={2}>{c.short_description || c.description || 'Structured learning with lessons, practice and tests.'}</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 13, flexWrap: 'wrap' }}><Text style={{ fontSize: 12, color: colors.muted }}>🎥 {c.video_count || 0}</Text><Text style={{ fontSize: 12, color: colors.muted }}>📄 {c.pdf_count || 0}</Text><Text style={{ fontSize: 12, color: colors.muted }}>📝 {c.mock_test_count || 0}</Text></View>
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '900', marginTop: 14 }}>View course  →</Text>
            </View>
        </Card>
    </Pressable>
}
function QuizCard({ q, onOpen }) { return <Card style={{ flex: 1, minWidth: 280, maxWidth: 410 }}><View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Text>📝</Text></View><View style={{ flex: 1 }}><Text style={{ fontWeight: '900', color: colors.navy }} numberOfLines={2}>{q.title || q.name}</Text><Text style={{ fontSize: 12, color: colors.muted, marginTop: 3 }}>{q.duration_minutes || 15} min · {(q.question_ids || []).length} questions</Text></View></View><Button title="Attempt test" onPress={() => onOpen(api.idOf(q))} style={{ marginTop: 13 }} /></Card> }

export default function StudentHomeScreen({ user, openCourse, openQuiz }) {
    const [search, setSearch] = useState(''), [activeExam, setActiveExam] = useState(''), [data, setData] = useState(null), [cats, setCats] = useState({}), [error, setError] = useState('');
    const load = async () => {
        setError('');
        const results = await Promise.allSettled([api.studentDashboard(), api.catalogCategories(), api.featuredCatalog(10), api.studentQuizzes(), api.analytics()]);
        const [d, c, f, q, a] = results.map(r => r.status === 'fulfilled' ? r.value : null);
        if (!d && !f && !q && !a) { setError(results.find(r => r.status === 'rejected')?.reason?.message || 'Unable to load learning data.'); return; }
        setData({ dashboard: d || {}, analytics: a || {}, featured: api.listOf(f?.courses), quizzes: api.listOf(f?.quizzes).length ? api.listOf(f?.quizzes) : api.listOf(q), enrolled: api.listOf(d?.enrolled_courses) });
        if (c) setCats(c);
    };
    useEffect(() => { load() }, []);
    const searchCourses = async () => { try { const c = await api.studentCourses({ search, category: activeExam }); setData(x => ({ ...x, searchResults: api.listOf(c) })) } catch (e) { Alert.alert('Search', e.message) } };
    if (error) return <AppShell><ErrorState title="Learning data could not load" message={error} onRetry={load} /></AppShell>;
    if (!data) return <AppShell><Loading label="Preparing your learning home…" /></AppShell>;
    const courses = data.searchResults || data.featured || []; const first = data.enrolled?.[0];
    return <AppShell>
        <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy, padding: 26 }}><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}><View style={{ flex: 1, minWidth: 300 }}><Badge tone="pink">SMART LEARNING LAB</Badge><Text style={{ fontSize: 31, fontWeight: '900', color: '#fff', marginTop: 11 }}>Learn smarter. Build skills. Keep growing.</Text><Text style={{ color: '#CBD5E1', fontSize: 15, lineHeight: 23, marginTop: 8, maxWidth: 720 }}>Courses, guided lessons, mock tests, AI support and personalized practice — designed around your progress.</Text><View style={{ flexDirection: 'row', gap: 8, marginTop: 18, alignItems: 'center', flexWrap: 'wrap' }}><View style={{ flex: 1, minWidth: 250 }}><Field value={search} onChangeText={setSearch} placeholder="Search courses, exams or topics…" /></View><Button title="Search" onPress={searchCourses} /></View></View><View style={{ width: 220, minWidth: 190, backgroundColor: '#1E293B', borderRadius: 18, padding: 17, alignSelf: 'stretch', justifyContent: 'center' }}><Text style={{ color: '#A5B4FC', fontSize: 11, fontWeight: '900' }}>WELCOME BACK</Text><Text style={{ color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 6 }}>{user?.name || 'Learner'} 👋</Text><Text style={{ color: '#CBD5E1', fontSize: 12, lineHeight: 18, marginTop: 5 }}>Small daily progress becomes big results.</Text><View style={{ marginTop: 14 }}><ProgressBar value={data.analytics?.streak?.current ? Math.min(100, data.analytics.streak.current * 10) : 0} /></View><Text style={{ color: '#CBD5E1', fontSize: 11, marginTop: 6 }}>🔥 {data.analytics?.streak?.current || 0} day streak</Text></View></View></Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}><StatCard icon="📚" label="Courses available" value={data.dashboard?.courses_available || 0} tone="primary" /><StatCard icon="✓" label="Lessons completed" value={data.dashboard?.lessons_completed || 0} tone="success" /><StatCard icon="🎯" label="Quiz average" value={`${data.dashboard?.quiz_average || 0}%`} tone="warning" /><StatCard icon="⚡" label="XP earned" value={data.analytics?.xp || 0} tone="purple" /></View>
        {first && <><SectionTitle title="Continue learning" subtitle="Pick up where you left off." /><Card><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}><View style={{ width: 58, height: 58, borderRadius: 17, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 27 }}>📖</Text></View><View style={{ flex: 1, minWidth: 230 }}><Badge tone="green">IN PROGRESS</Badge><Text style={{ fontSize: 18, fontWeight: '900', color: colors.navy, marginTop: 6 }}>{first.name || first.title || 'Your enrolled course'}</Text><View style={{ marginTop: 9 }}><ProgressBar value={first.progress_percentage || 0} /></View><Text style={{ fontSize: 11, color: colors.muted, marginTop: 5 }}>{first.progress_percentage || 0}% completed</Text></View><Button title="Continue course" onPress={() => api.idOf(first) && openCourse(api.idOf(first))} /></View></Card></>}
        <SectionTitle title="Explore by exam" subtitle="Find the right learning path quickly." /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>{[...(cats?.exams || []), ...exams.filter(x => !(cats?.exams || []).includes(x))].slice(0, 12).map(x => <Pressable key={x} onPress={() => { setActiveExam(activeExam === x ? '' : x); setTimeout(searchCourses, 0) }} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 22, borderWidth: 1, borderColor: activeExam === x ? colors.primary : colors.border, backgroundColor: activeExam === x ? colors.blueSoft : '#fff' }}><Text style={{ fontWeight: '800', color: activeExam === x ? colors.primary : colors.text }}>{x}</Text></Pressable>)}</View>
        <SectionTitle title={data.searchResults ? 'Search results' : 'Featured courses'} subtitle="Curated learning paths with practice built in." />{courses.length === 0 ? <Empty title="No courses found" message="Try another search or exam category." /> : <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{courses.map(c => <CourseCard key={api.idOf(c)} c={c} featured={!data.searchResults} onOpen={openCourse} />)}</View>}
        <SectionTitle title="Test series & mock tests" subtitle="Practice under exam-style conditions." />{data.quizzes?.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>{data.quizzes.slice(0, 8).map(q => <QuizCard key={api.idOf(q)} q={q} onOpen={openQuiz} />)}</View> : <Empty title="No published tests yet" message="New practice tests will appear here." />}
        <SectionTitle title="Learn your way" subtitle="Tools designed to help you stay consistent." /><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>{[['🤖', 'AI Tutor', 'Ask questions while learning and revise faster.'], ['🧠', 'Flashcards', 'Remember concepts with spaced repetition.'], ['🎤', 'Speaking Practice', 'Build fluency with guided practice.'], ['🏆', 'Goals & Streaks', 'Stay motivated with XP and daily progress.']].map(([i, t, d]) => <Card key={t} style={{ flex: 1, minWidth: 250 }}><Text style={{ fontSize: 25 }}>{i}</Text><Text style={{ fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 8 }}>{t}</Text><Text style={{ fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 4 }}>{d}</Text></Card>)}</View>
    </AppShell>
}
