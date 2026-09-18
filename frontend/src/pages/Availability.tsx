import { useEffect, useMemo, useState } from "react";
import "../App.css";

import type { AccommodationCategory, UserRole } from "../App";
import type { BookingDraft } from "./Booking";
import type { ExplicitAuthoritySelection } from "../AuthoritySelection";

export type BedStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "needs_cleaning"
  | "cleaning"
  | "out"
  | "unavailable"
  | "booked";

export interface Bed {
  id: string;
  number: number;
  status: BedStatus;
  occupant?: string;
}

export interface Room {
  id: string;
  name: string;
  category?: string;
  beds: Bed[];
}

export interface BedSelection {
  roomId: string;
  roomName: string;
  bedId: string;
  bedNumber: number;
  occupantName: string;
  guestId: string;
}

interface AvailabilityProps {
  category: AccommodationCategory;
  role: UserRole;
  booking?: BookingDraft | null;
  authoritySelection?: ExplicitAuthoritySelection | null;
  onBack: () => void;
  onConfirmBooking: (selection: BedSelection[]) => void;
}

const statusLabels: Record<BedStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  booked: "Booked",
  needs_cleaning: "Needs Cleaning",
  cleaning: "Housekeeping / Cleaning",
  out: "Out of Service",
  unavailable: "Not Available",
};

const normalize = (value: unknown): string =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");

const roomNumber = (room: Room): number => {
  const match = room.name.match(/(\d+)/);
  return match ? Number(match[1]) : 9999;
};

const isVipRoom = (room: Room): boolean => {
  const name = normalize(room.name);
  const category = normalize(room.category);
  return (
    name.includes("VIP") ||
    category === "VIP" ||
    category === "AC_VIP"
  );
};

const isAcRoom = (room: Room): boolean => {
  const name = normalize(room.name);
  const category = normalize(room.category);
  return (
    (name.startsWith("AC") && !name.includes("VIP")) ||
    category === "AC"
  );
};

const isNacRoom = (room: Room): boolean => {
  const name = normalize(room.name);
  const category = normalize(room.category);
  return (
    name.startsWith("NAC") ||
    category === "NAC" ||
    category === "NON_AC"
  );
};

const isDmRoom = (room: Room): boolean => {
  const name = normalize(room.name);
  const category = normalize(room.category);
  return (
    name.startsWith("DM") ||
    category === "DM" ||
    category === "DORMITORY"
  );
};

const isHallRoom = (room: Room): boolean => {
  const name = normalize(room.name);
  const category = normalize(room.category);
  return name === "HALL" || category === "HALL";
};

const isWholeRoom = (room: Room): boolean =>
  isAcRoom(room) || isNacRoom(room) || isVipRoom(room);

const isBedRoom = (room: Room): boolean =>
  isDmRoom(room) || isHallRoom(room);

const getRoomGroup = (room: Room): "AC" | "NAC" | "VIP" | "DM" | "HALL" | "OTHER" => {
  if (isVipRoom(room)) return "VIP";
  if (isAcRoom(room)) return "AC";
  if (isNacRoom(room)) return "NAC";
  if (isDmRoom(room)) return "DM";
  if (isHallRoom(room)) return "HALL";
  return "OTHER";
};

