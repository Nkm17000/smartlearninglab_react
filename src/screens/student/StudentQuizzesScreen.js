import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const examPalette = [
  { bg: '#EAFBF1', icon: '🎓', accent: '#19B76A' },
  { bg: '#FFF0F3', icon: '🧪', accent: '#F04B65' },
  { bg: '#F1ECFF', icon: '⚛️', accent: '#7656F5' },
  { bg: '#FFF4E5', icon: '🏛️', accent: '#F39A24' },
  { bg: '#EAF9FB', icon: '🏦', accent: '#27A8B7' },
  { bg: '#F2F3F8', icon: '•••', accent: '#6D7390' },
];

const subjectPalette = [
  { bg: '#EDF3FF', icon: '⚛️', accent: '#4D73F6' },
  { bg: '#EAFBF1', icon: '🧪', accent: '#18B86A' },
  { bg: '#F1ECFF', icon: '▣', accent: '#7956F5' },
  { bg: '#EAFBF2', icon: '🌿', accent: '#2DAF63' },
  { bg: '#FFF3DF', icon: '📖', accent: '#F1A21A' },
  { bg: '#EEF7FF', icon: '◎', accent: '#3E82D7' },
];

const heroPalette = ['#11143D', '#32217B', '#173C67', '#5A2D82', '#153B43', '#1D315F'];

function getText(item, ...keys) {
  for (const key of keys) if (item?.[key] !== undefined && item?.[key] !== null && String(item[key]).trim()) return String(item[key]);
  return '';
}

// Quiz taxonomy is stored as an array in MongoDB (categories).
// Use the array for display/filtering, with singular category only as a legacy fallback.
function categoryNames(item) {
  const values = Array.isArray(item?.categories)
    ? item.categories
        .map(value => {
          if (value && typeof value === 'object') return getText(value, 'name', 'title', 'label');
          return String(value ?? '').trim();
        })
        .filter(Boolean)
    : [];
  if (values.length) return Array.from(new Set(values));
  const legacy = getText(item, 'category');
  return legacy ? [legacy] : [];
}

function primaryCategory(item) {
  return categoryNames(item)[0] || 'General';
}

function QuizCard({ quiz, onOpen, width, index }) {
  const title = getText(quiz, 'title', 'name') || 'Practice Quiz';
  const questions = Array.isArray(quiz.question_ids) ? quiz.question_ids.length : Number(quiz.question_count || quiz.questions_count || 0);
  const duration = Number(quiz.duration_minutes || quiz.duration || 20);
  const passing = Number(quiz.passing_percentage || quiz.pass_percentage || 60);
  const category = primaryCategory(quiz);
  const hero = quiz.hero_color || heroPalette[index % heroPalette.length];
  const subtitle = getText(quiz, 'description', 'short_description') || 'Practice important concepts, test yourself and improve your score.';

  return (
    <Pressable onPress={() => onOpen(api.idOf(quiz))} style={({ pressed }) => ({ width, opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] })}>
      <Card style={{ padding: 0, overflow: 'hidden', minHeight: 330, marginBottom: 0 }}>
        <View style={{ height: 132, backgroundColor: hero, padding: 18, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ backgroundColor: '#F4F0FF', borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 }}>
              <Text style={{ fontFamily: colors.fontFamily, color: colors.primary, fontSize: 10, fontWeight: '900' }}>{category}</Text>
            </View>
            <Text style={{ color: '#080B24', fontSize: 28, fontWeight: '900' }}>✓</Text>
          </View>
          <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 18, lineHeight: 23, fontWeight: '900' }} numberOfLines={2}>{title}</Text>
        </View>
        <View style={{ padding: 17, flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 11, lineHeight: 18 }} numberOfLines={3}>{subtitle}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
            <Badge tone="purple">{questions || 10} Questions</Badge>
            <Badge tone="orange">{duration} min</Badge>
            <Badge tone="green">Pass {passing}%</Badge>
          </View>
          {quiz.exam && <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.subtle, marginTop: 11 }}>For {quiz.exam} · {primaryCategory(quiz)}</Text>}
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '900', color: colors.primary, marginTop: 'auto', paddingTop: 15 }}>Start Quiz →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function ExamTile({ name, count, index, onPress, active }) {
  const p = examPalette[index % examPalette.length];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 150, minHeight: 128, borderWidth: 1, borderColor: active ? p.accent : colors.border, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 12, opacity: pressed ? 0.92 : 1 })}>
      <View style={{ width: 48, height: 48, borderRadius: 15, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{p.icon}</Text></View>
      <Text style={{ fontFamily: colors.fontFamily, color: colors.navy, fontSize: 12, fontWeight: '900', marginTop: 9 }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 9, marginTop: 4 }}>{count}+ Quizzes</Text>
    </Pressable>
  );
}

