import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/StatusBadge";
import type { Trip } from "@/lib/types";

type TripWithCustomer = Trip & { customers: { name: string } | null };

export default function TripList() {
  const { appUser, signOut } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TripWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTrips = useCallback(async () => {
    if (!appUser) return;
    const { data, error } = await supabase
      .from("trips")
      .select("*, customers(name)")
      .eq("driver_id", appUser.id)
      .neq("status", "completed")
      .order("load_date", { ascending: true });

    if (error) {
      Alert.alert("Hata", error.message);
    } else {
      setTrips((data as TripWithCustomer[]) ?? []);
    }
    setLoading(false);
    setRefreshing(false);
  }, [appUser]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrips();
  }, [fetchTrips]);

  function onRefresh() {
    setRefreshing(true);
    fetchTrips();
  }

  async function handleSignOut() {
    Alert.alert("Çıkış", "Oturumunuzu kapatmak istiyor musunuz?", [
      { text: "İptal", style: "cancel" },
      {
        text: "Çıkış Yap",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/(auth)/sign-in");
        },
      },
    ]);
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "short",
    });
  }

  function renderItem({ item }: { item: TripWithCustomer }) {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push(`/(driver)/trip/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <StatusBadge status={item.status} />
          <Text style={styles.cardDate}>{formatDate(item.load_date)}</Text>
        </View>

        <View style={styles.route}>
          <Text style={styles.origin} numberOfLines={1}>
            {item.origin ?? "—"}
          </Text>
          <Text style={styles.arrow}>→</Text>
          <Text style={styles.dest} numberOfLines={1}>
            {item.destination ?? "—"}
          </Text>
        </View>

        {item.customers?.name && (
          <Text style={styles.customer} numberOfLines={1}>
            {item.customers.name}
          </Text>
        )}

        {item.cargo_type && <Text style={styles.cargo}>{item.cargo_type}</Text>}
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Yükleniyor…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Şoför kimliği */}
      <View style={styles.userBar}>
        <Text style={styles.userName} numberOfLines={1}>
          {appUser?.full_name ?? appUser?.email ?? "Şoför"}
        </Text>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={styles.signOutText}>Çıkış</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={trips}
        keyExtractor={(t) => t.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2563EB"]}
            tintColor="#2563EB"
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>Aktif sefer yok</Text>
            <Text style={styles.emptyText}>
              Yeni sefer atandığında burada görünecek.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#6B7280", fontSize: 15 },
  userBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1D4ED8",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  userName: {
    color: "#BFDBFE",
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
    marginRight: 12,
  },
  signOutText: {
    color: "#BFDBFE",
    fontSize: 13,
    fontWeight: "600",
  },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardDate: { fontSize: 12, color: "#9CA3AF" },
  route: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "nowrap",
  },
  origin: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  arrow: { fontSize: 14, color: "#9CA3AF" },
  dest: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  customer: { fontSize: 13, color: "#6B7280" },
  cargo: { fontSize: 12, color: "#9CA3AF" },
  empty: {
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#9CA3AF", textAlign: "center" },
});
