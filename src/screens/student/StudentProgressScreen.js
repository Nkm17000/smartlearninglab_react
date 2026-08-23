import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, Empty, ErrorState, Header, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const ff = colors.fontFamily;

function Stat({ icon, label, value, tone = colors.purpleSoft, accent = colors.primary }) {
  return (
    <Card style={{ flex: 1, minWidth: 145, padding: 15 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 20 }}>{icon}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, fontWeight: '800' }}>{label}</Text>
          <Text style={{ fontFamily: ff, color: colors.navy, fontSize: 19, fontWeight: '900', marginTop: 2 }}>{value}</Text>
        </View>
      </View>
    </Card>
  );
}

function Day({ day, date, status, tasks, today }) {
  return (
    <View style={{ flex: 1, minWidth: 72, borderWidth: 1, borderColor: today ? '#D6D0FF' : colors.border, backgroundColor: today ? '#F4F1FF' : '#fff', borderRadius: 13, paddingVertical: 11, alignItems: 'center' }}>
      <Text style={{ fontFamily: ff, fontSize: 10, color: colors.muted, fontWeight: '800' }}>{day}</Text>
      <Text style={{ fontFamily: ff, fontSize: 17, color: colors.navy, fontWeight: '900', marginTop: 5 }}>{date}</Text>
      <View style={{ width: 20, height: 20, borderRadius: 10, marginTop: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: status === 'done' ? colors.greenSoft : status === 'today' ? colors.purpleSoft : '#fff', borderWidth: status === 'todo' ? 1 : 0, borderColor: colors.border }}>
        <Text style={{ fontSize: 11, color: status === 'done' ? colors.success : colors.primary }}>{status === 'done' ? '✓' : status === 'today' ? '•' : '○'}</Text>
      </View>
      <Text style={{ fontFamily: ff, fontSize: 9, color: colors.muted, marginTop: 5 }}>{status === 'done' ? 'Done' : status === 'today' ? 'Today' : `${tasks} task${tasks === 1 ? '' : 's'}`}</Text>
    </View>
  );
}

function Recommendation({ icon, title, description, meta, badge, action, onPress, progress = 0, tone = colors.purpleSoft }) {
  return (
    <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, marginTop: 9, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', gap: 11 }}>
      <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1, minWidth: 170 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <Text style={{ fontFamily: ff, color: colors.navy, fontSize: 13, fontWeight: '900' }}>{title}</Text>
          {badge && <Badge tone={badge === 'Weak Area' ? 'purple' : badge === 'Review' ? 'orange' : 'green'}>{badge}</Badge>}
        </View>
        <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>{description}</Text>
        <Text style={{ fontFamily: ff, color: colors.subtle, fontSize: 9, marginTop: 5 }}>{meta}</Text>
      </View>
      <View style={{ width: 150, maxWidth: '25%', minWidth: 90, marginHorizontal: 6 }}>
        <View style={{ height: 6, borderRadius: 6, backgroundColor: '#E9EAF2', overflow: 'hidden' }}><View style={{ height: 6, width: `${Math.max(0, Math.min(100, progress))}%`, backgroundColor: colors.primary, borderRadius: 6 }} /></View>
        <Text style={{ textAlign: 'right', marginTop: 3, fontFamily: ff, fontSize: 9, color: colors.muted }}>{progress}%</Text>
      </View>
      <Button title={action} onPress={onPress} style={{ minWidth: 105 }} />
    </View>
  );
}

