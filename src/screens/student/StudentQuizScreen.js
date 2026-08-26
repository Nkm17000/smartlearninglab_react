import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, ErrorState, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const formatTime = seconds => `${String(Math.max(0, Math.floor(seconds / 60))).padStart(2, '0')}:${String(Math.max(0, seconds % 60)).padStart(2, '0')}`;

// ------------------------------------------------------------
// Quiz content normalization
// Supports all quiz formats accepted by the bulk importer:
// 1) Single language: question + options[]
// 2) Bilingual object: question.{english,hindi} + options.{english,hindi}
// 3) Legacy bilingual: question_hindi + options_hindi
// 4) Paired options: options_bilingual[]
// The student screen always renders English and Hindi when Hindi exists,
// while keeping single-language quizzes exactly as before.
// ------------------------------------------------------------
function asText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function textPair(value, hindiFallback) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      english: asText(value.english ?? value.en ?? value.text ?? value.label ?? value.value),
      hindi: asText(value.hindi ?? value.hi ?? value.text_hindi ?? value.label_hindi),
    };
  }

  return {
    english: asText(value),
    hindi: asText(hindiFallback),
  };
}

function questionPair(question) {
  return textPair(
    question?.question ?? question?.text,
    question?.question_hindi ?? question?.hindi_question ?? question?.questionHindi
  );
}

function optionPairs(question) {
  const raw = question?.options;
  const hindi = question?.options_hindi ?? question?.optionsHindi ?? [];

  // New bilingual object: { english: [...], hindi: [...] }
  if (raw && !Array.isArray(raw) && typeof raw === 'object') {
    const english = raw.english ?? raw.en ?? [];
    const hindiOptions = raw.hindi ?? raw.hi ?? [];
    if (Array.isArray(english)) {
      return english.map((item, index) => textPair(item, hindiOptions[index]));
    }
  }

  // Paired bilingual options: [{english, hindi}, ...]
  if (Array.isArray(question?.options_bilingual)) {
    return question.options_bilingual.map(item => textPair(item));
  }

  // Normal/legacy options arrays.
  const english = Array.isArray(raw) ? raw : [];
  return english.map((item, index) => textPair(item, hindi?.[index]));
}

function hasHindi(pair) {
  return Boolean(asText(pair?.hindi));
}

function BilingualText({ pair, style, hindiStyle }) {
  if (!hasHindi(pair)) {
    return <Text style={style}>{pair?.english || ''}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <Text style={style}>{pair.english}</Text>
      <Text style={[style, hindiStyle || {}, { marginTop: 5 }]}>{pair.hindi}</Text>
    </View>
  );
}


function Option({ letter, pair, selected, onPress, disabled }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row', alignItems: 'center', gap: 12,
        borderWidth: 1.4, borderColor: selected ? colors.primary : colors.border,
        backgroundColor: selected ? '#F0EEFF' : '#fff', borderRadius: 14,
        padding: 14, marginBottom: 10, opacity: pressed ? 0.78 : 1,
      })}
    >
      <View style={{ width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: selected ? colors.primary : '#F6F6FB', borderWidth: 1, borderColor: selected ? colors.primary : colors.border }}>
        <Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: selected ? '#fff' : colors.navy }}>{letter}</Text>
      </View>
      <BilingualText
        pair={pair}
        style={{ flex: 1, fontFamily: colors.fontFamily, fontSize: 13, fontWeight: selected ? '900' : '700', color: colors.navy, lineHeight: 21 }}
        hindiStyle={{ fontWeight: selected ? '800' : '600' }}
      />
      {selected && <Text style={{ fontSize: 18, color: colors.primary }}>✓</Text>}
    </Pressable>
  );
}

