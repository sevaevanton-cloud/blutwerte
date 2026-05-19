// src/components/add/AddNutrition.tsx
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import React, { useState } from 'react'
import {
  ActivityIndicator, Alert, FlatList, StyleSheet, Text,
  TextInput, TouchableOpacity, View,
} from 'react-native'
import { db } from '../../config/firebase'
import { LocalFood, searchLocalFoods } from '../../constants/foodDatabase'
import { BRAND, BRAND_LIGHT } from '../../constants/theme'
import { useAuth } from '../../context/AuthContext'


const MEALS = ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']

interface FoodResult {
  id: string
  name: string
  brand: string
  kcal: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  isLocal?: boolean
}

interface PortionFood extends FoodResult {
  portion: string
}

function MacroPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.macroPill, { backgroundColor: color + '18' }]}>
      <Text style={[styles.macroPillValue, { color }]}>{value.toFixed(1)}g</Text>
      <Text style={[styles.macroPillLabel, { color }]}>{label}</Text>
    </View>
  )
}

function localToResult(f: LocalFood): FoodResult {
  return { id: f.id, name: f.name, brand: f.category, kcal: f.kcal, protein: f.protein, carbs: f.carbs, fat: f.fat, isLocal: true }
}

export default function AddNutrition({ onClose }: { onClose: () => void }) {
  const { uid } = useAuth()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FoodResult[]>([])
  const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<PortionFood | null>(null)
  const [meal, setMeal] = useState('Frühstück')
  const [saving, setSaving] = useState(false)

  const handleSearch = async () => {
    if (!query.trim()) return

    // 1. Lokale Ergebnisse sofort anzeigen
    const local = searchLocalFoods(query).map(localToResult)
    setResults(local)
    setSearching(true)

    // 2. API im Hintergrund
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)

      const urls = [
        `https://world.openfoodfacts.org/api/v2/search?search_terms=${encodeURIComponent(query)}&fields=id,product_name,brands,nutriments&page_size=15&sort_by=unique_scans_n`,
        `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=15&fields=id,product_name,brands,nutriments`,
      ]

      let data: any = null
      for (const url of urls) {
        try {
          const res = await fetch(url, { signal: controller.signal })
          if (res.ok) { data = await res.json(); break }
        } catch (e: any) {
          if (e?.name === 'AbortError') break
        }
      }
      clearTimeout(timeout)

      if (data?.products) {
        const apiResults: FoodResult[] = data.products
          .filter((p: any) => p.product_name && (p.nutriments?.['energy-kcal_100g'] || p.nutriments?.['energy-kcal']))
          .slice(0, 12)
          .map((p: any) => ({
            id: p.id ?? Math.random().toString(),
            name: p.product_name,
            brand: p.brands ?? '',
            kcal: Math.round(p.nutriments['energy-kcal_100g'] ?? p.nutriments['energy-kcal'] ?? 0),
            protein: Math.round((p.nutriments['proteins_100g'] ?? 0) * 10) / 10,
            carbs: Math.round((p.nutriments['carbohydrates_100g'] ?? 0) * 10) / 10,
            fat: Math.round((p.nutriments['fat_100g'] ?? 0) * 10) / 10,
            fiber: Math.round((p.nutriments['fiber_100g'] ?? 0) * 10) / 10,
            isLocal: false,
          }))

        // Lokale zuerst, dann API-Ergebnisse (keine Duplikate)
        const localIds = new Set(local.map(f => f.name.toLowerCase()))
        const merged = [
          ...local,
          ...apiResults.filter(f => !localIds.has(f.name.toLowerCase())),
        ]
        setResults(merged)
      }
    } catch {
      // API-Fehler ignorieren — lokale Ergebnisse bleiben sichtbar
    } finally {
      setSearching(false)
    }
  }

  const selectFood = (food: FoodResult) => {
    setSelected({ ...food, portion: '100' })
    setResults([])
    setQuery('')
  }

  const calcMacros = (food: FoodResult, portion: number) => ({
    kcal:    Math.round((food.kcal     * portion) / 100),
    protein: Math.round((food.protein  * portion) / 100 * 10) / 10,
    carbs:   Math.round((food.carbs    * portion) / 100 * 10) / 10,
    fat:     Math.round((food.fat      * portion) / 100 * 10) / 10,
    fiber:   Math.round(((food.fiber ?? 0) * portion) / 100 * 10) / 10,
  })

  const handleSave = async () => {
    if (!selected) return
    const portion = parseFloat(selected.portion) || 100
    const macros = calcMacros(selected, portion)
    setSaving(true)
    try {
      await addDoc(collection(db, 'users', uid!, 'nutrition'), {
        name: selected.name,
        brand: selected.brand,
        meal,
        portion,
        ...macros,
        per100g: { kcal: selected.kcal, protein: selected.protein, carbs: selected.carbs, fat: selected.fat, fiber: selected.fiber ?? 0 },
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp(),
      })
      Alert.alert('✅ Gespeichert!', `${selected.name} – ${macros.kcal} kcal`)
      onClose()
    } catch {
      Alert.alert('Fehler', 'Speichern fehlgeschlagen.')
    } finally {
      setSaving(false)
    }
  }

  const portion = parseFloat(selected?.portion ?? '100') || 100
  const macros = selected ? calcMacros(selected, portion) : null

  return (
    <View style={{ flex: 1 }}>

      {/* ── Suche ── */}
      <View style={styles.searchBox}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Lebensmittel suchen..."
          placeholderTextColor="#9ca3af"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
          autoFocus
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching}>
          {searching
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.searchBtnText}>Suchen</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Ergebnisse ── */}
      {results.length > 0 && (
        <FlatList
          data={results}
          keyExtractor={item => item.id}
          style={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            searching ? (
              <View style={styles.apiLoadingRow}>
                <ActivityIndicator size="small" color={BRAND} />
                <Text style={styles.apiLoadingText}>Suche in Online-Datenbank...</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultRow} onPress={() => selectFood(item)}>
              <View style={{ flex: 1 }}>
                <View style={styles.resultNameRow}>
                  <Text style={styles.resultName} numberOfLines={1}>{item.name}</Text>
                  {item.isLocal && <View style={styles.localBadge}><Text style={styles.localBadgeText}>lokal</Text></View>}
                </View>
                {item.brand ? <Text style={styles.resultBrand} numberOfLines={1}>{item.brand}</Text> : null}
              </View>
              <View style={styles.resultMacros}>
                <Text style={styles.resultKcal}>{item.kcal} kcal</Text>
                <Text style={styles.resultPer}>pro 100g</Text>
              </View>
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {/* ── Ausgewähltes Lebensmittel ── */}
      {selected && (
        <View style={styles.selectedBox}>
          <View style={styles.selectedHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedName} numberOfLines={2}>{selected.name}</Text>
              {selected.brand ? <Text style={styles.selectedBrand}>{selected.brand}</Text> : null}
            </View>
            <TouchableOpacity onPress={() => setSelected(null)} style={styles.removeBtn}>
              <Text style={styles.removeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.portionRow}>
            <Text style={styles.portionLabel}>Portion</Text>
            <View style={styles.portionInputRow}>
              <TextInput
                style={styles.portionInput}
                value={selected.portion}
                onChangeText={v => setSelected(s => s ? { ...s, portion: v } : s)}
                keyboardType="decimal-pad"
                selectTextOnFocus
              />
              <Text style={styles.portionUnit}>g</Text>
            </View>
          </View>

          {macros && (
            <View style={styles.macroRow}>
              <View style={styles.kcalBadge}>
                <Text style={styles.kcalValue}>{macros.kcal}</Text>
                <Text style={styles.kcalLabel}>kcal</Text>
              </View>
              <MacroPill label="P" value={macros.protein} color="#f87171" />
              <MacroPill label="K" value={macros.carbs}   color="#fbbf24" />
              <MacroPill label="F" value={macros.fat}     color="#34d399" />
              <MacroPill label="B" value={macros.fiber}   color="#a78bfa" />
            </View>
          )}

          <Text style={styles.mealLabel}>Mahlzeit</Text>
          <View style={styles.mealRow}>
            {MEALS.map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.mealChip, meal === m && styles.mealChipActive]}
                onPress={() => setMeal(m)}
              >
                <Text style={[styles.mealChipText, meal === m && styles.mealChipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {selected && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.saveBtnText}>💾 Mahlzeit speichern</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      {/* ── Leerer Zustand ── */}
      {!selected && results.length === 0 && !searching && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🥗</Text>
          <Text style={styles.emptyTitle}>Lebensmittel suchen</Text>
          <Text style={styles.emptySub}>
            100+ häufige Lebensmittel sind offline verfügbar.{'\n'}Für Markenprodukte wird zusätzlich online gesucht.
          </Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  searchBox: { flexDirection: 'row', gap: 10, padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  searchInput: { flex: 1, backgroundColor: '#f7f8fc', borderRadius: 12, padding: 12, fontSize: 15, color: '#1a1a2e', borderWidth: 1, borderColor: '#e5e7eb' },
  searchBtn: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  apiLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, backgroundColor: BRAND_LIGHT },
  apiLoadingText: { fontSize: 12, color: BRAND, fontWeight: '500' },

  resultsList: { flex: 1, backgroundColor: '#fff' },
  resultRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  resultNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultName: { fontSize: 14, fontWeight: '600', color: '#1a1a2e', flex: 1 },
  resultBrand: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  localBadge: { backgroundColor: BRAND_LIGHT, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  localBadgeText: { fontSize: 10, color: BRAND, fontWeight: '700' },
  resultMacros: { alignItems: 'flex-end' },
  resultKcal: { fontSize: 15, fontWeight: '800', color: BRAND },
  resultPer: { fontSize: 11, color: '#9ca3af' },
  separator: { height: 1, backgroundColor: '#f3f4f6', marginLeft: 14 },

  selectedBox: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  selectedHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14, gap: 10 },
  selectedName: { fontSize: 16, fontWeight: '700', color: '#1a1a2e' },
  selectedBrand: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  removeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  removeBtnText: { color: '#6b7280', fontSize: 12, fontWeight: '700' },

  portionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  portionLabel: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  portionInputRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  portionInput: { backgroundColor: BRAND_LIGHT, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 18, fontWeight: '700', color: BRAND, minWidth: 70, textAlign: 'center', borderWidth: 1.5, borderColor: BRAND },
  portionUnit: { fontSize: 16, fontWeight: '600', color: '#6b7280' },

  macroRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 14 },
  kcalBadge: { backgroundColor: BRAND, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center' },
  kcalValue: { fontSize: 20, fontWeight: '800', color: '#fff' },
  kcalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  macroPill: { flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center' },
  macroPillValue: { fontSize: 14, fontWeight: '800' },
  macroPillLabel: { fontSize: 11, fontWeight: '600' },

  mealLabel: { fontSize: 12, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  mealRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mealChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: '#e5e7eb' },
  mealChipActive: { backgroundColor: BRAND_LIGHT, borderColor: BRAND },
  mealChipText: { fontSize: 13, fontWeight: '600', color: '#6b7280' },
  mealChipTextActive: { color: BRAND },

  footer: { padding: 16, paddingBottom: 32, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0' },
  saveBtn: { backgroundColor: BRAND, padding: 16, borderRadius: 14, alignItems: 'center', shadowColor: BRAND, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 10, elevation: 6 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a2e', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },
})