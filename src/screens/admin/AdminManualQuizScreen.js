import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import {
  AppShell,
  Badge,
  Button,
  Card,
  Field,
  Header,
  Select,
} from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const createQuestion = () => ({
  question: '',
  options: ['', '', '', ''],
  correct_answer: 0,
  difficulty: 'easy',
  marks: '1',
  negative_marks: '0',
  explanation: '',
});

const initialQuestions = () => Array.from({ length: 10 }, createQuestion);

export default function AdminManualQuizScreen({ onBack }) {
  const [quiz, setQuiz] = useState({
    title: '',
    subject: '',
    topic: '',
    exam: '',
    description: '',
    duration_minutes: '15',
    passing_percentage: '60',
    max_attempts: '3',
  });
  const [questions, setQuestions] = useState(initialQuestions);
  const [saving, setSaving] = useState(false);
  const [taxonomy, setTaxonomy] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState([]);
  const [taxonomyLoading, setTaxonomyLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.adminTaxonomy()
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : response?.categories || [];
        setTaxonomy(rows);
      })
      .catch((e) => {
        if (active) Alert.alert('Category setup', e?.message || 'Unable to load categories.');
      })
      .finally(() => {
        if (active) setTaxonomyLoading(false);
      });
    return () => { active = false; };
  }, []);

  const toggleCategory = (categoryId) => {
    setSelectedCategories((current) => {
      const exists = current.includes(categoryId);
      if (exists) {
        const category = taxonomy.find((x) => String(x.id) === String(categoryId));
        const childIds = (category?.subcategories || []).map((x) => String(x.id));
        setSelectedSubcategories((subs) => subs.filter((id) => !childIds.includes(String(id))));
        return current.filter((id) => id !== categoryId);
      }
      return [...current, categoryId];
    });
  };

  const toggleSubcategory = (subcategoryId) => {
    setSelectedSubcategories((current) =>
      current.includes(subcategoryId)
        ? current.filter((id) => id !== subcategoryId)
        : [...current, subcategoryId]
    );
  };

  const completedQuestions = useMemo(
    () => questions.filter((q) => q.question.trim()).length,
    [questions]
  );

  const updateQuestion = (index, patch) => {
    setQuestions((current) =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    setQuestions((current) =>
      current.map((item, i) => {
        if (i !== questionIndex) return item;
        const options = [...item.options];
        options[optionIndex] = value;
        return { ...item, options };
      })
    );
  };

  const validate = () => {
    if (!quiz.title.trim()) return 'Quiz title is required.';
    if (!quiz.subject.trim()) return 'Subject is required.';
    if (!quiz.topic.trim()) return 'Topic is required.';
    if (!selectedCategories.length) return 'Select at least one category.';
    if (!selectedSubcategories.length) return 'Select at least one subcategory.';

    const validSelectedSubcategories = new Set(
      taxonomy
        .filter((cat) => selectedCategories.includes(cat.id))
        .flatMap((cat) => (cat.subcategories || []).map((sub) => sub.id))
    );
    if (selectedSubcategories.some((id) => !validSelectedSubcategories.has(id))) {
      return 'Every selected subcategory must belong to a selected category.';
    }

    for (let i = 0; i < questions.length; i += 1) {
      const q = questions[i];
      if (!q.question.trim()) return `Question ${i + 1} is required.`;
      if (q.options.some((option) => !option.trim())) {
        return `All four options are required for question ${i + 1}.`;
      }
      if (![0, 1, 2, 3].includes(Number(q.correct_answer))) {
        return `Select a correct answer for question ${i + 1}.`;
      }
    }
    return '';
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Manual Quiz', validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...quiz,
        duration_minutes: Number(quiz.duration_minutes) || 15,
        passing_percentage: Number(quiz.passing_percentage) || 60,
        max_attempts: Number(quiz.max_attempts) || 3,
        category_ids: selectedCategories,
        subcategory_ids: selectedSubcategories,
        questions: questions.map((q) => ({
          ...q,
          correct_answer: Number(q.correct_answer),
          marks: Number(q.marks) || 1,
          negative_marks: Number(q.negative_marks) || 0,
        })),
      };

      await api.createManualQuiz(payload);
      Alert.alert(
        'Quiz created',
        'The quiz was saved as a draft. You can publish it from Quiz Management.',
        [{ text: 'OK', onPress: onBack }]
      );
    } catch (e) {
      Alert.alert('Create quiz', e?.message || 'Unable to create quiz.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell>
      <Header
        eyebrow="Test Series"
        title="Create Quiz Manually"
        subtitle="Create a standalone 10-question MCQ quiz for students."
        right={onBack ? <Button title="← Quiz Management" variant="secondary" onPress={onBack} /> : null}
      />

      <Card style={{ backgroundColor: colors.navy, borderColor: colors.navy }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 30 }}>✍️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 21, fontWeight: '900' }}>
              Manual quiz builder
            </Text>
            <Text style={{ color: '#CBD5E1', marginTop: 4 }}>
              Complete all 10 questions. The quiz will be created as Draft.
            </Text>
          </View>
          <Badge tone={completedQuestions === 10 ? 'green' : 'orange'}>
            {completedQuestions}/10 Questions
          </Badge>
        </View>
      </Card>

      <Card>
        <Text style={{ fontSize: 19, fontWeight: '900', color: colors.navy, marginBottom: 10 }}>
          Quiz details
        </Text>
        <Field
          label="Quiz title"
          value={quiz.title}
          onChangeText={(value) => setQuiz({ ...quiz, title: value })}
          placeholder="English Grammar - Noun"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Field
              label="Subject"
              value={quiz.subject}
              onChangeText={(value) => setQuiz({ ...quiz, subject: value })}
              placeholder="English"
            />
          </View>
          <View style={{ flex: 1, minWidth: 220 }}>
            <Field
              label="Topic"
              value={quiz.topic}
              onChangeText={(value) => setQuiz({ ...quiz, topic: value })}
              placeholder="Noun"
            />
          </View>
        </View>
        <Text style={{ fontSize: 16, fontWeight: '900', color: colors.navy, marginTop: 4 }}>
          Categories & Subcategories
        </Text>
        <Text style={{ color: colors.muted, marginTop: 3, marginBottom: 8 }}>
          Select one or more categories. Only subcategories belonging to selected categories are shown.
        </Text>
        {taxonomyLoading ? (
          <Text style={{ color: colors.muted, marginBottom: 12 }}>Loading categories...</Text>
        ) : (
          <View style={{ gap: 12, marginBottom: 14 }}>
            {taxonomy.map((category) => {
              const selected = selectedCategories.includes(category.id);
              const visibleSubs = selected ? (category.subcategories || []) : [];
              return (
                <Card key={category.id} style={{ backgroundColor: selected ? '#EEF6FF' : '#FFFFFF', borderColor: selected ? colors.blue : colors.border }}>
                  <Button
                    title={`${selected ? '✓ ' : ''}${category.name}`}
                    variant={selected ? 'primary' : 'secondary'}
                    onPress={() => toggleCategory(category.id)}
                  />
                  {selected && visibleSubs.length > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                      {visibleSubs.map((sub) => {
                        const subSelected = selectedSubcategories.includes(sub.id);
                        return (
                          <Button
                            key={sub.id}
                            title={`${subSelected ? '✓ ' : ''}${sub.name}`}
                            variant={subSelected ? 'primary' : 'secondary'}
                            onPress={() => toggleSubcategory(sub.id)}
                          />
                        );
                      })}
                    </View>
                  )}
                </Card>
              );
            })}
          </View>
        )}

        <Field
          label="Description"
          value={quiz.description}
          onChangeText={(value) => setQuiz({ ...quiz, description: value })}
          multiline
          placeholder="10-question practice test"
        />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Field
              label="Duration (minutes)"
              value={quiz.duration_minutes}
              onChangeText={(value) => setQuiz({ ...quiz, duration_minutes: value })}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Field
              label="Passing percentage"
              value={quiz.passing_percentage}
              onChangeText={(value) => setQuiz({ ...quiz, passing_percentage: value })}
              keyboardType="numeric"
            />
          </View>
          <View style={{ flex: 1, minWidth: 180 }}>
            <Field
              label="Maximum attempts"
              value={quiz.max_attempts}
              onChangeText={(value) => setQuiz({ ...quiz, max_attempts: value })}
              keyboardType="numeric"
            />
          </View>
        </View>
      </Card>

      {questions.map((q, index) => (
        <Card key={index} style={{ backgroundColor: '#FAFCFF' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <Badge tone="purple">Question {index + 1}</Badge>
            <Text style={{ color: colors.muted, fontSize: 12 }}>
              MCQ · 4 options
            </Text>
          </View>

          <Field
            label="Question"
            value={q.question}
            onChangeText={(value) => updateQuestion(index, { question: value })}
            multiline
            placeholder={`Write question ${index + 1}`}
          />

          {q.options.map((option, optionIndex) => (
            <Field
              key={optionIndex}
              label={`Option ${String.fromCharCode(65 + optionIndex)}`}
              value={option}
              onChangeText={(value) => updateOption(index, optionIndex, value)}
              placeholder={`Option ${String.fromCharCode(65 + optionIndex)}`}
            />
          ))}

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            <View style={{ flex: 1, minWidth: 220 }}>
              <Select
                label="Correct answer"
                value={Number(q.correct_answer)}
                onChange={(value) => updateQuestion(index, { correct_answer: Number(value) })}
                options={[0, 1, 2, 3].map((value) => ({
                  value,
                  label: `Option ${String.fromCharCode(65 + value)}`,
                }))}
              />
            </View>
            <View style={{ flex: 1, minWidth: 180 }}>
              <Select
                label="Difficulty"
                value={q.difficulty}
                onChange={(value) => updateQuestion(index, { difficulty: value })}
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
              />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field
                label="Marks"
                value={q.marks}
                onChangeText={(value) => updateQuestion(index, { marks: value })}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Field
                label="Negative marks"
                value={q.negative_marks}
                onChangeText={(value) => updateQuestion(index, { negative_marks: value })}
                keyboardType="numeric"
              />
            </View>
          </View>

          <Field
            label="Explanation"
            value={q.explanation}
            onChangeText={(value) => updateQuestion(index, { explanation: value })}
            multiline
            placeholder="Explain why the answer is correct"
          />
        </Card>
      ))}

      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <Button
            title={saving ? 'Creating Quiz...' : 'Create Quiz as Draft'}
            onPress={save}
            disabled={saving}
          />
          {onBack && (
            <Button title="Cancel" variant="secondary" onPress={onBack} disabled={saving} />
          )}
        </View>
      </Card>
    </AppShell>
  );
}
