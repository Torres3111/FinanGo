import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Platform,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { useTheme } from "@/types/themecontext";
import { ContaFixaModal } from "@/app/auth/contafixamodal";
import API_URL from "@/config/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ===== Tipos ===== */

type ContaFixa = {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  ativa: boolean;
};

const Contas: React.FC = () => {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] =
    useState<AppRoute>("/contas");

  const [modalVisible, setModalVisible] = useState(false);
  const [contas, setContas] = useState<ContaFixa[]>([]);
  const [loading, setLoading] = useState(true);

  /* ===== GET Contas Fixas ===== */

  async function carregarContas() {
    try {
      setLoading(true);
      const userId = await AsyncStorage.getItem("id");

      const response = await fetch(
        `${API_URL}/contas-fixas/minhascontas?user_id=${userId}`
      );
      const data = await response.json();

      setContas(data);
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    } finally {
      setLoading(false);
    }
  }


  async function criarContaFixa(data: {
    nome: string;
    valor: number;
    dia_vencimento: number;
    ativa: boolean;
  }) {
    try {
      const userId = await AsyncStorage.getItem("id");

      await fetch(`${API_URL}/contas-fixas/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          ...data,
        }),
      });

      await carregarContas();
    } catch (error) {
      console.error("Erro ao criar conta fixa:", error);
    }
  }

  useEffect(() => {
    carregarContas();
  }, []);


  function renderConta({ item }: { item: ContaFixa }) {
    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.card.backgroundColor,
            borderColor: theme.subText.color + "33",
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.cardTitle, theme.text]}>
            {item.nome}
          </Text>

          {!item.ativa && (
            <Text style={styles.inactiveBadge}>
              Inativa
            </Text>
          )}
        </View>

        <Text style={[styles.valor, theme.text]}>
          {item.valor.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Text>

        <Text style={[styles.vencimento, theme.subText]}>
          Vence todo dia {item.dia_vencimento}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, theme.container]}
      edges={["top", "bottom"]}
    >
      <StatusBar
        barStyle={darkMode ? "light-content" : "dark-content"}
        backgroundColor={theme.container.backgroundColor}
      />

      <View
        style={[
          styles.header,
          { borderBottomColor: theme.subText.color + "33" },
        ]}
      >
        <Text style={[styles.title, theme.text]}>
          Contas Fixas
        </Text>

        <Text style={[styles.subtitle, theme.subText]}>
          Gerencie suas contas fixas mensais
        </Text>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>
            Nova Conta
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {!loading && contas.length === 0 && (
          <View style={styles.emptyState}>
            <Feather
              name="credit-card"
              size={64}
              color={theme.subText.color}
            />
            <Text
              style={[styles.emptyStateText, theme.subText]}
            >
              Nenhuma conta cadastrada
            </Text>
          </View>
        )}

        <FlatList
          data={contas}
          keyExtractor={(item) =>
            item.id.toString()
          }
          renderItem={renderConta}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 24,
          }}
        />
      </View>

      <View style={styles.menuWrapper}>
        <MenuCard
          items={menuItems}
          active={activeTab}
          onNavigate={(route) => {
            setActiveTab(route);
            router.push(`../auth${route}`);
          }}
        />
      </View>

      {/* ===== Modal ===== */}
      <ContaFixaModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={criarContaFixa}
      />
    </SafeAreaView>
  );
};

export default Contas;

/* ===== Styles ===== */

const STATUS_BAR_HEIGHT =
  Platform.OS === "android"
    ? StatusBar.currentHeight ?? 10
    : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },

  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 6,
  },

  subtitle: {
    fontSize: 15,
    marginBottom: 16,
  },

  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2D5F3F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignSelf: "flex-start",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },

  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
  },

  inactiveBadge: {
    fontSize: 12,
    color: "#C0392B",
    fontWeight: "600",
  },

  valor: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },

  vencimento: {
    fontSize: 14,
    marginTop: 4,
  },

  emptyState: {
    alignItems: "center",
    marginTop: 48,
  },

  emptyStateText: {
    fontSize: 16,
    marginTop: 16,
    fontWeight: "500",
  },

  menuWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
});
