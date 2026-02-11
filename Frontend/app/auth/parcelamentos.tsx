import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { router } from "expo-router";
import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme } from "@/types/themecontext";

type Props = {
  title?: string;
  subtitle?: string;
};

export default function Parcelamentos({
  title = "Em construção",
  subtitle = "Essa tela ainda está sendo preparada 🚧",
}: Props) {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/parcelamentos");

  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      {/* Conteúdo */}
      <View style={styles.content}>
        <Text style={[styles.title, theme.text]}>{title}</Text>
        <Text style={[styles.subtitle, theme.subText]}>{subtitle}</Text>
      </View>

      {/* Menu inferior */}
      <View style={styles.menuWrapper}>
        <MenuCard
          items={menuItems}
          active={activeTab}
          onNavigate={(route) => {
            setActiveTab(route);
            router.push(`../auth${route}`);
          }}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },
  menuWrapper: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
