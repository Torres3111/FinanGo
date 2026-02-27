import React, { useEffect, useState } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/config/api";
import ModalParcelamento from "./modalparcelamento";

interface Parcelamento {
  id: number;
  descricao: string;
  valor_total: number;
  total_parcelas: number;
  parcelas_pagas: number;
  categoria: string;
}

const Parcelamentos = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;
  const [modalVisible, setModalVisible] = useState(false);
  const [parcelamentoSelecionado, setParcelamentoSelecionado] = useState<any>(null);

  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/parcelamentos");

  async function buscarParcelamentos() {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) throw new Error("Usuário não encontrado.");

      const response = await fetch(
        `${API_URL}`
      );

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error || "Erro ao buscar parcelamentos.");

      setParcelamentos(data.parcelamentos || []);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  }

  useEffect(() => {
    buscarParcelamentos();
  }, []);

  async function excluirParcelamento(id: string) {
    Alert.alert(
      "Excluir Parcelamento",
      "Tem certeza que deseja excluir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              await fetch(
                `${API_URL}`,
                { method: "DELETE" }
              );

              setParcelamentos((prev) =>
                prev.filter((p) => p.id !== Number(id))
              );
            } catch {
              Alert.alert("Erro", "Falha ao excluir.");
            }
          },
        },
      ]
    );
  }

  const totalEmAberto = parcelamentos.reduce((total, p) => {
    const valorParcela = p.valor_total / p.total_parcelas;
    const restantes = p.total_parcelas - p.parcelas_pagas;
    return total + valorParcela * restantes;
  }, 0);

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
              Parcelamentos
            </Text>
            <Text style={[styles.subtitle, theme.subText]}>
              Acompanhe suas compras parceladas
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setParcelamentoSelecionado(null);
              setModalVisible(true);
            }}>
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>
              Novo
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}>

          <View style={[styles.totalCard, theme.card]}>
            <Text style={[styles.totalLabel, theme.subText]}>
              Total restante em parcelamentos 💳
            </Text>
            <Text style={[styles.totalValue, theme.text]}>
              R$ {totalEmAberto.toFixed(2).replace(".", ",")}
            </Text>
          </View>

          {parcelamentos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, theme.subText]}>
                Nenhum parcelamento ativo
              </Text>
            </View>
          ) : (
            parcelamentos.map((p) => {
              const progresso =
                p.parcelas_pagas / p.total_parcelas;

              return (
                <View
                  key={p.id}
                  style={[styles.card, theme.card]}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.descricao,
                        theme.text,
                      ]}
                    >
                      {p.descricao}
                    </Text>

                    <Text
                      style={[
                        styles.categoria,
                        theme.subText,
                      ]}
                    >
                      {p.categoria}
                    </Text>

                    <Text
                      style={[
                        styles.parcelasInfo,
                        theme.subText,
                      ]}
                    >
                      {p.parcelas_pagas} de{" "}
                      {p.total_parcelas} parcelas pagas
                    </Text>

                    {/* Barra de Progresso */}
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progresso * 100}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>

                  <View style={styles.actions}>
                    <TouchableOpacity>
                      <Feather
                        name="edit"
                        size={18}
                        color="#2D5F3F"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() =>
                        excluirParcelamento(
                          String(p.id)
                        )
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
              );
            })
          )}
        </ScrollView>
        <ModalParcelamento
  visible={modalVisible}
  parcelamento={parcelamentoSelecionado}
  onClose={() => setModalVisible(false)}
  onSave={async (payload) => {
    try {
      const url = parcelamentoSelecionado
        ? `${API_URL}/parcelamentos/alterar/${parcelamentoSelecionado.id}`
        : `${API_URL}/parcelamentos/adicionar`;

      const method = parcelamentoSelecionado ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok)
        throw new Error(data.error);

      setModalVisible(false);
      buscarParcelamentos();
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  }}
/>
      </View>

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

export default Parcelamentos;

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

  totalLabel: { fontSize: 14 },

  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },

  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    gap: 12,
  },

  descricao: {
    fontSize: 16,
    fontWeight: "600",
  },

  categoria: {
    fontSize: 13,
    marginTop: 4,
  },

  parcelasInfo: {
    fontSize: 12,
    marginTop: 6,
  },

  progressBar: {
    height: 6,
    backgroundColor: "#DDD",
    borderRadius: 6,
    marginTop: 8,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2D5F3F",
  },

  actions: {
    justifyContent: "space-between",
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