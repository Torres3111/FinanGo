import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";

import MenuCard from "@/components/ui/menuCard";
import { menuItems } from "@/types/menu";
import { AppRoute } from "@/types/routes";
import { lightTheme, darkTheme } from "@/types/themes";
import { useTheme } from "@/types/themecontext";
import API_URL from "@/config/api";

export default function Configuracoes() {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [activeTab, setActiveTab] =
    useState<AppRoute>("/configuracoes");

  const [loading, setLoading] = useState(true);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [salario, setSalario] = useState("");

  useEffect(() => {
    carregarUsuario();
  }, []);

  /* ======================
     FORMATAÇÃO MONETÁRIA
  ======================= */
  function formatarMoeda(valor: string) {
    const numero = Number(valor);

    if (!numero) return "R$ 0,00";

    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(numero / 100);
  }

  async function carregarUsuario() {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) {
        Alert.alert("Erro", "Usuário não encontrado");
        return;
      }

      const response = await fetch(
        `${API_URL}/auth/info?user_id=${userId}`
      );
      const user = await response.json();

      setNome(user.usuario.nome);
      setEmail(user.usuario.email);

      setSalario(
        String(Math.round(user.usuario.salario_mensal * 100))
      );
    } catch (error) {
      Alert.alert("Erro", "Erro ao carregar informações do usuário");
    } finally {
      setLoading(false);
    }
  }

  async function salvarAlteracoes() {
    try {
      const userId = await AsyncStorage.getItem("id");

      if (!userId) {
        Alert.alert("Erro", "Usuário não encontrado");
        return;
      }

      await fetch(`${API_URL}/auth/alterar`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: userId,
          nome,
          email,
          salario_mensal: Number(salario) / 100,
        }),
      });

      Alert.alert("Sucesso", "Dados atualizados com sucesso");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar as alterações");
    }
  }

  async function logout() {
    Alert.alert(
      "Confirmar Logout",
      "Deseja realmente sair da sua conta?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sair",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            router.replace("../auth/login");
          },
        },
      ]
    );
  }

  return (
    <SafeAreaView style={[styles.container, theme.container]}>
      <View style={styles.content}>
        <View style={styles.titleWrapper}>
          <Text style={[styles.title, theme.text]}>
            Configurações
          </Text>
          <Feather
            name="settings"
            size={20}
            color={theme.text.color}
            style={styles.icon}
          />
        </View>

        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text style={[styles.label, theme.subText]}>
              Nome
            </Text>
            <TextInput
              style={[styles.input, theme.input]}
              value={nome}
              onChangeText={setNome}
            />

            <Text style={[styles.label, theme.subText]}>
              Email
            </Text>
            <TextInput
              style={[styles.input, theme.input]}
              value={email}
              autoCapitalize="none"
              keyboardType="email-address"
              onChangeText={setEmail}
            />

            <Text style={[styles.label, theme.subText]}>
              Salário mensal
            </Text>

            <View style={[styles.moneyInputWrapper, theme.input]}>
              <TextInput
                style={[styles.moneyInput, theme.money]}
                keyboardType="numeric"
                value={formatarMoeda(salario)}
                onChangeText={(texto) => {
                  const numeros = texto.replace(/\D/g, "");
                  setSalario(numeros.replace(/^0+/, ""));
                }}
              />
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={salvarAlteracoes}
            >
              <Text style={styles.buttonText}>
                Salvar alterações
              </Text>
            </TouchableOpacity>

            {/* BOTÃO LOGOUT */}
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={logout}
            >
              <Text style={styles.logoutButtonText}>
                Logout
              </Text>
            </TouchableOpacity>
          </>
        )}
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
    </SafeAreaView>
  );
}

const STATUS_BAR_HEIGHT =
  Platform.OS === "android"
    ? StatusBar.currentHeight ?? 10
    : 0;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: STATUS_BAR_HEIGHT,
  },
  content: {
    flex: 1,
    paddingHorizontal: 8,
    paddingTop: 2,
    paddingBottom: 12,
  },
  titleWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
  },
  icon: {
    marginLeft: 8,
  },
  label: {
    fontSize: 18,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
    fontSize: 18,
  },
  moneyInputWrapper: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 18,
  },
  moneyInput: {
    fontSize: 18,
  },
  button: {
    backgroundColor: "#178009",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  logoutButton: {
    backgroundColor: "#b00020",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },
  logoutButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  warningText: {
    fontSize: 14,
    color: "#eb1f08",
    paddingHorizontal: 12,
    marginBottom: 20,
  },
  menuWrapper: {
    position: "absolute",
    bottom: 8,
    left: 16,
    right: 16,
  },
});