import React, { useEffect, useState } from "react";
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
  Moon,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import API_URL from "@/config/api";
import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { useTheme } from "@/types/themecontext";

type Card = {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  highlight?: boolean;
};

export default function DashboardFinanceiro() {
  const { theme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] =
    useState<AppRoute>("/dashboard-financeiro");
  const [salarioMensal, setSalarioMensal] = useState(0);

  useEffect(() => {
    async function carregarSalario() {
      try {
        const userId = await AsyncStorage.getItem("id");
        if (!userId) return;

        const response = await fetch(
          `${API_URL}/dashboard/salariomensal?user_id=${userId}`
        );

        const data = await response.json();
        if (response.ok) {
          setSalarioMensal(data.salario_mensal);
        }
      } catch (e) {
        console.error("Erro ao carregar salário:", e);
      }
    }

    carregarSalario();
  }, []);

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  const cards: Card[] = [
    {
      title: "Salário Mensal",
      value: formatarMoeda(salarioMensal),
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
  ];

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, theme.text]}>Finanças</Text>

        <TouchableOpacity onPress={toggleTheme}>
          <Moon size={20} color={theme.text.color} />
        </TouchableOpacity>
      </View>

      {/* Conteúdo */}
      <ScrollView contentContainerStyle={styles.content}>
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
                    card.highlight
                      ? styles.highlightText
                      : theme.text,
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

      {/* Menu inferior */}
      <View style={styles.bottomMenu}>
        <MenuCard
          items={menuItems}
          active={activeTab}
          //theme={theme}
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100, // espaço para o menu inferior
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
  highlightCard: {
    borderWidth: 1,
    borderColor: "#16a34a",
  },
  cardTitle: {
    fontSize: 12,
    marginTop: 8,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 4,
  },
  highlightText: {
    color: "#16a34a",
  },
  bottomMenu: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
