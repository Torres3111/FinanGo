import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Switch,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useTheme } from "@/types/themecontext";
import { darkTheme, lightTheme } from "@/types/themes";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  const [valorParcela, setValorParcela] = useState("");
  const [parcelasTotais, setParcelasTotais] = useState("");
  const [parcelasRestantes, setParcelasRestantes] = useState("");
  const [dataInicio, setDataInicio] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [loading, setLoading] = useState(false);

  function formatDateYYYYMMDD(date: Date) {
    const ano = date.getFullYear();
    const mes = String(date.getMonth() + 1).padStart(2, "0");
    const dia = String(date.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
  }

  useEffect(() => {
    if (parcelamento) {
      setDescricao(parcelamento.descricao || "");
      setValorTotal(String(parcelamento.valor_total ?? ""));
      setValorParcela(String(parcelamento.valor_parcela ?? ""));
      setParcelasTotais(String(parcelamento.parcelas_totais ?? ""));
      setParcelasRestantes(String(parcelamento.parcelas_restantes ?? ""));
      setDataInicio(
        parcelamento.data_inicio
          ? new Date(parcelamento.data_inicio)
          : new Date()
      );
      setAtivo(parcelamento.ativo ?? true);
      return;
    }

    limparCampos();
  }, [parcelamento, visible]);

  useEffect(() => {
    const total = parseFloat(valorTotal.replace(",", "."));
    const qtd = parseInt(parcelasTotais || "0", 10);

    if (!Number.isNaN(total) && total > 0 && !Number.isNaN(qtd) && qtd > 0) {
      setValorParcela((total / qtd).toFixed(2));
      if (!parcelamento) {
        setParcelasRestantes(String(qtd));
      }
    }
  }, [valorTotal, parcelasTotais, parcelamento]);

  function limparCampos() {
    setDescricao("");
    setValorTotal("");
    setValorParcela("");
    setParcelasTotais("");
    setParcelasRestantes("");
    setDataInicio(new Date());
    setAtivo(true);
  }

  async function handleSalvar() {
    try {
      if (
        !descricao ||
        !valorTotal ||
        !valorParcela ||
        !parcelasTotais ||
        !parcelasRestantes
      ) {
        return Alert.alert("Erro", "Preencha todos os campos.");
      }

      const valorTotalNumber = parseFloat(valorTotal.replace(",", "."));
      const valorParcelaNumber = parseFloat(valorParcela.replace(",", "."));
      const parcelasTotaisNumber = parseInt(parcelasTotais, 10);
      const parcelasRestantesNumber = parseInt(parcelasRestantes, 10);

      if (
        Number.isNaN(valorTotalNumber) ||
        Number.isNaN(valorParcelaNumber) ||
        Number.isNaN(parcelasTotaisNumber) ||
        Number.isNaN(parcelasRestantesNumber)
      ) {
        return Alert.alert("Erro", "Verifique os campos numericos.");
      }

      setLoading(true);

      const usuarioId = await AsyncStorage.getItem("id");

      if (!usuarioId) {
        throw new Error("Usuario nao encontrado.");
      }

      const payload = {
        usuario_id: Number(usuarioId),
        user_id: Number(usuarioId),
        descricao,
        valor_total: valorTotalNumber,
        valor_parcela: valorParcelaNumber,
        parcelas_totais: parcelasTotaisNumber,
        parcelas_restantes: parcelasRestantesNumber,
        data_inicio: formatDateYYYYMMDD(dataInicio),
        ativo,
      };
      await onSave(payload);
      limparCampos();
    } catch (error: any) {
      Alert.alert("Erro", error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={[styles.container, theme.card]}>
          <Text style={[styles.title, theme.text]}>
            {parcelamento ? "Editar Parcelamento" : "Novo Parcelamento"}
          </Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <TextInput
              placeholder="Descricao"
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
              placeholder="Valor da Parcela"
              keyboardType="numeric"
              placeholderTextColor="#999"
              style={[styles.input, theme.input]}
              value={valorParcela}
              onChangeText={setValorParcela}
            />

            <TextInput
              placeholder="Parcelas Totais"
              keyboardType="numeric"
              placeholderTextColor="#999"
              style={[styles.input, theme.input]}
              value={parcelasTotais}
              onChangeText={setParcelasTotais}
            />

            <TextInput
              placeholder="Parcelas Restantes"
              keyboardType="numeric"
              placeholderTextColor="#999"
              style={[styles.input, theme.input]}
              value={parcelasRestantes}
              onChangeText={setParcelasRestantes}
            />

            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={[
                styles.input,
                theme.input,
                { justifyContent: "center" },
              ]}
            >
              <Text style={{ color: theme.text.color }}>
                {dataInicio.toLocaleDateString("pt-BR")}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dataInicio}
                mode="date"
                display={
                  Platform.OS === "ios"
                    ? "spinner"
                    : "default"
                }
                onChange={(_event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDataInicio(selectedDate);
                  }
                }}
              />
            )}

            <View style={styles.switchRow}>
              <Text style={[styles.switchLabel, theme.text]}>Ativo</Text>
              <Switch value={ativo} onValueChange={setAtivo} />
            </View>
          </ScrollView>

          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.saveButton} onPress={handleSalvar} disabled={loading}>
              <Text style={styles.saveText}>{loading ? "Salvando..." : "Salvar"}</Text>
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
    maxHeight: "85%",
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: "600",
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
