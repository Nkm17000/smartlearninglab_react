import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const fallbackCategories = ['Banking', 'SSC', 'Railways', 'UPSC', 'State Exams', 'Teaching', 'Defence', 'Computer'];
const fallbackExams = ['General', 'SSC', 'Banking', 'Railway', 'Teaching', 'UPSC', 'Defence', 'State Exams'];

const coursePalette = [
  { bg: '#132E63', accent: '#4D7BFF', icon: '▥' },
  { bg: '#0B8F70', accent: '#25C28F', icon: '📖' },
  { bg: '#E66D11', accent: '#FFB044', icon: '⌁' },
  { bg: '#7735B9', accent: '#B978F5', icon: '◎' },
  { bg: '#233C80', accent: '#6F91FF', icon: '◈' },
  { bg: '#A53E58', accent: '#FF7E9B', icon: '✦' },
];

function textOf(item, ...keys) {
  for (const key of keys) if (item?.[key] !== undefined && item?.[key] !== null && String(item[key]).trim()) return String(item[key]);
  return '';
}

// Course taxonomy is stored as an array in MongoDB (categories).
// Keep the legacy singular category only as a backward-compatible fallback.
function categoryNames(item) {
  const values = Array.isArray(item?.categories)
    ? item.categories
        .map(value => {
          if (value && typeof value === 'object') return textOf(value, 'name', 'title', 'label');
          return String(value ?? '').trim();
        })
        .filter(Boolean)
    : [];
  if (values.length) return Array.from(new Set(values));
  const legacy = textOf(item, 'category');
  return legacy ? [legacy] : [];
}

function primaryCategory(item) {
  return categoryNames(item)[0] || 'General';
}

function CourseCard({ course, onOpen, width, index }) {
  const title = textOf(course, 'name', 'title') || 'Course';
  const progress = Math.round(Number(course.progress_percentage || course.progress || 0));
  const palette = course.hero_color ? { bg: course.hero_color, accent: colors.primary, icon: course.icon || '📚' } : coursePalette[index % coursePalette.length];
  const lessons = Number(course.lesson_count || course.lessons_count || 0);
  const quizzes = Number(course.quiz_count || course.quizzes_count || 0);
  const resources = Number(course.pdf_count || course.resource_count || course.resources_count || 0);
  const description = textOf(course, 'short_description', 'description') || 'A complete guide with structured lessons, practice and assessments.';

  return (
    <Pressable onPress={() => onOpen(api.idOf(course))} style={({ pressed }) => ({ width, opacity: pressed ? 0.96 : 1, transform: [{ scale: pressed ? 0.995 : 1 }] })}>
      <Card style={{ padding: 0, overflow: 'hidden', minHeight: 360, marginBottom: 0 }}>
        <View style={{ height: 128, backgroundColor: palette.bg, padding: 16, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ width: 45, height: 45, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{palette.icon}</Text></View>
            <Pressable onPress={() => {}} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 18 }}>♡</Text></Pressable>
          </View>
          <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 18, lineHeight: 23, fontWeight: '900' }} numberOfLines={2}>{title}</Text>
        </View>
        <View style={{ padding: 16, flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            <Badge tone="purple">{primaryCategory(course)}</Badge>
            <Badge tone="green">{course.level || 'Beginner'}</Badge>
            {course.is_enrolled && <Badge tone="pink">Enrolled</Badge>}
          </View>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 14, fontWeight: '900', color: colors.navy, marginTop: 10 }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, lineHeight: 16, marginTop: 5 }} numberOfLines={2}>{description}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>▤ {lessons} lessons</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>◎ {quizzes} quizzes</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>▧ {resources} resources</Text>
          </View>
          {course.is_enrolled && <View style={{ marginTop: 11 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>Your progress</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.primary, fontWeight: '900' }}>{progress}%</Text></View>
            <ProgressBar value={progress} color={palette.accent} />
          </View>}
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 'auto', paddingTop: 13 }}>{course.is_enrolled ? 'Continue Learning →' : 'View Course →'}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

