import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Field, Loading, ProgressBar, SectionTitle } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const FALLBACK_CATEGORIES = ['SSC', 'Railway', 'Banking', 'UPSC', 'Computer', 'Teaching', 'Defence', 'State Exams'];
const FALLBACK_SUBJECTS = ['English', 'Hindi', 'Math', 'Reasoning', 'General Awareness', 'Science', 'Physics', 'Chemistry', 'Biology', 'Computer', 'Java', 'Python', 'PHP', 'SQL', 'DBMS', 'Operating Systems', 'Networking', 'Spring Boot', 'Microservices', 'Aptitude'];

const categoriesOf = course => Array.isArray(course?.categories) && course.categories.length
  ? course.categories
  : (course?.category ? [course.category] : ['General']);

const subjectOf = course => course?.subject || 'General';

function Stat({ icon, title, value, delta, tone = 'blue' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'orange' ? colors.orangeSoft : tone === 'pink' ? colors.pinkSoft : colors.blueSoft;
  return (
    <Card style={{ flex: 1, minWidth: 150, marginBottom: 0, padding: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{icon}</Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '800', color: colors.muted, flex: 1 }}>{title}</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: '900', color: colors.navy, marginTop: 10 }}>{value}</Text>
      {delta && <Text style={{ fontSize: 10, fontWeight: '800', color: colors.success, marginTop: 4 }}>{delta}</Text>}
    </Card>
  );
}

function TaxonomyCard({ title, count, icon, active, onPress, tone = 'purple' }) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'pink' ? colors.pinkSoft : tone === 'orange' ? colors.orangeSoft : colors.purpleSoft;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ width: 155, minWidth: 145, opacity: pressed ? 0.82 : 1 })}>
      <Card style={{ marginBottom: 0, padding: 14, borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.blueSoft : '#fff' }}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <Text style={{ fontSize: 13, fontWeight: '900', color: colors.navy, marginTop: 10 }} numberOfLines={1}>{title}</Text>
        <Text style={{ fontSize: 10, color: colors.muted, marginTop: 3 }}>{count} Courses</Text>
      </Card>
    </Pressable>
  );
}

function CourseCard({ course, onOpen, mobile = false }) {
  const title = course.name || course.title || 'Course';
  const progress = Math.round(Number(course.progress_percentage || 0));
  return (
    <Pressable onPress={() => onOpen(api.idOf(course))} style={({ pressed }) => ({ width: mobile ? '100%' : '100%', opacity: pressed ? 0.94 : 1 })}>
      <Card style={{ padding: 0, overflow: 'hidden', minHeight: 250, marginBottom: 0 }}>
        <View style={{ height: 88, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <View style={{ width: 58, height: 58, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 30 }}>{course.icon || '📚'}</Text>
          </View>
          <View style={{ position: 'absolute', top: 9, left: 9, flexDirection: 'row', gap: 5 }}>
            <Badge tone={course.is_free === false ? 'orange' : 'green'}>{course.is_free === false ? 'PAID' : 'FREE'}</Badge>
          </View>
        </View>
        <View style={{ padding: 14, flex: 1 }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {categoriesOf(course).slice(0, 3).map(category => <Badge key={category} tone="purple">{category}</Badge>)}
            <Badge tone="blue">{subjectOf(course)}</Badge>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 9 }} numberOfLines={2}>{title}</Text>
          <Text style={{ fontSize: 10, color: colors.muted, lineHeight: 16, marginTop: 5 }} numberOfLines={2}>
            {course.short_description || course.description || 'Structured learning with lessons, practice and assessments.'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 9 }}>
            <Text style={{ fontSize: 10, color: colors.muted }}>▤ {course.lesson_count || course.lessons_count || 0} lessons</Text>
            <Text style={{ fontSize: 10, color: colors.muted }}>◎ {course.quiz_count || 0} quizzes</Text>
            <Text style={{ fontSize: 10, color: colors.muted }}>▧ {course.pdf_count || 0} resources</Text>
          </View>
          {course.is_enrolled && (
            <View style={{ marginTop: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ fontSize: 9, color: colors.muted }}>Your progress</Text>
                <Text style={{ fontSize: 9, fontWeight: '900', color: colors.primary }}>{progress}%</Text>
              </View>
              <ProgressBar value={progress} />
            </View>
          )}
          <Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary, marginTop: 10 }}>View Course →</Text>
        </View>
      </Card>
    </Pressable>
  );
}

