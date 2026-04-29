import { Link } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

const Index = () => {
  return (
    <View style={styles.container}>
          <Text style={styles.headline}>BLUTWERTE.</Text>
          <Link style={styles.link} href="/profile">Profil öffnen</Link>
        </View>
  )
}

export default Index

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'beige',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headline: {
        fontSize: 40,
        fontWeight: 'bold',
    },
    link: {
        backgroundColor: 'blue',
        color: 'white',
        padding: 10,
        borderRadius: 5,
        fontSize: 20,
        marginTop: 20,
    },
})