function Stat({ icon, label, value }) {
  return (
    <View style={{ flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: colors.border }}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontFamily: colors.fontFamily, fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 5 }}>{value}</Text>
      <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export default function StudentQuizScreen({ quizId, onBack, backLabel = 'Back to Quizzes' }) {
  const { width } = useWindowDimensions();
  const mobile = width < 820;
  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attemptMeta, setAttemptMeta] = useState(null);
  const [answers, setAnswers] = useState({});
  const [current, setCurrent] = useState(0);
  const [attempt, setAttempt] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState(null);
  const hydrated = useRef(false);
  const saveTimer = useRef(null);
  const latestRef = useRef({ answers: {}, current: 0, attempt: null });

  const load = async () => {
    try {
      setError('');
      const bundle = await api.quizBundle(quizId);
      const qs = api.listOf(bundle?.questions);
      const active = bundle?.active_attempt;
      const restoredAnswers = active?.answers || {};
      const restoredCurrent = Math.min(Math.max(0, Number(active?.current_index || 0)), Math.max(0, qs.length - 1));
      setQuiz(bundle?.quiz || null);
      setQuestions(qs);
      setAttemptMeta(bundle || null);
      setAnswers(restoredAnswers);
      setCurrent(restoredCurrent);
      setAttempt(active ? { attempt_id: String(active._id), quiz_id: quizId, duration_minutes: bundle?.quiz?.duration_minutes || 15, started_at: active.started_at, resumed: true } : null);
      setResult(null);
      hydrated.current = true;
    } catch (e) {
      setError(e?.message || 'Unable to open this quiz.');
    }
  };

  useEffect(() => { hydrated.current = false; load(); return () => saveTimer.current && clearTimeout(saveTimer.current); }, [quizId]);
  useEffect(() => { latestRef.current = { answers, current, attempt }; }, [answers, current, attempt]);

  useEffect(() => {
    if (!hydrated.current || !attempt?.attempt_id || result) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try { await api.saveQuizAttempt(quizId, { attempt_id: attempt.attempt_id, answers, current_index: current }); } catch (_) { /* retry on next state change */ }
    }, 450);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [quizId, answers, current, attempt?.attempt_id, result]);

  useEffect(() => {
    if (!attempt?.started_at || !quiz?.duration_minutes || result) { setRemaining(null); return; }
    const duration = Number(quiz.duration_minutes || 15) * 60;
    const started = Date.parse(attempt.started_at);
    const tick = () => {
      const left = Math.max(0, duration - Math.floor((Date.now() - started) / 1000));
      setRemaining(left);
      if (left === 0 && latestRef.current.attempt?.attempt_id) {
        setBusy(true);
        api.submitQuiz(quizId, { attempt_id: latestRef.current.attempt.attempt_id, answers: latestRef.current.answers || {} })
          .then(setResult).catch(() => {}).finally(() => setBusy(false));
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [attempt?.attempt_id, attempt?.started_at, quiz?.duration_minutes, result]);

  const answered = useMemo(() => Object.keys(answers).length, [answers]);
  const completion = questions.length ? Math.round(answered / questions.length * 100) : 0;
  const q = questions[current];
  const currentQuestionPair = useMemo(() => questionPair(q), [q]);
  const currentOptionPairs = useMemo(() => optionPairs(q), [q]);

  const start = async () => {
    if (attempt) return;
    if (attemptMeta && attemptMeta.can_start === false && !attemptMeta.active_attempt) { Alert.alert('Quiz', 'Maximum attempts reached for this quiz.'); return; }
    setBusy(true);
    try {
      const a = await api.startQuiz(quizId);
      setAttempt(a); setAnswers(a.answers || {}); setCurrent(Math.min(Number(a.current_index || 0), Math.max(0, questions.length - 1)));
      setAttemptMeta(prev => ({ ...prev, active_attempt: a, can_start: true }));
    } catch (e) { Alert.alert('Quiz', e.message); }
    finally { setBusy(false); }
  };

  const submit = async (force = false) => {
    if (!attempt?.attempt_id) { if (!force) Alert.alert('Quiz', 'Start the quiz first.'); return; }
    if (!force && answered < questions.length) {
      const ok = await new Promise(resolve => Alert.alert('Submit quiz?', `You answered ${answered} of ${questions.length}. Unanswered questions will receive no marks.`, [
        { text: 'Continue', onPress: () => resolve(true) }, { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      ]));
      if (!ok) return;
    }
    setBusy(true);
    try { setResult(await api.submitQuiz(quizId, { attempt_id: attempt.attempt_id, answers })); }
    catch (e) { if (!force) Alert.alert('Submit failed', e.message); }
    finally { setBusy(false); }
  };

  const handleBack = async () => {
    if (attempt && !result) {
      try { await api.saveQuizAttempt(quizId, { attempt_id: attempt.attempt_id, answers, current_index: current }); } catch (_) {}
    }
    onBack?.();
  };

  if (error) return <AppShell><ErrorState title="Quiz could not load" message={error} onRetry={load} /></AppShell>;
  if (!quiz) return <AppShell><Loading label="Opening quiz…" /></AppShell>;

  if (result) {
    const details = Array.isArray(result.details) ? result.details : [];
    const optionLabel = (d, v) => {
      if (v === undefined || v === null || v === '') return { english: 'Not answered', hindi: '' };
      const optsQuestion = {
        options: d.options,
        options_hindi: d.options_hindi,
        options_bilingual: d.options_bilingual,
      };
      const opts = optionPairs(optsQuestion);
      const n = Number(v);
      if (Number.isInteger(n) && n >= 0 && n < opts.length) return opts[n];
      return textPair(v);
    };
    return <AppShell>
      <View style={{ maxWidth: 1000, width: '100%', alignSelf: 'center' }}>
        <Pressable onPress={handleBack} style={{ marginBottom: 10 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.primary }}>‹ {backLabel}</Text></Pressable>
        <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 28, alignItems: 'center' }}>
          <Text style={{ fontSize: 48 }}>{result.passed ? '🏆' : '📚'}</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 13, color: '#C8C6DF', marginTop: 10 }}>QUIZ COMPLETED</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 58, fontWeight: '900', color: '#fff', marginTop: 2 }}>{result.percentage}%</Text>
          <Badge tone={result.passed ? 'green' : 'orange'}>{result.passed ? 'Passed' : 'Keep practicing'}</Badge>
          <Text style={{ fontFamily: colors.fontFamily, color: '#D8D7E8', marginTop: 10 }}>{result.correct_count} correct · {result.wrong_count} wrong · {result.unanswered_count || 0} unanswered</Text>
          <View style={{ width: '100%', marginTop: 18 }}><ProgressBar value={result.percentage} color={colors.gold} /></View>
        </Card>
        <View style={{ marginTop: 18 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 21, fontWeight: '900', color: colors.navy, marginBottom: 10 }}>Answer Review</Text>
          {details.map((d, i) => <Card key={d.question_id || i} style={{ marginBottom: 11, borderColor: d.correct ? colors.green : colors.orange }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}><View style={{ flex: 1, flexDirection: 'row', gap: 4 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 14, fontWeight: '900', color: colors.navy }}>Q{i + 1}.</Text><BilingualText pair={questionPair(d)} style={{ fontFamily: colors.fontFamily, fontSize: 14, fontWeight: '900', color: colors.navy, lineHeight: 21 }} /></View><Badge tone={d.correct ? 'green' : 'orange'}>{d.correct ? 'Correct' : 'Review'}</Badge></View>
            <View style={{ marginTop: 10 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: colors.muted }}>Your answer:</Text><BilingualText pair={optionLabel(d, d.submitted)} style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: d.correct ? colors.success : colors.orange, lineHeight: 18 }} /></View>
            <View style={{ marginTop: 6 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, color: colors.muted }}>Correct answer:</Text><BilingualText pair={d.correct_answer_text ? textPair(d.correct_answer_text, d.correct_answer_text_hindi) : optionLabel(d, d.correct_answer)} style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.success, lineHeight: 18 }} /></View>
            {(d.explanation || d.explanation_hindi) ? <View style={{ marginTop: 9, padding: 11, borderRadius: 11, backgroundColor: colors.purpleSoft }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>Explanation</Text><BilingualText pair={textPair(d.explanation, d.explanation_hindi)} style={{ fontFamily: colors.fontFamily, fontSize: 11, lineHeight: 18, color: colors.navy, marginTop: 3 }} hindiStyle={{ marginTop: 5 }} /></View> : null}
          </Card>)}
        </View>
        <Button title={backLabel} onPress={handleBack} style={{ marginTop: 4, width: '100%' }} />
      </View>
    </AppShell>;
  }

  const answeredFlags = questions.map(question => Object.prototype.hasOwnProperty.call(answers, api.idOf(question)));
  const timerTone = remaining != null && remaining < 60 ? 'danger' : 'orange';

  return <AppShell>
    <View style={{ maxWidth: 1120, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <Pressable onPress={handleBack}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.primary }}>‹ {backLabel}</Text></Pressable>
        <View style={{ flexDirection: 'row', gap: 7 }}><Badge tone="purple">{quiz.category || 'Practice'}</Badge><Badge tone={timerTone}>{remaining == null ? `${quiz.duration_minutes || 20}:00` : formatTime(remaining)}</Badge></View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 13 }}>
        <Stat icon="📝" label="Questions" value={questions.length} />
        <Stat icon="✓" label="Answered" value={`${answered}/${questions.length}`} />
        <Stat icon="⏱" label="Duration" value={`${quiz.duration_minutes || 20} min`} />
        <Stat icon="🎯" label="Pass mark" value={`${quiz.passing_percentage || 60}%`} />
      </View>

      <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14, alignItems: 'stretch' }}>
        <View style={{ flex: 1 }}>
          <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: '#AFA8FF', letterSpacing: 1.1 }}>TEST SERIES • QUIZ</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 24, fontWeight: '900', color: '#fff', marginTop: 5 }}>{quiz.title || quiz.name}</Text><Text style={{ fontFamily: colors.fontFamily, color: '#D6D8E2', fontSize: 11, marginTop: 5 }}>Read carefully · choose one answer · review anytime</Text></View>
              {attempt && <Button title={busy ? 'Submitting…' : 'Submit Quiz'} onPress={() => submit(false)} disabled={busy} />}
            </View>
            <View style={{ marginTop: 15 }}><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}><Text style={{ fontFamily: colors.fontFamily, color: '#D6D8E2', fontSize: 9 }}>Overall progress</Text><Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 9, fontWeight: '900' }}>{completion}%</Text></View><ProgressBar value={completion} color={colors.gold} /></View>
          </Card>

          {!attempt && <Card>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy }}>{attemptMeta?.active_attempt ? 'Continue your quiz' : 'Ready to test your knowledge?'}</Text>
            <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, lineHeight: 20, marginTop: 6 }}>{attemptMeta?.active_attempt ? 'Your answers and current question are saved on the server. Resume safely after refresh or navigation.' : 'You can submit even if you are in the middle of the quiz. Unanswered questions will remain unanswered.'}</Text>
            <View style={{ flexDirection: 'row', gap: 7, flexWrap: 'wrap', marginTop: 14 }}><Badge tone="purple">{questions.length} Questions</Badge><Badge tone="orange">{quiz.duration_minutes || 20} Minutes</Badge><Badge tone="green">{quiz.passing_percentage || 60}% Pass</Badge><Badge tone="blue">Auto-save</Badge></View>
            <Button title={busy ? 'Starting…' : attemptMeta?.active_attempt ? 'Resume Quiz' : 'Start Quiz'} onPress={start} disabled={busy || (!attemptMeta?.active_attempt && attemptMeta?.can_start === false)} style={{ marginTop: 18, width: '100%' }} />
          </Card>}

          {attempt && q && <Card style={{ padding: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <View><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary }}>QUESTION {current + 1}</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 2 }}>of {questions.length}</Text></View>
              <Badge tone="purple">{answered}/{questions.length} answered</Badge>
            </View>
            <View style={{ marginTop: 16, padding: 16, borderRadius: 16, backgroundColor: current % 2 ? '#F4F8FF' : '#F5F1FF', borderWidth: 1, borderColor: current % 2 ? '#DDE8FF' : '#E3DBFF' }}>
              <BilingualText pair={currentQuestionPair} style={{ fontFamily: colors.fontFamily, fontSize: 20, fontWeight: '900', color: colors.navy, lineHeight: 29 }} hindiStyle={{ fontWeight: '800' }} />
            </View>
            <View style={{ marginTop: 17 }}>{currentOptionPairs.map((pair, index) => <Option key={index} letter={LETTERS[index] || String(index + 1)} pair={pair} selected={String(answers[api.idOf(q)]) === String(index)} disabled={busy} onPress={() => setAnswers(prev => ({ ...prev, [api.idOf(q)]: index }))} />)}</View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 8 }}>
              <Button title="← Previous" variant="secondary" onPress={() => setCurrent(Math.max(0, current - 1))} disabled={current === 0 || busy} />
              {current < questions.length - 1 ? <Button title="Next Question →" onPress={() => setCurrent(Math.min(questions.length - 1, current + 1))} disabled={busy} /> : <Button title={busy ? 'Submitting…' : 'Submit Quiz'} onPress={() => submit(false)} disabled={busy} />}
            </View>
          </Card>}
        </View>

        <View style={{ width: mobile ? '100%' : 255 }}>
          <Card>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 14, fontWeight: '900', color: colors.navy }}>Question Navigator</Text>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted, marginTop: 4 }}>Jump to any question</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 13 }}>
              {answeredFlags.map((done, i) => <Pressable key={i} onPress={() => setCurrent(i)} disabled={busy} style={{ width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: current === i ? colors.primary : done ? colors.greenSoft : '#F7F7FB', borderWidth: 1, borderColor: current === i ? colors.primary : done ? '#C8EFD8' : colors.border }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: current === i ? '#fff' : done ? colors.success : colors.navy }}>{i + 1}</Text></Pressable>)}
            </View>
            <View style={{ marginTop: 14, gap: 7 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>● Green = answered</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>● Purple = current</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, color: colors.muted }}>● Grey = unanswered</Text></View>
            <Button title="Save & Exit" variant="secondary" onPress={handleBack} disabled={busy} style={{ marginTop: 15, width: '100%' }} />
          </Card>
          <Card style={{ marginTop: 12, backgroundColor: '#F4F1FF', borderColor: '#DED7FF' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 12, fontWeight: '900', color: colors.navy }}>💡 Exam tip</Text><Text style={{ fontFamily: colors.fontFamily, fontSize: 9, lineHeight: 16, color: colors.muted, marginTop: 5 }}>Use Previous to review. Your answers are auto-saved while you move through the quiz.</Text></Card>
        </View>
      </View>
    </View>
  </AppShell>;
}
