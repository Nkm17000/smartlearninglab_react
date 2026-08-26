import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Platform, Text, View} from 'react-native';
import {AppShell, Badge, Button, Card, DropdownSelect, Field, Header} from '../../components/UI';
import {TaxonomyPicker} from '../../components/TaxonomyPicker';
import {api} from '../../services/api';
import {pickFile} from '../../services/filePicker';
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
      if (!Array.isArray(q.options) || q.options.length !== 4) throw new Error(`Quiz ${n}, question ${qn}: exactly four options are required.`);
      if (q.options.some(x => !String(x).trim())) throw new Error(`Quiz ${n}, question ${qn}: options cannot be empty.`);
      const normalizedOptions = q.options.map(x => String(x).trim().toLowerCase());
      if (new Set(normalizedOptions).size !== normalizedOptions.length) throw new Error(`Quiz ${n}, question ${qn}: duplicate options are not allowed.`);
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

  const readPickedFile = async (selected) => {
    if (!selected) throw new Error('No file selected.');
    if (Platform.OS === 'web' && selected.file && typeof selected.file.text === 'function') {
      return selected.file.text();
    }
    if (!selected.uri) throw new Error('The selected file has no URI. Please choose it again.');
    const response = await fetch(selected.uri);
    if (!response.ok) throw new Error('Unable to read the selected file.');
    return response.text();
  };

  const pickQuiz = async () => {
    try {
      const selected = await pickFile({accept: 'application/json,.json,text/plain', multiple: false});
      if (!selected) return;
      setQuizFile(selected);
      const text = await readPickedFile(selected);
      JSON.parse(text);
      setQuizJson(text);
      setResult(null);
    } catch (e) {
      Alert.alert('JSON file', e.message || 'Unable to read the selected JSON file.');
    }
  };

  const loadQuiz = async () => {
    if (!quizFile) return;
    try {
      const text = await readPickedFile(quizFile);
      JSON.parse(text);
      setQuizJson(text);
      setResult(null);
    } catch (e) {
      Alert.alert('JSON file', e.message || 'Unable to read the selected file.');
    }
  };

  const pickPdf = async () => {
    const f = await pickFile({accept: 'application/pdf'});
    if (f) {
      setFile(f);
      setTitle(title || f.name.replace(/\.pdf$/i, ''));
    }
  };

  const processQuizBatches = async (parsed, source = 'editor') => {
    if (!ready) throw new Error('Select at least one category and one subcategory before uploading quizzes.');
    const quizzes = validateQuizPayload(parsed);
    const batchSize = 50;
    const totalBatches = Math.ceil(quizzes.length / batchSize);
    const bulkUploadId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const batches = [];
    let created = 0;
    let skipped = 0;
    let failed = 0;
    let questions = 0;

    for (let offset = 0; offset < quizzes.length; offset += batchSize) {
      const batchNumber = Math.floor(offset / batchSize) + 1;
      const batch = quizzes.slice(offset, offset + batchSize).map((quiz, index) => ({
        ...quiz,
        _bulk_source_index: offset + index + 1,
      }));

      setResult({
        kind: 'quiz',
        status: 'processing',
        source,
        total_quizzes: quizzes.length,
        total_batches: totalBatches,
        current_batch: batchNumber,
        processed_quizzes: offset,
        created_count: created,
        skipped_count: skipped,
        failed_count: failed,
        question_count: questions,
        batches: [...batches],
        message: `Processing batch ${batchNumber} of ${totalBatches}…`,
      });

      try {
        const response = await api.bulkQuizBatch({
          ...selection,
          bulk_upload_id: bulkUploadId,
          quizzes: batch,
        });
        created += Number(response.created_count || 0);
        skipped += Number(response.skipped_count || 0);
        failed += Number(response.failed_count || 0);
        questions += Number(response.question_count || 0);
        batches.push({
          batch: batchNumber,
          size: batch.length,
          created: Number(response.created_count || 0),
          skipped: Number(response.skipped_count || 0),
          failed: Number(response.failed_count || 0),
          failures: response.failed_quizzes || [],
          status: 'completed',
        });
      } catch (e) {
        failed += batch.length;
        batches.push({
          batch: batchNumber,
          size: batch.length,
          created: 0,
          skipped: 0,
          failed: batch.length,
          failures: [{error: e.message || 'Batch request failed.'}],
          status: 'failed',
        });
      }

      setResult({
        kind: 'quiz',
        status: batchNumber === totalBatches ? 'completed' : 'processing',
        source,
        total_quizzes: quizzes.length,
        total_batches: totalBatches,
        current_batch: batchNumber,
        processed_quizzes: Math.min(offset + batch.length, quizzes.length),
        created_count: created,
        skipped_count: skipped,
        failed_count: failed,
        question_count: questions,
        batches: [...batches],
        message: batchNumber === totalBatches
          ? `Upload completed: ${created} created, ${skipped} skipped, ${failed} failed.`
          : `Batch ${batchNumber} of ${totalBatches} completed. Starting the next batch…`,
      });
    }

    return {created, skipped, failed, questions, total: quizzes.length, totalBatches, batches};
  };

  const createQuiz = async () => {
    try {
      setBusy(true);
      setResult(null);
      const parsed = JSON.parse(quizJson);
      const summary = await processQuizBatches(parsed, 'editor');
      Alert.alert(
        'Bulk quiz upload completed',
        `${summary.created} created · ${summary.skipped} skipped · ${summary.failed} failed`,
      );
    } catch (e) {
      setResult({kind: 'quiz', status: 'failed', message: e.message || 'Unable to process quiz JSON.'});
      Alert.alert('Bulk quiz', e.message || 'Unable to process quiz JSON.');
    } finally {
      setBusy(false);
    }
  };

  const uploadQuiz = async () => {
    try {
      setBusy(true);
      setResult(null);
      if (!quizFile) throw new Error('Choose a JSON file first.');
      const text = await readPickedFile(quizFile);
      setQuizJson(text);
      const parsed = JSON.parse(text);
      const summary = await processQuizBatches(parsed, 'file');
      Alert.alert(
        'JSON upload completed',
        `${summary.created} created · ${summary.skipped} skipped · ${summary.failed} failed`,
      );
    } catch (e) {
      setResult({kind: 'quiz', status: 'failed', message: e.message || 'Unable to upload quiz JSON.'});
      Alert.alert('JSON upload', e.message || 'Unable to upload quiz JSON.');
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
              <Button title="📂 Choose JSON" variant="secondary" onPress={pickQuiz} disabled={busy} />
              {quizFile && <Button title="Reload selected JSON" variant="secondary" onPress={loadQuiz} disabled={busy} />}
              {quizFile && <Badge tone="green">{quizFile.name}</Badge>}
            </View>
            <Field label="Quiz JSON" value={quizJson} onChangeText={setQuizJson} multiline />
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              <Button title={busy ? 'Processing…' : 'Create Quiz Drafts'} onPress={createQuiz} disabled={busy || !ready} />
              <Button title={busy ? 'Uploading…' : 'Upload JSON & Create'} variant="secondary" onPress={uploadQuiz} disabled={busy || !quizFile || !ready} />
              <Button title="Reset Sample" variant="secondary" onPress={() => setQuizJson(JSON.stringify(SAMPLE_MULTI, null, 2))} />
              <Badge tone={preview.error ? 'red' : 'blue'}>{preview.error ? 'Invalid JSON' : `${preview.count} quiz${preview.count === 1 ? '' : 'zes'} · ${preview.questions} questions`}</Badge>
            </View>
          </Card>

          <Card style={{backgroundColor: '#F8F9FD'}}>
            <Text style={{fontWeight: '900', color: colors.navy}}>JSON format</Text>
            <Text style={{fontFamily: 'monospace', fontSize: 10, lineHeight: 16, marginTop: 8}}>{`[
  {
    "title": "English Grammar - Noun - Set 1",
    "subject": "English",
    "topic": "Noun",
    "description": "Medium practice test",
    "passing_percentage": 60,
    "duration_minutes": 20,
    "questions": [
      {
        "question": "Which of the following is a proper noun?",
        "options": ["city", "country", "Delhi", "river"],
        "correct_answer": 2,
        "difficulty": "medium",
        "marks": 1,
        "negative_marks": 0,
        "explanation": "Delhi is the specific name of a city."
      }
    ]
  }
]`}
            </Text>
            <Text style={{color: colors.muted, marginTop: 10, lineHeight: 18}}>
              Required: title, subject, questions, exactly 4 unique options per question, and a zero-based correct_answer (0–3). Category/subcategory are selected above and are NOT required inside the JSON. Files larger than 50 quizzes are automatically sent as 50-quiz batches.
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

          <Card style={{backgroundColor: '#F8F9FD'}}>
            <Text style={{fontWeight: '900', color: colors.navy}}>Course upload format</Text>
            <Text style={{fontFamily: 'monospace', fontSize: 10, lineHeight: 16, marginTop: 8}}>{`PDF FILE: complete_english_grammar.pdf

Metadata used by the API:
{
  "title": "Complete English Grammar",
  "subject": "English",
  "level": "Beginner",
  "language": "English"
}`}</Text>
            <Text style={{color: colors.muted, marginTop: 10, lineHeight: 18}}>
              Required: a real PDF file, subject, one or more selected categories and subcategories. Title is optional and can be derived from the PDF filename. Level and language are optional. The backend extracts modules and lessons from the PDF and stores the original PDF in R2.
            </Text>
          </Card>
        </>
      )}

      {result && (
        <Card style={{borderColor: result.status === 'failed' ? colors.danger : colors.success, marginTop: 14}}>
          <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10}}>
            <View style={{flex: 1}}>
              <Text style={{fontSize: 18, fontWeight: '900', color: colors.navy}}>
                {result.kind === 'quiz' ? 'Quiz bulk upload status' : 'Course import status'}
              </Text>
              <Text style={{color: colors.muted, marginTop: 5}}>{result.message}</Text>
            </View>
            <Badge tone={result.status === 'failed' ? 'red' : result.status === 'processing' ? 'orange' : 'green'}>
              {result.status || 'completed'}
            </Badge>
          </View>

          {result.kind === 'quiz' && result.total_quizzes ? (
            <>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14}}>
                <Badge tone="blue">{result.processed_quizzes || 0}/{result.total_quizzes} processed</Badge>
                <Badge tone="green">✓ {result.created_count || 0} created</Badge>
                <Badge tone="orange">↻ {result.skipped_count || 0} skipped</Badge>
                <Badge tone="red">✕ {result.failed_count || 0} failed</Badge>
              </View>
              <Text style={{fontWeight: '900', color: colors.navy, marginTop: 14}}>Batch status</Text>
              {(result.batches || []).map((b) => (
                <View key={`batch-${b.batch}`} style={{marginTop: 8, padding: 10, borderRadius: 10, backgroundColor: '#F8F9FD', borderWidth: 1, borderColor: colors.border}}>
                  <Text style={{fontWeight: '900', color: colors.navy}}>Batch {b.batch} · {b.size} quizzes · {b.status}</Text>
                  <Text style={{fontSize: 11, color: colors.muted, marginTop: 3}}>Created {b.created} · Skipped {b.skipped} · Failed {b.failed}</Text>
                  {(b.failures || []).slice(0, 5).map((f, i) => <Text key={i} style={{fontSize: 10, color: colors.danger, marginTop: 3}}>Quiz {f.source_index || ''}: {f.title || ''} {f.error || ''}</Text>)}
                  {(b.failures || []).length > 5 ? <Text style={{fontSize: 10, color: colors.muted, marginTop: 3}}>+ {(b.failures || []).length - 5} more failures in this batch.</Text> : null}
                </View>
              ))}
            </>
          ) : null}

          {result.kind === 'course' && <Text style={{fontWeight: '900', marginTop: 10}}>{result.module_count || 0} modules · {result.lesson_count || 0} lessons</Text>}
        </Card>
      )}
    </AppShell>
  );
}
