import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, ProgressBar, SectionTitle } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

function QuizCard({ quiz, onOpen, width }) {
  const title = quiz.title || quiz.name || 'Practice Quiz';
  const questions = Array.isArray(quiz.question_ids) ? quiz.question_ids.length : Number(quiz.question_count || 0);
  const duration = quiz.duration_minutes || 20;
  return (
    <Pressable onPress={() => onOpen(api.idOf(quiz))} style={({ pressed }) => ({ width, opacity: pressed ? 0.94 : 1 })}>
      <Card style={{ padding: 0, overflow: 'hidden', minHeight: 300 }}>
        <View style={{ height: 108, backgroundColor: quiz.hero_color || colors.hero, padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Badge tone="purple">{quiz.category || 'General'}</Badge>
            <Text style={{ fontSize: 28 }}>✓</Text>
          </View>
          <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 19, fontWeight: '900' }} numberOfLines={2}>{title}</Text>
        </View>
        <View style={{ padding: 15, flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 11, lineHeight: 18 }} numberOfLines={3}>
            {quiz.description || 'Practice important concepts, test your knowledge and improve your score.'}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12 }}>
            <Badge tone="purple">{questions} Questions</Badge>
            <Badge tone="orange">{duration} min</Badge>
            <Badge tone="green">Pass {quiz.passing_percentage || 60}%</Badge>
          </View>
          {quiz.course_id && <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 11 }}>Course assessment</Text>}
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '900', color: colors.primary, marginTop: 'auto', paddingTop: 14 }}>Start Quiz →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function StudentQuizzesScreen({ openQuiz }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1100;
  const tablet = width >= 720;
  const cardWidth = wide ? '31.8%' : tablet ? '48.5%' : '100%';
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
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

  const categories = useMemo(() => {
    const values = items.map(x => x.category).filter(Boolean);
    return ['All', ...Array.from(new Set(values))];
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => {
      const text = [x.title, x.name, x.description, x.category, x.exam].filter(Boolean).join(' ').toLowerCase();
      return (!q || text.includes(q)) && (!category || category === 'All' || x.category === category);
    });
  }, [items, search, category]);

  if (error) return <AppShell><ErrorState title="Quizzes could not load" message={error} onRetry={load} /></AppShell>;
  if (loading) return <AppShell><Loading label="Loading quizzes…" /></AppShell>;

  return (
    <AppShell>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 28, fontWeight: '900', color: colors.navy }}>Quizzes</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, color: colors.muted, marginTop: 4 }}>Practice, test yourself and track your learning.</Text>
        </View>
        <Badge tone="purple">{filtered.length} Quizzes</Badge>
      </View>

      <Card style={{ marginTop: 16, backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 21, fontWeight: '900', color: '#fff' }}>Find a quiz</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: '#D6D8F2', marginTop: 4 }}>Search quizzes by title, exam or category.</Text>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginTop: 13 }}>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search quizzes, exams, topics…" /></View>
          <Button title="Search" onPress={() => {}} />
        </View>
      </Card>

      <SectionTitle title="Explore by Category" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map(x => <Pressable key={x} onPress={() => setCategory(category === x || x === 'All' && category === '' ? '' : x)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: (!category && x === 'All') || category === x ? colors.primary : colors.border, backgroundColor: (!category && x === 'All') || category === x ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: (!category && x === 'All') || category === x ? '#fff' : colors.text }}>{x}</Text></Pressable>)}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
        <View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>All Quizzes</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Published quizzes available to you</Text></View>
        {(category || search) && <Button title="Clear filters" variant="secondary" onPress={() => { setSearch(''); setCategory(''); }} />}
      </View>

      {filtered.length === 0 ? <Empty title="No quizzes found" message="Try another search or category." /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'stretch' }}>
          {filtered.map(quiz => <QuizCard key={api.idOf(quiz)} quiz={quiz} onOpen={openQuiz} width={cardWidth} />)}
        </View>
      )}
    </AppShell>
  );
}
