import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/lib/supabase";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSignIn() {
    if (!email.trim() || !password) {
      Alert.alert("Hata", "E-posta ve şifre gereklidir.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        Alert.alert("Giriş Başarısız", error.message);
        return;
      }

      if (!data.session) {
        Alert.alert("Hata", "Oturum oluşturulamadı.");
        return;
      }

      // Rol kontrolü
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.session.user.id)
        .single<{ role: string }>();

      if (userError || !userData) {
        await supabase.auth.signOut();
        Alert.alert(
          "Hata",
          "Kullanıcı bilgisi bulunamadı. Yöneticinize danışın.",
        );
        return;
      }

      if (userData.role !== "driver") {
        await supabase.auth.signOut();
        Alert.alert(
          "Erişim Reddedildi",
          "Bu uygulama yalnızca şoförler içindir. Web panelini kullanın.",
        );
        return;
      }

      router.replace("/(driver)");
    } catch {
      Alert.alert("Hata", "Beklenmedik bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo alanı */}
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>🚛</Text>
          </View>
          <Text style={styles.appName}>Lojistik CRM</Text>
          <Text style={styles.appSub}>Şoför Uygulaması</Text>
        </View>

        {/* Kart */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Giriş Yap</Text>

          <View style={styles.field}>
            <Text style={styles.label}>E-posta</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              placeholder="ornek@firma.com"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Şifre</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              placeholder="••••••••"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              onSubmitEditing={handleSignIn}
              returnKeyType="go"
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleSignIn}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Hesabınız yoksa yöneticinizden davet beklemeniz gerekiyor.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#EFF6FF",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 24,
  },
  logoWrap: {
    alignItems: "center",
    gap: 8,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },
  logoText: {
    fontSize: 40,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1E40AF",
  },
  appSub: {
    fontSize: 14,
    color: "#6B7280",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  field: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#F9FAFB",
  },
  btn: {
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  hint: {
    textAlign: "center",
    fontSize: 13,
    color: "#9CA3AF",
  },
});
