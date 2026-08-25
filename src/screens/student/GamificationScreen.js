import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { AppShell, Badge, Button, Card, ErrorState, Loading, ProgressBar } from '../../components/UI';
import { api } from '../../services/api';
import { colors } from '../../theme';

const GAMES = [
  { phase: 'Phase 1', icon: '🔥', title: 'Daily Challenge', slug: 'daily-challenge', tone: colors.orangeSoft, description: 'Complete a short daily learning challenge and keep your streak alive.', meta: 'Daily • 5 questions' },
  { phase: 'Phase 1', icon: '⚡', title: 'Speed Quiz', slug: 'speed-quiz', tone: colors.cyanSoft, description: 'Answer quick-fire questions before the timer runs out.', meta: 'Timed • 60 seconds' },
  { phase: 'Phase 1', icon: '🃏', title: 'Flashcard Battle', slug: 'flashcard-battle', tone: colors.purpleSoft, description: 'Flip flashcards, recall the answer and build your score.', meta: 'Recall • 5 cards' },
  { phase: 'Phase 2', icon: '🧠', title: 'Match & Learn', slug: 'match-learn', tone: colors.greenSoft, description: 'Match learning concepts with the correct definitions or answers.', meta: 'Memory • 5 matches' },
  { phase: 'Phase 2', icon: '🔤', title: 'Word Scramble', slug: 'word-scramble', tone: colors.pinkSoft, description: 'Unscramble important learning terms before time runs out.', meta: 'Vocabulary • 5 words' },
  { phase: 'Phase 3', icon: '🐉', title: 'Boss Battle', slug: 'boss-battle', tone: '#F0EEFF', description: 'Face a final mixed challenge and earn a larger XP reward.', meta: 'Boss • 10 questions' },
];
const phaseColors = { 'Phase 1': colors.primary, 'Phase 2': colors.purple, 'Phase 3': colors.navy };
const ff = colors.fontFamily;

function GameOption({ label, text, selected, correct, wrong, onPress, disabled }) {
  return <Pressable disabled={disabled} onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.2, borderColor: correct ? colors.success : wrong ? colors.danger : selected ? colors.primary : colors.border, backgroundColor: correct ? colors.greenSoft : wrong ? '#FFF0F6' : selected ? colors.blueSoft : '#fff', borderRadius: 13, padding: 13, marginBottom: 9, opacity: pressed ? .8 : 1 })}>
    <View style={{ width: 30, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: correct ? colors.success : wrong ? colors.danger : selected ? colors.primary : '#F7F7FB' }}><Text style={{ color: correct || wrong || selected ? '#fff' : colors.navy, fontWeight: '900' }}>{label}</Text></View>
    <Text style={{ flex: 1, fontFamily: colors.fontFamily, color: colors.navy, fontSize: 13, fontWeight: selected || correct ? '900' : '700', lineHeight: 20 }}>{text}</Text>
  </Pressable>;
}

