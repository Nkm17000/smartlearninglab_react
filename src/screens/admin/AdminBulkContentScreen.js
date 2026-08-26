import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Platform, Text, View} from 'react-native';
import {AppShell, Badge, Button, Card, DropdownSelect, Field, Header} from '../../components/UI';
import {TaxonomyPicker} from '../../components/TaxonomyPicker';
import {api} from '../../services/api';
import {pickFile} from '../../services/filePicker';
import {colors} from '../../theme';
import {
  asQuizList,
  normalizeQuestionForBackend,
  normalizeQuizForBackend,
  validateQuizPayload,
  validateQuizBatch,
  taxonomyFields,
} from '../../services/bulkQuizFormat';

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



const SAMPLE_BILINGUAL = [
  {title:'General Science - Motion - Set 1',subject:'General Science',topic:'Motion',description:'English + Hindi bilingual practice test',passing_percentage:60,duration_minutes:20,questions:[{question:{english:'A body moving with constant velocity has what type of acceleration?',hindi:'नियत वेग से गतिमान पिंड का त्वरण किस प्रकार का होता है?'},options:{english:['Zero','Constant positive','Constant negative','Variable'],hindi:['शून्य','नियत धनात्मक','नियत ऋणात्मक','परिवर्ती']},correct_answer:0,difficulty:'medium',marks:1,negative_marks:0,explanation:{english:'Constant velocity means acceleration is zero.',hindi:'नियत वेग का अर्थ है कि त्वरण शून्य है।'}}]}
];

const LARGE_JSON_WORKER = `
  const asQuizList = (value) => {
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.quizzes)) return value.quizzes;
    if (value && typeof value === 'object') return [value];
    return [];
  };

  self.onmessage = async (event) => {
    const data = event.data || {};
    try {
      if (data.type === 'analyze') {
        const source = data.file ? await data.file.text() : data.text;
        const parsed = JSON.parse(source);
        const quizzes = asQuizList(parsed);
        const questions = quizzes.reduce((n, x) => n + (Array.isArray(x?.questions) ? x.questions.length : 0), 0);
        self.postMessage({ type: 'analysis', count: quizzes.length, questions });
        self.close();
        return;
      }

      if (data.type === 'start') {
        const source = data.file ? await data.file.text() : data.text;
        const parsed = JSON.parse(source);
        const quizzes = asQuizList(parsed);
        const batchSize = 50;
        const totalBatches = Math.ceil(quizzes.length / batchSize);
        self.__quizzes = quizzes;
        self.__batchSize = batchSize;
        self.__next = 0;
        self.postMessage({ type: 'meta', count: quizzes.length, questions: quizzes.reduce((n, x) => n + (Array.isArray(x?.questions) ? x.questions.length : 0), 0), totalBatches });
        self.postMessage({ type: 'batch', batchNumber: 1, totalBatches, offset: 0, total: quizzes.length, batch: quizzes.slice(0, batchSize) });
        return;
      }

      if (data.type === 'next') {
        const quizzes = self.__quizzes || [];
        const batchSize = self.__batchSize || 50;
        self.__next = (self.__next || 0) + 1;
        const offset = self.__next * batchSize;
        if (offset >= quizzes.length) {
          self.postMessage({ type: 'done' });
          self.close();
          return;
        }
        self.postMessage({
          type: 'batch',
          batchNumber: Math.floor(offset / batchSize) + 1,
          totalBatches: Math.ceil(quizzes.length / batchSize),
          offset,
          total: quizzes.length,
          batch: quizzes.slice(offset, offset + batchSize),
        });
      }
    } catch (error) {
      self.postMessage({ type: 'error', message: error?.message || 'Invalid JSON file.' });
      self.close();
    }
  };
`;

