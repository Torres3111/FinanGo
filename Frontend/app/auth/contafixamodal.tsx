import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import Checkbox from "expo-checkbox";

import { useTheme } from "@/types/themecontext";
import { lightTheme, darkTheme } from "@/types/themes";

/* ===== Tipos ===== */

type ContaFixa = {
  id: number;
  nome: string;
  valor: number;
  dia_vencimento: number;
  ativa: boolean;
};

type Props = {
  visible: boolean;
  conta: ContaFixa | null;
  onClose: () => void;
  onSave: (data: {
    nome: string;
    valor: number;
    dia_vencimento: number;
    ativa: boolean;
  }) => void;
};

export function ContaFixaModal({
  visible,
  conta,
  onClose,
  onSave,
}: Props) {
  const { darkMode } = useTheme();
  const theme = darkMode ? darkTheme : lightTheme;

  const [nome, setNome] = useState("");
  const [valor, setValor] = useState<number>(0);
  const [valorFormatado, setValorFormatado] = useState("");
  const [diaVencimento, setDiaVencimento] = useState("");
  const [ativa, setAtiva] = useState(true);

  /* ===== Preencher dados (editar) ou limpar (criar) ===== */

  useEffect(() => {
    if (conta) {
      setNome(conta.nome);
      setValor(conta.valor);
      setValorFormatado(
        conta.valor.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })
      );
      setDiaVencimento(String(conta.dia_vencimento));
      setAtiva(conta.ativa);
    } else {
      setNome("");
      setValor(0);
      setValorFormatado("");
      setDiaVencimento("");
      setAtiva(true);
    }
  }, [conta, visible]);

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
      nome,
      valor,
      dia_vencimento: Number(diaVencimento),
      ativa,
    });
  }

  return (
    <Modal transparent animationType="fade" visible={visible}>
      <View style={styles.overlay}>
        <View style={[styles.container, theme.card]}>
          <Text style={[styles.title, theme.text]}>
            {conta ? "Editar Conta Fixa" : "Nova Conta Fixa"}
          </Text>

          <TextInput
            placeholder="Nome da conta"
            placeholderTextColor={theme.subText.color}
            value={nome}
            onChangeText={setNome}
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

          <TextInput
            placeholder="Dia do vencimento (1 - 31)"
            placeholderTextColor={theme.subText.color}
            keyboardType="numeric"
            value={diaVencimento}
            onChangeText={setDiaVencimento}
            style={[
              styles.input,
              {
                backgroundColor: theme.input.backgroundColor,
                color: theme.text.color,
              },
            ]}
          />

          <View style={styles.checkboxRow}>
            <Checkbox
              value={ativa}
              onValueChange={setAtiva}
              color={
                ativa ? theme.primary.color : undefined
              }
            />
            <Text style={[styles.checkboxText, theme.text]}>
              Conta ativa
            </Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.cancel, theme.subText]}>
                Cancelar
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave}>
              <Text style={[styles.save, theme.primary]}>
                {conta ? "Salvar alterações" : "Criar conta"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default ContaFixaModal;

/* ===== Styles ===== */

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
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  checkboxText: {
    marginLeft: 8,
    fontSize: 15,
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
