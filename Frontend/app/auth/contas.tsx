import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  FlatList,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { useTheme } from "@/types/themecontext";
import API_URL from "@/config/api";

import ContaFixaModal from "@/app/auth/contafixamodal";
import ConfirmarDeleteModal from "@/app/auth/confirmardeletemodal";

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
  const [confirmVisible, setConfirmVisible] = useState(false);

  const [contas, setContas] = useState<ContaFixa[]>([]);
  const [loading, setLoading] = useState(true);

  const [contaSelecionada, setContaSelecionada] =
    useState<ContaFixa | null>(null);

  const [contaParaExcluir, setContaParaExcluir] =
    useState<ContaFixa | null>(null);

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

  useEffect(() => {
    carregarContas();
  }, []);

  /* ===== Criar ou Editar ===== */

  async function salvarContaFixa(data: {
    nome: string;
    valor: number;
    dia_vencimento: number;
    ativa: boolean;
  }) {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (contaSelecionada) {
        await fetch(
          `${API_URL}/contas-fixas/alterar/${contaSelecionada.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          }
        );
      } else {
        await fetch(`${API_URL}/contas-fixas/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: userId,
            ...data,
          }),
        });
      }

      setModalVisible(false);
      setContaSelecionada(null);
      await carregarContas();
    } catch (error) {
      console.error("Erro ao salvar conta fixa:", error);
    }
  }

  /* ===== Excluir ===== */

  async function excluirConta() {
    if (!contaParaExcluir) return;

    try {
      await fetch(
        `${API_URL}/contas-fixas/deletar/${contaParaExcluir.id}`,
        { method: "DELETE" }
      );

      setConfirmVisible(false);
      setContaParaExcluir(null);
      await carregarContas();
    } catch (error) {
      console.error("Erro ao excluir conta:", error);
    }
  }

  /* ===== Render Conta ===== */

  function renderConta({ item }: { item: ContaFixa }) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => {
          setContaSelecionada(item);
          setModalVisible(true);
        }}
      >
        <View
          style={[
            styles.card,
            { backgroundColor: theme.card.backgroundColor },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, theme.text]}>
              {item.nome}
            </Text>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation();
                setContaParaExcluir(item);
                setConfirmVisible(true);
              }}
            >
              <Feather
                name="trash-2"
                size={26}
                color="#E53935"
              />
            </TouchableOpacity>
          </View>

          <Text style={[styles.valor, theme.money]}>
            {item.valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Text>

          <Text style={[styles.vencimento, theme.subText]}>
            Vence todo dia {item.dia_vencimento}
          </Text>
        </View>
      </TouchableOpacity>
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
          onPress={() => {
            setContaSelecionada(null);
            setModalVisible(true);
          }}
        >
          <Feather name="plus" size={18} color="#FFF" />
          <Text style={[styles.addButtonText]}>
            Nova Conta
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={contas}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderConta}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

     {/* Menu Inferior */}
           <View
             style={[
               styles.menuWrapper, theme.container
             ]}
           >
             <MenuCard
               items={menuItems}
               active={activeTab}
               onNavigate={(route) => {
                 setActiveTab(route);
                 router.push(`../auth${route}`);
               }}
             />
           </View>

      {/* ===== Modal Criar / Editar ===== */}
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
    borderWidth: 0.2,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 25,
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
    marginTop: 2,
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
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