export default function StudentCoursesScreen({ openCourse }) {
  const { width } = useWindowDimensions();
  const mobile = width < 600;
  const tablet = width >= 600 && width < 1050;

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState(FALLBACK_CATEGORIES);
  const [subjects, setSubjects] = useState(FALLBACK_SUBJECTS);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      const [coursesResult, catalogResult] = await Promise.all([
        api.studentCourses({ search: search.trim(), category, subject, free_only: false }),
        api.catalogCategories(),
      ]);
      setItems(api.listOf(coursesResult));
      if (catalogResult) {
        if (Array.isArray(catalogResult.categories) && catalogResult.categories.length) setCategories(catalogResult.categories);
        if (Array.isArray(catalogResult.subjects) && catalogResult.subjects.length) setSubjects(catalogResult.subjects);
      }
    } catch (e) {
      setError(e?.message || 'Unable to load courses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [category, subject]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(course => {
      const text = [
        course.name,
        course.title,
        course.description,
        course.exam,
        course.level,
        course.language,
        course.subject,
        ...(Array.isArray(course.tags) ? course.tags : []),
        ...categoriesOf(course),
      ].filter(Boolean).join(' ').toLowerCase();
      return text.includes(q);
    });
  }, [items, search]);

  const categoryCounts = useMemo(() => categories
    .map(name => ({ name, count: items.filter(course => categoriesOf(course).some(x => x.toLowerCase() === name.toLowerCase())).length }))
    .filter(x => x.count > 0), [categories, items]);

  const subjectCounts = useMemo(() => subjects
    .map(name => ({ name, count: items.filter(course => subjectOf(course).toLowerCase() === name.toLowerCase()).length }))
    .filter(x => x.count > 0), [subjects, items]);

  const enrolled = useMemo(() => items.filter(x => x.is_enrolled).slice(0, 5), [items]);
  const clearFilters = () => { setSearch(''); setCategory(''); setSubject(''); };

  if (error) return <AppShell><ErrorState title="Courses could not load" message={error} onRetry={load} /></AppShell>;
  if (loading) return <AppShell><Loading label="Preparing your course portal…" /></AppShell>;

  const gridWidth = mobile ? '100%' : tablet ? '48.5%' : '31.8%';

  return (
    <AppShell>
      <View style={{ marginBottom: 8 }}>
        <Text style={{ fontSize: mobile ? 24 : 28, fontWeight: '900', color: colors.navy }}>Courses</Text>
        <Text style={{ fontSize: 12, color: colors.muted, marginTop: 4 }}>Choose an exam category or subject and continue learning.</Text>
      </View>

      <Card style={{ padding: 10, marginBottom: 14 }}>
        <Field value={search} onChangeText={setSearch} placeholder="Search courses, exams, subjects…" />
        <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 8, marginTop: 2 }}>
          <Button title="Search" onPress={load} style={{ flex: mobile ? undefined : 1 }} />
          {(search || category || subject) && <Button title="Clear filters" variant="secondary" onPress={clearFilters} style={{ flex: mobile ? undefined : 1 }} />}
        </View>
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <Stat icon="📚" title="Courses Available" value={items.length} delta={`${filtered.length} shown`} tone="blue" />
        <Stat icon="✓" title="Enrolled" value={items.filter(x => x.is_enrolled).length} delta="Keep learning" tone="green" />
        <Stat icon="▤" title="Subjects" value={subjectCounts.length} delta="Across all courses" tone="pink" />
        <Stat icon="🎯" title="Categories" value={categoryCounts.length} delta="Exam focused" tone="orange" />
      </View>

      <SectionTitle title="Choose Course" subtitle="Browse by exam category." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {categoryCounts.slice(0, 12).map((item, i) => (
          <TaxonomyCard
            key={item.name}
            title={item.name}
            count={item.count}
            icon={['🎓', '🚆', '🏦', '🏛️', '💻', '📚'][i % 6]}
            active={category === item.name}
            onPress={() => { setCategory(category === item.name ? '' : item.name); setSubject(''); }}
            tone={['green', 'pink', 'purple', 'orange'][i % 4]}
          />
        ))}
      </ScrollView>

      <SectionTitle title="Popular Subjects" subtitle="The same subject can be available for multiple exams." />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
        {subjectCounts.slice(0, 12).map((item, i) => (
          <TaxonomyCard
            key={item.name}
            title={item.name}
            count={item.count}
            icon={['⚛️', '🧪', '➗', '🌿', '📖', '🌐'][i % 6]}
            active={subject === item.name}
            onPress={() => { setSubject(subject === item.name ? '' : item.name); setCategory(''); }}
            tone={['purple', 'green', 'orange', 'pink'][i % 4]}
          />
        ))}
      </ScrollView>

      <SectionTitle title="Continue Learning" subtitle="Your enrolled courses first." right={<Pressable onPress={() => { setCategory(''); setSubject(''); }}><Text style={{ fontSize: 11, fontWeight: '900', color: colors.primary }}>View all →</Text></Pressable>} />
      {enrolled.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingBottom: 4 }}>
          {enrolled.map(course => <View key={api.idOf(course)} style={{ width: 280 }}><CourseCard course={course} onOpen={openCourse} /></View>)}
        </ScrollView>
      ) : (
        <Empty title="No enrolled courses yet" message="Open any course below to start learning." />
      )}

      <SectionTitle title={category || subject ? `Courses in ${category || subject}` : 'All Courses'} subtitle={`${filtered.length} published course${filtered.length === 1 ? '' : 's'} available`} />
      {filtered.length === 0 ? (
        <Empty title="No courses found" message="Try another category, subject or search term." action={<Button title="Clear filters" variant="secondary" onPress={clearFilters} />} />
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
          {filtered.map(course => (
            <View key={api.idOf(course)} style={{ width: gridWidth }}>
              <CourseCard course={course} onOpen={openCourse} mobile={mobile} />
            </View>
          ))}
        </View>
      )}
    </AppShell>
  );
}