function Availability({
  category: _category,
  role,
  booking,
  authoritySelection,
  onBack,
  onConfirmBooking,
}: AvailabilityProps) {
  const [databaseRooms, setDatabaseRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(true);
  const [roomError, setRoomError] = useState("");
  const [selectedBeds, setSelectedBeds] = useState<BedSelection[]>([]);
  const [unavailableRoomId, setUnavailableRoomId] = useState<string | null>(null);

  const requiredGuests = booking?.guests.length ?? 1;
  const isAuthorityBooking = Boolean(authoritySelection);

  useEffect(() => {
    const loadRooms = async () => {
      try {
        setIsLoadingRooms(true);
        setRoomError("");
        setSelectedBeds([]);
        setUnavailableRoomId(null);

        const endpoint = authoritySelection
          ? `http://localhost:5000/api/rooms/authority-rooms?role=${encodeURIComponent(role)}`
          : `http://localhost:5000/api/rooms?role=${encodeURIComponent(role)}`;

        const response = await fetch(endpoint);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load rooms.");
        }

        if (!Array.isArray(data.rooms)) {
          throw new Error("Room data was not returned correctly by the server.");
        }

        const rooms: Room[] = await Promise.all(
          data.rooms.map(
            async (room: {
              id: string;
              room_number: string;
              total_beds: number;
              category_name?: string;
            }) => {
              const bedsResponse = await fetch(
                `http://localhost:5000/api/rooms/${room.id}/beds`
              );
              const bedsData = await bedsResponse.json();

              if (!bedsResponse.ok || !bedsData.success) {
                throw new Error(`Unable to load beds for ${room.room_number}.`);
              }

              const beds: Bed[] = Array.isArray(bedsData.beds)
                ? bedsData.beds.map(
                    (bed: {
                      id: string;
                      bed_number: number;
                      bed_status: string;
                    }) => {
                      let status: BedStatus = "out";
                      switch (normalize(bed.bed_status)) {
                        case "AVAILABLE":
                          status = "available";
                          break;
                        case "RESERVED":
                          status = "reserved";
                          break;
                        case "OCCUPIED":
                          status = "occupied";
                          break;
                        case "BOOKED":
                          status = "booked";
                          break;
                        case "NEEDS_CLEANING":
                          status = "needs_cleaning";
                          break;
                        case "CLEANING":
                        case "HOUSEKEEPING_CLEANING":
                          status = "cleaning";
                          break;
                        default:
                          status = "out";
                      }

                      return {
                        id: bed.id,
                        number: bed.bed_number,
                        status,
                      };
                    }
                  )
                : [];

              return {
                id: room.id,
                name: room.room_number,
                category: room.category_name,
                beds,
              };
            }
          )
        );

        setDatabaseRooms(rooms);
      } catch (error) {
        console.error("Room loading error:", error);
        setRoomError(
          error instanceof Error
            ? error.message
            : "Unable to load rooms from the backend."
        );
      } finally {
        setIsLoadingRooms(false);
      }
    };

    loadRooms();
  }, [
    role,
    authoritySelection?.roomId,
    authoritySelection?.isMatrixRoom,
    authoritySelection?.bedId,
  ]);

  const allRooms = useMemo(() => {
    return [...databaseRooms].sort((a, b) => {
      const groupOrder: Record<string, number> = {
        AC: 1,
        VIP: 2,
        NAC: 3,
        DM: 4,
        HALL: 5,
        OTHER: 6,
      };

      const groupDifference =
        groupOrder[getRoomGroup(a)] - groupOrder[getRoomGroup(b)];

      if (groupDifference !== 0) return groupDifference;

      return roomNumber(a) - roomNumber(b);
    });
  }, [databaseRooms]);

  const acRooms = useMemo(
    () =>
      allRooms
        .filter(isAcRoom)
        .sort((a, b) => roomNumber(a) - roomNumber(b)),
    [allRooms]
  );

  const vipRooms = useMemo(
    () =>
      allRooms
        .filter(isVipRoom)
        .sort((a, b) => roomNumber(a) - roomNumber(b)),
    [allRooms]
  );

  const nacRooms = useMemo(
    () =>
      allRooms
        .filter(isNacRoom)
        .sort((a, b) => roomNumber(a) - roomNumber(b)),
    [allRooms]
  );

  const dmRooms = useMemo(
    () =>
      allRooms
        .filter(isDmRoom)
        .sort((a, b) => roomNumber(a) - roomNumber(b)),
    [allRooms]
  );

  const hallRooms = useMemo(
    () => allRooms.filter(isHallRoom),
    [allRooms]
  );

  const getRoomStatus = (room: Room) => {
    const total = room.beds.length;
    const available = room.beds.filter((b) => b.status === "available").length;
    const occupied = room.beds.filter((b) => b.status === "occupied").length;
    const booked = room.beds.filter((b) => b.status === "booked").length;
    const reserved = room.beds.filter((b) => b.status === "reserved").length;
    const needsCleaning = room.beds.filter(
      (b) => b.status === "needs_cleaning"
    ).length;
    const cleaning = room.beds.filter((b) => b.status === "cleaning").length;
    const out = room.beds.filter((b) => b.status === "out").length;

    if (total === 0 || out === total) {
      return { label: "Out of Service", status: "out" as BedStatus, available, total };
    }
    if (cleaning > 0) {
      return { label: "Cleaning", status: "cleaning" as BedStatus, available, total };
    }
    if (needsCleaning > 0) {
      return {
        label: "Needs Cleaning",
        status: "needs_cleaning" as BedStatus,
        available,
        total,
      };
    }
    if (available === total) {
      return { label: "Available", status: "available" as BedStatus, available, total };
    }
    if (occupied > 0 && available === 0) {
      return { label: "Occupied", status: "occupied" as BedStatus, available, total };
    }
    if (booked > 0 && available === 0) {
      return { label: "Booked", status: "booked" as BedStatus, available, total };
    }
    if (reserved > 0 && available === 0) {
      return { label: "Reserved", status: "reserved" as BedStatus, available, total };
    }
    /*
     * AC / VIP / NAC are whole-room accommodations.
     * There is NO "Partially Available" state.
     *
     * If the complete room is not available, the room
     * is simply shown as NOT AVAILABLE.
     *
     * DM / HALL still show individual bed/seat status
     * below, so users can see exactly which beds are free.
     */
    return {
      label: "Not Available",
      status: "unavailable" as BedStatus,
      available,
      total,
    };
  };

  const selectedWholeRoomId = selectedBeds.find((s) => !s.bedId)?.roomId;
  const selectedWholeRoom = selectedWholeRoomId
    ? databaseRooms.find((room) => room.id === selectedWholeRoomId)
    : undefined;

  const selectedMatrixBeds = selectedBeds.filter((s) => Boolean(s.bedId));
  const hasWholeRoomSelection = Boolean(selectedWholeRoom);
  const hasBedSelection = selectedMatrixBeds.length > 0;

  const selectionMode: "ROOM" | "BED" | "NONE" = hasBedSelection
    ? "BED"
    : hasWholeRoomSelection
    ? "ROOM"
    : "NONE";

  const availableWholeRooms = useMemo(
    () =>
      [...acRooms, ...vipRooms, ...nacRooms].filter((room) => {
        const status = getRoomStatus(room);
        return status.total > 0 && status.available === status.total;
      }).length,
    [acRooms, vipRooms, nacRooms]
  );

  const availableBeds = useMemo(
    () =>
      [...dmRooms, ...hallRooms].reduce(
        (count, room) =>
          count + room.beds.filter((bed) => bed.status === "available").length,
        0
      ),
    [dmRooms, hallRooms]
  );

  const handleRoomSelection = (room: Room) => {
    if (!booking || !isWholeRoom(room)) return;

    if (authoritySelection && room.id !== authoritySelection.roomId) return;

    const status = getRoomStatus(room);

    if (status.total === 0) {
      setUnavailableRoomId(room.id);
      setRoomError(`${room.name} has no usable beds.`);
      return;
    }

    if (status.available !== status.total) {
      setUnavailableRoomId(room.id);
      setRoomError(`${room.name} is not fully available and cannot be allotted.`);
      return;
    }

    if (status.total < requiredGuests) {
      setUnavailableRoomId(room.id);
      setRoomError(
        `${room.name} has ${status.total} beds and cannot accommodate ${requiredGuests} guest(s).`
      );
      return;
    }

    setUnavailableRoomId(null);

    const roomSelections: BedSelection[] = booking.guests.map((guest) => ({
      roomId: room.id,
      roomName: room.name,
      bedId: "",
      bedNumber: 0,
      occupantName: guest.name || "",
      guestId: guest.id || "",
    }));

    setSelectedBeds(roomSelections);
    setRoomError("");
  };

  const handleBedClick = (room: Room, bed: Bed) => {
    if (!booking || !isBedRoom(room)) return;
    if (bed.status !== "available") return;

    if (authoritySelection && room.id !== authoritySelection.roomId) return;

    if (
      authoritySelection?.isMatrixRoom &&
      authoritySelection.bedId &&
      bed.id !== authoritySelection.bedId
    ) {
      return;
    }

    const alreadySelected = selectedBeds.some((s) => s.bedId === bed.id);

    if (alreadySelected) {
      if (authoritySelection) return;
      setSelectedBeds((current) =>
        current.filter((selection) => selection.bedId !== bed.id)
      );
      return;
    }

    if (selectedBeds.length >= requiredGuests) return;

    const nextGuest = booking.guests[selectedBeds.length];
    if (!nextGuest) return;

    setSelectedBeds((current) => [
      ...current,
      {
        roomId: room.id,
        roomName: room.name,
        bedId: bed.id,
        bedNumber: bed.number,
        occupantName: nextGuest.name || "",
        guestId: nextGuest.id || "",
      },
    ]);
    setRoomError("");
  };

  const assignGuest = (bedId: string, guestId: string) => {
    const guest = booking?.guests.find((g) => g.id === guestId);
    const duplicate = selectedBeds.some(
      (selection) => selection.bedId !== bedId && selection.guestId === guestId
    );
    if (guestId && duplicate) return;

    setSelectedBeds((current) =>
      current.map((selection) =>
        selection.bedId === bedId
          ? {
              ...selection,
              guestId: guestId || "",
              occupantName: guest?.name || "",
            }
          : selection
      )
    );
  };

  const clearSelection = () => {
    if (authoritySelection) return;
    setSelectedBeds([]);
    setRoomError("");
    setUnavailableRoomId(null);
  };

  useEffect(() => {
    if (!booking || !authoritySelection || databaseRooms.length === 0) return;

    const lockedRoom = databaseRooms.find(
      (room) => room.id === authoritySelection.roomId
    );

    if (!lockedRoom) {
      setRoomError(
        `The selected authority room ${authoritySelection.roomNumber} could not be loaded.`
      );
      return;
    }

    if (authoritySelection.isMatrixRoom) {
      if (!authoritySelection.bedId) {
        setRoomError(`No bed was selected for ${authoritySelection.roomNumber}.`);
        return;
      }

      const lockedBed = lockedRoom.beds.find(
        (bed) => bed.id === authoritySelection.bedId
      );

      if (!lockedBed) {
        setRoomError(
          `Selected bed could not be found in ${authoritySelection.roomNumber}.`
        );
        return;
      }

      if (lockedBed.status !== "available") {
        setRoomError(
          `Bed ${authoritySelection.bedNumber ?? ""} in ${authoritySelection.roomNumber} is no longer available.`
        );
        return;
      }

      const guest = booking.guests[0];
      if (!guest) return;

      setSelectedBeds([
        {
          roomId: lockedRoom.id,
          roomName: lockedRoom.name,
          bedId: lockedBed.id,
          bedNumber: lockedBed.number,
          occupantName: guest.name || "",
          guestId: guest.id || "",
        },
      ]);
      return;
    }

    const status = getRoomStatus(lockedRoom);

    if (status.available !== status.total) {
      setRoomError(`${authoritySelection.roomNumber} is not fully available.`);
      return;
    }

    if (status.total < requiredGuests) {
      setRoomError(
        `${authoritySelection.roomNumber} does not have enough capacity for this booking.`
      );
      return;
    }

    setSelectedBeds(
      booking.guests.map((guest) => ({
        roomId: lockedRoom.id,
        roomName: lockedRoom.name,
        bedId: "",
        bedNumber: 0,
        occupantName: guest.name || "",
        guestId: guest.id || "",
      }))
    );
  }, [booking, authoritySelection, databaseRooms, requiredGuests]);

  const handleConfirm = () => {
    if (!booking) return;

    if (selectionMode === "ROOM") {
      if (!hasWholeRoomSelection) return;
      if (selectedBeds.length !== requiredGuests) return;
      if (selectedBeds.some((selection) => Boolean(selection.bedId))) return;
    }

    if (selectionMode === "BED") {
      if (selectedMatrixBeds.length !== requiredGuests) return;
      if (
        selectedMatrixBeds.some(
          (selection) => !selection.guestId || !selection.occupantName
        )
      ) {
        return;
      }
    }

    const guestIds = selectedBeds.map((selection) => selection.guestId);
    if (new Set(guestIds).size !== guestIds.length) return;

    if (authoritySelection) {
      if (
        selectedBeds.some(
          (selection) => selection.roomId !== authoritySelection.roomId
        )
      ) {
        return;
      }

      if (authoritySelection.isMatrixRoom && authoritySelection.bedId) {
        if (
          selectedBeds.some(
            (selection) => selection.bedId !== authoritySelection.bedId
          )
        ) {
          return;
        }
      }
    }

    onConfirmBooking(selectedBeds);
  };

  const renderWholeRoomCard = (room: Room) => {
    const status = getRoomStatus(room);
    const selected = selectedWholeRoomId === room.id;
    const selectable =
      status.total >= requiredGuests && status.available === status.total;

    return (
      <div className="room-section" key={room.id}>
        <div className="room-title">
          <div>
            <h2>{room.name}</h2>
            <span>{room.beds.length} beds</span>
          </div>
          <span className={`room-status ${status.status}`}>
            {status.label}
          </span>
        </div>

        {booking && (
          <div
            className="room-action-row"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              minHeight: "52px",
              paddingTop: "4px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                color: "#7b8378",
                fontSize: "12px",
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "28px",
                  height: "28px",
                  borderRadius: "7px",
                  background: "#f3f5f1",
                  color: "#536947",
                  fontSize: "14px",
                }}
              >
                🛏
              </span>
              <span>
                {status.available === status.total
                  ? `${status.total} beds (All available)`
                  : `${status.total} beds (Not available)`}
              </span>
            </div>

            <button
              type="button"
              className="continue-booking-button"
              disabled={!selectable || selected}
              onClick={() => handleRoomSelection(room)}
            >
              {selected
                ? "ROOM SELECTED ✓"
                : status.status === "occupied"
                ? "OCCUPIED"
                : status.status === "booked"
                ? "BOOKED"
                : status.status === "needs_cleaning"
                ? "WAITING FOR HOUSEKEEPING"
                : status.status === "cleaning"
                ? "CLEANING IN PROGRESS"
                : status.status === "reserved"
                ? "RESERVED"
                : status.status === "out"
                ? "OUT OF SERVICE"
                : status.status === "unavailable"
                ? "ROOM NOT AVAILABLE"
                : status.total < requiredGuests
                ? "INSUFFICIENT CAPACITY"
                : selectable
                ? "SELECT ROOM →"
                : "ROOM NOT AVAILABLE"}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderBedRoom = (room: Room) => {
    const status = getRoomStatus(room);
    const selectedCount = selectedBeds.filter(
      (selection) => selection.roomId === room.id && Boolean(selection.bedId)
    ).length;

    return (
      <div className="room-section" key={room.id}>
        <div className="room-title">
          <div>
            <h2>{room.name}</h2>
            <span>{room.beds.length} beds / seats</span>
          </div>
          <span className={`room-status ${status.status}`}>
            {status.label}
          </span>
        </div>

        <div className="bed-grid">
          {room.beds.map((bed) => {
            const selected = selectedBeds.some(
              (selection) => selection.bedId === bed.id
            );

            const locked = Boolean(
              authoritySelection?.isMatrixRoom &&
                authoritySelection.bedId === bed.id
            );

            const disabledByAuthority = Boolean(
              authoritySelection?.isMatrixRoom && !locked
            );

            return (
              <button
                key={bed.id}
                type="button"
                className={`bed-card ${bed.status} ${
                  selected ? "selected" : ""
                }`}
                disabled={
                  !booking ||
                  bed.status !== "available" ||
                  disabledByAuthority
                }
                onClick={() => handleBedClick(room, bed)}
              >
                <span className="bed-number">Bed {bed.number}</span>
                <span className="bed-status">
                  {locked
                    ? "LOCKED"
                    : selected
                    ? "SELECTED"
                    : statusLabels[bed.status]}
                </span>
              </button>
            );
          })}
        </div>

        {selectedCount > 0 && (
          <div className="room-selection-summary">
            {selectedCount} bed(s) selected in {room.name}
          </div>
        )}
      </div>
    );
  };

  const unavailableRoom = unavailableRoomId
    ? databaseRooms.find((room) => room.id === unavailableRoomId)
    : undefined;

  const replacementRooms = useMemo(() => {
    if (!unavailableRoom || !booking || authoritySelection) {
      return [];
    }

    const group = getRoomGroup(unavailableRoom);

    return allRooms
      .filter((room) => room.id !== unavailableRoom.id)
      .filter((room) => getRoomGroup(room) === group)
      .filter((room) => isWholeRoom(room))
      .filter((room) => {
        const status = getRoomStatus(room);
        return (
          status.total >= requiredGuests &&
          status.available === status.total
        );
      })
      .sort((a, b) => roomNumber(a) - roomNumber(b));
  }, [
    unavailableRoom,
    booking,
    authoritySelection,
    allRooms,
    requiredGuests,
  ]);

  const headerDescription = isAuthorityBooking
    ? authoritySelection?.isMatrixRoom
      ? `Booking locked to ${authoritySelection.roomNumber}, Bed ${authoritySelection.bedNumber}. Approval remains with ${authoritySelection.authorityRole}.`
      : `Booking locked to ${authoritySelection?.roomNumber}. The complete room will be allotted. Approval remains with ${authoritySelection?.authorityRole}.`
    : booking
    ? "Select a room for AC / NAC / VIP, or an exact bed / seat for DM / HALL."
    : "View the current room availability.";

  const authorityRooms = authoritySelection
    ? databaseRooms.filter((room) => room.id === authoritySelection.roomId)
    : [];

  const visibleAcRooms = authoritySelection
    ? authorityRooms.filter(isAcRoom)
    : acRooms;
  const visibleVipRooms = authoritySelection
    ? authorityRooms.filter(isVipRoom)
    : vipRooms;
  const visibleNacRooms = authoritySelection
    ? authorityRooms.filter(isNacRoom)
    : nacRooms;
  const visibleDmRooms = authoritySelection
    ? authorityRooms.filter(isDmRoom)
    : dmRooms;
  const visibleHallRooms = authoritySelection
    ? authorityRooms.filter(isHallRoom)
    : hallRooms;

  return (
    <main className="availability-screen">
      <header className="availability-header">
        <div>
          <span className="section-label">
            {isAuthorityBooking ? "EXPLICIT AUTHORITY BOOKING" : "AVAILABILITY"}
          </span>
          <h1>Room &amp; Bed Availability</h1>
          <p>{headerDescription}</p>
        </div>

        <button
          type="button"
          className="availability-back-button"
          onClick={onBack}
        >
          {booking ? "← Back to Booking Form" : "← Back to Dashboard"}
        </button>
      </header>

      {roomError && <div className="availability-error">{roomError}</div>}

      {booking &&
        !authoritySelection &&
        unavailableRoom &&
        isWholeRoom(unavailableRoom) && (
          <section
            className="availability-toolbar"
            style={{
              border: "2px solid #c78a00",
              background: "rgba(199, 138, 0, 0.08)",
              marginBottom: "16px",
              alignItems: "center",
            }}
          >
            <div style={{ flex: 1 }}>
              <strong>CHANGE ROOM</strong>
              <p>
                {unavailableRoom.name} is not available for these dates.
                Select another available {getRoomGroup(unavailableRoom)} room.
              </p>
            </div>

            <div style={{ minWidth: "320px" }}>
              <label
                htmlFor="replacement-room"
                style={{
                  display: "block",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                Available replacement room
              </label>

              <select
                id="replacement-room"
                value=""
                onChange={(event) => {
                  const replacement = databaseRooms.find(
                    (room) => room.id === event.target.value
                  );

                  if (replacement) {
                    handleRoomSelection(replacement);
                  }
                }}
                disabled={replacementRooms.length === 0}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1px solid #c9ced8",
                  background: "#fff",
                  fontSize: "14px",
                }}
              >
                <option value="">
                  {replacementRooms.length > 0
                    ? "Select another room"
                    : `No available ${getRoomGroup(unavailableRoom)} rooms`}
                </option>

                {replacementRooms.map((room) => {
                  const status = getRoomStatus(room);

                  return (
                    <option key={room.id} value={room.id}>
                      {room.name} — {status.total} beds — Available
                    </option>
                  );
                })}
              </select>
            </div>
          </section>
        )}

      {authoritySelection && (
        <section
          className="availability-toolbar"
          style={{
            border: "2px solid #b8860b",
            background: "rgba(184, 134, 11, 0.08)",
            marginBottom: "16px",
          }}
        >
          <div>
            <strong>EXPLICIT ROOM</strong>
            <p>{authoritySelection.roomNumber}</p>
          </div>
          <div>
            <strong>AUTHORITY</strong>
            <p>{authoritySelection.authorityRole}</p>
          </div>
          <div>
            <strong>ALLOCATION</strong>
            <p>
              {authoritySelection.isMatrixRoom
                ? `BED ${authoritySelection.bedNumber}`
                : "ROOM"}
            </p>
          </div>
          <div>
            <strong>APPROVAL</strong>
            <p>Responsible Authority</p>
          </div>
        </section>
      )}

      <section className="availability-toolbar">
        <div>
          <strong>Serviceman</strong>
          <p>
            {booking?.serviceman.name ?? "No booking selected"}
            {" • "}
            {booking?.serviceman.rank ?? ""}
          </p>
        </div>
        <div>
          <strong>Guests</strong>
          <p>{booking ? booking.guests.length : "—"}</p>
        </div>
        <div>
          <strong>Stay</strong>
          <p>
            {booking?.checkIn ?? "—"} {" → "} {booking?.checkOut ?? "—"}
          </p>
        </div>
        <div>
          <strong>Available</strong>
          <p>{availableWholeRooms} rooms / {availableBeds} beds</p>
        </div>
      </section>

      <section className="availability-legend">
        <div><span className="legend-dot available" />Available</div>
        <div><span className="legend-dot reserved" />Reserved</div>
        <div><span className="legend-dot occupied" />Booked / Occupied</div>
        <div><span className="legend-dot needs_cleaning" />Needs Cleaning</div>
        <div><span className="legend-dot cleaning" />Housekeeping / Cleaning</div>
        <div><span className="legend-dot out" />Out of Service</div>
      </section>

      {!isLoadingRooms && (
        <>
          {/* =============================
              AC / VIP / NAC
              WHOLE ROOM SELECTION ONLY
          ============================== */}
          {(visibleAcRooms.length > 0 ||
            visibleVipRooms.length > 0 ||
            visibleNacRooms.length > 0) && (
            <section className="room-list">
              <div className="availability-section-heading">
                <span className="section-label">ROOMS</span>
                <h2>AC / VIP / NAC</h2>
                <p>
                  Select the complete room. Individual beds are not selected here.
                </p>
              </div>

              <div
                className="whole-room-grid"
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "20px",
                }}
              >
                {[...visibleAcRooms, ...visibleVipRooms, ...visibleNacRooms]
                  .sort((a, b) => {
                    const aNumber = roomNumber(a);
                    const bNumber = roomNumber(b);

                    if (aNumber !== bNumber) {
                      return aNumber - bNumber;
                    }

                    return a.name.localeCompare(b.name, undefined, {
                      numeric: true,
                      sensitivity: "base",
                    });
                  })
                  .map(renderWholeRoomCard)}
              </div>
            </section>
          )}

          {/* =============================
              DM
              EXACT BED SELECTION
          ============================== */}
          {visibleDmRooms.length > 0 && (
            <section className="room-list">
              <div className="availability-section-heading">
                <span className="section-label">DORMITORY</span>
                <h2>DM</h2>
                <p>Select the exact bed for each guest.</p>
              </div>
              {visibleDmRooms
                .sort((a, b) => roomNumber(a) - roomNumber(b))
                .map(renderBedRoom)}
            </section>
          )}

          {/* =============================
              HALL
              EXACT SEAT/BED SELECTION
          ============================== */}
          {visibleHallRooms.length > 0 && (
            <section className="room-list">
              <div className="availability-section-heading">
                <span className="section-label">HALL</span>
                <h2>HALL</h2>
                <p>Select the exact seat / bed for each guest.</p>
              </div>
              {visibleHallRooms.map(renderBedRoom)}
            </section>
          )}
        </>
      )}

      {booking && selectionMode === "BED" && selectedBeds.length > 0 && (
        <section className="booking-card">
          <div className="booking-section-title">
            <span>05</span>
            <div>
              <h2>Assign Occupants</h2>
              <p>Assign each guest to the selected bed or seat.</p>
            </div>
          </div>

          <div className="booking-grid">
            {selectedBeds.map((bed) => (
              <div className="form-field" key={bed.bedId}>
                <label>
                  {bed.roomName} — Bed {bed.bedNumber}
                </label>
                <select
                  value={bed.guestId}
                  onChange={(e) => assignGuest(bed.bedId, e.target.value)}
                >
                  <option value="">Select occupant</option>
                  {booking.guests.map((guest, index) => (
                    <option key={guest.id || index} value={guest.id || ""}>
                      {guest.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>
      )}

      {booking && selectionMode === "ROOM" && selectedWholeRoom && (
        <section className="booking-card">
          <div className="booking-section-title">
            <span>05</span>
            <div>
              <h2>Room Selected</h2>
              <p>The complete room will be allotted to this booking.</p>
            </div>
          </div>

          <div className="room-selection-summary">
            <strong>{selectedWholeRoom.name}</strong>
            <p>{requiredGuests} guest(s)</p>
            <p>Room capacity: {selectedWholeRoom.beds.length} beds</p>
            {authoritySelection && (
              <p>
                <strong>Approval Authority:</strong>{" "}
                {authoritySelection.authorityRole}
              </p>
            )}
          </div>
        </section>
      )}

      {booking && (
        <section className="selection-bar">
          <div>
            <span>
              {selectionMode === "BED"
                ? "Dormitory / Hall Bed Selection"
                : "Room Selection"}
            </span>
            <strong>
              {selectionMode === "BED"
                ? `${selectedMatrixBeds.length} / ${requiredGuests} BED(S) SELECTED`
                : selectionMode === "ROOM"
                ? "1 / 1 ROOM SELECTED"
                : "SELECT A ROOM OR BED"}
            </strong>
          </div>

          <div>
            {selectedBeds.length > 0 && !authoritySelection && (
              <button
                type="button"
                className="secondary-action"
                onClick={clearSelection}
              >
                CLEAR
              </button>
            )}

            <button
              type="button"
              className="continue-booking-button"
              disabled={
                selectionMode === "ROOM"
                  ? selectedBeds.length !== requiredGuests
                  : selectionMode === "BED"
                  ? selectedMatrixBeds.length !== requiredGuests
                  : true
              }
              onClick={handleConfirm}
            >
              {authoritySelection
                ? "CONFIRM EXPLICIT ALLOTMENT →"
                : selectionMode === "BED"
                ? "CONFIRM BED / SEAT ALLOTMENT →"
                : "CONFIRM ROOM ALLOTMENT →"}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default Availability;
