import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
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

type ParcelasListResponse = {
  parcelas?: ParcelamentoApi[];
  parcelamentos?: ParcelamentoApi[];
};

const HistoricoParcelamentos = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [activeTab, setActiveTab] = useState<AppRoute>("/parcelamentos");
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
        throw new Error("Endpoint de historico de parcelamentos nao encontrado no backend.");
      }
      throw new Error(`Servidor retornou formato invalido (status ${response.status}).`);
    }

    return {} as T;
  }

  async function buscarParcelamentosNaoAtivos() {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);

      if (!token) throw new Error("Sessao invalida. Faca login novamente.");

      const response = await fetch(`${API_URL}/parcelas/historico`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await parseResponseSafely<unknown>(response);

      if (!response.ok)
        throw new Error(
          extractApiError(
            isApiBaseResponse(data) ? data : undefined,
            "Erro ao buscar parcelamentos inativos."
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
      Alert.alert("Erro", getErrorMessage(error, "Erro ao buscar parcelamentos inativos."));
    }
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
    const dataVencimento = new Date(dataBase);
    dataVencimento.setMonth(dataVencimento.getMonth() + Math.max(totais - 1, 0));

    return dataVencimento.toLocaleDateString("pt-BR");
  }

  useEffect(() => {
    buscarParcelamentosNaoAtivos();
  }, []);

  const totalQuitado = parcelamentos.reduce((total, p) => {
    const valorTotal = Number(p.valor_total ?? 0);
    return total + valorTotal;
  }, 0);

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <StatusBar barStyle={darkMode ? "light-content" : "dark-content"} />

      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.title, theme.text]}>Historico de Parcelamentos</Text>
            <Text style={[styles.subtitle, theme.subText]}>
              Parcelamentos finalizados
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={[styles.totalCard, theme.card]}>
            <Text style={[styles.totalLabel, theme.subText]}>Total em compras encerradas</Text>
            <Text style={[styles.totalValue, theme.text]}>
              R$ {totalQuitado.toFixed(2).replace(".", ",")}
            </Text>
          </View>

          {parcelamentos.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, theme.subText]}>
                Nenhum parcelamento inativo
              </Text>
            </View>
          ) : (
            parcelamentos.map((p) => {
              const totalParcelas = Number(p.parcelas_totais ?? 0);

              return (
                <View key={p.id} style={[styles.card, theme.card]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.descricao, theme.text]}>{p.descricao || "Parcelamento"}</Text>
                    {!!p.categoria && (
                      <Text style={[styles.categoria, theme.subText]}>{p.categoria}</Text>
                    )}

                    <Text style={[styles.parcelasInfo, theme.subText]}>
                      {totalParcelas} de {totalParcelas} parcelas pagas
                    </Text>

                    <Text style={[styles.valorInfo, theme.text]}>
                      Total: R$ {Number(p.valor_total ?? 0).toFixed(2).replace(".", ",")}
                    </Text>
                  </View>
                </View>
              );
            })
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
    </SafeAreaView>
  );
};

export default HistoricoParcelamentos;

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1 },

  header: {
    marginTop: 24,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
  },

  subtitle: {
    fontSize: 15,
    marginTop: 4,
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

  valorInfo: {
    fontSize: 15,
    lineHeight: 20,
    marginTop: 6,
    fontWeight: "600",
  },

  vencimentoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
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
