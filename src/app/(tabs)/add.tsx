import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const add = () => {
  return (
    <View style={styles.container}>
      <Text>Hinzufügen</Text>
    </View>
  )
}

export default add

const styles = StyleSheet.create({
  container: {
    padding: 20,
  },
})