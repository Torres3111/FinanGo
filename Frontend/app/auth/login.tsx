import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useState } from "react";
import API_URL from "../../config/api";

///////////////////////////// FUNÇÃO LOGIN /////////////////////////////
export default function Login() {
  const [nome, setNome] = useState("");
  const [senha_hash, setSenha_hash] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!nome || !senha_hash) {
      Alert.alert("Erro", "Preencha todos os campos");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/auth/login`, { // ROTA DO LOGIN
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nome,
          senha_hash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Erro", data.error || "Erro ao entrar");
        return;
      }

      Alert.alert("Sucesso", "Login realizado com sucesso!");
      router.replace("../auth/dashboard-financeiro"); // dashboard futuramente
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor");
    } finally {
      setLoading(false);
    }
  }
  ///////////////////////////// FUNÇÃO LOGIN /////////////////////////////

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Entrar</Text>

      <Text style={styles.label}>Nome de usuário</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite seu nome de usuário"
        autoCapitalize="none"
        value={nome}
        onChangeText={setNome}
      />

      <Text style={styles.label}>Senha</Text>
      <TextInput
        style={styles.input}
        placeholder="Digite sua senha"
        secureTextEntry
        value={senha_hash}
        onChangeText={setSenha_hash}
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.primaryButtonText}>
          {loading ? "Entrando..." : "Entrar"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("../auth/cadastro")}>
        <Text style={styles.linkText}>Criar uma conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    padding: 24,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#034f2d",
    marginBottom: 32,
    textAlign: "center",
  },
  label: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: "#034f2d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    marginTop: 24,
    textAlign: "center",
    color: "#047857",
    fontSize: 14,
    fontWeight: "500",
  },
});
