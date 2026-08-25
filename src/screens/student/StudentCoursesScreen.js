import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, ProgressBar, SectionTitle } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const fallbackCategories = ['General', 'English Spoken', 'English Grammar', 'Banking', 'Railway', 'Teaching', 'Defence', 'SSC', 'UPSC', 'Computer'];
const fallbackExams = ['General', 'SSC', 'Banking', 'Railway', 'Teaching', 'UPSC', 'Defence', 'State Exams', 'Computer'];
const fallbackSubjects = ['English','Hindi','Math','Reasoning','General Awareness','Science','Physics','Chemistry','Biology','Computer','Java','Python','PHP','SQL','Spring Boot','Microservices','Aptitude','Other'];

function CourseCard({ course, onOpen, wide }) {
  const title = course.name || course.title || 'Course';
  const progress = Math.round(Number(course.progress_percentage || 0));
  return (
    <Pressable onPress={() => onOpen(api.idOf(course))} style={({ pressed }) => ({ flex: wide ? 1 : undefined, minWidth: wide ? 270 : 240, maxWidth: wide ? 390 : 330, opacity: pressed ? 0.94 : 1 })}>
      <Card style={{ padding: 0, overflow: 'hidden', height: 315 }}>
        <View style={{ height: 105, backgroundColor: course.hero_color || '#32217B', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 44 }}>{course.icon || '📚'}</Text>
        </View>
        <View style={{ padding: 14, flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {(Array.isArray(course.categories)?course.categories:(course.category?[course.category]:['General'])).slice(0,3).map(x=><Badge key={x} tone="purple">{x}</Badge>)}<Badge tone="blue">{course.subject||'General'}</Badge>
            <Badge tone="green">{course.level || 'Beginner'}</Badge>
            {course.is_enrolled && <Badge tone="pink">Enrolled</Badge>}
          </View>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 9 }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, lineHeight: 16, marginTop: 5 }} numberOfLines={2}>
            {course.short_description || course.description || 'Structured learning with lessons, practice and assessments.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 9 }}>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>▤ {course.lesson_count || course.lessons_count || 0} lessons</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>◎ {course.quiz_count || 0} quizzes</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>▧ {course.pdf_count || 0} resources</Text>
          </View>
          {course.is_enrolled && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>Your progress</Text>
                <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, fontWeight: '900', color: colors.primary }}>{progress}%</Text>
              </View>
              <ProgressBar value={progress} />
            </View>
          )}
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 10 }}>View Course →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function StudentCoursesScreen({ openCourse }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1180;
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [exams, setExams] = useState(fallbackExams);
  const [subjects, setSubjects] = useState(fallbackSubjects);
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
      const [coursesResult, catalogResult] = await Promise.all([
        api.studentCourses({ search: search.trim(), category, exam, subject }),
        api.catalogCategories(),
      ]);
      setItems(api.listOf(coursesResult));
      if (catalogResult) {
        if (Array.isArray(catalogResult.categories) && catalogResult.categories.length) setCategories(catalogResult.categories);
        if (Array.isArray(catalogResult.exams) && catalogResult.exams.length) setExams(catalogResult.exams);
        if (Array.isArray(catalogResult.subjects) && catalogResult.subjects.length) setSubjects(catalogResult.subjects);
      }
    } catch (e) {
      setError(e?.message || 'Unable to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, exam, subject]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(c => [c.name, c.title, c.description, c.category, c.exam, c.level, ...(c.tags || [], ...(Array.isArray(c.categories)?c.categories:[c.category]), c.subject)].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [items, search]);

  const submitSearch = () => load();

  if (error) return <AppShell><ErrorState title="Courses could not load" message={error} onRetry={load} /></AppShell>;
  if (loading) return <AppShell><Loading label="Loading courses…" /></AppShell>;

  return (
    <AppShell>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 28, fontWeight: '900', color: colors.navy }}>Courses</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, color: colors.muted, marginTop: 4 }}>Explore published courses and continue your learning journey.</Text>
        </View>
        <Badge tone="purple">{filtered.length} Courses</Badge>
      </View>

      <Card style={{ marginTop: 16, backgroundColor: colors.hero, borderColor: colors.hero, padding: 18 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 21, fontWeight: '900', color: '#fff' }}>Find the right course for you</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: '#D6D8F2', marginTop: 4 }}>Search by course, exam, topic or category.</Text>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginTop: 13 }}>
          <View style={{ flex: 1 }}><Field value={search} onChangeText={setSearch} placeholder="Search courses, exams, topics…" /></View>
          <Button title="Search" onPress={submitSearch} />
        </View>
      </Card>

      <SectionTitle title="Explore by Category" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {categories.map(x => <Pressable key={x} onPress={() => setCategory(category === x ? '' : x)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: category === x ? colors.primary : colors.border, backgroundColor: category === x ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: category === x ? '#fff' : colors.text }}>{x}</Text></Pressable>)}
      </ScrollView>

      <SectionTitle title="Explore by Exam" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {exams.map(x => <Pressable key={x} onPress={() => setExam(exam === x ? '' : x)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: exam === x ? colors.primary : colors.border, backgroundColor: exam === x ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: exam === x ? '#fff' : colors.text }}>{x}</Text></Pressable>)}
      </ScrollView>

      <SectionTitle title="Explore by Subject" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        {subjects.slice(0,20).map(x => <Pressable key={x} onPress={() => setSubject(subject === x ? '' : x)} style={{ paddingHorizontal: 14, paddingVertical: 10, borderRadius: 13, borderWidth: 1, borderColor: subject === x ? colors.primary : colors.border, backgroundColor: subject === x ? colors.primary : '#fff' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: subject === x ? '#fff' : colors.text }}>{x}</Text></Pressable>)}
      </ScrollView>

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 }}>
        <View><Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>All Courses</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>Courses currently available to students</Text></View>
        {(category || exam || subject || search) && <Button title="Clear filters" variant="secondary" onPress={() => { setSearch(''); setCategory(''); setExam(''); setSubject(''); }} />}
      </View>

      {filtered.length === 0 ? <Empty title="No courses found" message="Try another category, exam or search term." /> : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {filtered.map(course => <CourseCard key={api.idOf(course)} course={course} onOpen={openCourse} wide={wide} />)}
        </View>
      )}
    </AppShell>
  );
}
