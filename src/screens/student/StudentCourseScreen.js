import React, { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const courseVisual = (course) => {
  const text = `${course?.name || course?.title || ''} ${course?.category || ''} ${course?.subject || ''}`.toLowerCase();
  if (text.includes('java')) return { icon: '☕', label: 'JAVA', note: 'Programming' };
  if (text.includes('python')) return { icon: '🐍', label: 'PYTHON', note: 'Programming' };
  if (text.includes('english')) return { icon: '📘', label: 'ENGLISH', note: 'Language' };
  if (text.includes('math')) return { icon: '∑', label: 'MATHS', note: 'Mathematics' };
  if (text.includes('physics')) return { icon: '⚛️', label: 'PHYSICS', note: 'Science' };
  if (text.includes('chemistry')) return { icon: '🧪', label: 'CHEMISTRY', note: 'Science' };
  if (text.includes('biology')) return { icon: '🧬', label: 'BIOLOGY', note: 'Science' };
  return { icon: '🎓', label: String(course?.category || 'COURSE').toUpperCase(), note: 'Smart Learning Lab' };
};

const tabs = [
  ['overview', '▣', 'Overview'],
  ['curriculum', '▤', 'Lessons'],
  ['tests', '◎', 'Quiz'],
  ['resources', '▧', 'Resources'],
  ['reviews', '☏', 'Discussions'],
];

function Stat({ icon, value, label }) {
  return (
    <View style={{ flex: 1, minWidth: 125, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, backgroundColor: '#FAF9FF', borderRadius: 13 }}>
      <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 16, color: colors.primary }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy }}>{value}</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 1 }}>{label}</Text>
      </View>
    </View>
  );
}

function LessonRow({ lesson, index, topicIndex, done, onOpen }) {
  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => ({
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: pressed ? '#F8F7FF' : '#fff',
      })}
    >
      <View style={{ width: 23, height: 23, borderRadius: 12, backgroundColor: done ? colors.greenSoft : colors.blueSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: done ? colors.success : colors.primary }}>{done ? '✓' : '○'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '800', color: colors.navy }}>
          {topicIndex}.{index + 1} {lesson.title || lesson.name}
        </Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 2 }}>
          {lesson.duration_minutes || 10} min
        </Text>
      </View>
      <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '800', color: colors.primary }}>
        {done ? 'Review' : 'Open'}
      </Text>
      <Text style={{ fontSize: 17, color: colors.subtle }}>›</Text>
    </Pressable>
  );
}


function CourseDetailsPanel({ course, modules, lessons, quizzes, resources, pct, onContinue }) {
  const detailRows = [
    ['Category', course.category || 'General'],
    ['Exam', course.exam || 'General'],
    ['Level', course.level || 'Beginner'],
    ['Language', course.language || 'English'],
    ['Duration', course.duration || (course.duration_minutes ? `${course.duration_minutes} min` : 'Self paced')],
    ['Lessons', String(lessons.length)],
    ['Topics', String(modules.length)],
    ['Quizzes', String(quizzes.length)],
    ['Resources', String(resources.length || course.pdf_count || 0)],
    ['Access', course.is_free === false ? 'Paid course' : 'Free course'],
    ['Enrolled', String(course.enrollment_count || course.enrolled_count || course.students_count || 0)],
    ['Certificate', course.certificate_enabled === false ? 'Not included' : 'On completion'],
    ['Instructor', course.instructor_name || course.instructor || 'Smart Learning Lab'],
  ];
  const objectives = Array.isArray(course.learning_objectives) ? course.learning_objectives : [];
  const tags = Array.isArray(course.tags) ? course.tags : [];
  return (
    <View style={{ width: 315 }}>
      <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 17, fontWeight: '900', color: colors.navy }}>Course Details</Text>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 4 }}>Everything you need to know before you start.</Text>
        <View style={{ marginTop: 13 }}>
          {detailRows.map(([label, value]) => (
            <View key={label} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>{label}</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.navy, textAlign: 'right', flex: 1 }}>{value}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy }}>Your Progress</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, marginBottom: 6 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>Course completion</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>{pct}%</Text>
        </View>
        <ProgressBar value={pct} />
        <Button title={pct > 0 ? '▶ Continue Learning' : '▶ Start Learning'} onPress={onContinue} style={{ width: '100%', marginTop: 12 }} />
      </Card>

      <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy }}>What you'll learn</Text>
        {objectives.length ? objectives.slice(0, 8).map((item, i) => <Text key={i} style={{ fontFamily: colors.fontFamily, fontSize: 10, lineHeight: 16, color: colors.text, marginTop: 9 }}>✓  {item}</Text>) : <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, lineHeight: 17, color: colors.muted, marginTop: 8 }}>Follow the lessons in order to build your knowledge step by step.</Text>}
      </Card>

      {tags.length > 0 && <Card style={{ padding: 16 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy }}>Topics & Tags</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>{tags.slice(0, 12).map(tag => <Badge key={String(tag)}>{String(tag)}</Badge>)}</View>
      </Card>}
    </View>
  );
}

