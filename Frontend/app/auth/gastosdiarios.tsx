import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { useTheme } from "@/types/themecontext"; // ajuste o caminho se necessário
import { darkTheme } from "@/types/themes";
import { lightTheme } from "@/types/themes";
import Feather from "@expo/vector-icons/build/Feather";

const GastosDiarios = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [selectedMonth] = useState("Janeiro de 2026");
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/gastosdiarios");

  return (
    <SafeAreaView
      style={[
        styles.container, theme.container
      ]}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
      />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, theme.text]}>
              Gastos Diários
            </Text>
            <Text style={[styles.subtitle, theme.subText]}> Registre seus gastos do dia a dia</Text>
          </View>

         <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            /*setContaSelecionada(null); */
            /*setModalVisible(true);*/
          }}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <Text style={[styles.addButtonText]}>
            Novo Gasto
          </Text>
        </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Seletor de Mês */}
          <View
            style={[
              styles.card, theme.card
            ]}
          >
            <TouchableOpacity style={styles.monthButton}>
              <Text
                style={[
                  styles.monthText, theme.text
                ]}
              >
                {selectedMonth}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Total do mês */}
          <View
            style={[
              styles.totalCard, theme.card
            ]}
          >
            <Text
              style={[
                styles.totalLabel, theme.subText
              ]}
            >
              Total do mês
            </Text>
            <Text
              style={[
                styles.totalValue, theme.text
              ]}
            >
              R$ 0,00
            </Text>
          </View>

          {/* Estado vazio */}
          <View style={styles.emptyState}>
            <Text
              style={[
                styles.emptyStateText, theme.subText
              ]}
            >
              Nenhum gasto registrado neste mês
            </Text>
          </View>
        </ScrollView>
      </View>

      {/* Menu Inferior */}
      <View
        style={[
          styles.menuWrapper, theme.container
        ]}
      >
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

export default GastosDiarios;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  content: {
    flex: 1,
  },

  header: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    marginTop: 15,
    paddingVertical: 1,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D5F3F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },
  
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  monthButton: {
    paddingVertical: 8,
  },

  monthText: {
    fontSize: 14,
    fontWeight: "500",
  },

  totalCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },

  totalLabel: {
    fontSize: 14,
    marginBottom: 6,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
  },

  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },

  emptyStateText: {
    fontSize: 14,
  },

  menuWrapper: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
