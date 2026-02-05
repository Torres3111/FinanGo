import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { useTheme } from "@/types/themecontext";

const MetasFinanceiras: React.FC = () => {
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] =
    React.useState<AppRoute>("/metas");

  const theme = darkMode ? darkTheme : lightTheme;

  const handleNewGoal = () => {
    console.log("Nova meta");
  };

  return (
    <SafeAreaView
      style={[styles.container, theme.container]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.container.backgroundColor}
      />

      {/* Header */}
      <View
        style={[
          styles.header,
          { borderBottomColor: theme.subText.color + "33" },
        ]}
      >
        <View>
          <Text style={[styles.title, theme.text]}>
            Metas Financeiras
          </Text>
          <Text style={[styles.subtitle, theme.subText]}>
            Defina e acompanhe seus objetivos de economia
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleNewGoal}
            activeOpacity={0.8}
          >
            <Feather name="plus" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>
              Nova Meta
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Conteúdo */}
      <View style={styles.content}>
        <View style={styles.emptyState}>
          <Feather
            name="target"
            size={64}
            color={theme.subText.color}
          />
          <Text style={[styles.emptyStateText, theme.subText]}>
            Nenhuma meta cadastrada
          </Text>
        </View>
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
};

export default MetasFinanceiras;

/* ===== Styles ===== */

const STATUS_BAR_HEIGHT =
  Platform.OS === "android" ? StatusBar.currentHeight ?? 10 : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
  },
  themeToggle: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginRight: 12,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D5F3F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    elevation: 4,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyState: {
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },
  menuWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