function createQuizWorker() {
  if (Platform.OS !== 'web' || typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') return null;
  const blob = new Blob([LARGE_JSON_WORKER], {type: 'application/javascript'});
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  worker.__cleanup = () => {
    worker.terminate();
    URL.revokeObjectURL(url);
  };
  return worker;
}


async function analyzeQuizFileInWorker(source) {
  const worker = createQuizWorker();
  if (!worker) {
    const text = typeof source === 'string' ? source : await readPickedFile(source);
    const parsed = JSON.parse(text);
    const list = asQuizList(parsed);
    return {count: list.length, questions: list.reduce((n, x) => n + (x?.questions?.length || 0), 0)};
  }
  return new Promise((resolve, reject) => {
    worker.onmessage = (event) => {
      if (event.data?.type === 'analysis') { worker.__cleanup(); resolve(event.data); }
      else if (event.data?.type === 'error') { worker.__cleanup(); reject(new Error(event.data.message)); }
    };
    worker.onerror = (event) => { worker.__cleanup(); reject(new Error(event.message || 'Unable to analyze JSON file.')); };
    worker.postMessage(source?.file ? {type: 'analyze', file: source.file} : {type: 'analyze', text: source});
  });
}

function downloadJsonSample(filename,data){
  if(Platform.OS!=='web'||typeof Blob==='undefined'||typeof URL==='undefined'){Alert.alert('Sample file','Sample download is available in the web admin portal.');return;}
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
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
  const [filePreview, setFilePreview] = useState(null);

  useEffect(() => {
    let active = true;
    const loadTaxonomy = async () => {
      try {
        const r = await api.adminTaxonomy();
        const list = Array.isArray(r?.categories) ? r.categories : [];
        if (active && list.length) {
          setTaxonomy(list);
          return;
        }
        throw new Error('Taxonomy endpoint returned no categories.');
      } catch (e) {
        // Backward-compatible fallback for deployments where /admin/taxonomy
        // is not present yet. IDs match the backend taxonomy seed.
        if (!active) return;
        const defaults = {
          'SSC': ['SSC CGL', 'SSC CHSL', 'SSC CPO', 'SSC MTS', 'SSC GD'],
          'Railway': ['RRB NTPC', 'RRB Group D', 'RRB ALP', 'RRB JE'],
          'Banking': ['IBPS PO', 'IBPS Clerk', 'SBI PO', 'SBI Clerk', 'RBI Grade B', 'RBI Assistant'],
          'UPSC': ['UPSC Civil Services', 'UPSC CDS', 'UPSC NDA'],
          'Teaching': ['CTET', 'TET', 'KVS', 'DSSSB', 'REET'],
          'Defence': ['NDA', 'CDS', 'AFCAT', 'Agniveer'],
          'State Exams': ['State PSC', 'State SSC', 'State Police', 'State Teacher Exams'],
          'General': ['General Competitive Exams', 'General Knowledge'],
          'English Spoken': ['Spoken English', 'Business English', 'Interview English'],
          'Computer': ['Computer Fundamentals', 'Programming', 'Web Development', 'Database', 'Software Development'],
          'Other': ['Other Exams', 'Other Learning'],
        };
        const slug = value => String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        setTaxonomy(Object.entries(defaults).map(([name, children]) => ({
          id: slug(name),
          name,
          slug: slug(name),
          subcategories: children.map(child => ({
            id: `${slug(name)}:${slug(child)}`,
            name: child,
            slug: slug(child),
            category_id: slug(name),
          })),
        })));
      }
    };
    loadTaxonomy();
    return () => { active = false; };
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
      setResult(null);
      setFilePreview({name: selected.name, size: Number(selected.size || 0), analyzing: true});
      const analysis = await analyzeQuizFileInWorker(selected.file ? selected : await readPickedFile(selected));
      const size = Number(selected.size || 0);
      setFilePreview({name: selected.name, size, count: analysis.count, questions: analysis.questions, analyzing: false});
      // Never render a large uploaded JSON file inside the TextInput.
      // Small files may be loaded into the editor for inspection.
      if (size > 0 && size <= 512 * 1024) {
        const text = await readPickedFile(selected);
        setQuizJson(text);
      }
    } catch (e) {
      setQuizFile(null);
      setFilePreview(null);
      Alert.alert('JSON file', e.message || 'Unable to read the selected JSON file.');
    }
  };

  const loadQuiz = async () => {
    if (!quizFile) return;
    try {
      const text = await readPickedFile(quizFile);
      if (Number(quizFile.size || text.length || 0) > 512 * 1024) {
        Alert.alert('Large JSON', 'This file is large, so it will not be loaded into the editor. Use Upload JSON & Create to process it safely in 50-quiz batches.');
        return;
      }
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

  const processQuizListBatches = async (quizzes, source = 'editor', preFailures = []) => {
    if (!ready) throw new Error('Select at least one category and one subcategory before uploading quizzes.');
    if (!Array.isArray(quizzes) || !quizzes.length) throw new Error('No quizzes were found in the JSON file.');

    const batchSize = 50;
    const totalBatches = Math.ceil(quizzes.length / batchSize);
    const bulkUploadId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const batches = [];
    let created = 0;
    let skipped = 0;
    let failed = preFailures.length;
    let questions = 0;

    for (let offset = 0; offset < quizzes.length; offset += batchSize) {
      const batchNumber = Math.floor(offset / batchSize) + 1;
      const rawBatch = quizzes.slice(offset, offset + batchSize);
      const checked = validateQuizBatch(rawBatch, offset);
      const batch = checked.valid.map(normalizeQuizForBackend);
      const localFailures = [...checked.failures];

      setResult({kind: 'quiz', status: 'processing', source, total_quizzes: quizzes.length, total_batches: totalBatches, current_batch: batchNumber, processed_quizzes: offset, created_count: created, skipped_count: skipped, failed_count: failed, question_count: questions, batches: [...batches], message: `Processing batch ${batchNumber} of ${totalBatches}…`});

      if (batch.length) {
        try {
          const response = await api.bulkQuizBatch({...selection, bulk_upload_id: bulkUploadId, quizzes: batch});
          created += Number(response.created_count || 0);
          skipped += Number(response.skipped_count || 0);
          failed += Number(response.failed_count || 0) + localFailures.length;
          questions += Number(response.question_count || 0);
          batches.push({batch: batchNumber, size: rawBatch.length, sent: batch.length, created: Number(response.created_count || 0), skipped: Number(response.skipped_count || 0), failed: Number(response.failed_count || 0) + localFailures.length, failures: [...localFailures, ...(response.failed_quizzes || [])], status: 'completed'});
        } catch (e) {
          failed += batch.length + localFailures.length;
          batches.push({batch: batchNumber, size: rawBatch.length, sent: batch.length, created: 0, skipped: 0, failed: batch.length + localFailures.length, failures: [...localFailures, {error: e.message || 'Batch request failed.'}], status: 'failed'});
        }
      } else {
        failed += localFailures.length;
        batches.push({batch: batchNumber, size: rawBatch.length, sent: 0, created: 0, skipped: 0, failed: localFailures.length, failures: localFailures, status: 'completed'});
      }

      const processed = Math.min(offset + rawBatch.length, quizzes.length);
      setResult({kind: 'quiz', status: processed === quizzes.length ? 'completed' : 'processing', source, total_quizzes: quizzes.length, total_batches: totalBatches, current_batch: batchNumber, processed_quizzes: processed, created_count: created, skipped_count: skipped, failed_count: failed, question_count: questions, batches: [...batches], message: processed === quizzes.length ? `Upload completed: ${created} created, ${skipped} skipped, ${failed} failed.` : `Batch ${batchNumber} of ${totalBatches} completed. Starting the next batch…`});
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    return {created, skipped, failed, questions, total: quizzes.length, totalBatches, batches};
  };

  const processQuizFileInWorker = async (source) => {
    if (Platform.OS !== 'web' || typeof Worker === 'undefined') {
      const text = typeof source === 'string' ? source : await readPickedFile(source);
      const parsed = JSON.parse(text);
      return processQuizListBatches(asQuizList(parsed), 'file');
    }

    if (!ready) throw new Error('Select at least one category and one subcategory before uploading quizzes.');
    const worker = createQuizWorker();
    if (!worker) {
      const text = typeof source === 'string' ? source : await readPickedFile(source);
      const parsed = JSON.parse(text);
      return processQuizListBatches(asQuizList(parsed), 'file');
    }

    const bulkUploadId = `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const batches = [];
    let created = 0, skipped = 0, failed = 0, questions = 0, total = 0, totalBatches = 0;

    const finish = () => worker.__cleanup();
    const sendNext = () => worker.postMessage({type: 'next'});

    return new Promise((resolve, reject) => {
      worker.onmessage = async (event) => {
        const data = event.data || {};
        try {
          if (data.type === 'meta') {
            total = data.count;
            totalBatches = data.totalBatches;
            setFilePreview(prev => ({...(prev || {}), count: data.count, questions: data.questions, analyzing: false}));
            if (!total) throw new Error('No quizzes were found in the JSON file.');
            return;
          }
          if (data.type === 'batch') {
            const batchNumber = data.batchNumber;
            const rawBatch = Array.isArray(data.batch) ? data.batch : [];
            const checked = validateQuizBatch(rawBatch, data.offset || 0);
            setResult({kind: 'quiz', status: 'processing', source: 'file', total_quizzes: total || data.total, total_batches: totalBatches || data.totalBatches, current_batch: batchNumber, processed_quizzes: data.offset || 0, created_count: created, skipped_count: skipped, failed_count: failed, question_count: questions, batches: [...batches], message: `Processing batch ${batchNumber} of ${totalBatches || data.totalBatches}…`});
            let batchResult = {created: 0, skipped: 0, failed: checked.failures.length, question_count: 0, failed_quizzes: checked.failures};
            if (checked.valid.length) {
              try {
                const response = await api.bulkQuizBatch({...selection, bulk_upload_id: bulkUploadId, quizzes: checked.valid.map(normalizeQuizForBackend)});
                batchResult = {created: Number(response.created_count || 0), skipped: Number(response.skipped_count || 0), failed: Number(response.failed_count || 0) + checked.failures.length, question_count: Number(response.question_count || 0), failed_quizzes: [...checked.failures, ...(response.failed_quizzes || [])]};
              } catch (error) {
                batchResult.failed = checked.valid.length + checked.failures.length;
                batchResult.failed_quizzes = [...checked.failures, {error: error.message || 'Batch request failed.'}];
              }
            }
            created += batchResult.created;
            skipped += batchResult.skipped;
            failed += batchResult.failed;
            questions += batchResult.question_count;
            batches.push({batch: batchNumber, size: rawBatch.length, sent: checked.valid.length, created: batchResult.created, skipped: batchResult.skipped, failed: batchResult.failed, failures: batchResult.failed_quizzes || [], status: 'completed'});
            const processed = Math.min((data.offset || 0) + rawBatch.length, total || data.total);
            setResult({kind: 'quiz', status: processed >= (total || data.total) ? 'completed' : 'processing', source: 'file', total_quizzes: total || data.total, total_batches: totalBatches || data.totalBatches, current_batch: batchNumber, processed_quizzes: processed, created_count: created, skipped_count: skipped, failed_count: failed, question_count: questions, batches: [...batches], message: processed >= (total || data.total) ? `Upload completed: ${created} created, ${skipped} skipped, ${failed} failed.` : `Batch ${batchNumber} of ${totalBatches || data.totalBatches} completed. Starting the next batch…`});
            await new Promise(r => setTimeout(r, 0));
            sendNext();
            return;
          }
          if (data.type === 'done') {
            finish();
            resolve({created, skipped, failed, questions, total, totalBatches, batches});
            return;
          }
          if (data.type === 'error') {
            finish();
            reject(new Error(data.message || 'Invalid JSON file.'));
          }
        } catch (error) {
          finish();
          reject(error);
        }
      };
      worker.onerror = (event) => { finish(); reject(new Error(event.message || 'Large JSON processing failed.')); };
      worker.postMessage(source?.file ? {type: 'start', file: source.file, batchSize: 50} : {type: 'start', text: source, batchSize: 50});
    });
  };

  const createQuiz = async () => {
    try {
      setBusy(true);
      setResult(null);
      const parsed = JSON.parse(quizJson);
      validateQuizPayload(parsed);
      const summary = await processQuizListBatches(asQuizList(parsed), 'editor');
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
      const summary = await processQuizFileInWorker(quizFile);
      Alert.alert('JSON upload completed', `${summary.created} created · ${summary.skipped} skipped · ${summary.failed} failed`);
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
            <Text style={{color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 8}}>Choose one or more categories, then select the required subcategories. Categories are applied from the selected taxonomy arrays.</Text>
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
            {quizFile ? (
              <Card style={{backgroundColor: '#F8F9FD', borderColor: colors.border, marginTop: 10}}>
                <Text style={{fontWeight: '900', color: colors.navy}}>✓ JSON file selected</Text>
                <Text style={{color: colors.muted, marginTop: 5}}>{quizFile.name}</Text>
                <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10}}>
                  <Badge tone="blue">{filePreview?.analyzing ? 'Analyzing…' : `${filePreview?.count ?? '—'} quizzes`}</Badge>
                  <Badge tone="blue">{filePreview?.analyzing ? '…' : `${filePreview?.questions ?? '—'} questions`}</Badge>
                  <Badge tone="orange">{Math.max(0, Math.round(Number(quizFile.size || 0) / 1024 / 1024 * 10) / 10)} MB</Badge>
                </View>
                <Text style={{color: colors.muted, fontSize: 11, lineHeight: 17, marginTop: 9}}>
                  Large JSON files are processed outside the UI and uploaded in batches of 50. The full JSON is never rendered inside the text editor, preventing the browser from freezing.
                </Text>
              </Card>
            ) : (
              <Field label="Quiz JSON" value={quizJson} onChangeText={setQuizJson} multiline />
            )}
            <View style={{flexDirection: 'row', gap: 8, flexWrap: 'wrap'}}>
              <Button title={busy ? 'Processing…' : 'Create Quiz Drafts'} onPress={createQuiz} disabled={busy || !ready} />
              <Button title={busy ? 'Uploading…' : 'Upload JSON & Create'} variant="secondary" onPress={uploadQuiz} disabled={busy || !quizFile || !ready} />
              <Button title="Load simple sample" variant="secondary" onPress={() => {setQuizFile(null); setFilePreview(null); setQuizJson(JSON.stringify(SAMPLE_MULTI, null, 2));}} />
              <Button title="Load bilingual sample" variant="secondary" onPress={() => {setQuizFile(null); setFilePreview(null); setQuizJson(JSON.stringify(SAMPLE_BILINGUAL, null, 2));}} />
              <Button title="Download simple sample" variant="secondary" onPress={() => downloadJsonSample('bulk_quiz_simple_sample.json', SAMPLE_MULTI)} />
              <Button title="Download bilingual sample" variant="secondary" onPress={() => downloadJsonSample('bulk_quiz_bilingual_sample.json', SAMPLE_BILINGUAL)} />
              {!quizFile && <Badge tone={preview.error ? 'red' : 'blue'}>{preview.error ? 'Invalid JSON' : `${preview.count} quiz${preview.count === 1 ? '' : 'zes'} · ${preview.questions} questions`}</Badge>}
            </View>
          </Card>

          <Card style={{backgroundColor: '#F8F9FD'}}>
            <Text style={{fontWeight: '900', color: colors.navy}}>Supported quiz JSON formats</Text>
            <Text style={{fontWeight: '900', color: colors.text, marginTop: 10}}>A. Simple / single-language</Text>
            <Text style={{fontFamily: 'monospace', fontSize: 10, lineHeight: 16, marginTop: 6}}>{`{
  "question": "Which is a proper noun?",
  "options": ["city", "country", "Delhi", "river"],
  "correct_answer": 2,
  "explanation": "Delhi is a specific name."
}`}</Text>
            <Text style={{fontWeight: '900', color: colors.text, marginTop: 12}}>B. Bilingual English + Hindi</Text>
            <Text style={{fontFamily: 'monospace', fontSize: 10, lineHeight: 16, marginTop: 6}}>{`{
  "question": {"english": "Which is a proper noun?", "hindi": "व्यक्तिवाचक संज्ञा कौन-सी है?"},
  "options": {
    "english": ["city", "country", "Delhi", "river"],
    "hindi": ["शहर", "देश", "दिल्ली", "नदी"]
  },
  "correct_answer": 2,
  "explanation": {"english": "Delhi is a specific name.", "hindi": "दिल्ली एक विशिष्ट नाम है।"}
}`}</Text>
            <Text style={{color: colors.muted, marginTop: 10, lineHeight: 18}}>Also supported: legacy <Text style={{fontWeight: '800'}}>question_hindi</Text> + <Text style={{fontWeight: '800'}}>options_hindi</Text>, and <Text style={{fontWeight: '800'}}>options_bilingual</Text>. Every MCQ must contain exactly four distinct options. The same zero-based correct_answer (0–3) is used for English and Hindi. Category/subcategory are selected above, not inside each quiz.</Text>
          </Card>
        </>
      ) : (
        <>
          <Card>
            <Text style={{fontSize: 21, fontWeight: '900', color: colors.navy}}>1. Select category & subcategory</Text>
            <Text style={{color: colors.muted, fontSize: 12, marginTop: 4, marginBottom: 8}}>Choose one or more categories, then select the required subcategories. Categories are applied from the selected taxonomy arrays.</Text>
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
