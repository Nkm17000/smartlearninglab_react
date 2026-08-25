import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Text, View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {AppShell, Badge, Button, Card, DropdownSelect, Field, Header} from '../../components/UI';
import {TaxonomyPicker} from '../../components/TaxonomyPicker';
import {api} from '../../services/api';
import {colors} from '../../theme';

const SAMPLE_MULTI = [
  {
    title: 'English Grammar - Noun',
    subject: 'English',
    topic: 'Noun',
    description: '10-question practice test on Nouns',
    passing_percentage: 60,
    duration_minutes: 20,
    questions: [
      {
        question: 'Which of the following is a proper noun?',
        options: ['city', 'country', 'Delhi', 'river'],
        correct_answer: 2,
        explanation: 'Delhi is the specific name of a city, so it is a proper noun.'
      }
    ]
  },
  {
    title: 'English Grammar - Pronoun',
    subject: 'English',
    topic: 'Pronoun',
    description: '10-question practice test on Pronouns',
    passing_percentage: 60,
    duration_minutes: 20,
    questions: [
      {
        question: 'Choose the correct relative pronoun: The candidate ___ application was rejected appealed to the board.',
        options: ['who', 'whom', 'whose', 'which'],
        correct_answer: 2,
        explanation: 'Whose indicates possession.'
      }
    ]
  }
];

function asQuizList(value) {
  if (Array.isArray(value)) return value;
  if (value && Array.isArray(value.quizzes)) return value.quizzes;
  if (value && typeof value === 'object') return [value];
  return [];
}

function resolveCorrectAnswer(value, options) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const v = value.trim();
    if (/^[A-Za-z]$/.test(v)) return v.toUpperCase().charCodeAt(0) - 65;
    if (/^\d+$/.test(v)) return Number(v);
    return options.findIndex(x => String(x).trim() === v);
  }
  return NaN;
}

function validateQuizPayload(payload) {
  const quizzes = asQuizList(payload);
  if (!quizzes.length) throw new Error('Paste one quiz object, an array of quiz objects, or {"quizzes":[...]}.');
  if (quizzes.length > 500) throw new Error('Maximum 500 quizzes per upload.');

  const titles = new Set();
  quizzes.forEach((quiz, qi) => {
    const n = qi + 1;
    if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) throw new Error(`Quiz ${n} must be a JSON object.`);
    const title = String(quiz.title || quiz.name || '').trim();
    if (!title) throw new Error(`Quiz ${n}: title is required.`);
    const key = title.toLowerCase();
    if (titles.has(key)) throw new Error(`Quiz ${n}: duplicate title '${title}'.`);
    titles.add(key);
    if (!Array.isArray(quiz.questions) || quiz.questions.length < 1) throw new Error(`Quiz ${n} (${title}): questions must contain at least one question.`);
    quiz.questions.forEach((q, qi2) => {
      const qn = qi2 + 1;
      if (!q || typeof q !== 'object') throw new Error(`Quiz ${n}, question ${qn}: invalid question object.`);
      if (!String(q.question || '').trim()) throw new Error(`Quiz ${n}, question ${qn}: question text is empty.`);
      if (!Array.isArray(q.options) || q.options.length < 2) throw new Error(`Quiz ${n}, question ${qn}: provide at least two options.`);
      if (q.options.some(x => !String(x).trim())) throw new Error(`Quiz ${n}, question ${qn}: options cannot be empty.`);
      const correct = resolveCorrectAnswer(q.correct_answer ?? q.answer, q.options);
      if (!Number.isInteger(correct) || correct < 0 || correct >= q.options.length) {
        throw new Error(`Quiz ${n}, question ${qn}: correct_answer must be a zero-based index, A/B/C..., or an exact option.`);
      }
    });
  });
  return quizzes;
}