function CategoryTile({ name, count, index, active, onPress }) {
  const palette = coursePalette[index % coursePalette.length];
  return <Pressable onPress={onPress} style={({ pressed }) => ({ width: 138, minHeight: 104, borderWidth: 1, borderColor: active ? palette.accent : colors.border, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', padding: 10, opacity: pressed ? 0.92 : 1 })}>
    <View style={{ width: 43, height: 43, borderRadius: 14, backgroundColor: `${palette.accent}18`, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20 }}>{palette.icon}</Text></View>
    <Text style={{ fontFamily: colors.fontFamily, color: colors.navy, fontSize: 10, fontWeight: '900', marginTop: 8 }} numberOfLines={1}>{name}</Text>
    <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 8, marginTop: 3 }}>{count || 0}+ Courses</Text>
  </Pressable>;
}

export default function StudentCoursesScreen({ openCourse }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1180;
  const tablet = width >= 760;
  const cardWidth = wide ? '23.7%' : tablet ? '48.4%' : '100%';
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [exams, setExams] = useState(fallbackExams);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [exam, setExam] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (overrideSearch = submittedSearch) => {
    try {
      setLoading(true);
      setError('');
      const [coursesResult, catalogResult] = await Promise.all([
        api.studentCourses({ search: overrideSearch.trim(), category, exam }),
        api.catalogCategories(),
      ]);
      setItems(api.listOf(coursesResult));
      if (catalogResult) {
        if (Array.isArray(catalogResult.categories) && catalogResult.categories.length) setCategories(catalogResult.categories);
        if (Array.isArray(catalogResult.exams) && catalogResult.exams.length) setExams(catalogResult.exams);
      }
    } catch (e) {
      setError(e?.message || 'Unable to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(''); }, [category, exam]);

  const categoryStats = useMemo(() => {
    const map = new Map();
    items.forEach(course => {
      categoryNames(course).forEach(name => map.set(name, (map.get(name) || 0) + 1));
    });
    return categories.map(name => [name, map.get(name) || 0]);
  }, [items, categories]);

  const examStats = useMemo(() => {
    const map = new Map();
    items.forEach(c => { const value = textOf(c, 'exam') || 'General'; map.set(value, (map.get(value) || 0) + 1); });
    return exams.map(name => [name, map.get(name) || 0]);
  }, [items, exams]);

  const featured = useMemo(() => items.find(c => c.is_enrolled) || items[0], [items]);
  const filtered = useMemo(() => items, [items]);

  const clear = () => { setSearch(''); setSubmittedSearch(''); setCategory(''); setExam(''); };
  const submitSearch = () => { setSubmittedSearch(search); load(search); };

  if (error) return <AppShell><ErrorState title="Courses could not load" message={error} onRetry={() => load()} /></AppShell>;
  if (loading) return <AppShell><Loading label="Loading courses…" /></AppShell>;

  return (
    <AppShell>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 30, fontWeight: '900', color: colors.navy }}>Courses</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, color: colors.muted, marginTop: 4 }}>Explore published courses and continue your learning journey.</Text>
        </View>
        <Badge tone="purple">{filtered.length} Courses</Badge>
      </View>

      {featured && <Card style={{ marginTop: 18, padding: 0, overflow: 'hidden', backgroundColor: '#4B35E9', borderColor: '#4B35E9', borderRadius: 20 }}>
        <View style={{ padding: wide ? 24 : 18, flexDirection: wide ? 'row' : 'column', gap: 18, minHeight: wide ? 184 : 220 }}>
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: '#DAD6FF', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 }}>Continue Learning</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: wide ? 25 : 21, lineHeight: wide ? 32 : 27, color: '#fff', fontWeight: '900', marginTop: 7 }} numberOfLines={2}>{textOf(featured, 'name', 'title')}</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: '#D9D6FF', fontSize: 10, marginTop: 6 }} numberOfLines={1}>{featured.is_enrolled ? 'Pick up where you left off.' : 'Start a structured learning journey.'}</Text>
            {featured.is_enrolled && <View style={{ marginTop: 13, maxWidth: 360 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}><Text style={{ fontFamily: colors.fontFamily, color: '#E7E4FF', fontSize: 9 }}>Your progress</Text><Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 9, fontWeight: '900' }}>{Math.round(Number(featured.progress_percentage || 0))}%</Text></View><ProgressBar value={Number(featured.progress_percentage || 0)} color="#20C98A" /></View>}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 15 }}><Button title={featured.is_enrolled ? 'Continue Learning' : 'View Course'} onPress={() => openCourse(api.idOf(featured))} /><Button title="View Course" variant="secondary" onPress={() => openCourse(api.idOf(featured))} /></View>
          </View>
          <View style={{ width: wide ? 300 : '100%', minHeight: 135, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: wide ? 78 : 62 }}>{featured.icon || '📚'}</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: '#DAD6FF', fontSize: 9, marginTop: 2 }}>{primaryCategory(featured)} · {featured.level || 'Beginner'}</Text>
          </View>
        </View>
      </Card>}

      <Card style={{ marginTop: 16, backgroundColor: colors.hero, borderColor: colors.hero, padding: wide ? 22 : 18, borderRadius: 20 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: wide ? 24 : 21, fontWeight: '900', color: '#fff' }}>Find the right course for you</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: '#D6D8F2', marginTop: 4 }}>Search by course, exam, topic or category.</Text>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 9, marginTop: 15 }}>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search courses, exams, topics…" /></View>
          <Button title="Search" onPress={submitSearch} />
        </View>
      </Card>

      <View style={{ marginTop: 21 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}><View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>Top Categories</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Discover courses by your preparation goal</Text></View><Pressable onPress={() => setCategory('')}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>View All</Text></Pressable></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
          {categoryStats.slice(0, 8).map(([name, count], index) => <CategoryTile key={name} name={name} count={count} index={index} active={category === name} onPress={() => { setCategory(category === name ? '' : name); setExam(''); }} />)}
        </ScrollView>
      </View>

      <View style={{ marginTop: 21 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 }}><View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>Explore by Exam</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Find preparation material for your exam</Text></View></View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {examStats.slice(0, 8).map(([name, count]) => <Pressable key={name} onPress={() => setExam(exam === name ? '' : name)} style={{ paddingHorizontal: 15, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: exam === name ? colors.primary : colors.border, backgroundColor: exam === name ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: exam === name ? '#fff' : colors.text }}>{name}{count ? ` · ${count}` : ''}</Text></Pressable>)}
        </ScrollView>
      </View>

      <View style={{ marginTop: 24, marginBottom: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 22, fontWeight: '900', color: colors.navy }}>All Courses</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Courses currently available to students</Text></View>
        {(category || exam || submittedSearch) && <Button title="Clear filters" variant="secondary" onPress={clear} />}
      </View>

      {filtered.length === 0 ? <Empty title="No courses found" message="Try another category, exam or search term." /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {filtered.map((course, index) => <CourseCard key={api.idOf(course)} course={course} onOpen={openCourse} width={cardWidth} index={index} />)}
        </View>
      )}
    </AppShell>
  );
}
