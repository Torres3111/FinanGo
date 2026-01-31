import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  PieChart,
  Target,
  Settings,
  Moon,
} from "lucide-react-native";

type MenuItem = {
  id: string;
  label: string;
  icon: any;
};

type Card = {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  highlight?: boolean;
};

export default function DashboardFinanceiro() {
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");

  const menuItems: MenuItem[] = [
    { id: "dashboard", label: "Inicio", icon: PieChart },
    { id: "contas", label: "Contas", icon: Receipt },
    { id: "parcelamentos", label: "Parcelas", icon: CreditCard },
    { id: "metas", label: "Metas", icon: Target },
    { id: "config", label: "Config", icon: Settings },
  ];

  const cards: Card[] = [
    {
      title: "Salário Mensal",
      value: "R$ 0,00",
      icon: DollarSign,
    },
    {
      title: "Comprometido",
      value: "R$ 0,00",
      subtitle: "0% do salário",
      icon: TrendingDown,
    },
    {
      title: "Disponível",
      value: "R$ 0,00",
      icon: Wallet,
      highlight: true,
    },
    {
      title: "Contas Fixas",
      value: "R$ 0,00",
      subtitle: "0 contas",
      icon: Receipt,
    },
    {
      title: "Parcelamentos",
      value: "R$ 0,00",
      subtitle: "0 ativos",
      icon: CreditCard,
    },
    {
      title: "Gastos do Mês",
      value: "R$ 0,00",
      subtitle: "0 transações",
      icon: Wallet,
    },
  ];

  const theme = darkMode ? dark : light;

  return (
    <View style={[styles.container, theme.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, theme.text]}>Finanças</Text>

        <TouchableOpacity
          style={styles.darkButton}
          onPress={() => setDarkMode((prev) => !prev)}
        >
          <Moon size={20} color={darkMode ? "#facc15" : "#374151"} />
        </TouchableOpacity>
      </View>

      {/* Cards */}
      <ScrollView contentContainerStyle={styles.cardsContainer}>
        <View style={styles.grid}>
          {cards.map((card, index) => {
            const Icon = card.icon;

            return (
              <View
                key={index}
                style={[
                  styles.card,
                  theme.card,
                  card.highlight && styles.highlightCard,
                ]}
              >
                <Icon
                  size={24}
                  color={card.highlight ? "#16a34a" : theme.icon}
                />

                <Text style={[styles.cardTitle, theme.subText]}>
                  {card.title}
                </Text>

                <Text
                  style={[
                    styles.cardValue,
                    card.highlight ? styles.highlightText : theme.text,
                  ]}
                >
                  {card.value}
                </Text>

                {card.subtitle && (
                  <Text style={theme.subText}>{card.subtitle}</Text>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom Menu */}
      <View style={[styles.bottomMenu, theme.menu]}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={() => setActiveTab(item.id)}
            >
              <Icon size={22} color={isActive ? "#10b981" : theme.icon} />
              <Text
                style={[
                  styles.menuLabel,
                  { color: isActive ? "#10b981" : theme.subText.color },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

/* ===== Styles ===== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  header: {
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
  },

  darkButton: {
    padding: 8,
    borderRadius: 8,
  },

  cardsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  card: {
    width: "48%",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },

  cardTitle: {
    marginTop: 8,
    fontSize: 13,
  },

  cardValue: {
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },

  highlightCard: {
    borderWidth: 1,
    borderColor: "#22c55e",
  },

  highlightText: {
    color: "#16a34a",
  },

  bottomMenu: {
    position: "absolute",
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 10,
  },

  menuItem: {
    alignItems: "center",
  },

  menuLabel: {
    fontSize: 12,
    marginTop: 4,
  },
});

/* ===== Themes ===== */

const light = {
  container: { backgroundColor: "#f9fafb" },
  card: { backgroundColor: "#ffffff" },
  menu: { backgroundColor: "#ffffff" },
  text: { color: "#111827" },
  subText: { color: "#6b7280" },
  icon: "#374151",
};

const dark = {
  container: { backgroundColor: "#111827" },
  card: { backgroundColor: "#1f2933" },
  menu: { backgroundColor: "#1f2933" },
  text: { color: "#f9fafb" },
  subText: { color: "#9ca3af" },
  icon: "#d1d5db",
};
