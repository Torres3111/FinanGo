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
  const [somaContasFixas, setSomaContasFixas] = useState(0);
  const [registroDiario, setRegistroDiario] = useState(0);
  const [totalPorMes, setTotalPorMes] = useState<Record<string, number>>({});

  const anoAtual = new Date().getFullYear();

  /* ================= SALÁRIO ================= */

  useEffect(() => {
    async function carregarSalario() {
      try {
        const userId = await AsyncStorage.getItem("id");
        if (!userId) return;

        const response = await fetch(
          `${API_URL}/dashboard/salariomensal?user_id=${userId}`
        );

        const data = await response.json();
        if (response.ok) setSalarioMensal(data.salario_mensal);
      } catch (e) {
        console.error("Erro ao carregar salário:", e);
      }
    }

    carregarSalario();
  }, []);

  /* ================= CONTAS FIXAS ================= */

  useEffect(() => {
    async function carregarSomaContasFixas() {
      try {
        const userId = await AsyncStorage.getItem("id");
        if (!userId) return;

        const response = await fetch(
          `${API_URL}/dashboard/somacontasfixas?user_id=${userId}`
        );

        const data = await response.json();
        if (response.ok) setSomaContasFixas(data.soma_contas_fixas);
      } catch (e) {
        console.error("Erro ao carregar soma das contas fixas:", e);
      }
    }

    carregarSomaContasFixas();
  }, []);

  /* ================= TOTAL DO MÊS ATUAL ================= */

  useEffect(() => {
    async function carregarRegistrosDiariosdomes() {
      try {
        const mes = new Date().getMonth() + 1;
        const userId = await AsyncStorage.getItem("id");
        if (!userId) return;

        const response = await fetch(
          `${API_URL}/registro/total-gasto-mes/${userId}/${mes}/${anoAtual}`
        );

        const data = await response.json();
        if (response.ok) setRegistroDiario(data.total);
      } catch (e) {
        console.error("Erro ao carregar soma dos registros:", e);
      }
    }

    carregarRegistrosDiariosdomes();
  }, []);

  /* ================= TOTAL ANUAL (GRÁFICO) ================= */

  useEffect(() => {
    async function carregarTotalPorMesAno() {
      try {
        const userId = await AsyncStorage.getItem("id");
        if (!userId) return;

        const response = await fetch(
          `${API_URL}/registro/total-gasto-mes-ano/${userId}/${anoAtual}`
        );

        const data = await response.json();

        if (response.ok && data.total_por_mes) {
          setTotalPorMes(data.total_por_mes);
        }
      } catch (e) {
        console.error("Erro ao carregar gráfico anual:", e);
      }
    }

    carregarTotalPorMesAno();
  }, []);

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /* ================= CÁLCULOS ================= */

  const valorComprometido = somaContasFixas + registroDiario;
  const valorDisponivel = salarioMensal - valorComprometido;
  const percentualComprometido =
    salarioMensal > 0
      ? ((valorComprometido / salarioMensal) * 100).toFixed(1)
      : "0";

  const cards: Card[] = [
    {
      title: "Salário Mensal",
      value: formatarMoeda(salarioMensal),
      icon: DollarSign,
    },
    {
      title: "Comprometido",
      value: formatarMoeda(valorComprometido),
      subtitle: `${percentualComprometido}% do salário`,
      icon: TrendingDown,
    },
    {
      title: "Disponível",
      value: formatarMoeda(valorDisponivel),
      icon: Wallet,
      highlight: true,
    },
    {
      title: "Contas Fixas",
      value: formatarMoeda(somaContasFixas),
      icon: Receipt,
    },
    {
      title: "Parcelamentos",
      value: "R$ 0,00",
      subtitle: "0 ativos",
      icon: CreditCard,
    },
  ];

  /* ================= GRÁFICO MANUAL ================= */

  const meses = [
    "Jan", "Fev", "Mar", "Abr",
    "Mai", "Jun", "Jul", "Ago",
    "Set", "Out", "Nov", "Dez",
  ];

  const valoresGrafico = Array.from({ length: 12 }, (_, i) =>
    Number(totalPorMes[String(i + 1)] || 0)
  );

  const maiorValor = Math.max(...valoresGrafico, 1);

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <View style={styles.header}>
        <Text style={[styles.title, theme.text]}>
          Dashboard Financeiro 💵
        </Text>

        <TouchableOpacity onPress={toggleTheme}>
          <Moon size={30} color={theme.text.color} />
        </TouchableOpacity>
      </View>

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

        {/* ================= GRÁFICO ================= */}

        <View style={styles.chartContainer}>
          <Text style={[styles.chartTitle, theme.text]}>
            Gastos por Mês ({anoAtual})
          </Text>

          {valoresGrafico.map((valor, index) => {
            const larguraPercentual = (valor / maiorValor) * 100;

            return (
              <View key={index} style={styles.barRow}>
                <Text style={[styles.monthLabel, theme.subText]}>
                  {meses[index]}
                </Text>

                <View style={styles.barBackground}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${larguraPercentual}%` },
                    ]}
                  />
                </View>

                <Text style={[styles.valueLabel, theme.text]}>
                  {formatarMoeda(valor)}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.bottomMenu}>
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

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

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
    paddingBottom: 140,
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

  chartContainer: {
    marginTop: 24,
    marginBottom: 40,
  },

  chartTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 16,
  },

  barRow: {
    marginBottom: 14,
  },

  monthLabel: {
    fontSize: 16,
    marginBottom: 4,
  },

  barBackground: {
    width: "100%",
    height: 14,
    backgroundColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    borderRadius: 8,
    backgroundColor: "#16a34a",
  },

  valueLabel: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
  },

  bottomMenu: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});