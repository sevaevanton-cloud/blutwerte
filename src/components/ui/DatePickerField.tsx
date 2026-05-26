// src/components/ui/DatePickerField.tsx
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import React, { useState } from 'react'
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { BRAND } from '../../constants/theme'

interface Props {
  value: string           // YYYY-MM-DD
  onChange: (date: string) => void
  label?: string
  maximumDate?: Date
}

export default function DatePickerField({
  value,
  onChange,
  label = '📅 Datum der Blutabnahme',
  maximumDate = new Date(),
}: Props) {
  const [showPicker, setShowPicker] = useState(false)

  // Noon UTC vermeidet Timezone-Verschiebungen beim Parsen
  const dateObj = new Date(`${value}T12:00:00`)

  const formatted = dateObj.toLocaleDateString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    // Android schließt den Picker automatisch
    if (Platform.OS === 'android') setShowPicker(false)

    if (event.type === 'dismissed') return

    if (selectedDate) {
      const y = selectedDate.getFullYear()
      const m = String(selectedDate.getMonth() + 1).padStart(2, '0')
      const d = String(selectedDate.getDate()).padStart(2, '0')
      onChange(`${y}-${m}-${d}`)
    }
  }

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.button}
        onPress={() => setShowPicker(v => !v)}
        activeOpacity={0.75}
      >
        <Text style={styles.buttonText}>{formatted}</Text>
        <Text style={styles.chevron}>{showPicker ? '▴' : '▾'}</Text>
      </TouchableOpacity>

      {showPicker && (
        <View style={styles.pickerWrapper}>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleChange}
            maximumDate={maximumDate}
            locale="de-DE"
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.doneBtnText}>Fertig</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  button: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  buttonText: {
    fontSize: 15,
    color: '#1a1a2e',
    fontWeight: '600',
  },
  chevron: {
    fontSize: 13,
    color: BRAND,
    fontWeight: '700',
  },
  pickerWrapper: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  doneBtn: {
    alignItems: 'flex-end',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: BRAND,
  },
})
