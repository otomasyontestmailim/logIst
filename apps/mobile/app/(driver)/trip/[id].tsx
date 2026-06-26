import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ActionSheetIOS,
  Platform,
} from "react-native";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth-context";
import { StatusBadge } from "@/components/StatusBadge";
import { SignaturePad } from "@/components/SignaturePad";
import {
  STATUS_LABELS,
  ACTION_LABELS,
  DRIVER_NEXT_STATUS,
} from "@/lib/trip-status";
import type { Trip, TripDocument, DocumentType } from "@/lib/types";
import { enqueue, getQueue, updateEntry, purgeDone } from "@/lib/offline-queue";
import NetInfo from "@react-native-community/netinfo";

const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  cmr: "CMR",
  invoice: "Fatura",
  waybill: "İrsaliye",
  weighbridge: "Kantar Fişi",
  adr: "ADR",
  customs: "Gümrük Beyannamesi",
  delivery_note: "Teslim Tutanağı",
};

const DOC_TYPES: DocumentType[] = [
  "cmr",
  "invoice",
  "waybill",
  "weighbridge",
  "adr",
  "customs",
  "delivery_note",
];

const DOC_STATUS_LABEL: Record<string, string> = {
  pending: "Bekliyor",
  approved: "Onaylandı",
  rejected: "Reddedildi",
};

const DOC_STATUS_COLOR: Record<string, string> = {
  pending: "#F59E0B",
  approved: "#10B981",
  rejected: "#EF4444",
};

type TripWithCustomer = Trip & { customers: { name: string } | null };

