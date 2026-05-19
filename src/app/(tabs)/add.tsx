// src/app/(tabs)/add.tsx
import React, { useState } from 'react'
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import AddBloodValues from '../../components/add/AddBloodValues'
import AddNutrition from '../../components/add/AddNutrition'
import AddSupplement from '../../components/add/AddSupplement'
import AddTraining from '../../components/add/AddTraining'
import { BRAND } from '../../constants/theme'

    
const CATEGORIES = [
  {
    id: 'blood',
    icon: '🩸',
    title: 'Blutwerte',
    subtitle: 'Laborwerte eintragen',
    color: '#fce7e7',
    accent: '#f87171',
  },
  {
    id: 'nutrition',
    icon: '🥗',
    title: 'Ernährung',
    subtitle: 'Mahlzeit tracken',
    color: '#e7f5e7',
    accent: '#34d399',
  },
  {
    id: 'supplement',
    icon: '💊',
    title: 'Supplement',
    subtitle: 'Einnahme eintragen',
    color: '#eef1ff',
    accent: BRAND,
  },
  {
    id: 'training',
    icon: '🏋️',
    title: 'Training',
    subtitle: 'Einheit erfassen',
    color: '#fff7e7',
    accent: '#fbbf24',
  },
]

export default function Add() {
  const [activeModal, setActiveModal] = useState<string | null>(null)

  const activeCategory = CATEGORIES.find((c) => c.id === activeModal)

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Eintragen</Text>
        <Text style={styles.subtitle}>Was möchtest du heute erfassen?</Text>

        <View style={styles.grid}>
          {CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.card, { backgroundColor: cat.color }]}
              onPress={() => setActiveModal(cat.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardIcon}>{cat.icon}</Text>
              <Text style={[styles.cardTitle, { color: cat.accent }]}>{cat.title}</Text>
              <Text style={styles.cardSubtitle}>{cat.subtitle}</Text>
              <View style={[styles.cardArrow, { backgroundColor: cat.accent }]}>
                <Text style={styles.cardArrowText}>→</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.hintBox}>
          <Text style={styles.hintText}>
            💡 Tipp: Trage Ernährung, Supplements und Training täglich ein – die KI nutzt diese Daten für bessere Blutwert-Analysen.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={!!activeModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                {activeCategory?.icon} {activeCategory?.title}
              </Text>
              <Text style={styles.modalSubtitle}>{activeCategory?.subtitle}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setActiveModal(null)}
            >
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {activeModal === 'blood' && (
            <AddBloodValues onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'nutrition' && (
            <AddNutrition onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'supplement' && (
            <AddSupplement onClose={() => setActiveModal(null)} />
          )}
          {activeModal === 'training' && (
            <AddTraining onClose={() => setActiveModal(null)} />
          )}
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fc' },
  content: { padding: 20, paddingBottom: 100 },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a2e',
    letterSpacing: -0.5,
    marginBottom: 4,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 20,
  },
  card: {
    width: '47%',
    borderRadius: 20,
    padding: 20,
    minHeight: 150,
    justifyContent: 'space-between',
  },
  cardIcon: { fontSize: 32, marginBottom: 8 },
  cardTitle: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  cardSubtitle: { fontSize: 12, color: '#6b7280', fontWeight: '500', flex: 1 },
  cardArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginTop: 12,
  },
  cardArrowText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hintBox: {
    backgroundColor: '#eef1ff',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
  },
  hintText: { fontSize: 13, color: '#4b5563', lineHeight: 20 },
  modal: { flex: 1, backgroundColor: '#f7f8fc' },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a2e' },
  modalSubtitle: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: { fontSize: 14, color: '#6b7280', fontWeight: '700' },
})