export default function StudentProgressScreen({ openCourse, openQuiz, openRoute }) {
  const { width } = useWindowDimensions();
  const mobile = width < 850;
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState([]);
  const [results, setResults] = useState([]);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true); setError('');
      // Load each section independently. A temporary failure in one analytics
      // endpoint must not blank the entire My Learning page.
      const summary = await api.learningSummary();
      setCourses(api.listOf(summary?.courses));
      setProgress(api.listOf(summary?.progress));
      setResults(api.listOf(summary?.results));
      setPlan(summary?.plan || {});
    } catch (e) {
      setError(e?.message || 'Unable to load My Learning.');
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  // IMPORTANT: keep every hook before any conditional return.  The previous
  // version called useMemo only after the loading/error returns, which caused
  // React's "Rendered more hooks than during the previous render" crash when
  // the API response arrived.
  const dates = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, []);

  if (loading) return <AppShell><Header eyebrow="For you" title="Your Learning Plan" subtitle="Personalized recommendations to help you learn smarter and achieve your goals." /><Loading label="Loading your learning plan…" /></AppShell>;
  if (error) return <AppShell><Header eyebrow="For you" title="Your Learning Plan" subtitle="Personalized recommendations to help you learn smarter and achieve your goals." /><ErrorState title="My Learning could not load" message={error} onRetry={load} /></AppShell>;

  const completedLessons = progress.filter(p => p.completed).length;
  const totalLessons = courses.reduce((n, c) => n + Number(c.lesson_count || c.lessons_count || 0), 0);
  const completedCourses = courses.filter(c => Number(c.progress_percentage || 0) >= 100).length;
  const quizCount = results.length;
  const quizPassed = results.filter(r => Boolean((r.result || r).passed)).length;
  const flashcards = Number(plan?.flashcards_reviewed || 0);
  const xp = Number(plan?.xp || 0);
  const streak = Number(plan?.streak_days || 0);
  const overall = totalLessons ? Math.round(completedLessons * 100 / totalLessons) : Number(plan?.overall_progress || 0);
  const dailyGoal = Number(plan?.daily_goal_minutes || 20);
  const completedMinutes = Number(plan?.today_minutes || 0);
  const goalPct = Math.min(100, Math.round(completedMinutes * 100 / Math.max(1, dailyGoal)));

  const dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const weak = (plan?.weak_areas || []).slice(0, 4);
  const next = (plan?.next_steps || []).slice(0, 3);

  const firstCourse = courses.find(c => Number(c.progress_percentage || 0) < 100) || courses[0];
  const firstCourseId = firstCourse && api.idOf(firstCourse);

  const openRecommended = (item) => {
    if (item?.type === 'quiz' && item.quiz_id && openQuiz) return openQuiz(item.quiz_id);
    if (item?.course_id && openCourse) return openCourse(item.course_id);
    if (firstCourseId && openCourse) return openCourse(firstCourseId);
  };

  return (
    <AppShell>
      <Header
        eyebrow="For you"
        title="Your Learning Plan"
        subtitle="Personalized recommendations to help you learn smarter and achieve your goals."
        right={<Button title="⚙ Customize Plan" variant="secondary" onPress={() => {}} />}
      />

      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14 }}>
        <Card style={{ flex: 1.35, minHeight: 190, backgroundColor: colors.hero, borderColor: colors.hero, overflow: 'hidden', position: 'relative' }}>
          <View style={{ maxWidth: '75%' }}>
            <Text style={{ color: '#fff', fontFamily: ff, fontSize: 18, fontWeight: '900' }}>🎯 Today's Goal</Text>
            <Text style={{ color: '#fff', fontFamily: ff, fontSize: 16, fontWeight: '900', marginTop: 16 }}>{dailyGoal} minutes of focused learning</Text>
            <View style={{ marginTop: 13, height: 9, borderRadius: 8, backgroundColor: '#34385F', overflow: 'hidden' }}><View style={{ width: `${goalPct}%`, height: 9, backgroundColor: colors.purple, borderRadius: 8 }} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 }}><Text style={{ color: '#E9EAF3', fontFamily: ff, fontSize: 10 }}>{completedMinutes} min completed</Text><Text style={{ color: '#fff', fontFamily: ff, fontSize: 10, fontWeight: '900' }}>{goalPct}%</Text></View>
            <Button title="◉ Continue Learning" onPress={() => firstCourseId && openCourse && openCourse(firstCourseId)} style={{ marginTop: 14, alignSelf: 'flex-start' }} />
          </View>
          <Text style={{ position: 'absolute', right: 24, bottom: 22, fontSize: 62 }}>🎯</Text>
        </Card>

        <Card style={{ flex: 0.8, minHeight: 190 }}>
          <Text style={{ fontFamily: ff, color: colors.navy, fontWeight: '900', fontSize: 15 }}>📈 Overall Progress</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 15, gap: 18 }}>
            <View style={{ width: 105, height: 105, borderRadius: 53, borderWidth: 11, borderColor: '#F0EEFF', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ position: 'absolute', width: 105, height: 105, borderRadius: 53, borderWidth: 11, borderColor: colors.primary, borderRightColor: '#F0EEFF', borderBottomColor: '#F0EEFF', transform: [{ rotate: `${Math.min(180, overall * 1.8)}deg` }] }} />
              <Text style={{ fontFamily: ff, color: colors.navy, fontSize: 20, fontWeight: '900' }}>{overall}%</Text>
            </View>
            <View style={{ flex: 1, gap: 7 }}>
              <Text style={{ fontFamily: ff, fontSize: 10, color: colors.muted }}>Courses Completed <Text style={{ color: colors.navy, fontWeight: '900' }}>{completedCourses} / {courses.length}</Text></Text>
              <Text style={{ fontFamily: ff, fontSize: 10, color: colors.muted }}>Quizzes Completed <Text style={{ color: colors.navy, fontWeight: '900' }}>{quizPassed} / {quizCount}</Text></Text>
              <Text style={{ fontFamily: ff, fontSize: 10, color: colors.muted }}>Flashcards Reviewed <Text style={{ color: colors.navy, fontWeight: '900' }}>{flashcards}</Text></Text>
            </View>
          </View>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 7 }}>Keep it up! You're doing great.</Text>
        </Card>

        <Card style={{ flex: 0.75, minHeight: 190 }}>
          <Text style={{ fontFamily: ff, color: colors.navy, fontWeight: '900', fontSize: 15 }}>🗓 Plan Summary</Text>
          {[['📅','Weekly Goal',`${plan?.weekly_goal_lessons || 5} lessons`],['🔥','Days Active',`${Math.min(7, streak || 0)} / 7`],['🔥','Current Streak',`${streak} days`],['⭐','XP Earned',xp]].map(([i,l,v]) =>
            <View key={l} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F2F3F8' }}>
              <Text style={{ fontSize: 14 }}>{i}</Text><Text style={{ flex: 1, fontFamily: ff, color: colors.muted, fontSize: 10 }}>{l}</Text><Text style={{ fontFamily: ff, color: colors.navy, fontWeight: '900', fontSize: 10 }}>{v}</Text>
            </View>
          )}
        </Card>
      </View>

      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14, marginTop: 14 }}>
        <Card style={{ flex: 1.1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 16, fontWeight: '900' }}>🗓 This Week's Plan</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, marginTop: 3 }}>Your personalized weekly learning rhythm</Text></View>
            <Button title="View Calendar" variant="secondary" onPress={() => {}} />
          </View>
          <View style={{ flexDirection: 'row', gap: 7, marginTop: 14 }}>
            {dates.map((d, i) => {
              const today = new Date().toDateString() === d.toDateString();
              const past = d < new Date() && !today;
              return <Day key={i} day={dayNames[i]} date={d.getDate()} status={past ? 'done' : today ? 'today' : 'todo'} tasks={i % 3 === 0 ? 2 : 1} today={today} />;
            })}
          </View>
          <View style={{ marginTop: 12, padding: 11, borderRadius: 12, backgroundColor: '#F5F1FF', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text>◷</Text><Text style={{ flex: 1, fontFamily: ff, color: colors.navy, fontWeight: '800', fontSize: 10 }}>2 tasks pending for today</Text><Button title="Start Now" variant="secondary" onPress={() => firstCourseId && openCourse && openCourse(firstCourseId)} />
          </View>
        </Card>

        <Card style={{ flex: 0.75 }}>
          <Text style={{ fontFamily: ff, color: colors.navy, fontSize: 16, fontWeight: '900' }}>↗ Weak Areas</Text>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>Focus more on these topics</Text>
          {weak.length ? weak.map((w, i) => <View key={i} style={{ marginTop: 9, padding: 10, borderRadius: 11, backgroundColor: '#FFF5F6' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 10, fontWeight: '800' }}>{w.topic || `Quiz ${w.quiz_id}`}</Text><Text style={{ fontFamily: ff, color: colors.danger, fontSize: 9, fontWeight: '900' }}>{w.score}%</Text></View>
            <View style={{ height: 5, backgroundColor: '#F7DDE3', borderRadius: 6, marginTop: 6 }}><View style={{ height: 5, width: `${Math.max(5, Math.min(100, w.score || 0))}%`, backgroundColor: colors.danger, borderRadius: 6 }} /></View>
          </View>) : <Text style={{ color: colors.muted, fontSize: 11, marginTop: 14 }}>Complete a quiz to discover your weak areas.</Text>}
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, marginTop: 10 }}>Review these topics to improve your performance.</Text>
        </Card>
      </View>

      <Card style={{ marginTop: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 17, fontWeight: '900' }}>⌘ Recommended Next Steps</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>Based on your progress and performance</Text></View>
          <Button title="View Full Roadmap →" variant="secondary" onPress={() => {}} />
        </View>
        {next.length ? next.map((n, i) => <Recommendation key={i} icon={n.type === 'quiz' ? '📝' : i === 2 ? '🗂' : '📖'} title={n.title || 'Recommended lesson'} description={n.description || 'Strengthen your understanding with this learning activity.'} meta={`${n.type === 'quiz' ? 'Quiz' : 'Lesson'}  •  ${n.duration_minutes || 25} min  •  ${n.level || 'Beginner'}`} badge={n.badge || (i === 0 ? 'Weak Area' : i === 1 ? 'Recommended' : 'Review')} action={n.type === 'quiz' ? 'Start Quiz' : i === 2 ? 'Review Cards' : 'Open Lesson'} progress={Number(n.progress_percentage || 0)} onPress={() => openRecommended(n)} tone={i === 1 ? colors.greenSoft : i === 2 ? colors.orangeSoft : colors.purpleSoft} />) : <Text style={{ color: colors.muted, marginTop: 14 }}>Complete a few lessons or quizzes and your recommendations will appear here.</Text>}
      </Card>

      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14, marginTop: 14 }}>
        <Card style={{ flex: 1.1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 16, fontWeight: '900' }}>🏆 Recent Achievements</Text><Text style={{ color: colors.primary, fontFamily: ff, fontSize: 10, fontWeight: '900' }}>See all</Text></View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 12 }}>
            {(plan?.achievements || [{icon:'⭐',title:'Consistent Learner',subtitle:`${streak} day streak`},{icon:'🏆',title:'Quiz Master',subtitle:`${quizPassed} quizzes passed`},{icon:'⚡',title:'Quick Learner',subtitle:`${completedLessons} lessons`},{icon:'🃏',title:'Flashcard Pro',subtitle:`${flashcards} cards reviewed`}]).slice(0,4).map((a,i)=><View key={i} style={{ flex:1, minWidth:120, padding:12, borderRadius:12, backgroundColor:'#FBFBFE', borderWidth:1, borderColor:colors.border, alignItems:'center' }}><Text style={{ fontSize:31 }}>{a.icon}</Text><Text style={{ fontFamily: ff, color: colors.navy, fontWeight:'900', fontSize:10, marginTop:7, textAlign:'center' }}>{a.title}</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize:9, marginTop:4, textAlign:'center' }}>{a.subtitle}</Text></View>)}
          </View>
        </Card>
        <Card style={{ flex: 0.8 }}>
          <View style={{ flexDirection:'row', justifyContent:'space-between' }}><Text style={{ fontFamily:ff, color:colors.navy, fontSize:16, fontWeight:'900' }}>📊 Study Insights</Text><Badge tone="blue">This week</Badge></View>
          {[['◷','Total Study Time',`${plan?.study_hours || '0h 0m'}`],['▤','Lessons Completed',completedLessons],['🔗','Quizzes Taken',quizCount],['✓','Accuracy',`${plan?.accuracy || 0}%`]].map(([i,l,v])=><View key={l} style={{flexDirection:'row',alignItems:'center',paddingVertical:11,borderBottomWidth:1,borderBottomColor:'#F7F7FB'}}><Text style={{width:28,fontSize:14}}>{i}</Text><Text style={{flex:1,fontFamily:ff,color:colors.muted,fontSize:10}}>{l}</Text><Text style={{fontFamily:ff,color:colors.navy,fontWeight:'900',fontSize:10}}>{v}</Text></View>)}
          <Text style={{ fontFamily:ff, color:colors.muted,fontSize:9,marginTop:9 }}>Keep learning consistently to reach your goals. 🚀</Text>
        </Card>
      </View>

      <Card style={{ marginTop: 14, backgroundColor: '#F0EEFF', borderColor: '#DDD9FF', flexDirection: 'row', alignItems: 'center', gap: 13 }}>
        <View style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 28 }}>🤖</Text></View>
        <View style={{ flex: 1 }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 15, fontWeight: '900' }}>Need help with your plan?</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>Your AI Tutor can personalize your plan further and suggest the best resources.</Text></View>
        <Button title="Ask AI Tutor" onPress={() => openRoute && openRoute('ai')} />
      </Card>
    </AppShell>
  );
}