function SubjectTile({ name, count, index, onPress, active }) {
  const p = subjectPalette[index % subjectPalette.length];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 150, minHeight: 112, borderWidth: 1, borderColor: active ? p.accent : colors.border, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 12, opacity: pressed ? 0.92 : 1 })}>
      <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: p.bg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 21 }}>{p.icon}</Text></View>
      <Text style={{ fontFamily: colors.fontFamily, color: colors.navy, fontSize: 11, fontWeight: '900', marginTop: 8 }} numberOfLines={1}>{name}</Text>
      <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 9, marginTop: 3 }}>{count}+ Quizzes</Text>
    </Pressable>
  );
}

export default function StudentQuizzesScreen({ openQuiz }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1180;
  const tablet = width >= 760;
  const cardWidth = wide ? '31.9%' : tablet ? '48.4%' : '100%';
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [exam, setExam] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setItems(api.listOf(await api.studentQuizzes()));
    } catch (e) {
      setError(e?.message || 'Unable to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const exams = useMemo(() => {
    const counts = new Map();
    items.forEach(q => { const value = getText(q, 'exam'); if (value) counts.set(value, (counts.get(value) || 0) + 1); });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const subjects = useMemo(() => {
    const counts = new Map();
    items.forEach(q => {
      const value = getText(q, 'subject', 'topic');
      if (value) counts.set(value, (counts.get(value) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [items]);

  const categories = useMemo(() => {
    const values = items.flatMap(x => categoryNames(x));
    return ['All', ...Array.from(new Set(values))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => {
      const names = categoryNames(x);
      const text = [x.title, x.name, x.description, ...names, x.exam, x.subject, x.topic].filter(Boolean).join(' ').toLowerCase();
      const categoryMatches = !category || category === 'All' || names.includes(category);
      return (!q || text.includes(q)) && categoryMatches && (!exam || x.exam === exam) && (!subject || x.subject === subject || x.topic === subject);
    });
  }, [items, search, category, exam, subject]);

  const clear = () => { setSearch(''); setCategory(''); setExam(''); setSubject(''); };
  const chooseCategory = value => { setCategory(value === 'All' ? '' : value); setExam(''); setSubject(''); };

  if (error) return <AppShell><ErrorState title="Quizzes could not load" message={error} onRetry={load} /></AppShell>;
  if (loading) return <AppShell><Loading label="Loading quizzes…" /></AppShell>;

  return (
    <AppShell>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 30, fontWeight: '900', color: colors.navy }}>Quizzes</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, color: colors.muted, marginTop: 4 }}>Practice, test yourself and track your learning.</Text>
        </View>
        <Badge tone="purple">{filtered.length} Quizzes</Badge>
      </View>

      <Card style={{ marginTop: 18, backgroundColor: colors.hero, borderColor: colors.hero, padding: wide ? 22 : 18, borderRadius: 20 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: wide ? 24 : 21, fontWeight: '900', color: '#fff' }}>Find a quiz</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: '#D6D8F2', marginTop: 4 }}>Search quizzes by title, exam, subject or category.</Text>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 9, marginTop: 15 }}>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search quizzes, exams, subjects…" /></View>
          <Button title="Search" onPress={() => {}} />
        </View>
      </Card>

      {exams.length > 0 && <View style={{ marginTop: 21 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>Choose Quiz</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Browse by exam category</Text></View>
          <Pressable onPress={() => { setExam(''); setSubject(''); }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>View All</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {exams.map(([name, count], index) => <ExamTile key={name} name={name} count={count} index={index} active={exam === name} onPress={() => { setExam(exam === name ? '' : name); setSubject(''); }} />)}
          <ExamTile name="More" count={items.length} index={5} active={false} onPress={() => setCategory('')} />
        </ScrollView>
      </View>}

      {subjects.length > 0 && <View style={{ marginTop: 21 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}>
          <View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>Popular Subjects</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Practice topic-wise whenever you want</Text></View>
          <Pressable onPress={() => setSubject('')}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>View All</Text></Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {subjects.map(([name, count], index) => <SubjectTile key={name} name={name} count={count} index={index} active={subject === name} onPress={() => { setSubject(subject === name ? '' : name); setExam(''); }} />)}
        </ScrollView>
      </View>}

      <View style={{ marginTop: 24, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 22, fontWeight: '900', color: colors.navy }}>All Quizzes</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Published quizzes available to you</Text></View>
        {(category || exam || subject || search) && <Button title="Clear filters" variant="secondary" onPress={clear} />}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 14 }}>
        {categories.map(x => {
          const active = (!category && x === 'All') || category === x;
          return <Pressable key={x} onPress={() => chooseCategory(x)} style={{ paddingHorizontal: 14, paddingVertical: 9, borderRadius: 13, borderWidth: 1, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: active ? '#fff' : colors.text }}>{x}</Text></Pressable>;
        })}
      </ScrollView>

      {filtered.length === 0 ? <Empty title="No quizzes found" message="Try another search, exam, subject or category." /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' }}>
          {filtered.map((quiz, index) => <QuizCard key={api.idOf(quiz)} quiz={quiz} onOpen={openQuiz} width={cardWidth} index={index} />)}
        </View>
      )}
    </AppShell>
  );
}
