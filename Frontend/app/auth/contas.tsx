import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";

import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { useTheme } from "@/types/themecontext";
import API_URL from "@/config/api";

import ContaFixaModal from "@/app/auth/contafixamodal";
import ConfirmarDeleteModal from "@/app/auth/confirmardeletemodal";

type ContaFixa = {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  ativa: boolean;
};

type ContaFixaApi = {
  id: number;
  nome: string;
  valor: number | string | null;
  dia_vencimento: number | string | null;
  ativa: boolean | null;
};

type ApiBaseResponse = {
  message?: string;
  error?: string;
};

type ContaFixaMutationResponse = ApiBaseResponse & {
  conta_fixa?: ContaFixaApi;
};

const TOKEN_KEY = "auth_token";

function getErrorMessage(error: unknown, fallback = "Erro inesperado.") {
  if (error instanceof Error) return error.message;
  return fallback;
}

function extractApiErrorMessage(payload: ApiBaseResponse | undefined, fallback: string) {
  return payload?.error || payload?.message || fallback;
}

async function parseResponseSafely<T>(response: Response): Promise<T> {
  const raw = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    try {
      return (raw ? JSON.parse(raw) : {}) as T;
    } catch {
      throw new Error("Resposta JSON inválida do servidor.");
    }
  }

  if (!response.ok) {
    throw new Error(`Servidor retornou formato inválido (status ${response.status}).`);
  }

  return {} as T;
}

function normalizarContaFixa(conta: ContaFixaApi): ContaFixa {
  return {
    id: Number(conta.id),
    nome: conta.nome,
    valor: Number(conta.valor || 0),
    dia_vencimento: Number(conta.dia_vencimento || 0),
    ativa: Boolean(conta.ativa),
  };
}

