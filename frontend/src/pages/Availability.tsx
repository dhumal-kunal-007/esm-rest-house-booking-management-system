import { useState } from "react";
import "../App.css";

type BedStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "out";

interface Bed {
  id: string;
  number: number;
  status: BedStatus;
}

interface Room {
  id: string;
  name: string;
  beds: Bed[];
}

interface AvailabilityProps {
  onBack: () => void;
}

const rooms: Room[] = [
  {
    id: "AC-01",
    name: "Room 01",
    beds: [
      {
        id: "AC-01-01",
        number: 1,
        status: "available",
      },
      {
        id: "AC-01-02",
        number: 2,
        status: "occupied",
      },
      {
        id: "AC-01-03",
        number: 3,
        status: "reserved",
      },
      {
        id: "AC-01-04",
        number: 4,
        status: "available",
      },
    ],
  },

  {
    id: "AC-02",
    name: "Room 02",
    beds: [
      {
        id: "AC-02-01",
        number: 1,
        status: "available",
      },
      {
        id: "AC-02-02",
        number: 2,
        status: "available",
      },
      {
        id: "AC-02-03",
        number: 3,
        status: "out",
      },
      {
        id: "AC-02-04",
        number: 4,
        status: "occupied",
      },
    ],
  },

  {
    id: "AC-03",
    name: "Room 03",
    beds: [
      {
        id: "AC-03-01",
        number: 1,
        status: "available",
      },
      {
        id: "AC-03-02",
        number: 2,
        status: "reserved",
      },
      {
        id: "AC-03-03",
        number: 3,
        status: "available",
      },
      {
        id: "AC-03-04",
        number: 4,
        status: "available",
      },
    ],
  },

  {
    id: "AC-04",
    name: "Room 04",
    beds: [
      {
        id: "AC-04-01",
        number: 1,
        status: "occupied",
      },
      {
        id: "AC-04-02",
        number: 2,
        status: "available",
      },
      {
        id: "AC-04-03",
        number: 3,
        status: "available",
      },
      {
        id: "AC-04-04",
        number: 4,
        status: "out",
      },
    ],
  },
];

const statusLabels: Record<
  BedStatus,
  string
> = {
  available: "Available",
  reserved: "Reserved",
  occupied: "Occupied",
  out: "Out of Service",
};

function Availability({
  onBack,
}: AvailabilityProps) {
  const [selectedBed, setSelectedBed] =
    useState<Bed | null>(null);

  const [selectedRoom, setSelectedRoom] =
    useState<string | null>(null);

  const handleBedClick = (
    room: Room,
    bed: Bed
  ) => {
    if (bed.status !== "available") {
      return;
    }

    setSelectedRoom(room.name);
    setSelectedBed(bed);
  };

  return (
    <main className="availability-screen">

      {/* =================================
          HEADER
      ================================== */}

      <header className="availability-header">

        <div>

          <span className="section-label">
            AC ROOM MANAGEMENT
          </span>

          <h1>
            AC Room &amp; Bed Availability
          </h1>

          <p>
            Select an available bed for a new
            AC room booking.
          </p>

        </div>

        <button
          type="button"
          className="availability-back-button"
          onClick={onBack}
        >
          ← Back
        </button>

      </header>

      {/* =================================
          DATE FILTER
      ================================== */}

      <section className="availability-toolbar">

        <div className="date-field">

          <label htmlFor="check-in">
            Check-in
          </label>

          <input
            id="check-in"
            type="date"
          />

        </div>

        <div className="date-field">

          <label htmlFor="check-out">
            Check-out
          </label>

          <input
            id="check-out"
            type="date"
          />

        </div>

      </section>

      {/* =================================
          LEGEND
      ================================== */}

      <section className="availability-legend">

        <div>
          <span className="legend-dot available"></span>
          Available
        </div>

        <div>
          <span className="legend-dot reserved"></span>
          Reserved
        </div>

        <div>
          <span className="legend-dot occupied"></span>
          Occupied
        </div>

        <div>
          <span className="legend-dot out"></span>
          Out of Service
        </div>

      </section>

      {/* =================================
          ROOM / BED MATRIX
      ================================== */}

      <section className="room-list">

        {rooms.map((room) => (

          <div
            className="room-section"
            key={room.id}
          >

            <div className="room-title">

              <div>

                <h2>
                  {room.name}
                </h2>

                <span>
                  {room.beds.length} beds
                </span>

              </div>

              <span className="room-id">
                {room.id}
              </span>

            </div>

            <div className="bed-grid">

              {room.beds.map((bed) => (

                <button
                  type="button"
                  key={bed.id}
                  className={`
                    bed-card
                    ${bed.status}
                    ${
                      selectedBed?.id === bed.id
                        ? "selected"
                        : ""
                    }
                  `}
                  disabled={
                    bed.status !== "available"
                  }
                  onClick={() =>
                    handleBedClick(room, bed)
                  }
                >

                  <span className="bed-number">
                    Bed {bed.number}
                  </span>

                  <span className="bed-status">
                    {
                      statusLabels[
                        bed.status
                      ]
                    }
                  </span>

                </button>

              ))}

            </div>

          </div>

        ))}

      </section>

      {/* =================================
          SELECTED BED
      ================================== */}

      {selectedBed && (

        <section className="selection-bar">

          <div>

            <span>
              Selected
            </span>

            <strong>
              {selectedRoom} — Bed{" "}
              {selectedBed.number}
            </strong>

          </div>

          <button
            type="button"
            className="continue-booking-button"
            onClick={() => {
              alert(
                `Selected ${selectedRoom} - Bed ${selectedBed.number}`
              );
            }}
          >
            CONTINUE BOOKING
          </button>

        </section>

      )}

    </main>
  );
}

export default Availability;