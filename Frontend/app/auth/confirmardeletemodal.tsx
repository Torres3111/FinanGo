import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useTheme } from "@/types/themecontext";
import { lightTheme, darkTheme } from "@/types/themes";

type Props = {
  visible: boolean;
  nomeConta?: string;
  onCancel: () => void;
  onConfirm: () => void;
};

export function confirmardeletemodal({
  visible,
  nomeConta,
  onCancel,
  onConfirm,
}: Props) {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.container, theme.card]}>
          <Text style={[styles.title, theme.text]}>
            Excluir conta
          </Text>

          <Text style={[styles.message, theme.subText]}>
            Tem certeza que deseja excluir
            {nomeConta ? ` "${nomeConta}"` : ""}?
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={[styles.cancel, theme.subText]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onConfirm}>
              <Text style={styles.delete}>
                Excluir
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default confirmardeletemodal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "85%",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    marginBottom: 24,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cancel: {
    fontSize: 16,
    marginRight: 24,
  },
  delete: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E53935",
  },
});