const Contas: React.FC = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] = useState<AppRoute>("/contas");
  const [modalVisible, setModalVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [contas, setContas] = useState<ContaFixa[]>([]);
  const [contaSelecionada, setContaSelecionada] = useState<ContaFixa | null>(null);
  const [contaParaExcluir, setContaParaExcluir] = useState<ContaFixa | null>(null);

  function ordenarContas(contasArray: ContaFixa[]) {
    return [...contasArray].sort((a, b) => a.dia_vencimento - b.dia_vencimento);
  }

  async function carregarContas() {
    try {
      const userId = await AsyncStorage.getItem("id");
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!userId || !token) {
        router.replace("../auth/login");
        return;
      }

      const response = await fetch(`${API_URL}/contas-fixas/minhascontas`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseSafely<ContaFixaApi[] | ApiBaseResponse>(response);

      if (!response.ok) {
        throw new Error(
          extractApiErrorMessage(
            !Array.isArray(data) ? data : undefined,
            "Erro ao carregar contas fixas."
          )
        );
      }

      const contasArray = Array.isArray(data) ? data.map(normalizarContaFixa) : [];
      setContas(ordenarContas(contasArray));
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Erro ao carregar contas fixas."));
    }
  }

  useEffect(() => {
    carregarContas();
  }, []);

  async function salvarContaFixa(data: {
    nome: string;
    valor: number;
    dia_vencimento: number;
    ativa: boolean;
  }) {
    try {
      const userId = await AsyncStorage.getItem("id");
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!userId || !token) {
        router.replace("../auth/login");
        return;
      }

      if (contaSelecionada) {
        const response = await fetch(`${API_URL}/contas-fixas/alterar/${contaSelecionada.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });

        const payload = await parseResponseSafely<ContaFixaMutationResponse>(response);
        if (!response.ok) {
          throw new Error(extractApiErrorMessage(payload, "Erro ao editar conta fixa."));
        }
      } else {
        const response = await fetch(`${API_URL}/contas-fixas/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            user_id: userId,
            ...data,
          }),
        });

        const payload = await parseResponseSafely<ContaFixaMutationResponse>(response);
        if (!response.ok) {
          throw new Error(extractApiErrorMessage(payload, "Erro ao criar conta fixa."));
        }
      }

      setModalVisible(false);
      setContaSelecionada(null);
      await carregarContas();
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Erro ao salvar conta fixa."));
    }
  }

  async function excluirConta() {
    if (!contaParaExcluir) return;

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) {
        router.replace("../auth/login");
        return;
      }

      const response = await fetch(`${API_URL}/contas-fixas/deletar/${contaParaExcluir.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await parseResponseSafely<ApiBaseResponse>(response);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(payload, "Erro ao excluir conta fixa."));
      }

      setConfirmVisible(false);
      setContaParaExcluir(null);
      await carregarContas();
    } catch (error: unknown) {
      Alert.alert("Erro", getErrorMessage(error, "Erro ao excluir conta fixa."));
    }
  }

  const totalMensal = useMemo(
    () => contas.filter((conta) => conta.ativa).reduce((total, conta) => total + conta.valor, 0),
    [contas]
  );

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.title, theme.text]}>Contas Fixas</Text>
            <Text style={[styles.subtitle, theme.subText]}>
              Gerencie suas despesas recorrentes
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setContaSelecionada(null);
              setModalVisible(true);
            }}
          >
            <Feather name="plus" size={18} color="#FFF" />
            <Text style={styles.addButtonText}>Nova Conta</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.totalCard, theme.card]}>
            <View style={styles.totalRow}>
              <View style={styles.totalTextContainer}>
                <Text style={[styles.totalLabel, theme.subText]}>Total mensal de contas ativas</Text>
                <Text style={[styles.totalValue, theme.text]}>
                  {totalMensal.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>
              </View>
            </View>
          </View>

          {contas.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, theme.subText]}>
                Nenhuma conta fixa cadastrada
              </Text>
            </View>
          ) : (
            contas.map((conta) => (
              <TouchableOpacity
                key={conta.id}
                style={[styles.contaCard, theme.card]}
                activeOpacity={0.85}
                onPress={() => {
                  setContaSelecionada(conta);
                  setModalVisible(true);
                }}
              >
                <View style={styles.contaInfo}>
                  <Text style={[styles.contaNome, theme.text]}>{conta.nome}</Text>
                  <Text style={[styles.contaVencimento, theme.subText]}>
                    Vence todo dia {conta.dia_vencimento}
                  </Text>
                  <Text style={[styles.contaStatus, conta.ativa ? styles.statusAtiva : styles.statusInativa]}>
                    {conta.ativa ? "Ativa" : "Inativa"}
                  </Text>
                </View>

                <Text style={[styles.contaValor, theme.text]}>
                  {conta.valor.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    onPress={() => {
                      setContaSelecionada(conta);
                      setModalVisible(true);
                    }}
                  >
                    <Feather name="edit" size={18} color="#2D5F3F" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setContaParaExcluir(conta);
                      setConfirmVisible(true);
                    }}
                  >
                    <Feather name="trash-2" size={18} color="#D11A2A" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
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

      <ContaFixaModal
        visible={modalVisible}
        conta={contaSelecionada}
        onClose={() => {
          setModalVisible(false);
          setContaSelecionada(null);
        }}
        onSave={salvarContaFixa}
      />

      <ConfirmarDeleteModal
        visible={confirmVisible}
        nomeConta={contaParaExcluir?.nome}
        onCancel={() => {
          setConfirmVisible(false);
          setContaParaExcluir(null);
        }}
        onConfirm={excluirConta}
      />
    </SafeAreaView>
  );
};

export default Contas;

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
    gap: 12,
  },

  headerTextContainer: {
    flex: 1,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
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

  totalTextContainer: {
    flex: 1,
  },

  totalLabel: {
    fontSize: 14,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
    marginTop: 4,
  },

  contaCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  contaInfo: {
    flex: 1,
  },

  contaNome: {
    fontSize: 16,
    fontWeight: "600",
  },

  contaVencimento: {
    fontSize: 16,
    marginTop: 4,
  },

  contaStatus: {
    fontSize: 14,
    marginTop: 2,
    fontWeight: "600",
  },

  statusAtiva: {
    color: "#2D5F3F",
  },

  statusInativa: {
    color: "#D11A2A",
  },

  contaValor: {
    fontSize: 18,
    fontWeight: "bold",
    marginRight: 10,
  },

  actions: {
    flexDirection: "row",
    gap: 10,
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
