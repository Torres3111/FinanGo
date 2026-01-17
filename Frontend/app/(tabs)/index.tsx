import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { router } from "expo-router";
import login from "../auth/login";
import Cadastro from "../auth/cadastro";

export default function Index() {
  return (
    <View style={styles.container}>
      <Image
        source={require("../../assets/logo/Logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push("../auth/login")}
      >
        <Text style={styles.primaryButtonText}>Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push("../auth/cadastro")}
      >
        <Text style={styles.secondaryButtonText}>Criar conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    width: 340,
    height: 340,
    marginBottom: 1,
  },
  title: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#034f2d",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: "#4B5563",
    textAlign: "center",
    marginBottom: 48,
  },
  primaryButton: {
    width: "100%",
    backgroundColor: "#034f2d",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#047857",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: "#047857",
    fontSize: 16,
    fontWeight: "600",
  },
});
