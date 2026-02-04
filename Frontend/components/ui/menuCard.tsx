import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/types/themecontext";
import { lightTheme, darkTheme } from "@/types/themes";
import { AppRoute } from "@/types/routes";
import type { MenuItem } from "@/types/menu";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = {
  items: MenuItem[];
  active: AppRoute;
  onNavigate: (route: AppRoute) => void;
};

export default function MenuCard({
  items,
  active,
  onNavigate,
}: Props) {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.container, theme.card]}>
      {items.map((item) => {
        const isActive = active === item.id;
        const Icon = item.icon;

        return (
          <TouchableOpacity
            key={item.id}
            onPress={() => onNavigate(item.route)}
            style={styles.item}
            activeOpacity={0.7}
          >
            <Icon
              size={22}
              color={
                isActive
                  ? "#16a34a"
                  : theme.subText.color
              }
            />

            <Text
              style={[
                styles.label,
                isActive
                  ? styles.activeLabel
                  : theme.subText,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 0,
    elevation: 0,
    marginBottom: 0,
    backgroundColor: "#fff",
  },
  item: {
    alignItems: "center",
    flex: 1,
  },
  label: {
    fontSize: 12,
    marginTop: 6,
  },
  activeLabel: {
    color: "#16a34a",
    fontWeight: "600",
  },
});
