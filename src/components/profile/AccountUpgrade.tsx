import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { BRAND, BRAND_LIGHT } from '../../constants/theme'

export default function AccountUpgrade() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Anonymer Account</Text>
        <Text style={styles.text}>
          Deine Daten sind nur auf diesem Gerät gespeichert. Bei Neuinstallation gehen sie verloren.
        </Text>
        <Text style={styles.hint}>
          E-Mail-Login kommt in einem zukünftigen Update.
        </Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: BRAND_LIGHT,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: BRAND,
  },
  icon: { fontSize: 22, marginTop: 2 },
  title: { fontSize: 14, fontWeight: '700', color: '#1a1a2e', marginBottom: 4 },
  text: { fontSize: 13, color: '#4b5563', lineHeight: 19 },
  hint: { fontSize: 12, color: '#9ca3af', marginTop: 6 },
})