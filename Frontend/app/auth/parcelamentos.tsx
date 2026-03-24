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
import * as SecureStore from "expo-secure-store";
import API_URL from "@/config/api";
import ModalParcelamento from "./modalparcelamento";

interface Parcelamento {
  id: number;
  descricao?: string;
  valor_total?: number;
  valor_parcela?: number;
  parcelas_totais?: number;
  parcelas_restantes?: number;
  data_inicio?: string;
  data_vencimento?: string;
  ativo?: boolean;
  categoria?: string;
}

const Parcelamentos = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;
  const [modalVisible, setModalVisible] = useState(false);
  const [parcelamentoSelecionado, setParcelamentoSelecionado] = useState<Parcelamento | null>(null);

  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/parcelamentos");
  const TOKEN_KEY = "auth_token";

  async function parseResponseSafely(response: Response) {
    const raw = await response.text();
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      try {
        return raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error("Resposta JSON invalida do servidor.");
      }
    }

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Endpoint de parcelamentos nao encontrado no backend.");
      }
      throw new Error(`Servidor retornou formato invalido (status ${response.status}).`);
    }

    return {};
  }

  async function buscarParcelamentos() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) throw new Error("Sessao invalida. Faca login novamente.");

      const response = await fetch(`${API_URL}/parcelas/mostrar`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseSafely(response);

      if (!response.ok)
        throw new Error(data.error || "Erro ao buscar parcelamentos.");

      const listaParcelas = Array.isArray(data)
        ? data
        : data.parcelas || data.parcelamentos || [];

      setParcelamentos(listaParcelas);
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
              const token = await SecureStore.getItemAsync(TOKEN_KEY);
              if (!token) {
                Alert.alert("Erro", "Sessao invalida. Faca login novamente.");
                return;
              }

              const response = await fetch(
                `${API_URL}/parcelas/deletar/${id}`,
                {
                  method: "DELETE",
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              await parseResponseSafely(response);

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

  async function pagarParcela(parcelaId: number) {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        Alert.alert("Erro", "Sessao invalida. Faca login novamente.");
        return;
      }

      const response = await fetch(
        `${API_URL}/parcelas/pagar/${parcelaId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await parseResponseSafely(response);

      if (!response.ok) {
        throw new Error(data.error || "Falha ao pagar parcela.");
      }

      const parcelaAtualizada = data.parcela;
      if (parcelaAtualizada) {
        setParcelamentos((prev) =>
          prev.map((p) =>
            p.id === parcelaId ? { ...p, ...parcelaAtualizada } : p
          )
        );
      } else {
        await buscarParcelamentos();
      }

      Alert.alert("Sucesso", "Parcela paga com sucesso.");
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  }

  function confirmarPagamento(parcela: Parcelamento) {
    const restantes = Number(parcela.parcelas_restantes ?? 0);
    if (restantes <= 0) {
      Alert.alert("Aviso", "Todas as parcelas ja foram pagas.");
      return;
    }

    Alert.alert(
      "Pagar 1 parcela",
      `Confirmar pagamento de 1 parcela de \"${parcela.descricao || "Parcelamento"}\"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar pagar",
          onPress: () => pagarParcela(parcela.id),
        },
      ]
    );
  }

  function abrirModalEditar(parcela: Parcelamento) {
    setParcelamentoSelecionado(parcela);
    setModalVisible(true);
  }

  function calcularDataVencimento(parcela: Parcelamento) {
    if (parcela.data_vencimento) {
      const dataDireta = new Date(parcela.data_vencimento);
      if (!Number.isNaN(dataDireta.getTime())) {
        return dataDireta.toLocaleDateString("pt-BR");
      }
    }

    if (!parcela.data_inicio) {
      return "Sem data";
    }

    const dataBase = new Date(parcela.data_inicio);
    if (Number.isNaN(dataBase.getTime())) {
      return "Sem data";
    }

    const totais = Number(parcela.parcelas_totais ?? 0);
    const restantes = Number(parcela.parcelas_restantes ?? 0);
    const pagas = Math.max(totais - restantes, 0);

    const dataVencimento = new Date(dataBase);
    dataVencimento.setMonth(dataVencimento.getMonth() + pagas);

    return dataVencimento.toLocaleDateString("pt-BR");
  }

  const totalEmAberto = parcelamentos.reduce((total, p) => {
    const valorParcela = Number(p.valor_parcela ?? 0);
    const parcelasRestantes = Number(p.parcelas_restantes ?? 0);
    return total + valorParcela * parcelasRestantes;
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
              Total restante em parcelamentos
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
              const totalParcelas = Number(p.parcelas_totais ?? 0);
              const parcelasRestantes = Number(p.parcelas_restantes ?? 0);
              const parcelasPagas = Math.max(totalParcelas - parcelasRestantes, 0);
              const progresso = totalParcelas > 0
                ? parcelasPagas / totalParcelas
                : 0;

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
                      {p.descricao || "Parcelamento"}
                    </Text>
                    <View style={styles.vencimentoRow}>
                      <Feather
                        name="calendar"
                        size={14}
                        color={theme.subText.color}
                      />
                      <Text
                        style={[
                          styles.vencimentoText,
                          theme.subText,
                        ]}
                      >
                        Vencimento: {calcularDataVencimento(p)}
                      </Text>
                    </View>

                    {!!p.categoria && (
                      <Text
                        style={[
                          styles.categoria,
                          theme.subText,
                        ]}
                      >
                        {p.categoria}
                      </Text>
                    )}

                    <Text
                      style={[
                        styles.parcelasInfo,
                        theme.subText,
                      ]}
                    >
                      {parcelasPagas} de{" "}
                      {totalParcelas} parcelas pagas
                    </Text>
                    <Text
                      style={[
                        styles.parcelasRestantesInfo,
                        theme.subText,
                      ]}
                    >
                      Restantes: {parcelasRestantes}
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
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => abrirModalEditar(p)}
                    >
                      <Feather
                        name="edit"
                        size={22}
                        color="#2D5F3F"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => confirmarPagamento(p)}
                    >
                      <Feather
                        name="dollar-sign"
                        size={22}
                        color="#1E8449"
                      />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() =>
                        excluirParcelamento(
                          String(p.id)
                        )
                      }
                    >
                      <Feather
                        name="trash-2"
                        size={22}
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
  onClose={() => {
    setModalVisible(false);
    setParcelamentoSelecionado(null);
  }}
  onSave={async (payload) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) throw new Error("Sessao invalida. Faca login novamente.");

      const url = parcelamentoSelecionado
        ? `${API_URL}/parcelas/editar/${parcelamentoSelecionado.id}`
        : `${API_URL}/parcelas/criar`;

      const method = parcelamentoSelecionado ? "PUT" : "POST";

      const body = {
        descricao: payload.descricao,
        valor_total: payload.valor_total,
        valor_parcela: payload.valor_parcela,
        parcelas_totais: payload.parcelas_totais,
        parcelas_restantes: payload.parcelas_restantes,
        data_inicio: payload.data_inicio,
        ativo: payload.ativo,
        usuario_id: payload.usuario_id,
        user_id: payload.user_id,
      };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await parseResponseSafely(response);

      if (!response.ok)
        throw new Error(data.error || "Erro ao salvar parcelamento.");

      setModalVisible(false);
      setParcelamentoSelecionado(null);
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
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 2,
  },

  categoria: {
    fontSize: 13,
    marginTop: 6,
  },

  parcelasInfo: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },

  parcelasRestantesInfo: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },

  vencimentoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },

  vencimentoText: {
    fontSize: 12,
    fontWeight: "500",
  },

  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#DDD",
    borderRadius: 6,
    marginTop: 14,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2D5F3F",
  },

  actions: {
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },

  actionButton: {
    padding: 8,
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