export default function TripDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { appUser } = useAuth();
  const navigation = useNavigation();

  const [trip, setTrip] = useState<TripWithCustomer | null>(null);
  const [docs, setDocs] = useState<TripDocument[]>([]);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [advancing, setAdvancing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [sigPending, setSigPending] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);

  const fetchTrip = useCallback(async () => {
    if (!id || !appUser) return;
    const [tripRes, docsRes] = await Promise.all([
      supabase
        .from("trips")
        .select("*, customers(name)")
        .eq("id", id)
        .eq("driver_id", appUser.id)
        .single<TripWithCustomer>(),
      supabase
        .from("documents")
        .select("*")
        .eq("trip_id", id)
        .order("created_at", { ascending: false })
        .returns<TripDocument[]>(),
    ]);

    if (tripRes.data) {
      setTrip(tripRes.data);
      navigation.setOptions({
        title: `${tripRes.data.origin ?? "?"} → ${tripRes.data.destination ?? "?"}`,
      });
    }
    setDocs(docsRes.data ?? []);
    setLoadingTrip(false);
  }, [id, appUser, navigation]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTrip();
  }, [fetchTrip]);

  async function getPendingCount() {
    const q = await getQueue();
    return q.filter(
      (e) =>
        e.tripId === id && (e.status === "pending" || e.status === "uploading"),
    ).length;
  }

  // Offline kuyruk sayısı
  useEffect(() => {
    getPendingCount().then(setPendingUploads);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docs, id]);

  // Seferi ilerlet
  async function handleAdvance() {
    if (!trip) return;
    const next = DRIVER_NEXT_STATUS[trip.status];
    if (!next) return;

    Alert.alert(
      "Durumu Güncelle",
      `"${STATUS_LABELS[next]}" durumuna geçmek istiyor musunuz?`,
      [
        { text: "İptal", style: "cancel" },
        {
          text: "Evet",
          onPress: async () => {
            setAdvancing(true);
            const { error } = await supabase
              .from("trips")
              .update({ status: next })
              .eq("id", trip.id)
              .eq("driver_id", appUser?.id ?? "");

            if (error) {
              Alert.alert("Hata", error.message);
            } else {
              await fetchTrip();
            }
            setAdvancing(false);
          },
        },
      ],
    );
  }

  // Belge yükle
  async function handleUpload(source: "camera" | "gallery") {
    let result: ImagePicker.ImagePickerResult;
    if (source === "camera") {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("İzin Gerekli", "Kamera erişimi gerekiyor.");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
        allowsEditing: true,
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.75,
      });
    }

    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];

    // Belge tipi seçimi
    selectDocType(async (docType: DocumentType) => {
      const netState = await NetInfo.fetch();
      if (!netState.isConnected) {
        // Offline: kuyruğa ekle
        await enqueue({
          tripId: id!,
          organizationId: appUser?.organization_id ?? "",
          docType,
          localUri: asset.uri,
        });
        setPendingUploads((c) => c + 1);
        Alert.alert(
          "Çevrimdışı",
          "Belge kaydedildi. İnternet bağlantısı gelince otomatik yüklenecek.",
        );
        return;
      }

      setUploading(true);
      try {
        await uploadToSupabase(asset.uri, docType);
        await fetchTrip();
      } catch (e) {
        Alert.alert(
          "Yükleme Hatası",
          e instanceof Error ? e.message : "Bilinmeyen hata",
        );
      } finally {
        setUploading(false);
      }
    });
  }

  async function uploadToSupabase(uri: string, docType: DocumentType) {
    const ext = uri.split(".").pop()?.toLowerCase() ?? "jpg";
    const filename = `${Date.now()}.${ext}`;
    const storagePath = `${appUser?.organization_id}/${id}/${filename}`;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const { error: storageErr } = await supabase.storage
      .from("documents")
      .upload(storagePath, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: false,
      });

    if (storageErr) throw new Error(storageErr.message);

    const { error: dbErr } = await supabase.from("documents").insert({
      organization_id: appUser?.organization_id ?? "",
      trip_id: id!,
      uploaded_by: appUser?.id ?? "",
      type: docType,
      file_url: storagePath,
      status: "pending",
      captured_at: new Date().toISOString(),
    });

    if (dbErr) throw new Error(dbErr.message);
  }

  // Offline kuyruk flush
  async function flushQueue() {
    const queue = await getQueue();
    const pending = queue.filter(
      (e) => e.tripId === id && e.status === "pending",
    );
    if (pending.length === 0) {
      Alert.alert("Bilgi", "Bekleyen belge yok.");
      return;
    }

    setUploading(true);
    let success = 0;
    let fail = 0;
    for (const entry of pending) {
      await updateEntry(entry.id, { status: "uploading" });
      try {
        await uploadToSupabase(entry.localUri, entry.docType as DocumentType);
        await updateEntry(entry.id, { status: "done" });
        success++;
      } catch (e) {
        await updateEntry(entry.id, {
          status: "error",
          error: e instanceof Error ? e.message : "Hata",
        });
        fail++;
      }
    }
    await purgeDone();
    setPendingUploads(fail);
    setUploading(false);
    await fetchTrip();
    Alert.alert(
      "Senkronizasyon",
      `${success} belge yüklendi${fail > 0 ? `, ${fail} başarısız` : ""}.`,
    );
  }

  // Belge tipi seç (iOS ActionSheet / Android Alert)
  function selectDocType(cb: (type: DocumentType) => void) {
    const labels = DOC_TYPES.map((t) => DOC_TYPE_LABELS[t]);
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [...labels, "İptal"], cancelButtonIndex: labels.length },
        (i) => {
          if (i < DOC_TYPES.length) cb(DOC_TYPES[i]);
        },
      );
    } else {
      Alert.alert("Belge Türü Seç", undefined, [
        ...DOC_TYPES.map((t) => ({
          text: DOC_TYPE_LABELS[t],
          onPress: () => cb(t),
        })),
        { text: "İptal", style: "cancel" as const },
      ]);
    }
  }

  // İmza ile teslim et
  async function handleSignatureConfirm(base64: string) {
    if (!trip || !appUser) return;
    setSigPending(true);
    try {
      const sigPath = `${appUser.organization_id}/${trip.id}/signature.png`;
      const arrayBuffer = decode(base64);

      const { error: storageErr } = await supabase.storage
        .from("documents")
        .upload(sigPath, arrayBuffer, {
          contentType: "image/png",
          upsert: true,
        });

      if (storageErr) throw new Error(storageErr.message);

      const { error: dbErr } = await supabase
        .from("trips")
        .update({
          status: "delivery_approval",
          delivery_signature_url: sigPath,
          delivered_at: new Date().toISOString(),
        })
        .eq("id", trip.id)
        .eq("driver_id", appUser.id);

      if (dbErr) throw new Error(dbErr.message);

      setShowSignature(false);
      await fetchTrip();
      Alert.alert("Teslim Edildi", "İmza kaydedildi, onay bekleniyor.");
    } catch (e) {
      Alert.alert(
        "Hata",
        e instanceof Error ? e.message : "İmza kaydedilemedi.",
      );
    } finally {
      setSigPending(false);
    }
  }

  function formatDateTime(str: string | null) {
    if (!str) return "—";
    return new Date(str).toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  if (loadingTrip || !trip) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const canAdvance = trip.status in DRIVER_NEXT_STATUS;
  const isDelivering = trip.status === "delivering";
  const nextStatus = DRIVER_NEXT_STATUS[trip.status];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Durum kartı */}
        <View style={styles.card}>
          <View style={styles.row}>
            <StatusBadge status={trip.status} />
          </View>
          <Text style={styles.routeText}>
            {trip.origin ?? "?"} → {trip.destination ?? "?"}
          </Text>
          {trip.customers?.name && (
            <Text style={styles.customerText}>{trip.customers.name}</Text>
          )}
          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Yükleme</Text>
              <Text style={styles.dateValue}>
                {formatDateTime(trip.load_date)}
              </Text>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.dateLabel}>Teslimat</Text>
              <Text style={styles.dateValue}>
                {formatDateTime(trip.delivery_date)}
              </Text>
            </View>
          </View>
        </View>

        {/* Yük bilgisi */}
        {(trip.cargo_type || trip.tonnage_kg) && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Yük Bilgisi</Text>
            {trip.cargo_type && (
              <InfoRow label="Yük Türü" value={trip.cargo_type} />
            )}
            {trip.tonnage_kg && (
              <InfoRow label="Ağırlık" value={`${trip.tonnage_kg} kg`} />
            )}
          </View>
        )}

        {/* Notlar */}
        {trip.notes && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Notlar</Text>
            <Text style={styles.notes}>{trip.notes}</Text>
          </View>
        )}

        {/* Belgeler */}
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Belgeler ({docs.length})</Text>
            {pendingUploads > 0 && (
              <TouchableOpacity onPress={flushQueue} disabled={uploading}>
                <Text style={styles.syncBtn}>
                  {uploading
                    ? "Yükleniyor…"
                    : `${pendingUploads} bekliyor — Yükle`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {docs.length === 0 ? (
            <Text style={styles.emptyDocs}>Henüz belge yüklenmedi.</Text>
          ) : (
            docs.map((doc) => (
              <View key={doc.id} style={styles.docItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.docType}>
                    {DOC_TYPE_LABELS[doc.type] ?? doc.type}
                  </Text>
                  <Text style={styles.docDate}>
                    {new Date(doc.created_at).toLocaleDateString("tr-TR")}
                  </Text>
                </View>
                <View
                  style={[
                    styles.docStatusBadge,
                    {
                      backgroundColor:
                        (DOC_STATUS_COLOR[doc.status] ?? "#F59E0B") + "20",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.docStatusText,
                      { color: DOC_STATUS_COLOR[doc.status] ?? "#F59E0B" },
                    ]}
                  >
                    {DOC_STATUS_LABEL[doc.status] ?? doc.status}
                  </Text>
                </View>
              </View>
            ))
          )}

          {/* Belge yükleme butonları */}
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => handleUpload("camera")}
              disabled={uploading}
            >
              <Text style={styles.uploadBtnText}>📷 Kamera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadBtn}
              onPress={() => handleUpload("gallery")}
              disabled={uploading}
            >
              <Text style={styles.uploadBtnText}>🖼 Galeri</Text>
            </TouchableOpacity>
          </View>
          {uploading && (
            <View style={styles.uploadingRow}>
              <ActivityIndicator size="small" color="#2563EB" />
              <Text style={styles.uploadingText}>Yükleniyor…</Text>
            </View>
          )}
        </View>

        {/* Boşluk - CTA için alan */}
        <View style={{ height: canAdvance || isDelivering ? 100 : 20 }} />
      </ScrollView>

      {/* Sabit CTA */}
      {(canAdvance || isDelivering) && (
        <View style={styles.ctaBar}>
          {isDelivering ? (
            <TouchableOpacity
              style={[styles.ctaBtn, styles.ctaBtnGreen]}
              onPress={() => setShowSignature(true)}
              disabled={advancing}
            >
              <Text style={styles.ctaBtnText}>✍️ Teslim Et — İmza Al</Text>
            </TouchableOpacity>
          ) : canAdvance && nextStatus ? (
            <TouchableOpacity
              style={styles.ctaBtn}
              onPress={handleAdvance}
              disabled={advancing}
            >
              {advancing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ctaBtnText}>
                  {ACTION_LABELS[trip.status] ?? STATUS_LABELS[nextStatus]}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      {/* İmza modalı */}
      {showSignature && (
        <SignaturePad
          onConfirm={handleSignatureConfirm}
          onClose={() => setShowSignature(false)}
          loading={sigPending}
        />
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { padding: 16, gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  row: { flexDirection: "row", alignItems: "center" },
  routeText: { fontSize: 18, fontWeight: "700", color: "#111827" },
  customerText: { fontSize: 14, color: "#6B7280" },
  dateRow: {
    flexDirection: "row",
    gap: 16,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dateCol: { flex: 1, gap: 2 },
  dateLabel: { fontSize: 11, color: "#9CA3AF", textTransform: "uppercase" },
  dateValue: { fontSize: 14, fontWeight: "600", color: "#374151" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  syncBtn: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },
  notes: { fontSize: 14, color: "#374151", lineHeight: 20 },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  infoLabel: { fontSize: 14, color: "#6B7280" },
  infoValue: { fontSize: 14, fontWeight: "500", color: "#111827" },
  emptyDocs: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    paddingVertical: 8,
  },
  docItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 10,
  },
  docType: { fontSize: 14, fontWeight: "500", color: "#111827" },
  docDate: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  docStatusBadge: {
    borderRadius: 99,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  docStatusText: { fontSize: 11, fontWeight: "600" },
  uploadRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  uploadBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    borderStyle: "dashed",
  },
  uploadBtnText: { fontSize: 14, color: "#374151", fontWeight: "500" },
  uploadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  uploadingText: { fontSize: 13, color: "#2563EB" },
  ctaBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  ctaBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  ctaBtnGreen: { backgroundColor: "#059669" },
  ctaBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});