export default function GamificationScreen() {
  const { width } = useWindowDimensions();
  const mobile = width < 820;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [textAnswer, setTextAnswer] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await api.gamification()); }
    catch (e) { setError(e?.message || 'Unable to load gamification data.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const grouped = useMemo(() => ({
    'Phase 1': GAMES.filter(g => g.phase === 'Phase 1'),
    'Phase 2': GAMES.filter(g => g.phase === 'Phase 2'),
    'Phase 3': GAMES.filter(g => g.phase === 'Phase 3'),
  }), []);

  const startGame = async (game) => {
    setBusy(true); setSelectedGame(game); setSession(null); setSelected(null); setSubmitted(false); setFlipped(false); setTextAnswer(''); setResult(null);
    try {
      const s = await api.gamificationStart(game.slug);
      setSession(s);
    } catch (e) {
      Alert.alert(game.title, e?.message || 'Unable to start this game.');
      setSelectedGame(null);
    } finally { setBusy(false); }
  };

  const currentItem = session?.items?.[session?.current_index || 0];
  const total = Number(session?.total || session?.items?.length || 0);
  const currentNumber = Number(session?.current_index || 0) + 1;

  const submitAnswer = async (answer) => {
    if (!session || submitted || busy) return;
    setBusy(true);
    try {
      const r = await api.gamificationAnswer(session.session_id, { answer });
      setSubmitted(true); setResult(r);
      if (r.finished) {
        await load();
      }
    } catch (e) { Alert.alert('Game', e?.message || 'Unable to submit answer.'); }
    finally { setBusy(false); }
  };

  const next = () => {
    if (!result?.finished) {
      setSession(prev => ({ ...prev, current_index: Number(prev.current_index || 0) + 1 }));
      setSelected(null); setSubmitted(false); setFlipped(false); setTextAnswer(''); setResult(null);
    }
  };

  const finishGame = async () => {
    if (!session) return;
    setBusy(true);
    try { const r = await api.gamificationFinish(session.session_id); setResult(r); setSubmitted(true); await load(); }
    catch (e) { Alert.alert('Game', e?.message || 'Unable to finish game.'); }
    finally { setBusy(false); }
  };

  if (loading) return <AppShell><Loading label="Loading gamification…" /></AppShell>;
  if (error) return <AppShell><ErrorState title="Gamification could not load" message={error} onRetry={load} /></AppShell>;

  const xp = Number(data?.xp || 0); const level = Number(data?.level || 1); const currentLevelXp = xp % 500; const levelProgress = Math.min(100, Math.round(currentLevelXp / 500 * 100));

  if (session && selectedGame) {
    const finished = Boolean(result?.finished || (result?.status === 'completed'));
    return <AppShell>
      <View style={{ maxWidth: 980, width: '100%', alignSelf: 'center' }}>
        <Pressable onPress={() => { setSession(null); setSelectedGame(null); }} style={{ marginBottom: 12 }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 11, fontWeight: '900', color: colors.primary }}>‹ Back to Gamification</Text></Pressable>
        <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}><Badge tone="purple">{selectedGame.phase}</Badge><Text style={{ fontFamily: colors.fontFamily, color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 9 }}>{selectedGame.icon} {selectedGame.title}</Text><Text style={{ fontFamily: colors.fontFamily, color: '#D6D8F2', fontSize: 11, marginTop: 4 }}>{session.description || selectedGame.description}</Text></View>
            <View style={{ alignItems: 'flex-end' }}><Text style={{ color: '#AFA8FF', fontSize: 10, fontWeight: '900' }}>SCORE</Text><Text style={{ color: '#fff', fontSize: 26, fontWeight: '900' }}>{session.score || 0}</Text></View>
          </View>
          <View style={{ marginTop: 15 }}><ProgressBar value={total ? Math.round((currentNumber - 1) / total * 100) : 0} color={colors.gold} /><Text style={{ color: '#D6D8F2', fontSize: 10, marginTop: 5 }}>{Math.min(currentNumber, total)} / {total} completed</Text></View>
        </Card>

        {finished ? <Card style={{ marginTop: 14, alignItems: 'center', padding: 35 }}>
          <Text style={{ fontSize: 52 }}>{result?.passed ? '🏆' : '🎉'}</Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 27, fontWeight: '900', color: colors.navy, marginTop: 8 }}>Game Complete!</Text>
          <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, marginTop: 5 }}>You earned <Text style={{ fontWeight: '900', color: colors.primary }}>{result?.total_xp ?? result?.xp_earned ?? 0} XP</Text></Text>
          <Text style={{ fontFamily: colors.fontFamily, fontSize: 42, fontWeight: '900', color: colors.navy, marginTop: 12 }}>{result?.score || session.score || 0}</Text>
          <Text style={{ fontFamily: colors.fontFamily, color: colors.muted }}>Final score</Text>
          <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 9, marginTop: 22, width: '100%' }}><Button title="Play Again" onPress={() => startGame(selectedGame)} style={{ flex: 1 }} /><Button title="Back to Games" variant="secondary" onPress={() => { setSession(null); setSelectedGame(null); }} style={{ flex: 1 }} /></View>
        </Card> : currentItem ? <Card style={{ marginTop: 14 }}>
          <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, fontSize: 11 }}>Round {currentNumber} of {total}</Text>
          {session.game_type === 'flashcard' ? <>
            <Pressable onPress={() => setFlipped(v => !v)} style={{ marginTop: 13, minHeight: 250, borderRadius: 20, padding: 25, backgroundColor: flipped ? colors.purpleSoft : colors.orangeSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, fontWeight: '900', color: colors.primary, letterSpacing: 1 }}>{flipped ? 'ANSWER' : 'QUESTION'}</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 25, fontWeight: '900', color: colors.navy, textAlign: 'center', marginTop: 12 }}>{flipped ? currentItem.back : currentItem.front}</Text>
              <Text style={{ fontFamily: colors.fontFamily, fontSize: 10, color: colors.muted, marginTop: 18 }}>Tap to flip</Text>
            </Pressable>
            {flipped && <View style={{ marginTop: 15 }}><Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: colors.navy, marginBottom: 9 }}>How well did you remember it?</Text><View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{[['1','Again'],['3','Good'],['5','Easy']].map(([v,l]) => <Button key={v} title={`${v} • ${l}`} onPress={() => submitAnswer(Number(v))} disabled={busy} />)}</View></View>}
          </> : session.game_type === 'word_scramble' ? <>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 24, fontWeight: '900', color: colors.navy, marginTop: 14 }}>Unscramble this word</Text>
            <View style={{ padding: 20, borderRadius: 16, backgroundColor: colors.blueSoft, marginTop: 14, alignItems: 'center' }}><Text style={{ fontFamily: colors.fontFamily, fontSize: 30, fontWeight: '900', color: colors.primary, letterSpacing: 3 }}>{currentItem.scrambled}</Text></View>
            <TextInput value={textAnswer} onChangeText={setTextAnswer} editable={!submitted} autoCapitalize="none" placeholder="Type the correct word" style={{ marginTop: 15, borderWidth: 1, borderColor: colors.border, borderRadius: 13, padding: 13, backgroundColor: '#fff', color: colors.text }} />
            {!submitted && <Button title="Check Answer" onPress={() => submitAnswer(textAnswer.trim())} disabled={busy || !textAnswer.trim()} style={{ marginTop: 10 }} />}
          </> : <>
            <Text style={{ fontFamily: colors.fontFamily, fontSize: 21, fontWeight: '900', color: colors.navy, lineHeight: 29, marginTop: 14 }}>{currentItem.question || currentItem.left}</Text>
            <View style={{ marginTop: 16 }}>{(currentItem.options || currentItem.right_options || []).map((o, i) => { const label = typeof o === 'object' ? (o.text || o.label || o.value || '') : String(o); const chosen = selected === i; const correct = submitted && i === Number(result?.correct_index); const wrong = submitted && chosen && !correct; return <GameOption key={i} label={String.fromCharCode(65 + i)} text={label} selected={chosen} correct={correct} wrong={wrong} disabled={submitted || busy} onPress={() => { setSelected(i); submitAnswer(i); }} />; })}</View>
          </>}

          {submitted && !finished && <View style={{ marginTop: 14, padding: 13, borderRadius: 13, backgroundColor: result?.correct ? colors.greenSoft : colors.orangeSoft }}><Text style={{ fontFamily: colors.fontFamily, fontWeight: '900', color: result?.correct ? colors.success : colors.warning }}>{result?.correct ? 'Correct! +' : 'Not quite. '}{result?.total_xp ?? result?.xp_earned ?? 0} XP</Text>{result?.explanation && <Text style={{ fontFamily: colors.fontFamily, color: colors.muted, marginTop: 4, lineHeight: 18 }}>{result.explanation}</Text>}</View>}
          {submitted && !finished && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 }}><Button title="Next →" onPress={next} /></View>}
        </Card> : null}
      </View>
    </AppShell>;
  }

  const gameStats = [
    ['⚡', 'XP Earned', xp, '+120 this week', colors.orangeSoft],
    ['🔥', 'Lessons Played', Number(data?.lessons || 0), '+5 this week', colors.orangeSoft],
    ['🏆', 'Tests Passed', Number(data?.passed_tests || 0), 'Keep going!', colors.gold + '22'],
    ['🎖️', 'Badges Earned', Number(data?.badges?.length || 0), '+1 new', colors.purpleSoft],
  ];
  const streak = Number(data?.streak_days || 0);
  const bestStreak = Number(data?.best_streak || 0);
  const highScore = Number(data?.high_score || 0);
  const achievements = data?.achievements || [
    { icon: '🟢', title: 'Daily Starter', subtitle: 'Played a game today' },
    { icon: '🟠', title: 'Quick Learner', subtitle: 'Score 100% in any game' },
    { icon: '🔴', title: 'Streak Keeper', subtitle: `Maintain ${Math.max(3, streak)} day streak` },
    { icon: '🔵', title: 'First Challenger', subtitle: 'Complete your first game' },
  ];
  const leaderboard = data?.leaderboard || [];
  const phaseDescription = {
    'Phase 1': 'Start with quick daily games',
    'Phase 2': 'Build memory and vocabulary',
    'Phase 3': 'Take on the ultimate challenge',
  };

  return <AppShell>
    <View style={{ flexDirection: mobile ? 'column' : 'row', gap: 14 }}>
      <View style={{ flex: 1 }}>
        <Card style={{ backgroundColor: colors.hero, borderColor: colors.hero, minHeight: 180, overflow: 'hidden' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <View style={{ width: 105, height: 105, borderRadius: 28, backgroundColor: '#242752', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 58 }}>🎮</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: ff, color: '#fff', fontSize: 24, fontWeight: '900' }}>Your Learning Arcade</Text>
              <Text style={{ fontFamily: ff, color: '#E9EAF3', fontSize: 11, marginTop: 5 }}>Play real learning games, earn XP, build streaks and unlock badges.</Text>
              <View style={{ marginTop: 17, flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontFamily: ff, fontWeight: '900', fontSize: 11 }}>{xp} XP</Text>
                <Text style={{ color: '#E9EAF3', fontFamily: ff, fontSize: 10 }}>{level * 500} XP</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#30345D', borderRadius: 10, marginTop: 6, overflow: 'hidden' }}>
                <View style={{ width: `${levelProgress}%`, height: 10, backgroundColor: colors.gold, borderRadius: 10 }} />
              </View>
              <Text style={{ color: '#E9EAF3', fontFamily: ff, fontSize: 9, marginTop: 6, textAlign: 'center' }}>{Math.max(0, level * 500 - xp)} XP to reach level {level + 1}</Text>
            </View>
            <View style={{ width: 78, height: 88, borderRadius: 20, backgroundColor: '#30226D', borderWidth: 1, borderColor: '#6C55D9', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#C8BEFF', fontFamily: ff, fontSize: 9, fontWeight: '900' }}>LEVEL</Text>
              <Text style={{ color: '#fff', fontFamily: ff, fontSize: 31, fontWeight: '900' }}>{level}</Text>
            </View>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 }}>
          {gameStats.map(([icon, label, value, note, tone]) => <Card key={label} style={{ flex: 1, minWidth: 145, padding: 13 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={{ width: 42, height: 42, borderRadius: 14, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 22 }}>{icon}</Text></View>
              <View><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 18, fontWeight: '900' }}>{value}</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, marginTop: 2 }}>{label}</Text><Text style={{ fontFamily: ff, color: colors.success, fontSize: 8, fontWeight: '900', marginTop: 3 }}>{note}</Text></View>
            </View>
          </Card>)}
        </View>

        {Object.entries(grouped).map(([phase, games]) => <View key={phase} style={{ marginTop: 22 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <View><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 18, fontWeight: '900' }}>⚑ {phase}</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>{phaseDescription[phase]}</Text></View>
            <Badge tone={phase === 'Phase 3' ? 'purple' : 'green'}>{games.length} Games</Badge>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {games.map(game => <Card key={game.slug} style={{ flex: 1, minWidth: phase === 'Phase 3' ? 320 : 240, padding: 0, overflow: 'hidden' }}>
              <View style={{ padding: 15 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: game.tone, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 25 }}>{game.icon}</Text></View>
                  <View style={{ flex: 1 }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 14, fontWeight: '900' }}>{game.title}</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, marginTop: 3 }}>{game.meta}</Text></View>
                </View>
                <View style={{ minHeight: 58, marginTop: 12, justifyContent: 'center' }}><Text style={{ fontFamily: ff, color: colors.text, fontSize: 10, lineHeight: 17 }}>{game.description}</Text></View>
                <Button title={busy && selectedGame?.slug === game.slug ? 'Starting…' : 'Play Game →'} onPress={() => startGame(game)} disabled={busy} style={{ marginTop: 10, width: '100%' }} />
              </View>
            </Card>)}
          </View>
        </View>)}
      </View>

      {!mobile && <View style={{ width: 255 }}>
        <Card style={{ minHeight: 185 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 14, fontWeight: '900' }}>Your Streak</Text><Text style={{ fontSize: 28 }}>🔥</Text></View>
          <Text style={{ fontFamily: ff, color: colors.navy, fontSize: 27, fontWeight: '900', marginTop: 10 }}>{streak} Days</Text>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 3 }}>Keep it up!</Text>
          <View style={{ height: 9, backgroundColor: '#F0EAF0', borderRadius: 8, marginTop: 16, overflow: 'hidden' }}><View style={{ width: `${Math.min(100, streak * 12.5)}%`, height: 9, backgroundColor: colors.danger, borderRadius: 8 }} /></View>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, marginTop: 8 }}>Best streak: {bestStreak || Math.max(streak, 0)} days</Text>
        </Card>

        <Card style={{ marginTop: 13 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 14, fontWeight: '900' }}>Leaderboard</Text><Badge tone="blue">This Week</Badge></View>
          {(leaderboard.length ? leaderboard : [{rank:1,name:'Keep learning',xp:highScore||0},{rank:2,name:'You',xp}]).slice(0,5).map((u,i)=><View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F7F7FB' }}>
            <Text style={{ width: 19, fontFamily: ff, color: i < 3 ? colors.warning : colors.muted, fontWeight: '900', fontSize: 10 }}>{u.rank || i + 1}</Text>
            <View style={{ width: 27, height: 27, borderRadius: 14, backgroundColor: i === 0 ? colors.orangeSoft : colors.purpleSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 12 }}>{i === 0 ? '🏅' : 'ST'}</Text></View>
            <Text style={{ flex: 1, fontFamily: ff, color: colors.navy, fontWeight: '800', fontSize: 9 }}>{u.name || u.username || 'Student'}</Text>
            <Text style={{ fontFamily: ff, color: colors.muted, fontWeight: '800', fontSize: 8 }}>{u.xp || 0} XP</Text>
          </View>)}
          <Text style={{ color: colors.primary, fontFamily: ff, fontSize: 9, fontWeight: '900', marginTop: 10, textAlign: 'right' }}>View Full Leaderboard →</Text>
        </Card>

        <Card style={{ marginTop: 13 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 14, fontWeight: '900' }}>Recent Achievements</Text><Text style={{ color: colors.primary, fontSize: 9, fontWeight: '900' }}>View all</Text></View>
          {achievements.slice(0,4).map((a,i)=><View key={i} style={{ flexDirection: 'row', gap: 9, alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#F7F7FB' }}><View style={{ width: 32, height: 32, borderRadius: 11, backgroundColor: i % 2 ? colors.orangeSoft : colors.greenSoft, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 16 }}>{a.icon}</Text></View><View style={{ flex: 1 }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 9, fontWeight: '900' }}>{a.title}</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 8, marginTop: 2 }}>{a.subtitle}</Text></View></View>)}
        </Card>

        <Card style={{ marginTop: 13, backgroundColor: '#F0EEFF', borderColor: '#DDD9FF' }}>
          <Text style={{ fontFamily: ff, color: colors.navy, fontWeight: '900', fontSize: 12 }}>🏆 Play games, earn XP</Text>
          <Text style={{ fontFamily: ff, color: colors.muted, fontSize: 9, lineHeight: 15, marginTop: 5 }}>Complete phases, build streaks and become a top learner.</Text>
        </Card>
      </View>}
    </View>

    {mobile && <View style={{ marginTop: 14 }}>
      <Card><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 15, fontWeight: '900' }}>🔥 Your Streak: {streak} Days</Text><Text style={{ fontFamily: ff, color: colors.muted, fontSize: 10, marginTop: 4 }}>Best streak: {bestStreak} days</Text></Card>
      <Card style={{ marginTop: 10 }}><Text style={{ fontFamily: ff, color: colors.navy, fontSize: 15, fontWeight: '900' }}>🏆 Recent Achievements</Text>{achievements.slice(0,4).map((a,i)=><Text key={i} style={{ fontFamily: ff, color: colors.text, fontSize: 10, marginTop: 9 }}>{a.icon} {a.title} — {a.subtitle}</Text>)}</Card>
    </View>}
  </AppShell>;

}
