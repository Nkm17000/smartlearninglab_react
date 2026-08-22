import React, {useState} from 'react';
import {Alert, ScrollView, Text, View} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {AppShell, Badge, Button, Card, Field, Header} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

function makeForm(asset, values) {
  const form = new FormData();
  form.append('pdf', {
    uri: asset.uri,
    name: asset.name || 'source.pdf',
    type: asset.mimeType || 'application/pdf',
  });
  Object.entries(values).forEach(([key, value]) => form.append(key, String(value ?? '')));
  return form;
}

export default function AdminBulkImportScreen({onBack}) {
  const [mode, setMode] = useState('course');
  const [asset, setAsset] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [course, setCourse] = useState({title_override:'', category:'General', level:'Beginner', language:'English', module_limit:'8', lessons_per_module:'5'});
  const [quiz, setQuiz] = useState({title_override:'', course_id:'', question_count:'20', duration_minutes:'30', passing_percentage:'60'});

  const pickPdf = async () => {
    const result = await DocumentPicker.getDocumentAsync({type:'application/pdf', copyToCacheDirectory:true, multiple:false});
    if (!result.canceled) setAsset(result.assets[0]);
  };

  const submit = async () => {
    if (!asset) return Alert.alert('PDF required', 'Please select a PDF first.');
    setBusy(true); setResult(null);
    try {
      const form = mode === 'course'
        ? makeForm(asset, {...course, publish:false})
        : makeForm(asset, {...quiz, publish:false});
      const data = mode === 'course' ? await api.bulkCourseFromPdf(form) : await api.bulkQuizFromPdf(form);
      setResult(data);
      Alert.alert('Success', data.message || 'Content created as draft.');
    } catch (e) {
      Alert.alert('Bulk import failed', e.message);
    } finally { setBusy(false); }
  };

  return <AppShell>
    <Header eyebrow="Admin only" title="Bulk PDF Content Import" subtitle="Upload one educational PDF and create a draft course or quiz automatically." right={<Button title="← Back" variant="secondary" onPress={onBack}/>} />

    <Card style={{backgroundColor:colors.navy,borderColor:colors.navy}}>
      <Text style={{color:'#fff',fontSize:21,fontWeight:'900'}}>AI PDF Import</Text>
      <Text style={{color:'#CBD5E1',marginTop:6}}>The uploaded PDF is processed on the backend. Students cannot access this screen or these admin endpoints.</Text>
      <View style={{flexDirection:'row',gap:8,marginTop:14,flexWrap:'wrap'}}>
        <Button title="Course from PDF" onPress={()=>{setMode('course');setResult(null)}} />
        <Button title="Quiz from PDF" variant="secondary" onPress={()=>{setMode('quiz');setResult(null)}} />
      </View>
    </Card>

    <Card>
      <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginBottom:10}}>{mode==='course'?'Create course':'Create quiz'}</Text>
      <Button title={asset ? `Selected: ${asset.name}` : 'Select PDF'} onPress={pickPdf} variant="secondary" />
      {asset && <Badge tone="green">PDF selected</Badge>}

      {mode==='course' ? <>
        <Field label="Course title (optional)" value={course.title_override} onChangeText={v=>setCourse({...course,title_override:v})} placeholder="Leave blank to derive from PDF" />
        <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
          <View style={{flex:1,minWidth:180}}><Field label="Category" value={course.category} onChangeText={v=>setCourse({...course,category:v})}/></View>
          <View style={{flex:1,minWidth:180}}><Field label="Level" value={course.level} onChangeText={v=>setCourse({...course,level:v})}/></View>
          <View style={{flex:1,minWidth:180}}><Field label="Language" value={course.language} onChangeText={v=>setCourse({...course,language:v})}/></View>
        </View>
        <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
          <View style={{flex:1,minWidth:180}}><Field label="Maximum modules" value={course.module_limit} onChangeText={v=>setCourse({...course,module_limit:v})} keyboardType="numeric"/></View>
          <View style={{flex:1,minWidth:180}}><Field label="Lessons per module" value={course.lessons_per_module} onChangeText={v=>setCourse({...course,lessons_per_module:v})} keyboardType="numeric"/></View>
        </View>
      </> : <>
        <Field label="Quiz title (optional)" value={quiz.title_override} onChangeText={v=>setQuiz({...quiz,title_override:v})} placeholder="Leave blank to derive from PDF" />
        <Field label="Course ID (optional)" value={quiz.course_id} onChangeText={v=>setQuiz({...quiz,course_id:v})} placeholder="Attach quiz to an existing course" />
        <View style={{flexDirection:'row',gap:10,flexWrap:'wrap'}}>
          <View style={{flex:1,minWidth:160}}><Field label="Questions" value={quiz.question_count} onChangeText={v=>setQuiz({...quiz,question_count:v})} keyboardType="numeric"/></View>
          <View style={{flex:1,minWidth:160}}><Field label="Duration minutes" value={quiz.duration_minutes} onChangeText={v=>setQuiz({...quiz,duration_minutes:v})} keyboardType="numeric"/></View>
          <View style={{flex:1,minWidth:160}}><Field label="Pass %" value={quiz.passing_percentage} onChangeText={v=>setQuiz({...quiz,passing_percentage:v})} keyboardType="numeric"/></View>
        </View>
      </>}

      <Button title={busy?'Generating…':'Generate as Draft'} onPress={submit} disabled={busy || !asset} />
    </Card>

    {result && <Card style={{backgroundColor:'#F0FDF4'}}>
      <Text style={{fontSize:18,fontWeight:'900',color:colors.navy}}>Created successfully</Text>
      <Text style={{marginTop:8}}>Questions: {result.question_count ?? '-'}</Text>
      <Text>Modules: {result.module_count ?? '-'}</Text>
      <Text>Lessons: {result.lesson_count ?? '-'}</Text>
      <Text style={{marginTop:8,color:colors.muted}}>The generated content is a draft. Review it in the existing Course/Quiz admin screens before publishing.</Text>
    </Card>}

    <Card>
      <Text style={{fontWeight:'900',color:colors.navy}}>PDF requirements</Text>
      <Text style={{color:colors.muted,marginTop:6}}>• Text-based PDFs are supported.</Text>
      <Text style={{color:colors.muted}}>• Scanned/image-only PDFs need OCR support.</Text>
      <Text style={{color:colors.muted}}>• Course import creates modules and lessons.</Text>
      <Text style={{color:colors.muted}}>• Quiz import creates MCQs with answers and explanations.</Text>
    </Card>
  </AppShell>;
}
