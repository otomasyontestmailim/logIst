import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#2563EB" },
        headerTintColor: "#fff",
        headerTitleStyle: { fontWeight: "700" },
        contentStyle: { backgroundColor: "#F3F4F6" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Seferlerim" }} />
      <Stack.Screen name="trip/[id]" options={{ title: "Sefer Detayı" }} />
    </Stack>
  );
}
