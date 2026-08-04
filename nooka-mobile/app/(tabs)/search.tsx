import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Pill, PlaceRow, ScreenShell } from '@/components/nooka/ui';
import { placeResults } from '@/features/nooka/prototype-data';
import { useNookaTheme } from '@/hooks/use-nooka-theme';
import { t } from '@/lib/i18n';

type Filter = 'district' | 'quiet' | 'under500' | 'indoor';

export default function SearchScreen() {
  const { colors } = useNookaTheme();
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Set<Filter>>(new Set(['district', 'quiet', 'under500', 'indoor']));
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!normalized) return placeResults;
    return placeResults.filter((place) => t(place.nameKey).toLocaleLowerCase().includes(normalized));
  }, [query]);

  const toggleFilter = (filter: Filter) => {
    setFilters((current) => {
      const next = new Set(current);
      if (next.has(filter)) next.delete(filter);
      else next.add(filter);
      return next;
    });
  };

  const toggleSaved = (id: string) => {
    setSavedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ScreenShell testID="search-screen">
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('search.title')}</Text>
        <Pressable style={[styles.askButton, { backgroundColor: colors.accentSoft }]}>
          <Text style={[styles.askLabel, { color: colors.text }]}>{t('search.askNooka')}</Text>
          <Ionicons color={colors.accent} name="sparkles" size={15} />
        </Pressable>
      </View>

      <View style={[styles.searchBar, { backgroundColor: colors.surfaceMuted, borderColor: colors.border }]}>
        <Ionicons color={colors.icon} name="search-outline" size={19} />
        <TextInput
          accessibilityLabel={t('search.title')}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          placeholderTextColor={colors.textSubtle}
          style={[styles.searchInput, { color: colors.text }]}
          value={query}
        />
        <Ionicons color={colors.text} name="options-outline" size={20} />
      </View>

      <View style={styles.filters}>
        {(['district', 'quiet', 'under500', 'indoor'] as Filter[]).map((filter) => (
          <Pill
            key={filter}
            label={t(`search.filters.${filter}`)}
            onPress={() => toggleFilter(filter)}
            selected={filters.has(filter)}
            tone="mint"
          />
        ))}
      </View>

      <Text style={[styles.summary, { color: colors.text }]}>{t('search.summary')}</Text>
      <View style={styles.results}>
        {results.map((place) => (
          <PlaceRow
            friendCount={place.friendCount}
            image={place.image}
            key={place.id}
            metaKey={place.metaKey}
            nameKey={place.nameKey}
            onSave={() => toggleSaved(place.id)}
            saved={savedIds.has(place.id)}
            socialKey={place.socialKey}
          />
        ))}
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: 62, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  title: { fontSize: 25, lineHeight: 31, fontWeight: '800' },
  askButton: { minHeight: 36, borderRadius: 18, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 6 },
  askLabel: { fontSize: 11, lineHeight: 15, fontWeight: '700' },
  searchBar: { minHeight: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 9 },
  searchInput: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17, paddingVertical: 0 },
  filters: { marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  summary: { marginTop: 22, marginBottom: 10, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  results: { gap: 9 },
});
