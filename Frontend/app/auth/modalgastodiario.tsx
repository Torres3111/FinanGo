import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";

import { useTheme } from "@/types/themecontext";
import { lightTheme, darkTheme } from "@/types/themes";

/* ===== Tipos ===== */

type GastoDiario = {
  id: number;
  descricao: string;
  valor: number;
  categoria: string;
  data_registro: string;
};

type Props = {
  visible: boolean;
  gasto: GastoDiario | null;
  onClose: () => void;
  onSave: (data: {
    descricao: string;
    valor: number;
    categoria: string;
    data_registro: string;
  }) => void;
};

/* ===== Categorias fixas ===== */

const categorias = [
  "Alimentação",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Compras",
  "Assinaturas",
  "Outros",
];

export function GastoDiarioModal({
  visible,
  gasto,
  onClose,
  onSave,
}: Props) {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [valorFormatado, setValorFormatado] = useState("");
  const [categoria, setCategoria] = useState(categorias[0]);
  const [data, setData] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (gasto) {
      setDescricao(gasto.descricao);
      setValor(gasto.valor);
      setValorFormatado(
        gasto.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      );
      setCategoria(gasto.categoria);
      setData(new Date(gasto.data_registro));
    } else {
      setDescricao("");
      setValor(0);
      setValorFormatado("");
      setCategoria(categorias[0]);
      setData(new Date());
    }
  }, [gasto, visible]);

  /* ===== Formatação monetária ===== */

  function formatarParaReal(valorTexto: string) {
    const apenasNumeros = valorTexto.replace(/\D/g, "");
    const numero = Number(apenasNumeros) / 100;

    return {
      numero,
      formatado: numero.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      }),
    };
  }

  function handleSave() {
    onSave({
      descricao,
      valor,
      categoria,
      data_registro: data.toISOString(),
    });
  }

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.container, theme.card]}>
          <Text style={[styles.title, theme.text]}>
            {gasto ? "Editar Gasto Diário" : "Novo Gasto Diário"}
          </Text>

          <TextInput
            placeholder="Descrição"
            placeholderTextColor={theme.subText.color}
            value={descricao}
            onChangeText={setDescricao}
            style={[
              styles.input,
              {
                backgroundColor: theme.input.backgroundColor,
                color: theme.text.color,
              },
            ]}
          />

          <TextInput
            placeholder="Valor"
            placeholderTextColor={theme.subText.color}
            keyboardType="numeric"
            value={valorFormatado}
            onChangeText={(texto) => {
              const { numero, formatado } =
                formatarParaReal(texto);
              setValor(numero);
              setValorFormatado(formatado);
            }}
            style={[
              styles.input,
              {
                backgroundColor: theme.input.backgroundColor,
                color: theme.text.color,
              },
            ]}
          />

          <View
            style={[
              styles.pickerWrapper,
              { backgroundColor: theme.input.backgroundColor },
            ]}
          >
            <Picker
              selectedValue={categoria}
              onValueChange={(itemValue) =>
                setCategoria(itemValue)
              }
              dropdownIconColor={theme.text.color}
              style={{ color: theme.text.color }}
            >
              {categorias.map((cat) => (
                <Picker.Item
                  key={cat}
                  label={cat}
                  value={cat}
                />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            style={[
              styles.input,
              {
                backgroundColor: theme.input.backgroundColor,
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ color: theme.text.color }}>
              {data.toLocaleDateString("pt-BR")}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={data}
              mode="date"
              display={
                Platform.OS === "ios"
                  ? "spinner"
                  : "default"
              }
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) setData(selectedDate);
              }}
            />
          )}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancel, theme.subText]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.save, theme.primary]}>
                {gasto
                  ? "Salvar alterações"
                  : "Criar gasto"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default GastoDiarioModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    borderRadius: 14,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  pickerWrapper: {
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 24,
  },
  cancel: {
    fontSize: 16,
    marginRight: 24,
  },
  save: {
    fontSize: 16,
    fontWeight: "600",
  },
});
