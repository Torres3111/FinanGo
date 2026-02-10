import { Stack } from "expo-router";
import { ThemeProvider } from "@/types/themecontext";

export default function RootLayout() {
  return (
    <ThemeProvider>
    <Stack
      screenOptions={{
        headerShown: false, // remove header preto
      }}
    />
    </ThemeProvider>
  );
}
