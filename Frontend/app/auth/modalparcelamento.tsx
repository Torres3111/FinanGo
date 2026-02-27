import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import { useTheme } from "@/types/themecontext";
import { darkTheme, lightTheme } from "@/types/themes";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "@/config/api";

interface Parcelamento {
  id?: number;
  descricao: string;
  valor_total: number;
  parcelas_totais: number;
  parcelas_restantes: number;
  data_inicio: string;
  ativo: boolean;
}

interface Props {
  visible: boolean;
  parcelamento?: any;
  onClose: () => void;
  onSave: (parcelamento: any) => void;
}

export default function ModalParcelamento({
  visible,
  parcelamento,
  onClose,
  onSave,
}: Props) {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [parcelasTotais, setParcelasTotais] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (parcelamento) {
      setDescricao(parcelamento.descricao);
      setValorTotal(String(parcelamento.valor_total));
      setParcelasTotais(String(parcelamento.parcelas_totais));
      setDataInicio(parcelamento.data_inicio);
    } else {
      limparCampos();
    }
  }, [parcelamento]);

  function limparCampos() {
    setDescricao("");
    setValorTotal("");
    setParcelasTotais("");
    setDataInicio("");
  }

  async function handleSalvar() {
    try {
      if (!descricao || !valorTotal || !parcelasTotais || !dataInicio) {
        return Alert.alert("Erro", "Preencha todos os campos.");
      }

      setLoading(true);

      const usuarioId = await AsyncStorage.getItem("id");

      if (!usuarioId)
        throw new Error("Usuário não encontrado.");

      const valorTotalNumber = parseFloat(
        valorTotal.replace(",", ".")
      );

      const parcelasTotaisNumber = parseInt(
        parcelasTotais
      );

      const valorParcela =
        valorTotalNumber / parcelasTotaisNumber;

      const payload = {
        usuario_id: Number(usuarioId),
        descricao,
        valor_total: valorTotalNumber,
        valor_parcela: Number(valorParcela.toFixed(2)),
        parcelas_totais: parcelasTotaisNumber,
        parcelas_restantes: parcelamento
          ? parcelamento.parcelas_restantes
          : parcelasTotaisNumber,
        dataInicio,
        ativo: true,
      };

      onSave(payload);
      limparCampos();
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
    >
      <View style={styles.overlay}>
        <View style={[styles.container, theme.card]}>
          <Text style={[styles.title, theme.text]}>
            {parcelamento
              ? "Editar Parcelamento"
              : "Novo Parcelamento"}
          </Text>

          <TextInput
            placeholder="Descrição"
            placeholderTextColor="#999"
            style={[styles.input, theme.input]}
            value={descricao}
            onChangeText={setDescricao}
          />

          <TextInput
            placeholder="Valor Total"
            keyboardType="numeric"
            placeholderTextColor="#999"
            style={[styles.input, theme.input]}
            value={valorTotal}
            onChangeText={setValorTotal}
          />

          <TextInput
            placeholder="Quantidade de Parcelas"
            keyboardType="numeric"
            placeholderTextColor="#999"
            style={[styles.input, theme.input]}
            value={parcelasTotais}
            onChangeText={setParcelasTotais}
          />

          <TextInput
            placeholder="Data de Início (YYYY-MM-DD)"
            placeholderTextColor="#999"
            style={[styles.input, theme.input]}
            value={dataInicio}
            onChangeText={setDataInicio}
          />

          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelText}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSalvar}
              disabled={loading}
            >
              <Text style={styles.saveText}>
                {loading
                  ? "Salvando..."
                  : "Salvar"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}


const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  container: {
    borderRadius: 12,
    padding: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },

  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },

  cancelButton: {
    padding: 12,
  },

  cancelText: {
    color: "#D11A2A",
    fontWeight: "600",
  },

  saveButton: {
    backgroundColor: "#2D5F3F",
    padding: 12,
    borderRadius: 8,
  },

  saveText: {
    color: "#FFF",
    fontWeight: "600",
  },
});