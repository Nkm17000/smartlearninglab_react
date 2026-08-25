import React, {useMemo} from 'react';
import {Pressable, Text, View} from 'react-native';
import {Badge, Button} from './UI';
import {colors} from '../theme';

function toggle(values, value) {
  return values.includes(value) ? values.filter(x => x !== value) : [...values, value];
}

export function TaxonomyPicker({
  taxonomy = [],
  categoryIds = [],
  subcategoryIds = [],
  onChange,
  required = true,
  title = 'Categories & Subcategories',
  helper = 'Select one or more categories. Subcategories appear only for the selected categories.',
}) {
  const selectedCategories = useMemo(
    () => taxonomy.filter(group => categoryIds.includes(group.id)),
    [taxonomy, categoryIds]
  );

  const selectedSubcategories = useMemo(
    () => selectedCategories.flatMap(group => group.subcategories || []).filter(sub => subcategoryIds.includes(sub.id)),
    [selectedCategories, subcategoryIds]
  );

  const allSelectedFor = group => {
    const ids = (group.subcategories || []).map(x => x.id);
    return ids.length > 0 && ids.every(id => subcategoryIds.includes(id));
  };

  const toggleCategory = id => {
    const nextCategoryIds = toggle(categoryIds, id);
    const allowed = new Set(
      taxonomy
        .filter(group => nextCategoryIds.includes(group.id))
        .flatMap(group => group.subcategories || [])
        .map(sub => sub.id)
    );
    onChange({
      categoryIds: nextCategoryIds,
      subcategoryIds: subcategoryIds.filter(id => allowed.has(id)),
    });
  };

  const toggleSubcategory = id => {
    onChange({categoryIds, subcategoryIds: toggle(subcategoryIds, id)});
  };

  const toggleAllSubcategories = group => {
    const ids = (group.subcategories || []).map(x => x.id);
    if (!ids.length) return;
    const next = allSelectedFor(group)
      ? subcategoryIds.filter(id => !ids.includes(id))
      : Array.from(new Set([...subcategoryIds, ...ids]));
    onChange({categoryIds, subcategoryIds: next});
  };

  const clear = () => onChange({categoryIds: [], subcategoryIds: []});

  return (
    <View style={{marginBottom: 14}}>
      <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 5}}>
        <Text style={{fontSize: 12, fontWeight: '900', color: colors.text}}>{title}{required ? ' *' : ''}</Text>
        {(categoryIds.length > 0 || subcategoryIds.length > 0) && (
          <Button title="Clear" variant="secondary" onPress={clear} style={{minHeight: 34, paddingHorizontal: 11}} />
        )}
      </View>
      <Text style={{fontSize: 12, color: colors.muted, lineHeight: 18, marginBottom: 10}}>{helper}</Text>

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 8}}>
        {taxonomy.map(group => {
          const selected = categoryIds.includes(group.id);
          return (
            <Pressable
              key={group.id}
              onPress={() => toggleCategory(group.id)}
              style={{
                borderWidth: 1,
                borderColor: selected ? '#B9B1FF' : colors.border,
                borderRadius: 22,
                paddingHorizontal: 13,
                paddingVertical: 9,
                backgroundColor: selected ? colors.blueSoft : '#fff',
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text style={{fontSize: 13, color: selected ? colors.primary : colors.muted}}>{selected ? '✓' : '○'}</Text>
              <Text style={{fontWeight: '900', fontSize: 12, color: selected ? colors.primary : colors.text}}>{group.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {selectedCategories.length > 0 ? (
        <View style={{marginTop: 14, borderWidth: 1, borderColor: colors.border, borderRadius: 14, backgroundColor: '#FAFCFF', padding: 12}}>
          <Text style={{fontSize: 12, fontWeight: '900', color: colors.navy, marginBottom: 9}}>
            Subcategories — choose multiple
          </Text>
          {selectedCategories.map(group => (
            <View key={group.id} style={{marginBottom: 12}}>
              <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7}}>
                <Text style={{fontSize: 12, fontWeight: '900', color: colors.text}}>{group.name}</Text>
                {!!group.subcategories?.length && (
                  <Pressable onPress={() => toggleAllSubcategories(group)}>
                    <Text style={{fontSize: 11, fontWeight: '900', color: colors.primary}}>
                      {allSelectedFor(group) ? 'Clear all' : 'Select all'}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7}}>
                {(group.subcategories || []).map(sub => {
                  const selected = subcategoryIds.includes(sub.id);
                  return (
                    <Pressable
                      key={sub.id}
                      onPress={() => toggleSubcategory(sub.id)}
                      style={{
                        minWidth: 145,
                        borderWidth: 1,
                        borderColor: selected ? '#B9B1FF' : colors.border,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        paddingVertical: 9,
                        backgroundColor: selected ? colors.purpleSoft : '#fff',
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <Text style={{fontSize: 15, color: selected ? colors.purple : colors.subtle}}>{selected ? '☑' : '☐'}</Text>
                      <Text style={{flex: 1, fontSize: 11, fontWeight: selected ? '900' : '700', color: selected ? colors.purple : colors.text}}>
                        {sub.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={{marginTop: 12, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border, borderRadius: 12, padding: 12, backgroundColor: '#FAFAFC'}}>
          <Text style={{fontSize: 12, color: colors.muted}}>Select a category to see its subcategories.</Text>
        </View>
      )}

      <View style={{flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 9}}>
        {categoryIds.length > 0 && <Badge tone="pink">{categoryIds.length} categor{categoryIds.length === 1 ? 'y' : 'ies'}</Badge>}
        {subcategoryIds.length > 0 && <Badge tone="purple">{subcategoryIds.length} subcategor{subcategoryIds.length === 1 ? 'y' : 'ies'}</Badge>}
        {selectedSubcategories.length > 0 && <Text style={{fontSize: 11, color: colors.muted, alignSelf: 'center'}}>{selectedSubcategories.map(x => x.name).join(' · ')}</Text>}
      </View>
    </View>
  );
}
