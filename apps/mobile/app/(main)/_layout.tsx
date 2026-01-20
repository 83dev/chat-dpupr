import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Chat DPUPR',
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '600', color: '#0f172a' },
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="chat/[roomId]"
        options={{
          headerStyle: { backgroundColor: '#fff' },
          headerTitleStyle: { fontWeight: '600', color: '#0f172a' },
          headerShadowVisible: false,
          headerBackTitle: 'Kembali',
        }}
      />
    </Stack>
  );
}
