import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  AppShell,
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  Header,
  Loading,
  ProgressBar,
} from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const abs = (url) =>
  url?.startsWith('http')
    ? url
    : `${api.BASE_URL.replace('/api/v1', '')}${url || ''}`;

const icons = {
  pdf: '📄',
  video: '🎥',
  audio: '🎧',
  document: '📑',
  image: '🖼️',
  link: '🔗',
  other: '📎',
};

function cleanSourceText(value) {
  return String(value || '')
    .replace(/\u0000/g, '')
    .replace(/\u0007/g, '')
    .replace(/\u007f/g, '•')
    .replace(/\u00a0/g, ' ')
    .replace(/\r/g, '');
}

function FallbackPdfBlocks({ content }) {
  const lines = cleanSourceText(content).split('\n');
  const blocks=[]; let paragraph=[];
  const flush=()=>{if(paragraph.length){const t=paragraph.join(' ').trim();if(t)blocks.push({type:'paragraph',text:t});paragraph=[];}};
  for(const raw of lines){
    const line=raw.trim();
    if(!line){flush();continue;}
    if(/^\s*(?:•|●|▪|◦|-|\*)\s+/.test(line)){flush();blocks.push({type:'bullets',items:[line.replace(/^\s*(?:•|●|▪|◦|-|\*)\s+/,'')]});continue;}
    if(/^(?:Example|Exam Tip|Note|Warning|Important)\s*:/i.test(line)){flush();const [label,...rest]=line.split(':');blocks.push({type:'callout',label,text:rest.join(':').trim()});continue;}
    paragraph.push(line);
  }
  flush(); return blocks;
}

function PdfContent({ content, contentBlocks }) {
  const blocks = Array.isArray(contentBlocks) && contentBlocks.length
    ? contentBlocks
    : FallbackPdfBlocks({ content });

  return <View style={{ marginTop: 6 }}>
    {blocks.map((block,index)=>{
      const type=block?.type;
      if(type==='subheading'||type==='heading') return <Text key={index} style={{fontSize:20,lineHeight:28,fontWeight:'800',color:'#29417E',marginTop:index?20:6,marginBottom:8}}>{block.text}</Text>;
      if(type==='bullets'||type==='numbered') return <View key={index} style={{marginBottom:10}}>{(block.items||[]).map((item,i)=><View key={i} style={{flexDirection:'row',alignItems:'flex-start',marginBottom:7,paddingLeft:4}}><Text style={{fontSize:16,lineHeight:25,marginRight:10,color:'#111827',fontWeight:type==='numbered'?'700':'400'}}>{type==='numbered'?`${i+1}.`:'•'}</Text><Text selectable style={{flex:1,fontSize:16,lineHeight:25,color:'#111827'}}>{item}</Text></View>)}</View>;
      if(type==='code') return <View key={index} style={{backgroundColor:'#101828',borderRadius:7,padding:14,marginTop:8,marginBottom:12}}><Text selectable style={{color:'#F8FAFC',fontFamily:Platform.OS==='ios'?'Menlo':'monospace',fontSize:13,lineHeight:21}}>{block.text}</Text></View>;
      if(type==='callout') return <View key={index} style={{backgroundColor:'#F5F8FF',borderWidth:1,borderColor:'#D7E0F8',borderRadius:7,padding:12,marginTop:7,marginBottom:7}}><Text style={{fontSize:15.5,lineHeight:24,color:'#111827'}}><Text style={{fontWeight:'900'}}>{block.label ? `${block.label}: ` : ''}</Text>{block.text}</Text></View>;
      return <Text key={index} selectable style={{fontSize:16,lineHeight:27,color:'#111827',marginBottom:10}}>{block.text||''}</Text>;
    })}
  </View>;
}

