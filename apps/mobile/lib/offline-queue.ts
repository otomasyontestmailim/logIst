import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@logistic_upload_queue";

export type QueueEntry = {
  id: string;
  tripId: string;
  organizationId: string;
  docType: string;
  localUri: string;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
  createdAt: string;
};

export async function enqueue(
  entry: Omit<QueueEntry, "id" | "status" | "createdAt">,
): Promise<void> {
  const queue = await getQueue();
  queue.push({
    ...entry,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<QueueEntry[]> {
  try {
    const json = await AsyncStorage.getItem(QUEUE_KEY);
    return json ? (JSON.parse(json) as QueueEntry[]) : [];
  } catch {
    return [];
  }
}

export async function updateEntry(
  id: string,
  updates: Partial<Pick<QueueEntry, "status" | "error">>,
): Promise<void> {
  const queue = await getQueue();
  const updated = queue.map((e) => (e.id === id ? { ...e, ...updates } : e));
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(updated));
}

export async function purgeDone(): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((e) => e.status !== "done");
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getPendingCount(): Promise<number> {
  const queue = await getQueue();
  return queue.filter((e) => e.status === "pending" || e.status === "uploading")
    .length;
}