function taxonomyFields(taxonomy, categoryIds, subcategoryIds) {
  const categories = taxonomy.filter(x => categoryIds.includes(x.id)).map(x => x.name);
  const subcategories = taxonomy
    .filter(x => categoryIds.includes(x.id))
    .flatMap(x => x.subcategories || [])
    .filter(x => subcategoryIds.includes(x.id))
    .map(x => x.name);
  return {category_ids: categoryIds, categories, subcategory_ids: subcategoryIds, subcategories};
}

export default function AdminBulkContentScreen({onBack}) {
  const [tab, setTab] = useState('quiz');
  const [taxonomy, setTaxonomy] = useState([]);
  const [quizJson, setQuizJson] = useState(JSON.stringify(SAMPLE_MULTI, null, 2));
  const [quizFile, setQuizFile] = useState(null);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('English');
  const [categoryIds, setCategoryIds] = useState([]);
  const [subcategoryIds, setSubcategoryIds] = useState([]);
  const [level, setLevel] = useState('Beginner');
  const [language, setLanguage] = useState('English');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    api.adminTaxonomy()
      .then(r => setTaxonomy(r?.categories || []))
      .catch(e => Alert.alert('Taxonomy', e.message || 'Unable to load categories.'));
  }, []);

  const preview = useMemo(() => {
    try {
      const parsed = JSON.parse(quizJson);
      const list = asQuizList(parsed);
      return {
        count: list.length,
        questions: list.reduce((n, x) => n + (x.questions?.length || 0), 0),
        error: null,
      };
    } catch (e) {
      return {count: 0, questions: 0, error: e.message};
    }
  }, [quizJson]);

  const selection = taxonomyFields(taxonomy, categoryIds, subcategoryIds);
  const ready = categoryIds.length > 0 && subcategoryIds.length > 0;

  const pickQuiz = async () => {
    const r = await DocumentPicker.getDocumentAsync({type: ['application/json', 'text/plain'], copyToCacheDirectory: true, multiple: false});
    if (!r.canceled) setQuizFile(r.assets?.[0] || null);
  };

  const loadQuiz = async () => {
    if (!quizFile) return;
    try {
      const text = await (await fetch(quizFile.uri)).text();
      JSON.parse(text);
      setQuizJson(text);
      setResult(null);
    } catch (e) {
      Alert.alert('JSON file', e.message || 'Unable to read the selected file.');
    }
  };

  const pickPdf = async () => {
    const r = await DocumentPicker.getDocumentAsync({type: 'application/pdf', copyToCacheDirectory: true, multiple: false});
    if (!r.canceled && r.assets?.[0]) {
      setFile(r.assets[0]);
      setTitle(title || r.assets[0].name.replace(/\.pdf$/i, ''));
    }
  };

  const createQuiz = async () => {
    try {
      setBusy(true);
      setResult(null);
      if (!ready) throw new Error('Select at least one category and one subcategory before uploading quizzes.');
      const parsed = JSON.parse(quizJson);
      validateQuizPayload(parsed);
      const d = await api.bulkQuiz({
        ...selection,
        quizzes: asQuizList(parsed),
      });
      setResult({kind: 'quiz', ...d});
      Alert.alert('Quiz drafts created', d.message || `${d.quiz_count || 1} quiz draft(s) created.`);
    } catch (e) {
      Alert.alert('Bulk quiz', e.message || 'Unable to create quiz drafts.');
    } finally {
      setBusy(false);
    }
  };

  const uploadQuiz = async () => {
    try {
      setBusy(true);
      setResult(null);
      if (!quizFile) throw new Error('Choose a JSON file first.');
      if (!ready) throw new Error('Select at least one category and one subcategory before uploading quizzes.');

      // Prefer the dedicated multipart endpoint. If an older backend is still
      // deployed and does not expose /quiz-file yet, fall back to the JSON
      // endpoint so the admin upload remains usable during a rolling deploy.
      let d;
      try {
        d = await api.bulkQuizFile(quizFile, selection);
      } catch (uploadError) {
        if (!/404|not found|quiz-file/i.test(String(uploadError?.message || ''))) {
          throw uploadError;
        }
        const text = await (await fetch(quizFile.uri)).text();
        const parsed = JSON.parse(text);
        validateQuizPayload(parsed);
        d = await api.bulkQuiz({ ...selection, quizzes: asQuizList(parsed) });
      }

      setResult({kind: 'quiz', ...d});
      Alert.alert('Quiz drafts created', d.message || `${d.quiz_count || 1} quiz draft(s) created.`);
    } catch (e) {
      Alert.alert('JSON upload', e.message || 'Unable to create quiz drafts.');
    } finally {
      setBusy(false);
    }
  };

  const createCourse = async () => {
    try {
      setBusy(true);
      setResult(null);
      if (!file) throw new Error('Choose a PDF first.');
      if (!subject.trim()) throw new Error('Select a subject.');
      if (!ready) throw new Error('Select at least one category and one subcategory before creating the course.');
      const d = await api.bulkCoursePdf(file, {
        title,
        subject: subject.trim(),
        category: selection.categories?.[0] || '',
        subcategory: selection.subcategories?.[0] || '',
        ...selection,
        level,
        language,
      });
      setResult({kind: 'course', ...d});
      Alert.alert('Course created', `${d.module_count} modules and ${d.lesson_count} lessons were created as a draft.`);
    } catch (e) {
      Alert.alert('PDF course', e.message || 'Unable to create course.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <Header
        eyebrow="Content studio"
        title="Bulk Content Studio"
        subtitle="Choose taxonomy once, then apply it to every quiz or course in this upload."
        right={<Button title="← Dashboard" variant="secondary" onPress={onBack} />}
      />

      <Card style={{backgroundColor: colors.navy, borderColor: colors.navy}}>
        <Text style={{color: '#fff', fontSize: 20, fontWeight: '900'}}>Upload-level taxonomy</Text>
        <Text style={{color: '#D9DBE8', lineHeight: 20, marginTop: 6}}>
          Category and subcategory are no longer entered inside each quiz or course file. Select them here once; the backend applies the same selection to every item created by this upload.
        </Text>
      </Card>

      <View style={{flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap'}}>
        <Button title="📝 Bulk Quiz" onPress={() => setTab('quiz')} variant={tab === 'quiz' ? 'primary' : 'secondary'} />
        <Button title="📄 PDF → Course" onPress={() => setTab('course')} variant={tab === 'course' ? 'primary' : 'secondary'} />
      </View>

      {tab === 'quiz' ? (
        <>
          <Card>
            <Text style={{fontSize: 21, fontWeight: '900', color: colors.navy}}>1. Select category & subcategory</Text>
            <TaxonomyPicker
              taxonomy={taxonomy}
              categoryIds={categoryIds}
              subcategoryIds={subcategoryIds}
              onChange={({categoryIds: c, subcategoryIds: s}) => {setCategoryIds(c); setSubcategoryIds(s);}}
              helper="These selections will be attached to every quiz in this upload. You can select multiple categories and multiple subcategories."
            />
          </Card>

          <Card>
            <Text style={{fontSize: 21, fontWeight: '900', color: colors.navy}}>2. Upload quiz JSON</Text>
            <Text style={{color: colors.muted, lineHeight: 20, marginTop: 5}}>
              Keep each quiz focused on its title, subject, topic and questions. Do not add category or subcategory fields to the JSON.
            </Text>
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 12}}>
              <Button title="📂 Choose JSON" variant="secondary" onPress={pickQuiz} />
              {quizFile && <Button title="Load selected file" variant="secondary" onPress={loadQuiz} />}
              {quizFile && <Badge tone="green">{quizFile.name}</Badge>}
            </View>
            <Field label="Quiz JSON" value={quizJson} onChangeText={setQuizJson} multiline />
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              <Button title={busy ? 'Creating…' : 'Create Quiz Drafts'} onPress={createQuiz} disabled={busy || !ready} />
              <Button title="Upload JSON & Create" variant="secondary" onPress={uploadQuiz} disabled={busy || !quizFile || !ready} />
              <Button title="Reset Sample" variant="secondary" onPress={() => setQuizJson(JSON.stringify(SAMPLE_MULTI, null, 2))} />
              <Badge tone={preview.error ? 'red' : 'blue'}>{preview.error ? 'Invalid JSON' : `${preview.count} quiz${preview.count === 1 ? '' : 'zes'} · ${preview.questions} questions`}</Badge>
            </View>
          </Card>

          <Card style={{backgroundColor: '#F8F9FD'}}>
            <Text style={{fontWeight: '900', color: colors.navy}}>JSON format</Text>
            <Text style={{fontFamily: 'monospace', fontSize: 11, marginTop: 8}}>{`[
  {
    "title": "English Grammar - Noun",
    "subject": "English",
    "topic": "Noun",
    "description": "10-question practice test",
    "passing_percentage": 60,
    "duration_minutes": 20,
    "questions": [ ...10 questions... ]
  }
]`}</Text>
            <Text style={{color: colors.muted, marginTop: 10, lineHeight: 18}}>
              Category and subcategory are intentionally absent from this sample. The FE sends the selected taxonomy separately with the upload.
            </Text>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Text style={{fontSize: 21, fontWeight: '900', color: colors.navy}}>1. Select category & subcategory</Text>
            <TaxonomyPicker
              taxonomy={taxonomy}
              categoryIds={categoryIds}
              subcategoryIds={subcategoryIds}
              onChange={({categoryIds: c, subcategoryIds: s}) => {setCategoryIds(c); setSubcategoryIds(s);}}
              helper="These selections will be attached to the course and all generated modules/lessons."
            />
          </Card>

          <Card>
            <Text style={{fontSize: 21, fontWeight: '900', color: colors.navy}}>2. Course details & PDF</Text>
            <Button title={file ? `Selected: ${file.name}` : 'Choose PDF'} variant="secondary" onPress={pickPdf} style={{marginTop: 10}} />
            <Field label="Course title (optional)" value={title} onChangeText={setTitle} placeholder="Leave blank to derive from PDF" />
            <View style={{flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
              <View style={{flex: 1, minWidth: 220}}><Field label="Subject *" value={subject} onChangeText={setSubject} placeholder="English, Java, Math..." /></View>
              <View style={{flex: 1, minWidth: 220}}><DropdownSelect label="Level" value={level} onChange={setLevel} options={['Beginner', 'Intermediate', 'Advanced'].map(x => ({value: x, label: x}))} /></View>
              <View style={{flex: 1, minWidth: 220}}><DropdownSelect label="Language" value={language} onChange={setLanguage} options={['English', 'Hindi', 'Hinglish', 'Other'].map(x => ({value: x, label: x}))} /></View>
            </View>
            <Button title={busy ? 'Processing PDF…' : 'Generate Course Draft'} onPress={createCourse} disabled={busy || !file || !subject.trim() || !ready} style={{marginTop: 6}} />
          </Card>
        </>
      )}

      {result && (
        <Card style={{borderColor: colors.success}}>
          <Badge tone="green">Draft created</Badge>
          <Text style={{fontSize: 18, fontWeight: '900', color: colors.navy, marginTop: 8}}>{result.kind === 'quiz' ? 'Quiz drafts ready' : 'Course ready'}</Text>
          <Text style={{color: colors.muted, marginTop: 5}}>{result.message}</Text>
          {result.kind === 'quiz' && <Text style={{fontWeight: '900', marginTop: 8}}>{result.quiz_count || 1} quizzes · {result.question_count || 0} questions</Text>}
          {result.kind === 'course' && <Text style={{fontWeight: '900', marginTop: 8}}>{result.module_count} modules · {result.lesson_count} lessons</Text>}
        </Card>
      )}
    </AppShell>
  );
}
