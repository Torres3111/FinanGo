import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { useTheme } from "@/types/themecontext";
import { darkTheme, lightTheme } from "@/types/themes";
import Feather from "@expo/vector-icons/Feather";
import ModalGastoDiario from "./modalgastodiario";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/config/api";

interface GastoDiario {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  data_registro: string;
}

const GastosDiarios = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [modalVisible, setModalVisible] = useState(false);
  const [gastos, setGastos] = useState<GastoDiario[]>([]);
  const [gastoSelecionado, setGastoSelecionado] =
    useState<GastoDiario | null>(null);

  const [activeTab, setActiveTab] =
    useState<AppRoute>("/gastosdiarios");

  const selectedMonth = "Fevereiro de 2026";


  async function buscarGastos() {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) throw new Error("Usuário não encontrado.");

      const response = await fetch(
        `${API_URL}/registro/mostrar/${userId}`
      );

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao buscar gastos.");

      setGastos(data.gastos || []);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  }

  useEffect(() => {
    buscarGastos();
  }, []);


  async function criarGastoDiario(payload: any) {
    const response = await fetch(
      `${API_URL}/registro/adicionar`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();

    if (!response.ok)
      throw new Error(data.error || "Erro ao criar.");

    return data.gasto_diario;
  }


  async function editarGastoDiario(id: string, payload: any) {
  const response = await fetch(
    `${API_URL}/registro/alterar/${id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json();

  if (!response.ok)
    throw new Error(data.error || "Erro ao editar.");

  return data.gasto; 
}


  async function excluirGastoDiario(id: string) {
    Alert.alert(
      "Excluir Gasto",
      "Tem certeza que deseja excluir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(
                `${API_URL}/registro/deletar/${id}`,
                { method: "DELETE" }
              );

              setGastos((prev) =>
                prev.filter((g) => g.id !== Number(id))
              );
            } catch {
              Alert.alert("Erro", "Falha ao excluir.");
            }
          },
        },
      ]
    );
  }

  const totalMes = gastos.reduce(
    (total, gasto) => total + gasto.valor,
    0
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
      />

      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, theme.text]}>
              Gastos Diários
            </Text>
            <Text style={[styles.subtitle, theme.subText]}>
              Registre seus gastos do dia a dia
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setGastoSelecionado(null);
              setModalVisible(true);
            }}
          >
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>
              Novo Gasto
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          
          <View style={[styles.totalCard, theme.card]}>
            <View style={styles.totalRow}>
              <View>
                <Text style={[styles.totalLabel, theme.subText]}>
                  Total gasto em Registros Diários 🥲
                  </Text>
                  <Text style={[styles.totalValue, theme.text]}>
                    R$ {totalMes.toFixed(2).replace(".", ",")}
                  </Text>
              </View>
              <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push("/auth/graficos")}
              >
                <Feather name ="table" size={18} color="#FFF" />
                <Text style={styles.addButtonText}>
                  Ver Gráficos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {gastos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, theme.subText]}>
                Nenhum gasto registrado neste mês
              </Text>
            </View>
          ) : (
            gastos.map((gasto) => (
              <View
                key={gasto.id}
                style={[styles.gastoCard, theme.card]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.gastoDescricao,
                      theme.text,
                    ]}
                  >
                    {gasto.descricao}
                  </Text>
                  <Text
                    style={[
                      styles.gastoCategoria,
                      theme.subText,
                    ]}
                  >
                    {gasto.categoria}
                  </Text>
                </View>

                <Text
                  style={[
                    styles.gastoValor,
                    theme.text,
                  ]}
                >
                  R$ {gasto.valor.toFixed(2).replace(".", ",")}
                </Text>

                {/* AÇÕES */}
                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => {
                      setGastoSelecionado(gasto);
                      setModalVisible(true);
                    }}
                  >
                    <Feather
                      name="edit"
                      size={18}
                      color="#2D5F3F"
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() =>
                      excluirGastoDiario(String(gasto.id))
                    }
                  >
                    <Feather
                      name="trash-2"
                      size={18}
                      color="#D11A2A"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      <ModalGastoDiario
        visible={modalVisible}
        gasto={gastoSelecionado}
        onClose={() => setModalVisible(false)}
        onSave={async (data) => {
          try {
            const userId =
              await AsyncStorage.getItem("id");

            const payload = {
              user_id: Number(userId),
              descricao: data.descricao,
              valor: data.valor,
              categoria: data.categoria,
              data_registro: new Date(
                data.data_registro
              )
                .toISOString()
                .split("T")[0],
            };

            if (gastoSelecionado) {
              const atualizado =
                await editarGastoDiario(
                  String(gastoSelecionado.id),
                  payload
                );

              setGastos((prev) =>
                prev.map((g) =>
                  g.id === gastoSelecionado.id
                    ? atualizado
                    : g
                )
              );
            } else {
              const novo =
                await criarGastoDiario(payload);

              setGastos((prev) => [
                ...prev,
                novo,
              ]);
            }

            setModalVisible(false);
          } catch (error: any) {
            Alert.alert("Erro", error.message);
          }
        }}
      />
       {/* Menu inferior */}
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
};

export default GastosDiarios;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  header: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 15,
    marginTop: 4,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D5F3F",
    padding: 12,
    borderRadius: 10,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  totalCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },

  totalRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

  totalLabel: { fontSize: 14 },
  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
  },

  gastoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  gastoDescricao: {
    fontSize: 16,
    fontWeight: "600",
  },

  gastoCategoria: {
    fontSize: 13,
    marginTop: 4,
  },

  gastoValor: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 10,
  },

  actions: {
    flexDirection: "row",
    gap: 12,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },

  emptyStateText: {
    fontSize: 14,
  },

  bottomMenu: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
