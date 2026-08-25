import React, {useEffect, useMemo, useState} from 'react';
import {Alert, Pressable, Text, View} from 'react-native';
import {AppShell, Badge, Button, Card, Empty, Field, Header, Loading} from '../../components/UI';
import {api} from '../../services/api';
import {colors} from '../../theme';

export default function AdminTaxonomyScreen(){
  const [groups,setGroups]=useState([]),[selected,setSelected]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const [newCategory,setNewCategory]=useState(''),[newSub,setNewSub]=useState(''),[editingCategory,setEditingCategory]=useState(null),[editingSub,setEditingSub]=useState(null),[editValue,setEditValue]=useState('');
  const load=async()=>{setLoading(true);setError('');try{const r=await api.adminTaxonomy();const list=r?.categories||[];setGroups(list);if(!selected&&list[0])setSelected(list[0].id);else if(selected&&!list.some(x=>x.id===selected)&&list[0])setSelected(list[0].id);}catch(e){setError(e?.message||'Unable to load taxonomy.')}finally{setLoading(false)}};
  useEffect(()=>{load()},[]);
  const active=useMemo(()=>groups.find(x=>x.id===selected),[groups,selected]);
  const addCategory=async()=>{const name=newCategory.trim();if(!name)return;try{await api.createAdminCategory({name});setNewCategory('');await load();}catch(e){Alert.alert('Category',e.message)}};
  const addSub=async()=>{const name=newSub.trim();if(!name||!active)return;try{await api.createAdminSubcategory(active.id,{name});setNewSub('');await load();}catch(e){Alert.alert('Subcategory',e.message)}};
  const saveCategory=async()=>{if(!editingCategory)return;try{await api.updateAdminCategory(editingCategory,{name:editValue});setEditingCategory(null);setEditValue('');await load()}catch(e){Alert.alert('Category',e.message)}};
  const saveSub=async()=>{if(!editingSub)return;try{await api.updateAdminSubcategory(editingSub,{name:editValue});setEditingSub(null);setEditValue('');await load()}catch(e){Alert.alert('Subcategory',e.message)}};
  const removeCategory=id=>Alert.alert('Deactivate category?','Existing content is preserved. The category will no longer be available for new content.',[{text:'Cancel',style:'cancel'},{text:'Deactivate',style:'destructive',onPress:async()=>{try{await api.deleteAdminCategory(id);await load()}catch(e){Alert.alert('Category',e.message)}}}]);
  const removeSub=id=>Alert.alert('Deactivate subcategory?','Existing content is preserved.',[{text:'Cancel',style:'cancel'},{text:'Deactivate',style:'destructive',onPress:async()=>{try{await api.deleteAdminSubcategory(id);await load()}catch(e){Alert.alert('Subcategory',e.message)}}}]);
  if(loading)return <AppShell><Loading label="Loading taxonomy..."/></AppShell>;
  if(error)return <AppShell><Header title="Taxonomy"/><Card><Text style={{color:colors.danger}}>{error}</Text><Button title="Retry" onPress={load} style={{marginTop:12}}/></Card></AppShell>;
  return <AppShell>
    <Header eyebrow="Content taxonomy" title="Categories & Subcategories" subtitle="Categories are top-level exam/domain groups. Each subcategory belongs to exactly one category." right={<Button title="↻ Refresh" variant="secondary" onPress={load}/>}/>
    <Card style={{backgroundColor:colors.blueSoft}}><Text style={{fontWeight:'900',color:colors.navy}}>How it works</Text><Text style={{color:colors.muted,lineHeight:20,marginTop:5}}>Example: SSC is a category. SSC CGL, SSC CHSL and SSC CPO are subcategories under SSC only. Courses and quizzes store links to both collections.</Text></Card>
    <View style={{flexDirection:'row',gap:14,alignItems:'flex-start',flexWrap:'wrap'}}>
      <Card style={{width:300,minWidth:280}}>
        <Text style={{fontSize:18,fontWeight:'900',color:colors.navy,marginBottom:10}}>Categories</Text>
        <Field label="Add category" value={newCategory} onChangeText={setNewCategory} placeholder="e.g. Medical"/>
        <Button title="+ Add Category" onPress={addCategory} disabled={!newCategory.trim()}/>
        <View style={{marginTop:14}}>{groups.map(c=><Pressable key={c.id} onPress={()=>setSelected(c.id)} style={{padding:12,borderRadius:12,marginBottom:6,backgroundColor:selected===c.id?colors.blueSoft:'#fff',borderWidth:1,borderColor:selected===c.id?colors.primary:colors.border}}><View style={{flexDirection:'row',alignItems:'center',gap:8}}><View style={{flex:1}}><Text style={{fontWeight:'900',color:colors.navy}}>{c.name}</Text><Text style={{fontSize:11,color:colors.muted,marginTop:2}}>{c.subcategories?.length||0} subcategories</Text></View><Badge>{c.subcategories?.length||0}</Badge></View></Pressable>)}</View>
      </Card>
      <Card style={{flex:1,minWidth:320}}>
        {!active?<Empty title="Select a category" message="Choose a category to manage its subcategories."/>:<>
          <View style={{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10}}><View style={{flex:1}}><Text style={{fontSize:20,fontWeight:'900',color:colors.navy}}>{active.name}</Text><Text style={{color:colors.muted,marginTop:3}}>Only subcategories belonging to {active.name} appear here.</Text></View><Badge tone="purple">{active.subcategories?.length||0} subcategories</Badge></View>
          <Field label={`Add ${active.name} subcategory`} value={newSub} onChangeText={setNewSub} placeholder="e.g. SSC CGL"/>
          <Button title="+ Add Subcategory" onPress={addSub} disabled={!newSub.trim()}/>
          <View style={{marginTop:15}}>{(active.subcategories||[]).length===0?<Empty title="No subcategories" message="Add the first subcategory for this category."/>:(active.subcategories||[]).map(s=><View key={s.id} style={{padding:12,borderWidth:1,borderColor:colors.border,borderRadius:12,marginBottom:8,backgroundColor:'#fff'}}><View style={{flexDirection:'row',alignItems:'center',gap:10}}><View style={{flex:1}}><Text style={{fontWeight:'900',color:colors.navy}}>{s.name}</Text><Text style={{fontSize:10,color:colors.muted,marginTop:2}}>Parent: {active.name}</Text></View><Button title="Edit" variant="secondary" onPress={()=>{setEditingSub(s.id);setEditValue(s.name)}}/><Button title="Deactivate" variant="danger" onPress={()=>removeSub(s.id)}/></View></View>)}</View>
        </>}
      </Card>
    </View>
    <Card style={{marginTop:14}}><Text style={{fontSize:17,fontWeight:'900',color:colors.navy}}>Edit selected category</Text>{active&&<View style={{flexDirection:'row',gap:8,alignItems:'flex-end',flexWrap:'wrap',marginTop:10}}>{editingCategory===active.id?<><View style={{flex:1,minWidth:220}}><Field label="Category name" value={editValue} onChangeText={setEditValue}/></View><Button title="Save" onPress={saveCategory}/><Button title="Cancel" variant="secondary" onPress={()=>{setEditingCategory(null);setEditValue('')}}/></>:<><Badge tone="purple">{active.name}</Badge><Button title="Edit" variant="secondary" onPress={()=>{setEditingCategory(active.id);setEditValue(active.name)}}/><Button title="Deactivate" variant="danger" onPress={()=>removeCategory(active.id)}/></>}</View>}</Card>
    {editingSub&&<Card style={{marginTop:14,backgroundColor:'#FFF9FB'}}><Text style={{fontWeight:'900',color:colors.navy}}>Edit subcategory</Text><View style={{flexDirection:'row',gap:8,alignItems:'flex-end',flexWrap:'wrap',marginTop:8}}><View style={{flex:1,minWidth:220}}><Field label="Subcategory name" value={editValue} onChangeText={setEditValue}/></View><Button title="Save" onPress={saveSub}/><Button title="Cancel" variant="secondary" onPress={()=>{setEditingSub(null);setEditValue('')}}/></View></Card>}
  </AppShell>;
}
