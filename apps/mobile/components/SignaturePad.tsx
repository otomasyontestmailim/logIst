import { useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import SignatureCanvas from "react-native-signature-canvas";

type Props = {
  onConfirm: (base64: string) => void;
  onClose: () => void;
  loading?: boolean;
};

export function SignaturePad({ onConfirm, onClose, loading = false }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ref = useRef<any>(null);

  function handleOK(signature: string) {
    // signature is "data:image/png;base64,..."
    const base64 = signature.replace("data:image/png;base64,", "");
    onConfirm(base64);
  }

  const webStyle = `.m-signature-pad { box-shadow: none; border: 1px solid #E5E7EB; border-radius: 8px; }
    .m-signature-pad--footer { display: none; }
    body { margin: 0; padding: 8px; background: #F9FAFB; }`;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.title}>Teslim İmzası</Text>
        <Text style={styles.subtitle}>Alıcının imzasını alın</Text>

        <View style={styles.canvasWrap}>
          <SignatureCanvas
            ref={ref}
            onOK={handleOK}
            webStyle={webStyle}
            backgroundColor="white"
            penColor="#111827"
            descriptionText=""
            clearText="Temizle"
            confirmText="Onayla"
            autoClear={false}
          />
        </View>

        <View style={styles.row}>
          <TouchableOpacity
            style={styles.btnOutline}
            onPress={() => ref.current?.clearSignature()}
          >
            <Text style={styles.btnOutlineText}>Temizle</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btnPrimary, loading && styles.btnDisabled]}
            onPress={() => ref.current?.readSignature()}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Onayla</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>İptal</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
    zIndex: 100,
  },
  card: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: -8,
  },
  canvasWrap: {
    height: 220,
    borderRadius: 8,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  btnOutline: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnOutlineText: {
    color: "#374151",
    fontWeight: "600",
  },
  btnPrimary: {
    flex: 1,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: "#fff",
    fontWeight: "600",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 8,
  },
  cancelText: {
    color: "#9CA3AF",
    fontSize: 14,
  },
});