export default function StudentCourseScreen({ courseId, onBack, openQuiz, openLesson }) {
  const { width } = useWindowDimensions();
  const mobile = width < 720;
  const [data, setData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [tab, setTab] = useState('overview');
  const [expanded, setExpanded] = useState({ 0: true });
  const [error, setError] = useState('');
  const [reviews, setReviews] = useState([]);
  const [bookmarked, setBookmarked] = useState(false);

  const load = async () => {
    try {
      setError('');
      const overview = await api.courseOverview(courseId);
      setData(overview);
      setProgress(overview.progress || null);
      setCompleted(Array.isArray(overview.completed_lesson_ids) ? overview.completed_lesson_ids.map(String) : []);
      setReviews(api.listOf(overview.reviews));
      setBookmarked(Boolean(overview.bookmarked));
    } catch (e) {
      setError(e?.message || 'Unable to open this course.');
    }
  };

  useEffect(() => { load(); }, [courseId]);

  if (error) {
    return (
      <AppShell>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 24, fontWeight: '900', color: colors.navy }}>Course</Text>
          <Button title="← Back to Courses" variant="secondary" onPress={onBack} />
        </View>
        <ErrorState title="Course could not load" message={error} onRetry={load} />
      </AppShell>
    );
  }

  if (!data) return <AppShell><Loading label="Opening course…" /></AppShell>;

  const course = data.course || {};
  const modules = data.modules || [];
  const lessons = data.lessons || [];
  const quizzes = data.quizzes || [];
  const resources = data.resources || [];
  const pct = Math.round(Number(progress?.percentage || 0));

  const orderedLessons = modules.flatMap(module => lessons.filter(lesson => String(lesson.topic_id) === String(api.idOf(module))));

  const openLessonAt = (lesson) => {
    if (!openLesson) return;
    const lessonId = api.idOf(lesson);
    const index = orderedLessons.findIndex(x => String(api.idOf(x)) === String(lessonId));
    openLesson(
      lessonId,
      courseId,
      index > 0 ? api.idOf(orderedLessons[index - 1]) : '',
      index < orderedLessons.length - 1 ? api.idOf(orderedLessons[index + 1]) : ''
    );
  };

  const complete = async lesson => {
    try {
      await api.completeLesson(api.idOf(lesson));
      const refreshed = await api.courseOverview(courseId);
      setData(refreshed);
      setProgress(refreshed.progress || null);
      setCompleted(Array.isArray(refreshed.completed_lesson_ids) ? refreshed.completed_lesson_ids.map(String) : []);
    } catch (e) {
      Alert.alert('Progress', e.message);
    }
  };

  const firstIncomplete = orderedLessons.find(x => !completed.includes(String(api.idOf(x)))) || orderedLessons[0];

  const continueLearning = () => {
    if (!firstIncomplete) {
      setTab('curriculum');
      return;
    }
    openLessonAt(firstIncomplete);
  };

  const bookmark = async () => {
    try {
      if (bookmarked) return;
      await api.addBookmark({ item_type: 'course', item_id: courseId, title: course.name || course.title });
      setBookmarked(true);
    } catch (e) {
      Alert.alert('Bookmark', e.message);
    }
  };

  const certificate = async () => {
    try {
      const result = await api.issueCertificate(courseId);
      Alert.alert('Certificate ready', result.certificate_id);
    } catch (e) {
      Alert.alert('Certificate', e.message);
    }
  };

  const heroTitle = course.name || course.title || 'Course';
  const heroDescription = course.short_description || course.description || 'Learn through a structured curriculum with practical examples and assessments.';
  const visual = courseVisual(course);

  return (
    <AppShell>
      <Pressable onPress={onBack} style={{ marginBottom: 12 }}>
        <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '800', color: colors.primary }}>‹  Back to Courses</Text>
      </Pressable>

      {/* Course hero — same visual language as the supplied course/quiz design */}
      <Card style={{ backgroundColor: '#32217B', borderColor: '#32217B', padding: mobile ? 16 : 22, overflow: 'hidden' }}>
        <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 20 }}>
          <View style={{ width: mobile ? '100%' : 136, height: mobile ? 170 : 136, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 58 }}>{visual.icon}</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '900', color: '#5B42D9', marginTop: 3 }}>{visual.label}</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 8, color: '#7A7D96', marginTop: 2 }}>{visual.note}</Text>
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <Badge tone="green">{course.level || 'Beginner'}</Badge>
              <Badge tone="purple">{course.category || 'General'}</Badge>
              <Badge tone="pink">{course.is_free === false ? 'PAID' : 'FREE'}</Badge>
            </View>
            <Text style={{ fontFamily: colors.fontFamily, color: '#D6D0FF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 10 }}>COURSE</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: mobile ? 24 : 28, fontWeight: '900', marginTop: 4 }}>{heroTitle}</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: '#E4E2F4', fontSize: 12, lineHeight: 20, marginTop: 6 }}>{heroDescription}</Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginTop: 12 }}>
              <Text style={{ fontFamily: colors.fontFamily, color: colors.gold, fontSize: 15, fontWeight: '900' }}>★★★★★</Text>
              <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 11, fontWeight: '800' }}>4.7</Text>
              <Text style={{ fontFamily: colors.fontFamily, color: '#C8C7DC', fontSize: 11 }}>{course.enrollment_count || course.enrolled_count || 0} Enrolled</Text>
            </View>

            <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 10, marginTop: 16 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,.10)', borderRadius: 12, padding: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
                  <Text style={{ fontFamily: colors.fontFamily, color: '#D2D1E5', fontSize: 10 }}>Your Progress</Text>
                  <Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 10, fontWeight: '900' }}>{pct}% Complete</Text>
                </View>
                <ProgressBar value={pct} color="#7B5CFF" />
              </View>
              <Button title={pct > 0 ? '▶  Continue Learning' : '▶  Start Learning'} onPress={continueLearning} style={{ minWidth: 190 }} />
            </View>
          </View>

          {!mobile && (
            <Pressable onPress={bookmark} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#fff' }}>{bookmarked ? '🔖' : '♧'}</Text>
            </Pressable>
          )}
        </View>
      </Card>

      <View style={{ flexDirection: mobile ? 'column' : 'row', alignItems: 'flex-start', gap: 14, marginTop: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
      {/* Course navigation */}
      <Card style={{ padding: 0, overflow: 'hidden', borderRadius: 13 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 7 }}>
          {tabs.map(([key, icon, label]) => (
            <Pressable key={key} onPress={() => setTab(key)} style={{ paddingHorizontal: 15, paddingVertical: 14, borderBottomWidth: 3, borderBottomColor: tab === key ? colors.primary : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <Text style={{ fontSize: 14, color: tab === key ? colors.primary : colors.muted }}>{icon}</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: tab === key ? colors.primary : colors.muted }}>{label}</Text>
              {key === 'tests' && quizzes.length > 0 && <Badge tone="purple">{quizzes.length}</Badge>}
            </Pressable>
          ))}
        </ScrollView>
      </Card>

      {tab === 'overview' && (
        <>
          <Card>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 17, fontWeight: '900', color: colors.navy }}>About this course</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: colors.text, fontSize: 12, lineHeight: 21, marginTop: 7 }}>{course.description || heroDescription}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 15 }}>
              <Stat icon="▤" value={lessons.length} label="Lessons" />
              <Stat icon="✦" value={modules.length} label="Topics" />
              <Stat icon="◎" value={quizzes.length} label="Quizzes" />
              <Stat icon="▧" value={resources.length || course.pdf_count || 0} label="Resources" />
            </View>
          </Card>

          {Array.isArray(course.learning_objectives) && course.learning_objectives.length > 0 && (
            <Card>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 17, fontWeight: '900', color: colors.navy }}>What you'll learn</Text>
              {course.learning_objectives.map((item, index) => (
                <Text key={index} style={{ fontFamily: colors.fontFamily, fontSize: 12, color: colors.text, marginTop: 9 }}>✓  {item}</Text>
              ))}
            </Card>
          )}

          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: colors.fontFamily, fontSize: 17, fontWeight: '900', color: colors.navy }}>Course Content</Text>
                <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: colors.muted, marginTop: 3 }}>Start with the first lesson and move through the course in order.</Text>
              </View>
              <Button title="Lessons" variant="secondary" onPress={() => setTab('curriculum')} />
            </View>
          </Card>
        </>
      )}

      {tab === 'curriculum' && (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 18, fontWeight: '900', color: colors.navy }}>Course Content</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: colors.muted, marginTop: 3 }}>{modules.length} topics · {lessons.length} lessons</Text>
            </View>
            <Badge tone="purple">{pct}% Complete</Badge>
          </View>

          {modules.length === 0 ? (
            <Empty title="Curriculum is not published yet" message="Published lessons will appear here." />
          ) : modules.map((module, moduleIndex) => {
            const moduleId = api.idOf(module);
            const moduleLessons = lessons.filter(lesson => String(lesson.topic_id) === String(moduleId));
            const doneCount = moduleLessons.filter(lesson => completed.includes(String(api.idOf(lesson)))).length;
            const isOpen = !!expanded[moduleIndex];
            return (
              <View key={moduleId} style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 13, marginTop: 12, overflow: 'hidden' }}>
                <Pressable onPress={() => setExpanded(prev => ({ ...prev, [moduleIndex]: !isOpen }))} style={{ padding: 13, backgroundColor: '#FAF9FF', flexDirection: 'row', alignItems: 'center', gap: 9 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: colors.primary }}>{moduleIndex + 1}</Text>
                  </View>
                  <Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '900', color: colors.navy, flex: 1 }}>{module.name || module.title}</Text>
                  <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted }}>{doneCount}/{moduleLessons.length}</Text>
                  <Text style={{ color: colors.primary, fontSize: 16 }}>{isOpen ? '⌃' : '⌄'}</Text>
                </Pressable>
                {isOpen && moduleLessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    key={api.idOf(lesson)}
                    lesson={lesson}
                    index={lessonIndex}
                    topicIndex={moduleIndex + 1}
                    done={completed.includes(String(api.idOf(lesson)))}
                    onOpen={() => openLessonAt(lesson)}
                  />
                ))}
              </View>
            );
          })}
        </Card>
      )}

      {tab === 'tests' && (
        <Card>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 18, fontWeight: '900', color: colors.navy }}>Quiz & Assessments</Text>
          {quizzes.length === 0 ? <Empty title="No tests published" message="Course quizzes will appear here when published." /> : quizzes.map(quiz => (
            <View key={api.idOf(quiz)} style={{ padding: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 13, marginTop: 10, flexDirection: mobile ? 'column' : 'row', alignItems: mobile ? 'stretch' : 'center', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 13, backgroundColor: colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 20, color: colors.primary }}>◎</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: colors.navy }}>{quiz.title || quiz.name}</Text>
                <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>{(quiz.question_ids || []).length} questions · {quiz.duration_minutes || 15} min · Pass {quiz.passing_percentage || 60}%</Text>
              </View>
              <Button title="Start Quiz" onPress={() => openQuiz && openQuiz(api.idOf(quiz))} />
            </View>
          ))}
        </Card>
      )}

      {tab === 'resources' && (
        <Card>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 18, fontWeight: '900', color: colors.navy }}>Resources</Text>
          {resources.length === 0 ? <Empty title="No resources added" message="PDFs, videos, audio and documents attached by the admin will appear here." /> : resources.map(resource => (
            <View key={api.idOf(resource)} style={{ padding: 13, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: colors.navy }}>{resource.title || resource.name}</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 3 }}>{resource.resource_type || resource.type || 'Resource'}</Text>
            </View>
          ))}
        </Card>
      )}

      {tab === 'reviews' && (
        <Card>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 18, fontWeight: '900', color: colors.navy }}>Discussions & Reviews</Text>
          {reviews.length === 0 ? <Empty title="No reviews yet" message="Be the first learner to review this course." /> : reviews.map(review => (
            <View key={api.idOf(review)} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: colors.navy }}>{review.user_name || 'Learner'} · {review.rating} ★</Text>
              <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, marginTop: 5 }}>{review.review}</Text>
            </View>
          ))}
        </Card>
      )}

      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 10, justifyContent: 'space-between', alignItems: mobile ? 'stretch' : 'center' }}>
        <Button title={bookmarked ? '🔖 Saved' : '🔖 Save Course'} variant="secondary" onPress={bookmark} />
        {pct >= 100 && <Button title="🎓 Get Certificate" variant="success" onPress={certificate} />}
      </View>
        </View>
        {!mobile && <CourseDetailsPanel course={course} modules={modules} lessons={lessons} quizzes={quizzes} resources={resources} pct={pct} onContinue={continueLearning} />}
      </View>
    </AppShell>
  );
}
