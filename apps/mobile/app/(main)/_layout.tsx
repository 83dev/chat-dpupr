import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          // Options are handled in index.tsx
          headerShown: true, 
        }}
      />
      <Stack.Screen
        name="chat/[roomId]"
        options={{
          headerShown: true,
          title: '', // Dynamic in page
        }}
      />
      <Stack.Screen
        name="contacts/index"
        options={{
          title: 'Pilih Kontak',
          presentation: 'modal', // Nice touch for contact picking
        }}
      />
       <Stack.Screen
        name="contacts/create-group"
        options={{
          title: 'Buat Grup',
        }}
      />
      <Stack.Screen
        name="map"
        options={{
          title: 'Peta Laporan',
        }}
      />
    </Stack>
  );
}
