import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Platform, Pressable, ScrollView, Text, TextInput, View, useWindowDimensions} from 'react-native';
import {AppShell, Badge, Button, Card, Empty, ErrorState, Field, Header, Loading, ProgressBar, SectionTitle} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const ff = colors.fontFamily;

function StatCard({icon, label, value, tone = 'blue'}) {
  const bg = tone === 'green' ? colors.greenSoft : tone === 'pink' ? colors.pinkSoft : tone === 'orange' ? colors.orangeSoft : colors.blueSoft;
  return (
    <Card style={{flex: 1, minWidth: 145, padding: 14, marginBottom: 0}}>
      <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
        <View style={{width: 36, height: 36, borderRadius: 11, backgroundColor: bg, alignItems: 'center', justifyContent: 'center'}}>
          <Text style={{fontSize: 17}}>{icon}</Text>
        </View>
        <Text style={{fontFamily: ff, fontSize: 11, fontWeight: '900', color: colors.muted, flex: 1}}>{label}</Text>
      </View>
      <Text style={{fontFamily: ff, fontSize: 23, fontWeight: '900', color: colors.navy, marginTop: 10}}>{value}</Text>
    </Card>
  );
}

function ActionCard({icon, title, subtitle, onPress}) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => ({flex: 1, minWidth: 190, opacity: pressed ? 0.78 : 1})}>
      <Card style={{height: '100%', marginBottom: 0}}>
        <Text style={{fontSize: 24}}>{icon}</Text>
        <Text style={{fontFamily: ff, fontSize: 14, fontWeight: '900', color: colors.navy, marginTop: 8}}>{title}</Text>
        <Text style={{fontFamily: ff, fontSize: 11, color: colors.muted, lineHeight: 17, marginTop: 4}}>{subtitle}</Text>
      </Card>
    </Pressable>
  );
}

function SearchResult({item, type, onOpen}) {
  const title = item.name || item.title || 'Learning item';
  const subtitle = type === 'lesson'
    ? `${item.duration_minutes || 0} min lesson`
    : type === 'topic'
      ? (item.description || 'Course topic')
      : (item.short_description || item.category || item.level || 'Course');
  return (
    <Pressable onPress={onOpen} style={({pressed}) => ({padding: 12, borderBottomWidth: 1, borderBottomColor: '#F1F1F6', opacity: pressed ? 0.7 : 1})}>
      <View style={{flexDirection: 'row', gap: 10, alignItems: 'center'}}>
        <View style={{width: 34, height: 34, borderRadius: 10, backgroundColor: colors.blueSoft, alignItems: 'center', justifyContent: 'center'}}>
          <Text>{type === 'course' ? '📚' : type === 'topic' ? '🧩' : '📖'}</Text>
        </View>
        <View style={{flex: 1}}>
          <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy}} numberOfLines={2}>{title}</Text>
          <Text style={{fontFamily: ff, fontSize: 10, color: colors.muted, marginTop: 2}} numberOfLines={2}>{subtitle}</Text>
        </View>
        <Text style={{color: colors.primary, fontWeight: '900'}}>›</Text>
      </View>
    </Pressable>
  );
}

