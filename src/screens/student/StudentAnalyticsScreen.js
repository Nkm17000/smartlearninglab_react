import React, {useCallback, useEffect, useState} from 'react';
import {Text, View} from 'react-native';
import {AppShell, Badge, Card, ErrorState, Header, Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

const num = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export default function StudentAnalyticsScreen() {
  const [data, setData] = useState(null);
  const [advanced, setAdvanced] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const summary = await api.analyticsSummary();
      setData(summary?.basic || {});
      setAdvanced(summary?.advanced || null);
    } catch (e) {
      setError(e?.message || 'Unable to load analytics.');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) {
    return (
      <AppShell>
        <Header title="My Analytics" />
        <ErrorState title="Analytics could not load" message={error} onRetry={load}/>
      </AppShell>
    );
  }

  if (!data) return <AppShell><Loading label="Loading your analytics…"/></AppShell>;

  const xp = num(data.xp);
  const stats = [
    ['Courses enrolled', num(data.courses_enrolled)],
    ['Courses completed', num(data.courses_completed)],
    ['Lessons completed', num(data.lessons_completed)],
    ['Tests attempted', num(data.quiz_attempts)],
    ['Tests passed', num(data.quizzes_passed)],
    ['Average score', `${num(data.average_score).toFixed(1)}%`],
    ['Learning hours', num(data.learning_hours).toFixed(1)],
    ['XP', xp],
  ];

  const streak = data.streak || {};
  const levelProgress = Math.max(0, Math.min(100, (xp % 500) / 5));

  return (
    <AppShell>
      <Header eyebrow="Your learning" title="My Analytics" subtitle="See your learning activity, performance and streak."/>

      <View style={{flexDirection:'row',flexWrap:'wrap',gap:12}}>
        {stats.map(([label,value]) => (
          <Card key={label} style={{flex:1,minWidth:180}}>
            <Text style={{fontSize:12,color:colors.muted,fontWeight:'800'}}>{label}</Text>
            <Text style={{fontSize:25,fontWeight:'900',color:colors.navy,marginTop:7}}>{value}</Text>
          </Card>
        ))}
      </View>

      {advanced && (
        <Card>
          <Text style={{fontSize:19,fontWeight:'900',color:colors.navy}}>Advanced learning analytics</Text>
          <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:12}}>
            {[
              ['Courses', num(advanced.courses_enrolled)],
              ['Lessons', num(advanced.lessons_completed)],
              ['Tests', num(advanced.tests_taken)],
              ['Average', `${num(advanced.average_score).toFixed(1)}%`],
            ].map(([label,value]) => (
              <View key={label} style={{padding:12,backgroundColor:'#F8F9FD',borderRadius:12,minWidth:110}}>
                <Text style={{fontSize:11,color:colors.muted,fontWeight:'800'}}>{label}</Text>
                <Text style={{fontSize:20,fontWeight:'900',color:colors.navy,marginTop:3}}>{value}</Text>
              </View>
            ))}
          </View>
        </Card>
      )}

      <Card style={{backgroundColor:colors.navy,borderColor:colors.navy}}>
        <Text style={{color:'#fff',fontSize:20,fontWeight:'900'}}>🔥 Learning streak</Text>
        <Text style={{color:'#E9EAF3',marginTop:7}}>Keep learning every day to grow your streak.</Text>
        <View style={{flexDirection:'row',gap:10,marginTop:18,flexWrap:'wrap'}}>
          <Badge tone="pink">Current: {num(streak.current)} days</Badge>
          <Badge tone="orange">Best: {num(streak.best)} days</Badge>
          {streak.active_today && <Badge tone="green">Active today ✓</Badge>}
        </View>
      </Card>

      <Card>
        <Text style={{fontSize:19,fontWeight:'900',color:colors.navy}}>Level {num(data.level, 1)}</Text>
        <Text style={{color:colors.muted,marginTop:5}}>Earn XP by completing lessons, attempting tests and passing assessments.</Text>
        <View style={{height:10,backgroundColor:'#E9EAF3',borderRadius:10,marginTop:15,overflow:'hidden'}}>
          <View style={{height:10,width:`${levelProgress}%`,backgroundColor:colors.primary}}/>
        </View>
        <Text style={{fontSize:12,color:colors.muted,marginTop:6}}>{Math.round(xp % 500)}/500 XP to next level</Text>
      </Card>
    </AppShell>
  );
}
