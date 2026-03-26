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
  descricao: string;
  valor_total: number;
  valor_parcela: number;
  parcelas_totais: number;
  parcelas_restantes: number;
  data_inicio: string | null;
  data_vencimento?: string | null;
  ativo: boolean;
  categoria?: string | null;
}

type ParcelamentoApi = {
  id: number | string;
  descricao?: string | null;
  valor_total?: number | string | null;
  valor_parcela?: number | string | null;
  parcelas_totais?: number | string | null;
  parcelas_restantes?: number | string | null;
  data_inicio?: string | null;
  data_vencimento?: string | null;
  ativo?: boolean | null;
  categoria?: string | null;
};

type ApiBaseResponse = {
  message?: string;
  error?: string;
};

type ParcelaMutationResponse = ApiBaseResponse & {
  parcela?: ParcelamentoApi;
};

type ParcelasListResponse = {
  parcelas?: ParcelamentoApi[];
  parcelamentos?: ParcelamentoApi[];
};

type ParcelamentoPayload = {
  descricao: string;
  valor_total: number;
  valor_parcela: number;
  parcelas_totais: number;
  parcelas_restantes: number;
  data_inicio: string;
  ativo: boolean;
  usuario_id: number;
  user_id: number;
};

const Parcelamentos = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;
  const [modalVisible, setModalVisible] = useState(false);
  const [parcelamentoSelecionado, setParcelamentoSelecionado] = useState<Parcelamento | null>(null);

  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/parcelamentos");
  const TOKEN_KEY = "auth_token";

  function getErrorMessage(error: unknown, fallback = "Erro inesperado.") {
    if (error instanceof Error) return error.message;
    return fallback;
  }

  function parseNumero(valor: number | string | null | undefined): number {
    return Number(valor || 0);
  }

  function isObjectRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
  }

  function isApiBaseResponse(value: unknown): value is ApiBaseResponse {
    return isObjectRecord(value) && ("error" in value || "message" in value);
  }

  function isParcelamentoApi(value: unknown): value is ParcelamentoApi {
    return isObjectRecord(value) && "id" in value;
  }

  function isParcelasListResponse(value: unknown): value is ParcelasListResponse {
    return isObjectRecord(value) && ("parcelas" in value || "parcelamentos" in value);
  }

  function normalizarParcelamento(item: ParcelamentoApi): Parcelamento {
    return {
      id: Number(item.id),
      descricao: item.descricao || "Parcelamento",
      valor_total: parseNumero(item.valor_total),
      valor_parcela: parseNumero(item.valor_parcela),
      parcelas_totais: parseNumero(item.parcelas_totais),
      parcelas_restantes: parseNumero(item.parcelas_restantes),
      data_inicio: item.data_inicio ?? null,
      data_vencimento: item.data_vencimento ?? null,
      ativo: Boolean(item.ativo),
      categoria: item.categoria ?? null,
    };
  }

  function extractApiError(payload: ApiBaseResponse | undefined, fallback: string) {
    return payload?.error || payload?.message || fallback;
  }

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
        throw new Error("Endpoint de parcelamentos nao encontrado no backend.");
      }
      throw new Error(`Servidor retornou formato invalido (status ${response.status}).`);
    }

    return {} as T;
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

      const data = await parseResponseSafely<unknown>(response);

      if (!response.ok)
        throw new Error(
          extractApiError(
            isApiBaseResponse(data) ? data : undefined,
            "Erro ao buscar parcelamentos."
          )
        );

      const listaParcelas = Array.isArray(data)
        ? data.filter(isParcelamentoApi)
        : isParcelasListResponse(data)
          ? [
              ...(Array.isArray(data.parcelas) ? data.parcelas : []),
              ...(Array.isArray(data.parcelamentos) ? data.parcelamentos : []),
            ].filter(isParcelamentoApi)
          : [];

      setParcelamentos(listaParcelas.map(normalizarParcelamento));
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Erro ao buscar parcelamentos."));
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

              const data = await parseResponseSafely<ApiBaseResponse>(response);
              if (!response.ok) {
                throw new Error(
                  extractApiError(data, "Falha ao excluir parcelamento.")
                );
              }

              setParcelamentos((prev) =>
                prev.filter((p) => p.id !== Number(id))
              );
            } catch (error: unknown) {
              Alert.alert("Erro", getErrorMessage(error, "Falha ao excluir."));
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

      const data = await parseResponseSafely<ParcelaMutationResponse>(response);

      if (!response.ok) {
        throw new Error(extractApiError(data, "Falha ao pagar parcela."));
      }

      const parcelaAtualizada = data.parcela;
      if (parcelaAtualizada) {
        const parcelaNormalizada = normalizarParcelamento(parcelaAtualizada);
        setParcelamentos((prev) =>
          prev.map((p) =>
            p.id === parcelaId ? { ...p, ...parcelaNormalizada } : p
          )
        );
      } else {
        await buscarParcelamentos();
      }

      Alert.alert("Sucesso", "Parcela paga com sucesso.");
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Falha ao pagar parcela."));
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

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => router.push("../auth/historico_parcelamentos")}
            >
              <Feather name="clock" size={16} color="#2D5F3F" />
            </TouchableOpacity>

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
                <TouchableOpacity
                  key={p.id}
                  style={[styles.card, theme.card]}
                  activeOpacity={0.85}
                  onPress={() => abrirModalEditar(p)}
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
                </TouchableOpacity>
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
  onSave={async (payload: ParcelamentoPayload) => {
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

      const data = await parseResponseSafely<ApiBaseResponse>(response);

      if (!response.ok)
        throw new Error(extractApiError(data, "Erro ao salvar parcelamento."));

      setModalVisible(false);
      setParcelamentoSelecionado(null);
      buscarParcelamentos();
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Erro ao salvar parcelamento."));
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

  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2D5F3F",
    backgroundColor: "#EEF4EF",
  },

  historyButtonText: {
    color: "#2D5F3F",
    fontWeight: "600",
    marginLeft: 6,
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
