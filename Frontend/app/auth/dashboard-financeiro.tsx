import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Dimensions,
} from "react-native";
import {
  DollarSign,
  TrendingDown,
  Wallet,
  CreditCard,
  Receipt,
  Moon,
  ChevronLeft,
  ChevronRight,
  Target,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import API_URL from "@/config/api";
import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { useTheme } from "@/types/themecontext";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const TOKEN_KEY = "auth_token";
const TRIMESTRE_CARD_WIDTH = SCREEN_WIDTH - 32;
const TRIMESTRE_CARD_GAP = 16;
const TRIMESTRE_SNAP_INTERVAL = TRIMESTRE_CARD_WIDTH + TRIMESTRE_CARD_GAP;

type Card = {
  title: string;
  value: string;
  subtitle?: string;
  icon: any;
  highlight?: boolean;
};

type Trimestre = {
  id: number;
  nome: string;
  meses: string[];
  indices: number[];
  total: number;
};

type SalarioMensalResponse = {
  salario_mensal?: number | string | null;
};

type SomaContasFixasResponse = {
  soma_contas_fixas?: number | string | null;
};

type RegistroDiarioMesResponse = {
  total?: number | string | null;
};

type TotalPorMesAnoResponse = {
  total_por_mes?: Record<string, number | string | null>;
};

type ResumoParcelamentosResponse = {
  quantidade_ativos?: number | string | null;
  soma_total_mensal?: number | string | null;
};

export default function DashboardFinanceiro() {
  const { theme, toggleTheme } = useTheme();
  const flatListRef = useRef<FlatList>(null);

  const [activeTab, setActiveTab] =
    useState<AppRoute>("/dashboard-financeiro");

  const [salarioMensal, setSalarioMensal] = useState(0);
  const [somaContasFixas, setSomaContasFixas] = useState(0);
  const [registroDiario, setRegistroDiario] = useState(0);
  const [parcelamentosAtivos, setParcelamentosAtivos] = useState(0);
  const [somaParcelamentosMensal, setSomaParcelamentosMensal] = useState(0);
  const [totalPorMes, setTotalPorMes] = useState<Record<string, number>>({});
  const [trimestreAtual, setTrimestreAtual] = useState(0);

  const anoAtual = new Date().getFullYear();

  async function parseResponseSafely<T>(response: Response): Promise<T> {
    const raw = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        return (raw ? JSON.parse(raw) : {}) as T;
      } catch {
        throw new Error("Resposta JSON invalida do servidor.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Endpoint de parcelamentos/resumo nao encontrado no backend.");
      }
      throw new Error(`Servidor retornou formato invalido (status ${response.status}).`);
    }

    return {} as T;
  }

  /* ================= TRIMESTRES ================= */

  const trimestres: Trimestre[] = [
    {
      id: 1,
      nome: "1º Trimestre",
      meses: ["Jan", "Fev", "Mar"],
      indices: [0, 1, 2],
      total: 0,
    },
    {
      id: 2,
      nome: "2º Trimestre",
      meses: ["Abr", "Mai", "Jun"],
      indices: [3, 4, 5],
      total: 0,
    },
    {
      id: 3,
      nome: "3º Trimestre",
      meses: ["Jul", "Ago", "Set"],
      indices: [6, 7, 8],
      total: 0,
    },
    {
      id: 4,
      nome: "4º Trimestre",
      meses: ["Out", "Nov", "Dez"],
      indices: [9, 10, 11],
      total: 0,
    },
  ];

  /* ================= SALÁRIO ================= */

  useEffect(() => {
    async function carregarSalario() {
      try {
        const userId = await AsyncStorage.getItem("id");
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!userId || !token) return;

        const response = await fetch(`${API_URL}/dashboard/salariomensal?user_id=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponseSafely<SalarioMensalResponse>(response);
        if (response.ok) setSalarioMensal(Number(data.salario_mensal || 0));
      } catch (e) {
        console.error("Erro ao carregar salário:", e);
      }
    }

    carregarSalario();
  }, []);


  useEffect(() => {
    async function carregarSomaContasFixas() {
      try {
        const userId = await AsyncStorage.getItem("id");
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!userId || !token) return;

        const response = await fetch(`${API_URL}/dashboard/somacontasfixas?user_id=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponseSafely<SomaContasFixasResponse>(response);
        if (response.ok) setSomaContasFixas(Number(data.soma_contas_fixas || 0));
      } catch (e) {
        console.error("Erro ao carregar soma das contas fixas:", e);
      }
    }

    carregarSomaContasFixas();
  }, []);


  useEffect(() => {
    async function carregarRegistrosDiariosdomes() {
      try {
        const mes = new Date().getMonth() + 1;
        const userId = await AsyncStorage.getItem("id");
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!userId || !token) return;

        const response = await fetch(`${API_URL}/registro/total-gasto-mes/${userId}/${mes}/${anoAtual}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponseSafely<RegistroDiarioMesResponse>(response);
        if (response.ok) {
          setRegistroDiario(Number(data.total || 0));
        }
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
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!userId || !token) return;

        const response = await fetch(`${API_URL}/registro/total-gasto-mes-ano/${userId}/${anoAtual}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponseSafely<TotalPorMesAnoResponse>(response);

        if (response.ok && data.total_por_mes) {
          const totalPorMesNormalizado = Object.fromEntries(
            Object.entries(data.total_por_mes).map(([mes, valor]) => [
              mes,
              Number(valor || 0),
            ])
          );

          setTotalPorMes(totalPorMesNormalizado);
        }
      } catch (e) {
        console.error("Erro ao carregar gráfico anual:", e);
      }
    }

    carregarTotalPorMesAno();
  }, []);


  useEffect(() => {
    async function carregarResumoParcelamentos() {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return;

        const response = await fetch(`${API_URL}/parcelas/resumo`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await parseResponseSafely<ResumoParcelamentosResponse>(response);

        if (response.ok) {
          setParcelamentosAtivos(Number(data.quantidade_ativos || 0));
          setSomaParcelamentosMensal(Number(data.soma_total_mensal || 0));
        }
      } catch (e) {
        console.error("Erro ao carregar resumo de parcelamentos:", e);
      }
    }

    carregarResumoParcelamentos();
  }, []);

  function formatarMoeda(valor: number) {
    return valor.toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  /* ================= CÁLCULOS ================= */

  const valorComprometido =
    somaContasFixas + registroDiario + somaParcelamentosMensal;
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
      value: formatarMoeda(somaParcelamentosMensal),
      subtitle: `${parcelamentosAtivos} ativos`,
      icon: CreditCard,
    },
    {
      title: "Registros Diarios",
      value: formatarMoeda(registroDiario),
      icon: Target,
    },
  ];

  /* ================= DADOS DOS TRIMESTRES ================= */

  const trimestresComDados = trimestres.map((trimestre) => {
    const total = trimestre.indices.reduce((acc, mesIndex) => {
      const mesNumero = mesIndex + 1;
      return acc + (Number(totalPorMes[String(mesNumero)]) || 0);
    }, 0);

    return {
      ...trimestre,
      total,
    };
  });

  const maiorValorTrimestre = Math.max(
    ...trimestresComDados.map((t) => t.total),
    1
  );

  const irParaTrimestre = (index: number) => {
    if (index >= 0 && index < trimestresComDados.length) {
      setTrimestreAtual(index);
      flatListRef.current?.scrollToIndex({
        index,
        animated: true,
      });
    }
  };

  const renderTrimestre = ({ item }: { item: Trimestre & { total: number } }) => {
    const valoresMeses = item.indices.map((mesIndex) => {
      const mesNumero = mesIndex + 1;
      return Number(totalPorMes[String(mesNumero)] || 0);
    });

    const maiorValorMes = Math.max(...valoresMeses, 1);

    return (
      <View style={[styles.trimestreContainer, { width: TRIMESTRE_CARD_WIDTH }]}>
        <Text style={[styles.trimestreTitle, theme.text]}>
          {item.nome} - {anoAtual}
        </Text>

        <View style={styles.trimestreTotal}>
          <Text style={[styles.trimestreTotalLabel, theme.subText]}>
            Total do Trimestre
          </Text>
          <Text style={[styles.trimestreTotalValue, theme.text]}>
            {formatarMoeda(item.total)}
          </Text>
        </View>

        <View style={styles.mesesContainer}>
          {item.meses.map((mes, index) => {
            const valor = valoresMeses[index];
            const larguraPercentual = (valor / maiorValorMes) * 100;

            return (
              <View key={index} style={styles.mesRow}>
                <Text style={[styles.mesLabel, theme.text]}>{mes}</Text>

                <View style={styles.mesBarBackground}>
                  <View
                    style={[
                      styles.mesBarFill,
                      { width: `${larguraPercentual}%` },
                    ]}
                  />
                </View>

                <Text style={[styles.mesValue, theme.subText]}>
                  {formatarMoeda(valor)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.comparativoContainer}>
          <Text style={[styles.comparativoTitle, theme.subText]}>
            Comparativo com outros trimestres
          </Text>

          {trimestresComDados.map((trimestre, idx) => {
            if (idx === item.id - 1) return null; 

            const percentual =
              item.total > 0
                ? ((trimestre.total / item.total) * 100).toFixed(1)
                : "0";

            return (
              <View key={trimestre.id} style={styles.comparativoRow}>
                <Text style={[styles.comparativoNome, theme.text]}>
                  {trimestre.nome}
                </Text>
                <View style={styles.comparativoBarBackground}>
                  <View
                    style={[
                      styles.comparativoBarFill,
                      {
                        width: `${Math.min(Number(percentual), 100)}%`,
                        backgroundColor:
                          trimestre.total > item.total ? "#ef4444" : "#3b82f6",
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.comparativoValor, theme.subText]}>
                  {formatarMoeda(trimestre.total)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

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

      <ScrollView 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
        <View style={styles.trimestresSection}>
          <View style={styles.trimestresHeader}>
            <Text style={[styles.sectionTitle, theme.text]}>
              Gastos por Trimestre
            </Text>

            <View style={styles.trimestresNav}>
              <TouchableOpacity
                onPress={() => irParaTrimestre(trimestreAtual - 1)}
                disabled={trimestreAtual === 0}
                style={[
                  styles.navButton,
                  trimestreAtual === 0 && styles.navButtonDisabled,
                ]}
              >
                <ChevronLeft
                  size={24}
                  color={trimestreAtual === 0 ? "#9ca3af" : theme.text.color}
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => irParaTrimestre(trimestreAtual + 1)}
                disabled={trimestreAtual === trimestresComDados.length - 1}
                style={[
                  styles.navButton,
                  trimestreAtual === trimestresComDados.length - 1 &&
                    styles.navButtonDisabled,
                ]}
              >
                <ChevronRight
                  size={24}
                  color={
                    trimestreAtual === trimestresComDados.length - 1
                      ? "#9ca3af"
                      : theme.text.color
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={trimestresComDados}
            renderItem={renderTrimestre}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / TRIMESTRE_SNAP_INTERVAL
              );
              setTrimestreAtual(newIndex);
            }}
            snapToInterval={TRIMESTRE_SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={styles.trimestresList}
          />
          <View style={styles.paginationDots}>
            {trimestresComDados.map((_, index) => (
              <TouchableOpacity
                key={index}
                onPress={() => irParaTrimestre(index)}
                style={[
                  styles.paginationDot,
                  {
                    backgroundColor:
                      index === trimestreAtual
                        ? theme.text.color
                        : theme.subText.color + "40",
                  },
                ]}
              />
            ))}
          </View>
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

  trimestresSection: {
    marginTop: 24,
    marginBottom: 40,
  },

  trimestresHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
  },

  trimestresNav: {
    flexDirection: "row",
    gap: 8,
  },

  navButton: {
    padding: 8,
    borderRadius: 8,
    opacity: 0.7,
    backgroundColor: "rgba(0,0,0,0.05)",
  },

  navButtonDisabled: {
    opacity: 0.5,
  },

  trimestresList: {
    paddingRight: 0,
  },

  trimestreContainer: {
    marginRight: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 20,
  },

  trimestreTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 16,
  },

  trimestreTotal: {
    alignItems: "center",
    marginBottom: 24,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
  },

  trimestreTotalLabel: {
    fontSize: 14,
    marginBottom: 4,
  },

  trimestreTotalValue: {
    fontSize: 24,
    fontWeight: "700",
  },

  mesesContainer: {
    marginBottom: 24,
  },

  mesRow: {
    marginBottom: 12,
  },

  mesLabel: {
    fontSize: 16,
    marginBottom: 2,
    fontWeight: "600",
  },

  mesBarBackground: {
    width: "100%",
    height: 12,
    backgroundColor: "#e5e7eb",
    borderRadius: 6,
    overflow: "hidden",
    marginVertical: 2,
  },

  mesBarFill: {
    height: "100%",
    borderRadius: 6,
    backgroundColor: "#16a34a",
  },

  mesValue: {
    fontSize: 12,
    marginTop: 2,
    textAlign: "right",
  },

  comparativoContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },

  comparativoTitle: {
    fontSize: 14,
    marginBottom: 12,
  },

  comparativoRow: {
    marginBottom: 12,
  },

  comparativoNome: {
    fontSize: 14,
    marginBottom: 2,
  },

  comparativoBarBackground: {
    width: "100%",
    height: 10,
    backgroundColor: "#e5e7eb",
    borderRadius: 5,
    overflow: "hidden",
    marginVertical: 2,
  },

  comparativoBarFill: {
    height: "100%",
    borderRadius: 5,
  },

  comparativoValor: {
    fontSize: 11,
    marginTop: 2,
    textAlign: "right",
  },

  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },

  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  bottomMenu: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
