import { View, Text, StyleSheet } from "react-native";
import {
  STATUS_LABELS,
  STATUS_COLOR,
  STATUS_BG_COLOR,
} from "@/lib/trip-status";
import type { TripStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: TripStatus }) {
  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: STATUS_BG_COLOR[status] ?? "#F3F4F6" },
      ]}
    >
      <Text style={[styles.text, { color: STATUS_COLOR[status] ?? "#6B7280" }]}>
        {STATUS_LABELS[status] ?? status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