function TimerCard() {
  const [seconds, setSeconds] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return undefined;
    const timer = setInterval(() => {
      setSeconds(value => {
        if (value <= 1) {
          clearInterval(timer);
          setRunning(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');
  return (
    <Card>
      <SectionTitle title="Focus timer" subtitle="Study in one focused session." />
      <View style={{alignItems: 'center', paddingVertical: 6}}>
        <Text style={{fontFamily: ff, fontSize: 42, fontWeight: '900', color: colors.navy}}>{mins}:{secs}</Text>
        <View style={{flexDirection: 'row', gap: 8, marginTop: 10}}>
          <Button title={running ? 'Pause' : 'Start'} onPress={() => setRunning(x => !x)} />
          <Button title="Reset" variant="soft" onPress={() => {setRunning(false); setSeconds(25 * 60);}} />
        </View>
      </View>
    </Card>
  );
}

function ReadAloud({text}) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    setSupported(Platform.OS === 'web' && typeof window !== 'undefined' && !!window.speechSynthesis);
  }, []);
  if (!supported || !text) return null;
  const toggle = () => {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.slice(0, 5000));
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setSpeaking(true);
  };
  return <Button title={speaking ? 'Stop reading' : '🔊 Read aloud'} variant="soft" onPress={toggle} />;
}

export default function StudyAssistanceScreen({openCourse, openLesson, openRoute}) {
  const {width} = useWindowDimensions();
  const mobile = width < 760;
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [searchData, setSearchData] = useState(null);
  const [searching, setSearching] = useState(false);
  const [note, setNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [reviewing, setReviewing] = useState(null);
  const [readText, setReadText] = useState('');
  const inputRef = useRef(null);

  const load = async () => {
    setError('');
    try {
      setData(await api.studyAssistance());
    } catch (e) {
      if (e?.message === 'SESSION_EXPIRED') return;
      setError(e?.message || 'Study assistance could not load.');
    }
  };

  useEffect(() => { load(); }, []);

  const doSearch = async () => {
    const q = search.trim();
    if (!q) { setSearchData(null); return; }
    setSearching(true);
    try {
      setSearchData(await api.studySearch(q, mobile ? 6 : 8));
    } catch (e) {
      setSearchData({courses: [], topics: [], lessons: []});
    } finally {
      setSearching(false);
    }
  };

  const addQuickNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    try {
      await api.addNote({content: note.trim()});
      setNote('');
      await load();
    } finally {
      setSavingNote(false);
    }
  };

  const reviewCard = async (card, quality) => {
    setReviewing(card._id);
    try {
      await api.reviewFlashcard(api.idOf(card), {quality});
      await load();
    } finally {
      setReviewing(null);
    }
  };

  const openSearchItem = (type, item) => {
    if (type === 'course') openCourse(api.idOf(item));
    else if (type === 'lesson') openLesson(api.idOf(item), item.course_id);
    else if (item.course_id) openCourse(item.course_id);
  };

  const stats = data?.stats || {};
  const selectedReadText = readText || data?.continue_learning?.lesson_title || '';
  const searchEmpty = searchData && !searchData.courses?.length && !searchData.topics?.length && !searchData.lessons?.length;

  if (error) {
    return <AppShell><Header title="Study Assistance" subtitle="Study tools built from your learning data."/><ErrorState title="Study assistance could not load" message={error} onRetry={load}/></AppShell>;
  }
  if (!data) return <AppShell><Header title="Study Assistance" subtitle="No AI API required."/><Loading label="Preparing your study workspace…"/></AppShell>;

  return (
    <AppShell>
      <Header
        eyebrow="Student learning"
        title="Study Assistance"
        subtitle="Search, revise, practice and track your learning — without an AI API."
      />

      <Card style={{backgroundColor: colors.hero, borderColor: colors.hero, padding: mobile ? 16 : 22}}>
        <Badge tone="purple">ZERO AI API</Badge>
        <Text style={{fontFamily: ff, fontSize: mobile ? 23 : 30, lineHeight: mobile ? 30 : 38, fontWeight: '900', color: '#fff', marginTop: 10}}>Everything you need to study smarter.</Text>
        <Text style={{fontFamily: ff, fontSize: 12, lineHeight: 19, color: '#D6D8F2', marginTop: 5}}>Your courses, quizzes, results, flashcards, notes and bookmarks power this study workspace.</Text>
        <View style={{flexDirection: mobile ? 'column' : 'row', gap: 8, marginTop: 16}}>
          <TextInput
            ref={inputRef}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={doSearch}
            placeholder="Search courses, topics or lessons…"
            placeholderTextColor={colors.subtle}
            returnKeyType="search"
            style={{flex: 1, minHeight: 46, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 13, color: colors.text, fontFamily: ff}}
          />
          <Button title={searching ? 'Searching…' : 'Search'} onPress={doSearch} disabled={searching}/>
        </View>
      </Card>

      {searchData && (
        <Card style={{padding: 0, overflow: 'hidden'}}>
          <View style={{padding: 14, borderBottomWidth: 1, borderBottomColor: colors.border}}>
            <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy}}>Search results</Text>
          </View>
          {searchData.courses?.map(item => <SearchResult key={`c-${api.idOf(item)}`} item={item} type="course" onOpen={() => openSearchItem('course', item)}/>) }
          {searchData.topics?.map(item => <SearchResult key={`t-${api.idOf(item)}`} item={item} type="topic" onOpen={() => openSearchItem('topic', item)}/>) }
          {searchData.lessons?.map(item => <SearchResult key={`l-${api.idOf(item)}`} item={item} type="lesson" onOpen={() => openSearchItem('lesson', item)}/>) }
          {searchEmpty && <View style={{padding: 22}}><Text style={{fontFamily: ff, color: colors.muted}}>No matching course content found.</Text></View>}
        </Card>
      )}

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4}}>
        <StatCard icon="📚" label="Courses" value={stats.courses || 0}/>
        <StatCard icon="✓" label="Lessons done" value={stats.lessons_done || 0} tone="green"/>
        <StatCard icon="🎯" label="Quiz average" value={`${Number(stats.quiz_average || 0).toFixed(1)}%`} tone="pink"/>
        <StatCard icon="🃏" label="Cards due" value={stats.flashcards_due || 0} tone="orange"/>
      </View>

      <SectionTitle title="Today's study plan" subtitle="Short actions generated from your actual progress."/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        {(data.today_plan || []).map((item, index) => (
          <ActionCard
            key={`${item.type}-${index}`}
            icon={item.type === 'revision' ? '🃏' : item.type === 'practice' ? '🧪' : item.type === 'continue' ? '▶️' : '🎯'}
            title={item.title}
            subtitle={item.subtitle}
            onPress={() => {
              if (item.route === 'lesson' && item.lesson_id) openLesson(item.lesson_id, item.course_id);
              else if (item.route === 'flashcards') openRoute('flashcards');
              else if (item.route === 'mock-test') openRoute('mock-test');
              else if (item.route === 'study-mistakes') openRoute('study-mistakes');
            }}
          />
        ))}
      </View>

      <SectionTitle title="Continue learning" subtitle="Pick up exactly where you left off."/>
      {data.continue_learning ? (
        <Card>
          <View style={{flexDirection: mobile ? 'column' : 'row', gap: 14}}>
            <View style={{flex: 1}}>
              <Badge>{data.continue_learning.course_title}</Badge>
              <Text style={{fontFamily: ff, fontSize: 18, fontWeight: '900', color: colors.navy, marginTop: 9}}>{data.continue_learning.lesson_title}</Text>
              <Text style={{fontFamily: ff, fontSize: 11, color: colors.muted, marginTop: 4}}>Course progress: {data.continue_learning.progress_percentage}%</Text>
              <View style={{marginTop: 10}}><ProgressBar value={data.continue_learning.progress_percentage}/></View>
            </View>
            <View style={{justifyContent: 'center'}}>
              <Button title="Continue lesson" onPress={() => openLesson(data.continue_learning.lesson_id, data.continue_learning.course_id)}/>
            </View>
          </View>
        </Card>
      ) : <Empty title="You're caught up" message="Start a new course or practice session when you're ready."/>}

      <SectionTitle title="Revision center" subtitle={`${stats.flashcards_due || 0} flashcards are due right now.`} right={<Button title="Open flashcards" variant="soft" onPress={() => openRoute('flashcards')}/>}/>
      {data.due_flashcards?.length ? (
        <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
          {data.due_flashcards.slice(0, mobile ? 3 : 6).map(card => (
            <Card key={api.idOf(card)} style={{flex: 1, minWidth: mobile ? '100%' : 250}}>
              <Badge tone="orange">DUE</Badge>
              <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy, marginTop: 9}} numberOfLines={3}>{card.front}</Text>
              <Text style={{fontFamily: ff, color: colors.muted, fontSize: 11, marginTop: 7}} numberOfLines={4}>{card.back}</Text>
              <View style={{flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap'}}>
                {[1, 3, 5].map(q => <Button key={q} title={q === 1 ? 'Again' : q === 3 ? 'Good' : 'Easy'} variant={q === 1 ? 'danger' : 'soft'} disabled={reviewing === api.idOf(card)} onPress={() => reviewCard(card, q)}/>) }
              </View>
            </Card>
          ))}
        </View>
      ) : <Empty title="No flashcards due" message="Create or review flashcards to build long-term memory."/>}

      <SectionTitle title="Topics to improve" subtitle="Rule-based analysis from your quiz results."/>
      {data.weak_topics?.length ? (
        <Card>
          {data.weak_topics.map((topic, index) => (
            <View key={`${topic.topic}-${index}`} style={{marginBottom: index === data.weak_topics.length - 1 ? 0 : 14}}>
              <View style={{flexDirection: 'row', justifyContent: 'space-between', gap: 8}}>
                <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy, flex: 1}}>{topic.topic}</Text>
                <Text style={{fontFamily: ff, fontWeight: '900', color: topic.score < 50 ? colors.danger : colors.warning}}>{topic.score}%</Text>
              </View>
              <ProgressBar value={topic.score} color={topic.score < 50 ? colors.danger : colors.warning}/>
              <Text style={{fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 4}}>{topic.wrong} incorrect out of {topic.total} reviewed</Text>
            </View>
          ))}
        </Card>
      ) : <Empty title="No weak topics yet" message="Complete a quiz and we'll identify topics that need more practice."/>}

      <SectionTitle title="Review your mistakes" subtitle="Your recent incorrect answers, with the correct answer and explanation." right={<Button title="Practice" variant="soft" onPress={() => openRoute('mock-test')}/>}/>
      {data.mistakes?.length ? (
        <View style={{gap: 10}}>
          {data.mistakes.slice(0, 6).map((mistake, index) => (
            <Card key={`${mistake.question_id}-${index}`}>
              <Badge tone="red">NEEDS REVIEW</Badge>
              <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy, lineHeight: 20, marginTop: 8}}>{mistake.question}</Text>
              <Text style={{fontFamily: ff, fontSize: 11, color: colors.muted, marginTop: 7}}>Your answer: {mistake.submitted_text || 'Not answered'}</Text>
              <Text style={{fontFamily: ff, fontSize: 11, color: colors.success, fontWeight: '800', marginTop: 3}}>Correct: {mistake.correct_answer_text || 'See quiz review'}</Text>
              {mistake.explanation ? <Text style={{fontFamily: ff, fontSize: 11, color: colors.text, lineHeight: 17, marginTop: 7}}>{mistake.explanation}</Text> : null}
            </Card>
          ))}
        </View>
      ) : <Empty title="No recent mistakes" message="Great. Keep practicing to maintain your progress."/>}

      <SectionTitle title="My courses" subtitle="Your five most relevant enrolled courses." right={<Button title="View all courses" variant="soft" onPress={() => openRoute('courses')}/>}/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
        {(data.courses || []).map(course => (
          <Pressable key={course.course_id} onPress={() => openCourse(course.course_id)} style={{flex: 1, minWidth: mobile ? '100%' : 260}}>
            <Card style={{marginBottom: 0}}>
              <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy}} numberOfLines={2}>{course.name || course.title || 'Course'}</Text>
              <Text style={{fontFamily: ff, fontSize: 10, color: colors.muted, marginTop: 4}}>{course.completed_lessons}/{course.total_lessons} lessons</Text>
              <View style={{marginTop: 9}}><ProgressBar value={course.progress_percentage}/></View>
            </Card>
          </Pressable>
        ))}
      </View>

      <SectionTitle title="Saved study material" subtitle="Your notes and bookmarks are kept close to your study flow."/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 12}}>
        <Card style={{flex: 1, minWidth: mobile ? '100%' : 300}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy}}>📝 Recent notes</Text>
            <Button title="All notes" variant="soft" onPress={() => openRoute('notes')}/>
          </View>
          {data.notes?.length ? data.notes.slice(0, 4).map(noteItem => (
            <Text key={api.idOf(noteItem)} style={{fontFamily: ff, fontSize: 11, color: colors.text, lineHeight: 17, marginTop: 9}} numberOfLines={2}>• {noteItem.content}</Text>
          )) : <Text style={{fontFamily: ff, fontSize: 11, color: colors.muted, marginTop: 10}}>No personal notes yet.</Text>}
        </Card>
        <Card style={{flex: 1, minWidth: mobile ? '100%' : 300}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'}}>
            <Text style={{fontFamily: ff, fontWeight: '900', color: colors.navy}}>🔖 Bookmarks</Text>
            <Button title="All bookmarks" variant="soft" onPress={() => openRoute('bookmarks')}/>
          </View>
          {data.bookmarks?.length ? data.bookmarks.slice(0, 4).map(bookmark => (
            <Pressable key={api.idOf(bookmark)} onPress={() => bookmark.item_type === 'course' && bookmark.item_id ? openCourse(bookmark.item_id) : bookmark.item_id ? openLesson(bookmark.item_id) : openRoute('bookmarks')} style={{marginTop: 9}}>
              <Text style={{fontFamily: ff, fontSize: 11, fontWeight: '800', color: colors.primary}} numberOfLines={2}>• {bookmark.title || 'Saved learning item'}</Text>
            </Pressable>
          )) : <Text style={{fontFamily: ff, fontSize: 11, color: colors.muted, marginTop: 10}}>No bookmarks yet.</Text>}
        </Card>
      </View>

      <SectionTitle title="Quick study tools" subtitle="Open the existing learning features directly."/>
      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 10}}>
        <ActionCard icon="📝" title="My Notes" subtitle="Capture important points while you study." onPress={() => openRoute('notes')}/>
        <ActionCard icon="🔖" title="Bookmarks" subtitle="Return to saved lessons quickly." onPress={() => openRoute('bookmarks')}/>
        <ActionCard icon="🧪" title="Quick Practice" subtitle="Take a rule-based adaptive practice test." onPress={() => openRoute('mock-test')}/>
        <ActionCard icon="📊" title="My Performance" subtitle="See progress, scores and study activity." onPress={() => openRoute('analytics')}/>
      </View>

      <SectionTitle title="Quick note" subtitle="Save a personal study note without leaving this page."/>
      <Card>
        <Field value={note} onChangeText={setNote} placeholder="Write a formula, definition, reminder or example…" multiline/>
        <Button title={savingNote ? 'Saving…' : 'Save note'} onPress={addQuickNote} disabled={savingNote || !note.trim()}/>
      </Card>

      <SectionTitle title="Recent study history" subtitle="Your latest learning activity."/>
      {data.history?.length ? (
        <Card>
          {data.history.slice(0, 8).map((item, index) => (
            <View key={`${item.created_at}-${index}`} style={{flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: index === Math.min(7, data.history.length - 1) ? 0 : 1, borderBottomColor: '#F2F2F6'}}>
              <Text style={{fontSize: 17}}>{item.type === 'quiz' ? '🧪' : '📖'}</Text>
              <View style={{flex: 1}}>
                <Text style={{fontFamily: ff, fontWeight: '800', color: colors.navy}} numberOfLines={1}>{item.title || 'Study activity'}</Text>
                <Text style={{fontFamily: ff, fontSize: 10, color: colors.muted, marginTop: 2}}>{item.action || 'completed'}</Text>
              </View>
            </View>
          ))}
        </Card>
      ) : <Empty title="No study history yet" message="Your completed lessons and tests will appear here."/>}

      <SectionTitle title="Read aloud" subtitle="Use your device/browser's built-in speech support for selected study text."/>
      <Card>
        <Field value={readText} onChangeText={setReadText} placeholder="Paste or type study text here…" multiline/>
        <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
          <ReadAloud text={selectedReadText}/>
          {selectedReadText && <Button title="Use current lesson" variant="soft" onPress={() => setReadText(selectedReadText)}/>}
        </View>
        {Platform.OS !== 'web' && <Text style={{fontFamily: ff, fontSize: 10, color: colors.muted, marginTop: 8}}>Native speech can be added with the optional Expo Speech package; this version keeps dependencies unchanged.</Text>}
      </Card>

      <SectionTitle title="Study recommendations" subtitle="Simple rules based on your current learning state."/>
      <Card>
        {(data.recommendations || []).map((item, index) => (
          <View key={`${item}-${index}`} style={{flexDirection: 'row', gap: 9, marginBottom: index === (data.recommendations || []).length - 1 ? 0 : 9}}>
            <Text style={{fontFamily: ff, fontWeight: '900', color: colors.primary}}>✓</Text>
            <Text style={{fontFamily: ff, fontSize: 11, color: colors.text, lineHeight: 17, flex: 1}}>{item}</Text>
          </View>
        ))}
      </Card>

      <TimerCard />
    </AppShell>
  );
}
