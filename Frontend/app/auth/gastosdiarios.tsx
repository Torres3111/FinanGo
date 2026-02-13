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
  id: string;
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
  const [activeTab, setActiveTab] =
    useState<AppRoute>("/gastosdiarios");

  const selectedMonth = "Fevereiro de 2026";

  async function buscarGastos() {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) {
        throw new Error("Usuário não encontrado.");
      }

      const response = await fetch(
        `${API_URL}/registro/mostrar/${userId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao buscar gastos.");
      }

      setGastos(data.gastos || []);
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    }
  }

  useEffect(() => {
    buscarGastos();
  }, []);

  async function criarGastoDiario({
    descricao,
    valor,
    categoria,
    data,
  }: {
    descricao: string;
    valor: number;
    categoria: string;
    data: Date;
  }) {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) {
        throw new Error("Usuário não encontrado.");
      }

      const dataFormatada = data
        .toISOString()
        .split("T")[0];

      const response = await fetch(
        `${API_URL}/registro/adicionar`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: Number(userId),
            descricao,
            valor,
            categoria,
            data_registro: dataFormatada,
          }),
        }
      );

      const dataResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          dataResponse.error ||
            "Erro ao criar gasto."
        );
      }

      return dataResponse.gasto_diario;
    } catch (error: any) {
      Alert.alert("Erro", error.message);
      return null;
    }
  }


  const totalMes = gastos.reduce(
    (total, gasto) => total + gasto.valor,
    0
  );

  return (
    <SafeAreaView
      style={[styles.container, theme.container]}
    >
      <StatusBar
        barStyle={
          darkMode
            ? "light-content"
            : "dark-content"
        }
      />

      <View style={styles.content}>
        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text
              style={[
                styles.title,
                theme.text,
              ]}
            >
              Gastos Diários
            </Text>
            <Text
              style={[
                styles.subtitle,
                theme.subText,
              ]}
            >
              Registre seus gastos do dia a dia
            </Text>
          </View>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() =>
              setModalVisible(true)
            }
          >
            <Feather
              name="plus"
              size={18}
              color="#FFF"
            />
            <Text
              style={
                styles.addButtonText
              }
            >
              Novo Gasto
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={
            false
          }
          contentContainerStyle={
            styles.scrollContent
          }
        >
          {/* MÊS */}
          <View
            style={[
              styles.card,
              theme.card,
            ]}
          >
            <TouchableOpacity
              style={
                styles.monthButton
              }
            >
              <Text
                style={[
                  styles.monthText,
                  theme.text,
                ]}
              >
                {selectedMonth}
              </Text>
            </TouchableOpacity>
          </View>

          {/* TOTAL */}
          <View
            style={[
              styles.totalCard,
              theme.card,
            ]}
          >
            <Text
              style={[
                styles.totalLabel,
                theme.subText,
              ]}
            >
              Total do mês
            </Text>
            <Text
              style={[
                styles.totalValue,
                theme.text,
              ]}
            >
              R${" "}
              {totalMes
                .toFixed(2)
                .replace(".", ",")}
            </Text>
          </View>

          {/* LISTA DE GASTOS */}
          {gastos.length === 0 ? (
            <View
              style={
                styles.emptyState
              }
            >
              <Text
                style={[
                  styles.emptyStateText,
                  theme.subText,
                ]}
              >
                Nenhum gasto registrado neste mês
              </Text>
            </View>
          ) : (
            gastos.map((gasto) => (
              <View
                key={gasto.id}
                style={[
                  styles.gastoCard,
                  theme.card,
                ]}
              >
                <View>
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
                    {
                      gasto.categoria
                    }
                  </Text>
                </View>

                <Text
                  style={[
                    styles.gastoValor,
                    theme.text,
                  ]}
                >
                  R${" "}
                  {gasto.valor
                    .toFixed(2)
                    .replace(".", ",")}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* MENU */}
      <View
        style={[
          styles.menuWrapper,
          theme.container,
        ]}
      >
        <MenuCard
          items={menuItems}
          active={activeTab}
          onNavigate={(route) => {
            setActiveTab(route);
            router.push(
              `../auth${route}`
            );
          }}
        />
      </View>

      {/* MODAL */}
      <ModalGastoDiario
        visible={modalVisible}
        gasto={null}
        onClose={() =>
          setModalVisible(false)
        }
        onSave={async (data) => {
          const novoGasto =
            await criarGastoDiario({
              descricao:
                data.descricao,
              valor: data.valor,
              categoria:
                data.categoria,
              data: new Date(
                data.data_registro
              ),
            });

          if (novoGasto) {
            setModalVisible(false);
            setGastos((prev) => [
              ...prev,
              novoGasto,
            ]);
          }
        }}
      />
    </SafeAreaView>
  );
};

export default GastosDiarios;

/* ===============================
   STYLES
=============================== */

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
    marginBottom: 16,
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
    paddingHorizontal: 20,
    borderRadius: 10,
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
    marginLeft: 8,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },

  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },

  monthButton: {
    paddingVertical: 8,
  },

  monthText: {
    fontSize: 14,
    fontWeight: "500",
  },

  totalCard: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },

  totalLabel: {
    fontSize: 14,
    marginBottom: 6,
  },

  totalValue: {
    fontSize: 22,
    fontWeight: "bold",
  },

  gastoCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  },

  emptyState: {
    alignItems: "center",
    marginTop: 40,
  },

  emptyStateText: {
    fontSize: 14,
  },

  menuWrapper: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});
