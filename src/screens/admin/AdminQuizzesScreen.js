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
} from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

export default function AdminQuizzesScreen() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
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
  }, []);

  const filtered = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return items;

    return items.filter((quiz) => {
      const text = [
        quiz.title,
        quiz.name,
        quiz.category,
        quiz.description,
        quiz.exam,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return text.includes(value);
    });
  }, [items, search]);

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
            <Text style={{ color: '#E9EAF3', marginTop: 4 }}>
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

        <Button title="↻ Refresh" variant="secondary" onPress={load} />
      </View>

      {filtered.length === 0 ? (
        <Empty
          title="No quizzes found"
          message={
            search
              ? 'Try a different search.'
              : 'Create a quiz from Bulk Content or Course Builder first.'
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
            <Card key={id} style={{ backgroundColor: '#FBFBFE' }}>
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
                      {quiz.category || 'General'}
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