export default function StudentLessonScreen({
  lessonId,
  courseId,
  onBack,
  onOpenLesson,
}) {
  const [lesson, setLesson] = useState(null);
  const [courseData, setCourseData] = useState(null);
  const [progress, setProgress] = useState(null);
  const [note, setNote] = useState('');
  const [savedNote, setSavedNote] = useState(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [showOutline, setShowOutline] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setError('');
      const [lessonData, progressData, notes, overview] = await Promise.all([
        api.studentLesson(lessonId),
        api.courseProgress(courseId),
        api.notes(),
        api.courseOverview(courseId),
      ]);

      setLesson(lessonData);
      setProgress(progressData);
      setCourseData(overview);

      const existing = api
        .listOf(notes)
        .find((item) => String(item.lesson_id || '') === String(lessonId));

      setSavedNote(existing || null);
      setNote(existing?.content || existing?.note || '');
    } catch (e) {
      setError(e?.message || 'Unable to load this lesson.');
    }
  };

  useEffect(() => {
    load();
  }, [lessonId, courseId]);

  const orderedLessons = useMemo(() => {
    const modules = courseData?.modules || [];
    const allLessons = courseData?.lessons || [];

    return modules
      .slice()
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .flatMap((module) =>
        allLessons
          .filter(
            (item) => String(item.topic_id) === String(api.idOf(module))
          )
          .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      );
  }, [courseData]);

  const currentIndex = orderedLessons.findIndex(
    (item) => String(api.idOf(item)) === String(lessonId)
  );

  const previousLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < orderedLessons.length - 1
      ? orderedLessons[currentIndex + 1]
      : null;

  const goToLesson = (target) => {
    if (!target || busy || !onOpenLesson) return;
    onOpenLesson(api.idOf(target), courseId);
  };

  const complete = async () => {
    try {
      setBusy(true);
      await api.completeLesson(lessonId);

      if (nextLesson) {
        goToLesson(nextLesson);
        return;
      }

      await load();
      Alert.alert(
        'Course completed',
        'Congratulations! You completed the final lesson.'
      );
    } catch (e) {
      Alert.alert('Lesson', e?.message || 'Unable to mark the lesson complete.');
    } finally {
      setBusy(false);
    }
  };

  const saveNote = async () => {
    const text = String(note || '').trim();
    if (!text) {
      Alert.alert('My note', 'Please enter a note first.');
      return;
    }

    try {
      if (savedNote) {
        const updated = await api.updateNote(api.idOf(savedNote), {
          title: lesson?.title || 'Lesson note',
          content: text,
        });
        setSavedNote(updated);
      } else {
        const created = await api.addNote({
          title: lesson?.title || 'Lesson note',
          content: text,
          lesson_id: lessonId,
          course_id: courseId,
        });
        setSavedNote(created);
      }

      setNote(text);
      Alert.alert('Saved', 'Your note was saved for this lesson.');
    } catch (e) {
      Alert.alert('Note', e?.message || 'Unable to save your note.');
    }
  };

  const openSourcePdf = () => {
    if (!lesson?.source_pdf_url) return;
    const startPage = Number(lesson.source_page_start || 1);
    const url = `${abs(lesson.source_pdf_url)}#page=${startPage}`;
    Linking.openURL(url);
  };

  if (error) {
    return (
      <AppShell>
        <ErrorState title="Lesson could not load" message={error} onRetry={load} />
      </AppShell>
    );
  }

  if (!lesson) {
    return (
      <AppShell>
        <Loading label="Opening lesson…" />
      </AppShell>
    );
  }

  const resources = Array.isArray(lesson.resources) ? lesson.resources : [];
  const pct = Number(progress?.percentage || 0);
  const hasPrevious = Boolean(previousLesson);
  const hasNext = Boolean(nextLesson);
  const sourceStart = lesson.source_page_start;
  const sourceEnd = lesson.source_page_end;

  return (
    <AppShell>
      <Header
        eyebrow={`LESSON ${currentIndex >= 0 ? currentIndex + 1 : lesson.order || ''} OF ${orderedLessons.length || '—'}`}
        title={lesson.title || lesson.name}
        subtitle={
          sourceStart
            ? `Source pages ${sourceStart}${sourceEnd && sourceEnd !== sourceStart ? `–${sourceEnd}` : ''} from the uploaded PDF.`
            : 'Source content from the uploaded PDF.'
        }
        right={
          <Button title="← Course" variant="secondary" onPress={onBack} />
        }
      />

      {progress && (
        <Card style={{ padding: 15 }}>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 7,
            }}
          >
            <Text style={{ fontWeight: '900', color: colors.navy }}>
              Course progress
            </Text>
            <Text style={{ fontWeight: '900', color: colors.primary }}>
              {Math.round(pct)}%
            </Text>
          </View>
          <ProgressBar value={pct} />
          <Text style={{ fontSize: 12, color: colors.muted, marginTop: 6 }}>
            {progress.completed_lessons || 0} of {progress.total_lessons || 0} lessons completed
          </Text>
        </Card>
      )}

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 12,
          flexWrap: 'wrap',
        }}
      >
        <Button
          title="← Previous"
          variant="secondary"
          onPress={() => goToLesson(previousLesson)}
          disabled={!hasPrevious || busy}
        />

        <Button
          title={hasNext ? 'Next →' : '🎓 Course Complete'}
          variant={hasNext ? 'primary' : 'success'}
          onPress={() => goToLesson(nextLesson)}
          disabled={!hasNext || busy}
        />
      </View>

      {/* PDF-like paper */}
      <View
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          borderWidth: 1,
          borderColor: '#E5E7EB',
          paddingHorizontal: Platform.OS === 'web' ? 52 : 22,
          paddingVertical: Platform.OS === 'web' ? 42 : 24,
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 2,
        }}
      >
        <View style={{ borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingBottom: 18 }}>
          <Text
            style={{
              fontSize: 12,
              color: '#6B7280',
              fontWeight: '800',
              letterSpacing: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {lesson.content_source === 'pdf' ? 'PDF SOURCE' : 'COURSE LESSON'}
          </Text>
          <Text
            style={{
              fontSize: Platform.OS === 'web' ? 30 : 27,
              lineHeight: 38,
              fontWeight: '900',
              color: '#29417E',
              marginTop: 8,
            }}
          >
            {lesson.title || lesson.name}
          </Text>
        </View>

        {lesson.content_source === 'toc_only' ? (
          <View
            style={{
              marginTop: 22,
              padding: 15,
              borderWidth: 1,
              borderColor: '#FDBA74',
              backgroundColor: '#FFF7ED',
              borderRadius: 6,
            }}
          >
            <Text style={{ fontWeight: '900', color: '#9A3412' }}>
              Source content is not available in the uploaded PDF.
            </Text>
            <Text style={{ color: '#9A3412', lineHeight: 22, marginTop: 6 }}>
              This topic exists in the PDF contents, but its detailed chapter body was not found.
            </Text>
          </View>
        ) : (
          <PdfContent content={lesson.content} contentBlocks={lesson.content_blocks} />
        )}

        {lesson.source_pdf_url && (
          <View style={{ marginTop: 18 }}>
            <Button
              title={`📄 Open Original PDF${sourceStart ? ` · Page ${sourceStart}` : ''}`}
              variant="secondary"
              onPress={openSourcePdf}
            />
          </View>
        )}
      </View>

      {resources.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.navy, marginBottom: 10 }}>
            📚 Resources
          </Text>
          {resources.map((resource, index) => {
            const item = typeof resource === 'string'
              ? { title: resource, url: resource, type: 'link' }
              : resource;

            return (
              <Card key={index}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{icons[item.type] || '📎'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '900', color: colors.navy }}>
                      {item.title || `Resource ${index + 1}`}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.muted, marginTop: 3 }}>
                      {item.type || 'resource'}
                    </Text>
                  </View>
                  {item.url && (
                    <Button
                      title="Open"
                      variant="secondary"
                      onPress={() => Linking.openURL(abs(item.url))}
                    />
                  )}
                </View>
              </Card>
            );
          })}
        </View>
      )}

      <View style={{ marginTop: 2, marginBottom: 10 }}>
        <Button
          title={
            showOutline
              ? '✕ Hide Course Outline'
              : `📚 Course Outline${orderedLessons.length ? ` · ${orderedLessons.length} lessons` : ''}`
          }
          variant="secondary"
          onPress={() => setShowOutline(!showOutline)}
        />
      </View>

      {showOutline && (
        <Card style={{ borderColor: colors.primary, borderWidth: 1, padding: 8 }}>
          <Text style={{ fontWeight: '900', fontSize: 17, color: colors.navy, padding: 8 }}>
            Jump to a lesson
          </Text>
          <ScrollView style={{ maxHeight: 340 }}>
            {orderedLessons.map((item, index) => {
              const active = String(api.idOf(item)) === String(lessonId);
              return (
                <Pressable
                  key={api.idOf(item)}
                  onPress={() => !active && goToLesson(item)}
                  style={{
                    padding: 11,
                    borderRadius: 10,
                    backgroundColor: active ? colors.blueSoft : '#fff',
                    marginBottom: 4,
                  }}
                >
                  <Text
                    style={{
                      fontWeight: active ? '900' : '700',
                      color: active ? colors.primary : colors.navy,
                    }}
                  >
                    {index + 1}. {item.title || item.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Card>
      )}

      <View style={{ marginTop: 2, marginBottom: 10 }}>
        <Button
          title={noteOpen ? '✕ Close My Note' : savedNote ? '📝 My Note • Saved' : '📝 My Note'}
          variant="secondary"
          onPress={() => setNoteOpen(!noteOpen)}
        />
      </View>

      {noteOpen && (
        <Card style={{ borderColor: colors.primary, borderWidth: 1 }}>
          {savedNote && (
            <View
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: 13,
                marginBottom: 12,
              }}
            >
              <Text style={{ fontWeight: '900', color: colors.navy }}>
                Your saved note
              </Text>
              <Text style={{ color: colors.text, lineHeight: 22, marginTop: 6 }}>
                {savedNote.content || savedNote.note}
              </Text>
            </View>
          )}
          <Field
            label={savedNote ? 'Update note' : 'Add a note'}
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Write something you want to remember…"
          />
          <Button
            title={savedNote ? 'Update Note' : 'Save Note'}
            onPress={saveNote}
            disabled={!note.trim()}
          />
        </Card>
      )}

      <Card style={{ borderColor: colors.primary, marginBottom: 20 }}>
        <Text style={{ fontSize: 19, fontWeight: '900', color: colors.navy }}>
          {hasNext ? 'Ready to continue?' : '🎓 Final lesson'}
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          {hasNext
            ? `Next chapter: ${nextLesson.title || nextLesson.name}`
            : 'Complete this lesson to finish the course.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
          <Button
            title={busy ? 'Saving…' : '✓ Mark Complete'}
            onPress={complete}
            disabled={busy}
          />
          {hasPrevious && (
            <Button
              title="← Previous"
              variant="secondary"
              onPress={() => goToLesson(previousLesson)}
              disabled={busy}
            />
          )}
          {hasNext && (
            <Button
              title="Next →"
              variant="primary"
              onPress={() => goToLesson(nextLesson)}
              disabled={busy}
            />
          )}
          {!hasNext && (
            <Button title="🎓 Course Complete" variant="success" disabled />
          )}
        </View>
      </Card>
    </AppShell>
  );
}
