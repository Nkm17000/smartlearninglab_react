import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Empty,
  ErrorState,
  Field,
  Header,
  Loading,
  DropdownSelect,
} from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

export default function AdminQuizzesScreen({ onCreateManual }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subject, setSubject] = useState('All');
  const [subcategory, setSubcategory] = useState('All');
  const [status, setStatus] = useState('All');
  const [quizType, setQuizType] = useState('All');
  const [hasQuestions, setHasQuestions] = useState('All');
  const [taxonomy, setTaxonomy] = useState({ categories: [], subjects: [] });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [publishingAll, setPublishingAll] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.quizzes();
      setItems(api.listOf(response));
    } catch (e) {
      setError(e?.message || 'Unable to load quizzes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    api.adminTaxonomy().then((x) => setTaxonomy(x || {})).catch(() => {});
  }, []);

  const categoryOptions = [
    { value: 'All', label: 'All categories' },
    ...((taxonomy.categories || taxonomy.allowed_categories || []).map((x) => ({
      value: typeof x === 'string' ? x : x.name,
      label: typeof x === 'string' ? x : x.name,
    }))),
  ];
  const subjectOptions = [
    { value: 'All', label: 'All subjects' },
    ...((taxonomy.subjects || []).map((x) => ({ value: typeof x === 'string' ? x : x.name, label: typeof x === 'string' ? x : x.name }))),
  ];

  const selectedCategory = category === 'All' ? null : category;
  const subcategoryOptions = useMemo(() => {
    const out = [{ value: 'All', label: 'All subcategories' }];
    if (!selectedCategory) return out;
    const all = items.flatMap((q) => {
      const pairs = Array.isArray(q.category_subcategory_map) ? q.category_subcategory_map : [];
      const direct = Array.isArray(q.subcategories) ? q.subcategories : (q.subcategory ? [q.subcategory] : []);
      const pair = pairs.find((x) => String(x.category || x.category_name || x.category_id) === String(selectedCategory));
      return pair?.subcategories || direct;
    });
    return out.concat([...new Set(all.filter(Boolean).map(String))].sort((a,b)=>a.localeCompare(b)).map((x)=>({value:x,label:x})));
  }, [items, selectedCategory]);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    const contains = (quiz, field, selected) => {
      if (!selected || selected === 'All') return true;
      const values = Array.isArray(quiz[field]) ? quiz[field] : [quiz[field]];
      return values.filter(Boolean).some((v) => String(v).toLowerCase() === String(selected).toLowerCase());
    };
    return items.filter((quiz) => {
      const text = [quiz.title, quiz.name, quiz.category, quiz.categories, quiz.subcategory, quiz.subcategories, quiz.subject, quiz.description, quiz.exam, quiz.topic]
        .flat().filter(Boolean).join(' ').toLowerCase();
      if (value && !text.includes(value)) return false;
      if (!contains(quiz, 'categories', category) && String(quiz.category || '').toLowerCase() !== category.toLowerCase()) return false;
      if (!contains(quiz, 'subcategories', subcategory) && String(quiz.subcategory || '').toLowerCase() !== subcategory.toLowerCase()) return false;
      if (subject !== 'All' && String(quiz.subject || '').toLowerCase() !== subject.toLowerCase()) return false;
      if (status === 'Published' && quiz.is_published !== true) return false;
      if (status === 'Unpublished' && quiz.is_published === true) return false;
      if (quizType === 'Standalone' && quiz.course_id) return false;
      if (quizType === 'Course' && !quiz.course_id) return false;
      const count = Array.isArray(quiz.question_ids) ? quiz.question_ids.length : Number(quiz.question_count || 0);
      if (hasQuestions === 'Ready' && count < 1) return false;
      if (hasQuestions === 'Empty' && count > 0) return false;
      return true;
    });
  }, [items, search, category, subject, subcategory, status, quizType, hasQuestions]);

  const togglePublish = async (quiz) => {
    const id = api.idOf(quiz);
    if (!id) return;

    const isPublished = quiz.is_published === true;
    const questionCount = Array.isArray(quiz.question_ids)
      ? quiz.question_ids.length
      : Number(quiz.question_count || 0);

    if (!isPublished && questionCount === 0) {
      Alert.alert(
        'Cannot publish quiz',
        'Add at least one question before publishing this quiz.'
      );
      return;
    }

    setBusyId(id);

    try {
      if (isPublished) {
        await api.unpublishQuiz(id);
      } else {
        await api.publishQuiz(id);
      }

      await load();
    } catch (e) {
      Alert.alert(
        isPublished ? 'Unpublish quiz' : 'Publish quiz',
        e?.message || 'Unable to update quiz status.'
      );
    } finally {
      setBusyId('');
    }
  };

  const publishAll = async () => {
    const draftCount = items.filter((quiz) => quiz.is_published !== true).length;
    if (!draftCount) {
      Alert.alert('Publish All', 'There are no draft quizzes to publish.');
      return;
    }

    Alert.alert(
      'Publish all quizzes?',
      `This will publish all eligible draft quizzes, not only the current search results. Empty or invalid quizzes will be skipped.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Publish All',
          onPress: async () => {
            setPublishingAll(true);
            try {
              const result = await api.publishAllQuizzes();
              const skipped = Number(result?.skipped_count || 0);
              const published = Number(result?.published_count || 0);
              Alert.alert(
                'Publish All Complete',
                `${published} quiz(es) published.${skipped ? ` ${skipped} skipped because they have no questions or missing questions.` : ''}`
              );
              await load();
            } catch (e) {
              Alert.alert('Publish All', e?.message || 'Unable to publish quizzes.');
            } finally {
              setPublishingAll(false);
            }
          },
        },
      ]
    );
  };

  const removeQuiz = (quiz) => {
    const id = api.idOf(quiz);
    if (!id) return;

    Alert.alert(
      'Delete quiz?',
      `This will delete "${quiz.title || quiz.name || 'this quiz'}".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setBusyId(id);
            try {
              await api.deleteQuiz(id);
              await load();
            } catch (e) {
              Alert.alert('Delete quiz', e?.message || 'Unable to delete quiz.');
            } finally {
              setBusyId('');
            }
          },
        },
      ]
    );
  };

  if (error) {
    return (
      <AppShell>
        <ErrorState title="Quizzes could not load" message={error} onRetry={load} />
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell>
        <Loading label="Loading quizzes..." />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Header
        eyebrow="Test Series"
        title="Quiz Management"
        subtitle="Create, review and publish quizzes for students."
      />

      <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 32 }}>📝</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>
              Publish quizzes
            </Text>
            <Text style={{ color: '#CBD5E1', marginTop: 4 }}>
              Published standalone quizzes appear in Test Series and on the student home page.
            </Text>
          </View>
          <Badge tone="green">
            {items.filter((x) => x.is_published).length} Published
          </Badge>
        </View>
      </Card>

      <Field
        label="Search quizzes"
        value={search}
        onChangeText={setSearch}
        placeholder="Search by title, category, exam..."
      />

      <Card>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.navy, marginBottom: 10 }}>Filters</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 210 }}><DropdownSelect label="Category" value={category} onChange={(v) => { setCategory(v); setSubcategory('All'); }} options={categoryOptions} /></View>
          <View style={{ flex: 1, minWidth: 210 }}><DropdownSelect label="Subject" value={subject} onChange={setSubject} options={subjectOptions} /></View>
          <View style={{ flex: 1, minWidth: 210 }}><DropdownSelect label="Subcategory" value={subcategory} onChange={setSubcategory} options={subcategoryOptions} /></View>
          <View style={{ flex: 1, minWidth: 180 }}><DropdownSelect label="Status" value={status} onChange={setStatus} options={[{value:'All',label:'All statuses'},{value:'Published',label:'Published'},{value:'Unpublished',label:'Unpublished'}]} /></View>
          <View style={{ flex: 1, minWidth: 180 }}><DropdownSelect label="Quiz type" value={quizType} onChange={setQuizType} options={[{value:'All',label:'All types'},{value:'Standalone',label:'Standalone'},{value:'Course',label:'Course quiz'}]} /></View>
          <View style={{ flex: 1, minWidth: 180 }}><DropdownSelect label="Questions" value={hasQuestions} onChange={setHasQuestions} options={[{value:'All',label:'Any question state'},{value:'Ready',label:'Has questions'},{value:'Empty',label:'No questions'}]} /></View>
        </View>
        <View style={{ marginTop: 10 }}><Button title="Reset Filters" variant="secondary" onPress={() => { setSearch(''); setCategory('All'); setSubject('All'); setSubcategory('All'); setStatus('All'); setQuizType('All'); setHasQuestions('All'); }} /></View>
      </Card>

      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          gap: 10,
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 20, fontWeight: '900', color: colors.navy }}>
            All quizzes
          </Text>
          <Text style={{ color: colors.muted, marginTop: 3 }}>
            {filtered.length} quiz{filtered.length === 1 ? '' : 'zes'}
          </Text>
        </View>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {onCreateManual && (
            <Button title="+ Create Quiz Manually" onPress={onCreateManual} />
          )}
          <Button
            title={publishingAll ? 'Publishing All...' : 'Publish All'}
            onPress={publishAll}
            disabled={publishingAll}
          />
          <Button title="↻ Refresh" variant="secondary" onPress={load} disabled={publishingAll} />
        </View>
      </View>

      {filtered.length === 0 ? (
        <Empty
          title="No quizzes found"
          message={
            search
              ? 'Try a different search.'
              : 'Create a quiz manually or use Bulk Content / Course Builder.'
          }
        />
      ) : (
        filtered.map((quiz) => {
          const id = api.idOf(quiz);
          const published = quiz.is_published === true;
          const questions = Array.isArray(quiz.question_ids)
            ? quiz.question_ids.length
            : Number(quiz.question_count || 0);
          const standalone = !quiz.course_id;

          return (
            <Card key={id} style={{ backgroundColor: '#FAFCFF' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <Text style={{ fontSize: 28 }}>📝</Text>

                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 18,
                      fontWeight: '900',
                      color: colors.navy,
                    }}
                  >
                    {quiz.title || quiz.name || 'Untitled Quiz'}
                  </Text>

                  <Text style={{ color: colors.muted, marginTop: 4 }}>
                    {quiz.description || 'No description'}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: 'wrap',
                      gap: 6,
                      marginTop: 9,
                    }}
                  >
                    <Badge tone={published ? 'green' : 'orange'}>
                      {published ? 'Published' : 'Draft'}
                    </Badge>

                    <Badge tone="purple">
                      {Array.isArray(quiz.categories) ? quiz.categories.join(', ') : (quiz.category || 'General')}
                    </Badge>

                    <Badge tone="purple">
                      {quiz.subject || 'Other'}
                    </Badge>

                    <Badge>
                      {questions} question{questions === 1 ? '' : 's'}
                    </Badge>

                    <Badge>
                      {quiz.duration_minutes || 15} min
                    </Badge>

                    {standalone && <Badge tone="green">Standalone Test</Badge>}
                    {!standalone && <Badge tone="purple">Course Quiz</Badge>}
                  </View>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginTop: 14,
                }}
              >
                <Button
                  title={
                    busyId === id
                      ? published
                        ? 'Unpublishing...'
                        : 'Publishing...'
                      : published
                        ? 'Unpublish'
                        : 'Publish Quiz'
                  }
                  onPress={() => togglePublish(quiz)}
                  disabled={busyId === id}
                />

                <Button
                  title="Delete"
                  variant="danger"
                  onPress={() => removeQuiz(quiz)}
                  disabled={busyId === id}
                />
              </View>

              {!published && (
                <Text
                  style={{
                    marginTop: 9,
                    color: colors.muted,
                    fontSize: 12,
                  }}
                >
                  {questions === 0
                    ? 'Add questions before publishing.'
                    : 'This quiz is a draft. Publish it when it is ready for students.'}
                </Text>
              )}
            </Card>
          );
        })
      )}
    </AppShell>
  );
}
