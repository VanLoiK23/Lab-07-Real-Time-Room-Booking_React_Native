import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./src/firebase";

type Room = {
  id: string;
  name: string;
  capacity: number;
  available: boolean;
  building: string;
  floor: number;
};

type Booking = {
  id: string;
  roomId: string;
  roomName: string;
  building: string;
  slot: string;
  purpose: string;
  bookedBy: string;
  createdAt?: unknown;
};

type RoomCardProps = {
  room: Room;
  onSelect: (room: Room) => void;
  isSelected: boolean;
};

const slots = ["08:00-09:00", "09:00-10:00", "14:00-15:00"];

function RoomCard({ room, onSelect, isSelected }: RoomCardProps) {
  return (
    <View
      style={[
        styles.roomCard,
        isSelected && styles.selectedRoomCard,
        !room.available && styles.unavailableRoomCard,
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.roomIdentity}>
          <View style={styles.roomIcon}>
            <Text style={styles.roomIconText}>{room.name.slice(0, 1)}</Text>
          </View>
          <View style={styles.roomTitleWrap}>
            <Text style={styles.roomName}>{room.name}</Text>
            <Text style={styles.building}>{room.building}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            room.available ? styles.availableBadge : styles.unavailableBadge,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              room.available ? styles.availableDot : styles.unavailableDot,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              room.available ? styles.availableText : styles.unavailableText,
            ]}
          >
            {room.available ? "Available" : "Unavailable"}
          </Text>
        </View>
      </View>

      <View style={styles.cardDivider} />

      <View style={styles.roomDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>CAPACITY</Text>
          <Text style={styles.detailValue}>{room.capacity} people</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>FLOOR</Text>
          <Text style={styles.detailValue}>Floor {room.floor ?? "—"}</Text>
        </View>
      </View>

      <Pressable
        disabled={!room.available}
        onPress={() => onSelect(room)}
        style={[
          styles.selectButton,
          isSelected && styles.selectButtonSelected,
          !room.available && styles.selectButtonDisabled,
        ]}
      >
        <Text
          style={[
            styles.selectButtonText,
            !room.available && styles.selectButtonDisabledText,
          ]}
        >
          {!room.available
            ? "Not Available"
            : isSelected
            ? "✓  Selected"
            : "Select Room"}
        </Text>
      </Pressable>
    </View>
  );
}

