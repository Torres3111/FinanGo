import { Stack } from "expo-router";
import React from "react";
import { ThemeProvider } from "@/types/themecontext";

export default function AuthLayout() {
  return (
    <ThemeProvider>
    <Stack
      screenOptions={{
        headerShown: false, 
        animation: "fade",    
      }}
    />
    </ThemeProvider>
  );
}
