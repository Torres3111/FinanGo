import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTheme } from "@/types/themecontext";
import { darkTheme, lightTheme } from "@/types/themes";
import {
  Utensils,
  Car,
  Smile,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  CircleEllipsis,
} from "lucide-react-native";
import API_URL from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

export default function Graficos() {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [modalInfoVisible, setModalInfoVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mesSelecionado, setMesSelecionado] = useState(new Date().getMonth());

  const [quantidadeGastos, setQuantidadeGastos] = useState<number>(0);
  const [totalMes, setTotalMes] = useState<number>(0);

  const [dadosCategoria, setDadosCategoria] = useState<
    { nome: string; total: number }[]
  >([]);

  const [dadosPercentuais, setDadosPercentuais] = useState<
    { nome: string; percentual: number }[]
  >([]);

  const categorias = [
    "Alimentação",
    "Transporte",
    "Lazer",
    "Saúde",
    "Educação",
    "Compras",
    "Outros",
  ];

  const iconesCategoria = {
    Alimentação: Utensils,
    Transporte: Car,
    Lazer: Smile,
    Saúde: HeartPulse,
    Educação: GraduationCap,
    Compras: ShoppingBag,
    Outros: CircleEllipsis,
  };

  type TotalGastoMesResponse = {
    total: number;
    gastos: number;
  };

  type TotalGastoCategoriaResponse = {
    total_por_categoria: Record<string, number>;
  };

  type PercentualGastoCategoriaResponse = {
    percentual_por_categoria: Record<string, number>;
  };

  const fetchTotalGastoMes = async (
    mes: number
  ): Promise<TotalGastoMesResponse | null> => {
    try {
      const userId = await AsyncStorage.getItem("id");
      if (!userId) throw new Error("UserId não encontrado");

      const response = await fetch(
        `${API_URL}/registro/total-gasto-mes/${Number(userId)}/${mes}/2026`);
      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar total de gasto por mês:", error);
      return null;
    }
  };

  const fetchTotalGastoCategoria = async (
    mes: number
  ): Promise<TotalGastoCategoriaResponse | null> => {
    try {
      const userId = await AsyncStorage.getItem("id");
      if (!userId) throw new Error("UserId não encontrado");

      const response = await fetch(
        `${API_URL}/registro/total-gasto-categoria/${Number(userId)}/${mes}/2026`);
      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar total de gasto por categoria:", error);
      return null;
    }
  };

  const fetchPercentualGastoCategoria = async (
    mes: number
  ): Promise<PercentualGastoCategoriaResponse | null> => {
    try {
      const userId = await AsyncStorage.getItem("id");
      if (!userId) throw new Error("UserId não encontrado");

      const response = await fetch(
        `${API_URL}/registro/percentual-gasto-categoria/${Number(
          userId
        )}/${mes}/2026`
      );

      return await response.json();
    } catch (error) {
      console.error("Erro ao buscar percentual de gasto por categoria:", error);
      return null;
    }
  };

  useEffect(() => {
    carregarDados();
  }, [mesSelecionado]);

  const carregarDados = async () => {
  try {
    setLoading(true);

    const mesAPI = mesSelecionado + 1;

    const [totalMesData, categoriaData, percentualData] =
      await Promise.all([
        fetchTotalGastoMes(mesAPI),
        fetchTotalGastoCategoria(mesAPI),
        fetchPercentualGastoCategoria(mesAPI),
      ]);

    if (totalMesData && typeof totalMesData.total === "number") {
      setTotalMes(totalMesData.total);
      setQuantidadeGastos(totalMesData.gastos);
    } else {
      setTotalMes(0);
      setQuantidadeGastos(0);
    }

    const categoriasObj =
      categoriaData?.total_por_categoria ?? {};

    const categoriasFormatadas = categorias.map((cat) => ({
      nome: cat,
      total: categoriasObj[cat] ?? 0,
    }));

    setDadosCategoria(categoriasFormatadas);

    const percentualObj =
      percentualData?.percentual_por_categoria ?? {};

    const percentuaisFormatados = categorias.map((cat) => ({
      nome: cat,
      percentual: percentualObj[cat] ?? 0,
    }));

    setDadosPercentuais(percentuaisFormatados);

  } catch (error) {
    console.log("Erro ao carregar dados:", error);

    // fallback total
    setTotalMes(0);
    setQuantidadeGastos(0);
    setDadosCategoria(
      categorias.map((cat) => ({ nome: cat, total: 0 }))
    );
    setDadosPercentuais(
      categorias.map((cat) => ({ nome: cat, percentual: 0 }))
    );
  } finally {
    setLoading(false);
  }
};

  const maxValor = Math.max(...dadosCategoria.map((c) => c.total), 1);

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, justifyContent: "center" }}>
          <Text style={[styles.title, theme.text]}> Análise Financeira </Text>
        </View>
        
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.voltar}>Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthSelector}> {MESES.map((mes, index) => (
        <TouchableOpacity key={index} onPress={() => setMesSelecionado(index)} style={[ styles.monthButton, mesSelecionado === index && { backgroundColor: theme.primary.color,},]}>
          <Text style={[ styles.monthText, mesSelecionado === index && { color: "#FFF" },]}> {mes.substring(0, 3)} </Text>
        </TouchableOpacity> ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, theme.card]}>
          <Text style={[styles.cardTitle, theme.text]}>
            Total em {MESES[mesSelecionado]}
          </Text>
          <Text style={[styles.valorGrande, theme.text]}>
            R$ {totalMes.toFixed(2)}
          </Text>
          <Text style={[theme.text]}>
            {quantidadeGastos} lançamentos
          </Text>
        </View>

        <View style={[styles.card, theme.card]}>
          <Text style={[styles.cardTitle, theme.text]}>
            Gastos por Categoria
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.chartContainer}>
              {dadosCategoria.map((item, index) => {
                const altura = (item.total / maxValor) * 160;
                const Icon =
                  iconesCategoria[
                    item.nome as keyof typeof iconesCategoria
                  ];

                return (
                  <View key={index} style={styles.barWrapper}>
                    <Text style={[styles.barValue, theme.text]}> R$ {item.total}</Text>
                     <View style={[styles.bar, { height: altura }]} />
                     <View style={{ marginTop: 8 }}>
                      <Icon size={18} color={theme.text.color} />
                    </View>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={[styles.card, theme.card]}>
          <Text style={[styles.cardTitle, theme.text]}>
            Percentual por Categoria
          </Text>

          {dadosPercentuais.map((item, index) => {
            const Icon =
              iconesCategoria[
                item.nome as keyof typeof iconesCategoria
              ];

            return (
              <View key={index} style={styles.percentualLinha}>
                <View style={styles.percentualHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Icon size={18} color={theme.text.color} />
                    <Text style={[styles.percentualLabel, theme.text]}>
                      {item.nome}
                    </Text>
                  </View>

                  <Text style={[styles.percentualNumero, theme.text]}>
                    {item.percentual.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.percentualBarBackground}>
                  <View
                    style={[
                      styles.percentualBarFill,
                      { width: `${item.percentual}%` },
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 10, paddingBottom: 20 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  title: { fontSize: 20, fontWeight: "bold", marginTop: 15},
  voltar: { color: "#16a34a", fontWeight: "600", marginTop: 15, marginRight: 10 },
  icon: { marginTop: 15 },

  monthSelector: { marginBottom: 10 },

  monthButton: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: "#e4e4e4",
    marginRight: 8,
  },

  monthText: { fontWeight: "600", color: "#333" },

  card: {
    padding: 16,
    borderRadius: 14,
    marginBottom: 20,
  },

  cardTitle: { fontSize: 16, fontWeight: "600" },

  valorGrande: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 10,
  },

  chartContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingVertical: 10,
  },

  barWrapper: {
    alignItems: "center",
    marginRight: 12,
    width: 50,
  },

  bar: {
    width: 26,
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },

  barValue: {
    fontSize: 12,
    marginBottom: 6,
    fontWeight: "600",
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  percentualLinha: { marginBottom: 16 },

  percentualHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  percentualLabel: { fontSize: 14, fontWeight: "500" },
  percentualNumero: { fontSize: 14, fontWeight: "600" },

  percentualBarBackground: {
    height: 8,
    borderRadius: 6,
    backgroundColor: "rgba(150,150,150,0.15)",
    overflow: "hidden",
  },

  percentualBarFill: {
    height: "100%",
    backgroundColor: "#16a34a",
    borderRadius: 6,
  },

  linha: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    height: "37%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  monthLabel: {
  fontSize: 12,
  marginTop: 6,
},

  modalTitle: { fontSize: 18, fontWeight: "bold" },
  label: { fontSize: 14, fontWeight: "500" },
});