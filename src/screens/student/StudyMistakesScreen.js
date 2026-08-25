import React, {useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {AppShell, Badge, Card, Empty, ErrorState, Header, Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

export default function StudyMistakesScreen() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api.allResults().then(setRows).catch(e => {
      if (e?.message !== 'SESSION_EXPIRED') setError(e?.message || 'Could not load mistakes.');
    });
  }, []);
  if (error) return <AppShell><Header title="Mistake Review" subtitle="Review questions you got wrong."/><ErrorState message={error}/></AppShell>;
  if (!rows) return <AppShell><Header title="Mistake Review" subtitle="Review questions you got wrong."/><Loading/></AppShell>;
  const mistakes = [];
  rows.forEach(row => (row.details || row.result?.details || []).forEach(detail => {
    if (!detail.correct) mistakes.push({...detail, quiz_title: row.quiz_title || row.title || 'Quiz'});
  }));
  return <AppShell>
    <Header title="Mistake Review" subtitle="Review incorrect answers and explanations."/>
    {!mistakes.length ? <Empty title="No mistakes to review" message="Excellent. Keep practicing to maintain your score."/> : mistakes.slice(0, 30).map((m, i) => (
      <Card key={`${m.question_id}-${i}`}>
        <Badge tone="red">REVIEW</Badge>
        <Text style={{fontFamily:colors.fontFamily,fontWeight:'900',color:colors.navy,lineHeight:20,marginTop:8}}>{m.question}</Text>
        <Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.muted,marginTop:7}}>Your answer: {m.submitted_text || 'Not answered'}</Text>
        <Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.success,fontWeight:'800',marginTop:3}}>Correct: {m.correct_answer_text || m.correct_answer || 'See quiz review'}</Text>
        {m.explanation ? <Text style={{fontFamily:colors.fontFamily,fontSize:11,color:colors.text,lineHeight:17,marginTop:7}}>{m.explanation}</Text> : null}
      </Card>
    ))}
  </AppShell>;
}
