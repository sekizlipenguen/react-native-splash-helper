import React from 'react';
import {
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 24,
          paddingBottom: insets.bottom + 24,
        },
      ]}
      testID="splash-helper-example">
      <Text style={styles.eyebrow} testID="app-eyebrow">
        @sekizlipenguen/react-native-splash-helper
      </Text>
      <Text style={styles.title} testID="app-title">
        Splash Helper Example
      </Text>
      <Text style={styles.body} testID="app-body">
        If you saw the navy splash with “Splash Helper” before this screen, the
        generator wired LaunchScreen / windowBackground correctly.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Try again</Text>
        <Text style={styles.cardBody}>
          Kill the app and relaunch to see the native splash. Regenerate with:
        </Text>
        <Text style={styles.code} testID="regen-command">
          npm run generate-splash
        </Text>
      </View>

      <Pressable
        testID="btn-info"
        style={({pressed}) => [styles.button, pressed && styles.buttonPressed]}
        onPress={() => {}}>
        <Text style={styles.buttonText}>RN 0.86.2 playground</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f7f9',
    paddingHorizontal: 24,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0B1F3A',
    marginBottom: 12,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: '#374151',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#d1d5db',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  cardBody: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4b5563',
    marginBottom: 10,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 12,
    color: '#0B1F3A',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  button: {
    alignSelf: 'flex-start',
    backgroundColor: '#0B1F3A',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#F5C542',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default App;