export default function App() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [purpose, setPurpose] = useState("");
  const [bookedBy, setBookedBy] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("ALL");
  const [message, setMessage] = useState("");
  const [bookingSummary, setBookingSummary] = useState("");
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const roomsRef = collection(db, "rooms");

    const unsubscribe = onSnapshot(
      roomsRef,
      (snapshot) => {
        const roomItems = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Room[];

        setRooms(roomItems);
        setLoadError("");
        setLoadingRooms(false);

        setSelectedRoom((current) => {
          if (!current) return null;
          return roomItems.find((room) => room.id === current.id) ?? null;
        });
      },
      (error) => {
        console.error("Listen rooms failed:", error);
        setLoadError(
          "Cannot load rooms. Check your Firebase config and Firestore rules."
        );
        setLoadingRooms(false);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const bookingsQuery = query(
      collection(db, "bookings"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      bookingsQuery,
      (snapshot) => {
        const bookingItems = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        })) as Booking[];

        setBookings(bookingItems);
      },
      (error) => {
        console.error("Listen bookings failed:", error);
        setMessage("Cannot load bookings. Check Firestore rules.");
      }
    );

    return unsubscribe;
  }, []);

  const buildingFilteredRooms =
    selectedBuilding === "ALL"
      ? rooms
      : rooms.filter((room) => room.building === selectedBuilding);

  const filteredRooms = showAvailableOnly
    ? buildingFilteredRooms.filter((room) => room.available)
    : buildingFilteredRooms;

  const totalRooms = rooms.length;
  const availableRooms = rooms.filter((room) => room.available).length;
  const unavailableRooms = rooms.filter((room) => !room.available).length;

  async function handleBookRoom() {
    setMessage("");
    setBookingSummary("");

    if (!selectedRoom) {
      setMessage("Please select a room.");
      return;
    }

    if (!selectedRoom.available) {
      setMessage("This room is unavailable. Please select another room.");
      return;
    }

    if (!selectedSlot) {
      setMessage("Please select a time slot.");
      return;
    }

    if (!purpose.trim()) {
      setMessage("Please enter purpose.");
      return;
    }

    if (!bookedBy.trim()) {
      setMessage("Please enter your name.");
      return;
    }

    setSaving(true);

    try {
      await addDoc(collection(db, "bookings"), {
        roomId: selectedRoom.id,
        roomName: selectedRoom.name,
        building: selectedRoom.building,
        slot: selectedSlot,
        purpose: purpose.trim(),
        bookedBy: bookedBy.trim(),
        createdAt: serverTimestamp(),
      });

      setBookingSummary(
        `Room: ${selectedRoom.name}\nBuilding: ${
          selectedRoom.building
        }\nFloor: ${
          selectedRoom.floor ?? "—"
        }\nTime: ${selectedSlot}\nPurpose: ${purpose.trim()}\nBooked by: ${bookedBy.trim()}`
      );
      setPurpose("");
      setBookedBy("");
      setMessage("Booking created successfully.");
    } catch (error) {
      console.error("Create booking failed:", error);
      setMessage(
        "Cannot create booking. Check your connection and Firestore rules."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClearSelection() {
    setSelectedRoom(null);
    setSelectedSlot(null);
    setPurpose("");
    setBookedBy("");
    setSelectedBuilding("ALL");
    setShowAvailableOnly(false);
    setMessage("");
    setBookingSummary("");
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>RB</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE DATA</Text>
            </View>
          </View>
          <Text style={styles.eyebrow}>WEEK 7 · REACT NATIVE + FIREBASE</Text>
          <Text style={styles.title}>Room Booking</Text>
          <Text style={styles.subtitle}>
            Find a space for your next great idea.
          </Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalRooms}</Text>
            <Text style={styles.statLabel}>Total rooms</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statAvailable]}>
              {availableRooms}
            </Text>
            <Text style={styles.statLabel}>Available</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, styles.statUnavailable]}>
              {unavailableRooms}
            </Text>
            <Text style={styles.statLabel}>Unavailable</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Choose a room</Text>
            <Text style={styles.sectionSubtitle}>
              Select a space that fits your needs
            </Text>
          </View>
          <View style={styles.roomCountBadge}>
            <Text style={styles.roomCountText}>
              {filteredRooms.length} rooms
            </Text>
          </View>
        </View>

        <View style={styles.buildingFilterRow}>
          {["ALL", "Block A", "Block B"].map((building) => (
            <Pressable
              key={building}
              onPress={() => setSelectedBuilding(building)}
              style={[
                styles.buildingFilterButton,
                selectedBuilding === building &&
                  styles.buildingFilterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.buildingFilterText,
                  selectedBuilding === building &&
                    styles.buildingFilterTextActive,
                ]}
              >
                {building === "ALL" ? "All buildings" : building}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.filterRow}>
          <Pressable
            style={[
              styles.filterButton,
              !showAvailableOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowAvailableOnly(false)}
          >
            <Text
              style={[
                styles.filterButtonText,
                !showAvailableOnly && styles.filterButtonTextActive,
              ]}
            >
              All rooms
            </Text>
          </Pressable>
          <Pressable
            style={[
              styles.filterButton,
              showAvailableOnly && styles.filterButtonActive,
            ]}
            onPress={() => setShowAvailableOnly(true)}
          >
            <Text
              style={[
                styles.filterButtonText,
                showAvailableOnly && styles.filterButtonTextActive,
              ]}
            >
              Available only
            </Text>
          </Pressable>
          <Pressable style={styles.clearButton} onPress={handleClearSelection}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </Pressable>
        </View>

        {loadingRooms ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#0F766E" />
            <Text style={styles.loadingText}>
              Loading rooms from Firestore...
            </Text>
          </View>
        ) : loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Connection problem</Text>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : filteredRooms.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No rooms found</Text>
            <Text style={styles.emptyText}>
              Check the rooms collection in your Firestore database.
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            contentContainerStyle={styles.roomList}
            renderItem={({ item }) => (
              <RoomCard
                room={item}
                onSelect={(room) => {
                  setSelectedRoom(room);
                  setMessage("");
                }}
                isSelected={selectedRoom?.id === item.id}
              />
            )}
          />
        )}

        <View style={styles.bookingPanel}>
          <View style={styles.panelHeading}>
            <View>
              <Text style={styles.sectionTitle}>Make a booking</Text>
              <Text style={styles.sectionSubtitle}>
                Complete the details below
              </Text>
            </View>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>01</Text>
            </View>
          </View>

          <View style={styles.selectedRoomBox}>
            <View style={styles.selectedRoomIcon}>
              <Text style={styles.selectedRoomIconText}>
                {selectedRoom ? selectedRoom.name.slice(0, 1) : "?"}
              </Text>
            </View>
            <View style={styles.selectedRoomInfo}>
              <Text style={styles.selectedLabel}>SELECTED ROOM</Text>
              <Text style={styles.selectedRoomName}>
                {selectedRoom ? selectedRoom.name : "No room selected"}
              </Text>
              <Text style={styles.selectedRoomBuilding}>
                {selectedRoom
                  ? `${selectedRoom.building} · Floor ${
                      selectedRoom.floor ?? "—"
                    }`
                  : "Choose a room above"}
              </Text>
            </View>
          </View>

          <Text style={styles.label}>TIME SLOT</Text>
          <View style={styles.slotRow}>
            {slots.map((slot) => (
              <Pressable
                key={slot}
                style={[
                  styles.slotButton,
                  selectedSlot === slot && styles.slotButtonActive,
                ]}
                onPress={() => {
                  setSelectedSlot(slot);
                  setMessage("");
                }}
              >
                <Text
                  style={[
                    styles.slotText,
                    selectedSlot === slot && styles.slotTextActive,
                  ]}
                >
                  {slot}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>BOOKING PURPOSE</Text>
          <TextInput
            style={styles.input}
            value={purpose}
            onChangeText={setPurpose}
            placeholder="e.g. Team meeting, group study..."
            placeholderTextColor="#94A3B8"
            returnKeyType="done"
          />

          <Text style={styles.label}>BOOKED BY</Text>
          <TextInput
            style={styles.input}
            value={bookedBy}
            onChangeText={setBookedBy}
            placeholder="Your name"
            placeholderTextColor="#94A3B8"
            autoCapitalize="words"
            returnKeyType="done"
          />

          <Pressable
            style={[styles.bookButton, saving && styles.bookButtonDisabled]}
            onPress={handleBookRoom}
            disabled={saving || loadingRooms}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.bookButtonText}>Confirm booking →</Text>
            )}
          </Pressable>

          {bookingSummary ? (
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Booking summary</Text>
              <Text style={styles.summaryText}>{bookingSummary}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Recent bookings</Text>
              <Text style={styles.sectionSubtitle}>
                Total Bookings: {bookings.length} · Synced live across devices
              </Text>
            </View>
            <View style={styles.liveBadgeLight}>
              <View style={styles.liveDot} />
              <Text style={styles.liveTextLight}>REALTIME</Text>
            </View>
          </View>

          {bookings.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>No bookings yet</Text>
              <Text style={styles.emptyText}>
                Your first booking will appear here automatically.
              </Text>
            </View>
          ) : (
            bookings.slice(0, 5).map((booking) => (
              <View key={booking.id} style={styles.bookingCard}>
                <View style={styles.bookingCardTop}>
                  <View style={styles.bookingRoomIcon}>
                    <Text style={styles.bookingRoomIconText}>
                      {booking.roomName.slice(0, 1)}
                    </Text>
                  </View>
                  <View style={styles.bookingRoomInfo}>
                    <Text style={styles.bookingRoomName}>
                      {booking.roomName}
                    </Text>
                    <Text style={styles.bookingBuilding}>
                      {booking.building}
                    </Text>
                  </View>
                  <View style={styles.bookingTimeBadge}>
                    <Text style={styles.bookingTimeText}>{booking.slot}</Text>
                  </View>
                </View>
                <View style={styles.cardDivider} />
                <Text style={styles.bookingPurposeLabel}>PURPOSE</Text>
                <Text style={styles.bookingPurpose}>{booking.purpose}</Text>
                <Text style={styles.bookingBy}>
                  Booked by: {booking.bookedBy || "Unknown"}
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={styles.footerText}>
          ROOM BOOKING · POWERED BY FIRESTORE
        </Text>
      </ScrollView>

      <Modal
        transparent
        animationType="fade"
        visible={!!message}
        onRequestClose={() => setMessage("")}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View
              style={[
                styles.modalIcon,
                message.includes("successfully") && styles.modalIconSuccess,
              ]}
            >
              <Text style={styles.modalIconText}>
                {message.includes("successfully") ? "✓" : "!"}
              </Text>
            </View>
            <Text style={styles.modalTitle}>
              {message.includes("successfully")
                ? "Booking confirmed"
                : "Check details"}
            </Text>
            <Text style={styles.modalMessage}>{message}</Text>
            <Pressable
              style={styles.modalButton}
              onPress={() => setMessage("")}
            >
              <Text style={styles.modalButtonText}>Got it</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7F8",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 25,
    backgroundColor: "#123B45",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  brandMark: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D7F5EC",
  },
  brandMarkText: {
    color: "#0F766E",
    fontSize: 15,
    fontWeight: "900",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#20B486",
  },
  liveText: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#E1F7F0",
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.7,
    color: "#8FD8C8",
    marginBottom: 9,
  },
  title: {
    fontSize: 32,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.8,
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    color: "#C5DADD",
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: -1,
    marginBottom: 27,
    paddingVertical: 18,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E3ECEE",
    elevation: 2,
    shadowColor: "#123B45",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 25,
    fontWeight: "900",
    color: "#163E48",
  },
  statAvailable: {
    color: "#0F9275",
  },
  statUnavailable: {
    color: "#C65D5D",
  },
  statLabel: {
    marginTop: 5,
    fontSize: 11,
    fontWeight: "600",
    color: "#7B8C91",
  },
  statDivider: {
    width: 1,
    height: 34,
    backgroundColor: "#E5ECEE",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginBottom: 13,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#163E48",
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#7A8D92",
    lineHeight: 17,
  },
  roomCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 9,
    backgroundColor: "#E2F3EF",
  },
  roomCountText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F766E",
  },
  buildingFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 9,
  },
  buildingFilterButton: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D9E5E7",
    backgroundColor: "#FFFFFF",
  },
  buildingFilterButtonActive: {
    backgroundColor: "#DDF3ED",
    borderColor: "#A9DCCF",
  },
  buildingFilterText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#647A7F",
  },
  buildingFilterTextActive: {
    color: "#0F766E",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 22,
    marginBottom: 14,
  },
  filterButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D9E5E7",
    backgroundColor: "#FFFFFF",
  },
  filterButtonActive: {
    backgroundColor: "#176B68",
    borderColor: "#176B68",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#647A7F",
  },
  filterButtonTextActive: {
    color: "#FFFFFF",
  },
  clearButton: {
    minHeight: 40,
    paddingHorizontal: 13,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#E8EFF0",
  },
  clearButtonText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#42636A",
  },
  roomList: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  roomCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E0EAEC",
    backgroundColor: "#FFFFFF",
    elevation: 1,
    shadowColor: "#163E48",
    shadowOpacity: 0.035,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  selectedRoomCard: {
    borderWidth: 1.7,
    borderColor: "#159985",
    backgroundColor: "#F7FFFC",
  },
  unavailableRoomCard: {
    backgroundColor: "#F9FAFA",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  roomIdentity: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 11,
  },
  roomIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2F3EF",
  },
  roomIconText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#176B68",
  },
  roomTitleWrap: {
    flex: 1,
  },
  roomName: {
    fontSize: 19,
    fontWeight: "900",
    color: "#173E47",
  },
  building: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: "500",
    color: "#7A8D92",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
  },
  availableBadge: {
    backgroundColor: "#E4F7EF",
  },
  unavailableBadge: {
    backgroundColor: "#FCEBEC",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  availableDot: {
    backgroundColor: "#0F9275",
  },
  unavailableDot: {
    backgroundColor: "#C65D5D",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "800",
  },
  availableText: {
    color: "#0B8068",
  },
  unavailableText: {
    color: "#B94F56",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#EAF0F1",
    marginVertical: 14,
  },
  roomDetails: {
    flexDirection: "row",
    gap: 28,
  },
  detailItem: {
    gap: 5,
  },
  detailLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
    color: "#92A1A5",
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#405B61",
  },
  selectButton: {
    marginTop: 15,
    height: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#176B68",
  },
  selectButtonSelected: {
    backgroundColor: "#0E8B78",
  },
  selectButtonDisabled: {
    backgroundColor: "#EDF1F2",
  },
  selectButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  selectButtonDisabledText: {
    color: "#98A7AA",
  },
  bookingPanel: {
    marginTop: 17,
    marginHorizontal: 16,
    padding: 18,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0EAEC",
    elevation: 2,
    shadowColor: "#163E48",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  panelHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 17,
  },
  stepBadge: {
    width: 37,
    height: 37,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2F3EF",
  },
  stepBadgeText: {
    color: "#176B68",
    fontSize: 12,
    fontWeight: "900",
  },
  selectedRoomBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 13,
    marginBottom: 20,
    borderRadius: 13,
    backgroundColor: "#F2F8F8",
    borderWidth: 1,
    borderColor: "#E2EEEE",
  },
  selectedRoomIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#D9EFEB",
  },
  selectedRoomIconText: {
    fontSize: 17,
    fontWeight: "900",
    color: "#176B68",
  },
  selectedRoomInfo: {
    flex: 1,
  },
  selectedLabel: {
    fontSize: 9,
    letterSpacing: 1.1,
    fontWeight: "800",
    color: "#819599",
  },
  selectedRoomName: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "900",
    color: "#173E47",
  },
  selectedRoomBuilding: {
    marginTop: 2,
    fontSize: 11,
    color: "#7A8D92",
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    color: "#456168",
    marginBottom: 9,
  },
  slotRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 19,
  },
  slotButton: {
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#D9E5E7",
    backgroundColor: "#FFFFFF",
  },
  slotButtonActive: {
    backgroundColor: "#176B68",
    borderColor: "#176B68",
  },
  slotText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#60777C",
  },
  slotTextActive: {
    color: "#FFFFFF",
  },
  input: {
    minHeight: 47,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: "#D9E5E7",
    borderRadius: 10,
    backgroundColor: "#FBFDFD",
    fontSize: 13,
    color: "#173E47",
    marginBottom: 14,
  },
  bookButton: {
    minHeight: 49,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#176B68",
  },
  bookButtonDisabled: {
    opacity: 0.65,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  summaryBox: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#E8F8F0",
    borderWidth: 1,
    borderColor: "#C9EBDD",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#147653",
    marginBottom: 7,
  },
  summaryText: {
    fontSize: 12,
    lineHeight: 20,
    color: "#315F50",
  },
  recentSection: {
    marginTop: 29,
  },
  liveBadgeLight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#E2F3EF",
  },
  liveTextLight: {
    fontSize: 9,
    letterSpacing: 0.7,
    fontWeight: "900",
    color: "#176B68",
  },
  bookingCard: {
    marginHorizontal: 20,
    marginBottom: 11,
    padding: 15,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0EAEC",
  },
  bookingCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bookingRoomIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E2F3EF",
  },
  bookingRoomIconText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#176B68",
  },
  bookingRoomInfo: {
    flex: 1,
  },
  bookingRoomName: {
    fontSize: 15,
    fontWeight: "900",
    color: "#173E47",
  },
  bookingBuilding: {
    marginTop: 3,
    fontSize: 11,
    color: "#7A8D92",
  },
  bookingTimeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#EEF4F5",
  },
  bookingTimeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#42636A",
  },
  bookingPurposeLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "900",
    color: "#91A1A5",
    marginBottom: 5,
  },
  bookingPurpose: {
    fontSize: 13,
    lineHeight: 19,
    color: "#456168",
  },
  bookingBy: {
    marginTop: 8,
    fontSize: 11,
    fontWeight: "700",
    color: "#0F766E",
  },
  loadingBox: {
    marginHorizontal: 20,
    padding: 28,
    alignItems: "center",
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 12,
    color: "#71868B",
  },
  errorBox: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 13,
    backgroundColor: "#FCEBEC",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#B94F56",
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    lineHeight: 18,
    color: "#8F444B",
  },
  emptyBox: {
    marginHorizontal: 20,
    padding: 22,
    alignItems: "center",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0EAEC",
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#34565E",
  },
  emptyText: {
    marginTop: 5,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 18,
    color: "#819599",
  },
  footerText: {
    marginTop: 28,
    textAlign: "center",
    fontSize: 9,
    letterSpacing: 1.5,
    fontWeight: "800",
    color: "#9AABAE",
  },
  modalOverlay: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(9, 35, 40, 0.48)",
  },
  modalBox: {
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF0D9",
    marginBottom: 13,
  },
  modalIconSuccess: {
    backgroundColor: "#DDF7EA",
  },
  modalIconText: {
    fontSize: 23,
    fontWeight: "900",
    color: "#176B68",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "#173E47",
    textAlign: "center",
  },
  modalMessage: {
    marginTop: 9,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    color: "#647A7F",
  },
  modalButton: {
    alignSelf: "stretch",
    marginTop: 20,
    paddingVertical: 13,
    alignItems: "center",
    borderRadius: 11,
    backgroundColor: "#176B68",
  },
  modalButtonText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#FFFFFF",
  },
});
