import {
  useEffect,
  useState,
} from "react";

import "../App.css";

import type {
  UserRole,
} from "../App";


/* =========================================
   ROOM
========================================= */

interface AuthorityRoom {

  id: string;

  room_number: string;

  total_beds: number;

  room_status: string;

  is_active: boolean;

  category_name: string;

  receptionist_can_book: boolean;

  receptionist_can_allot: boolean;

  receptionist_emergency_allot: boolean;

  authority_role: string;

  authority_can_book: boolean;

  authority_can_allot: boolean;

  authority_can_approve: boolean;

}


/* =========================================
   BED
========================================= */

interface RoomBed {

  id: string;

  room_id: string;

  bed_number: number;

  bed_status: string;

  is_active: boolean;

}


/* =========================================
   EXPLICIT AUTHORITY SELECTION
========================================= */

export interface ExplicitAuthoritySelection {

  roomId: string;

  roomNumber: string;

  categoryName: string;

  authorityRole: string;

  bedId?: string;

  bedNumber?: number;

  isMatrixRoom: boolean;

}


/* =========================================
   PROPS
========================================= */

interface OtherAuthorityRoomsProps {

  role: UserRole;

  onBack: () => void;

  onContinue: (
    selection: ExplicitAuthoritySelection
  ) => void;

}


/* =========================================
   AUTHORITY DISPLAY NAME
========================================= */

const getAuthorityDisplayName = (
  role: string
) => {

  switch (role) {

    case "DY_DIRECTOR":

      return "Deputy Director";


    case "SUPERINTENDENT":

      return "Superintendent";


    case "WELFARE_ORGANISER":

      return "Welfare Organizer";


    case "OLC_REST_HOUSE_MANAGER":

      return "OLC Rest House Manager";


    default:

      return role;

  }

};


/* =========================================
   CHECK MATRIX ROOM
========================================= */

const isMatrixRoom = (
  room: AuthorityRoom
) => {

  const category =
    String(
      room.category_name || ""
    ).toUpperCase();

  const roomName =
    String(
      room.room_number || ""
    ).toUpperCase();

  return (

    category === "DORMITORY"

    ||

    category === "HALL"

    ||

    roomName.startsWith("DM")

    ||

    roomName === "HALL"

  );

};


/* =========================================
   CHRONOLOGICAL ROOM SORT
=========================================

   Examples:

   AC 1
   AC 2
   AC 3
   ...
   AC 9
   AC 11
   AC 12
   ...

   DM1
   DM2
   DM3
   ...

   This prevents alphabetical ordering such as:

   AC 1
   AC 11
   AC 12
   AC 2
========================================= */

const getRoomNumberValue = (
  roomNumber: string
) => {

  const match =
    String(
      roomNumber || ""
    ).match(
      /\d+/
    );


  if (!match) {

    return Number.MAX_SAFE_INTEGER;

  }


  return Number(
    match[0]
  );

};


const sortRoomsChronologically = (
  roomList: AuthorityRoom[]
) => {

  return [
    ...roomList,
  ].sort(
    (
      first,
      second
    ) => {

      const firstNumber =
        getRoomNumberValue(
          first.room_number
        );

      const secondNumber =
        getRoomNumberValue(
          second.room_number
        );


      /*
       * First sort by room number.
       *
       * This gives:
       *
       * AC 1
       * AC 2
       * AC 3
       * ...
       * AC 24
       */

      if (
        firstNumber !==
        secondNumber
      ) {

        return (
          firstNumber -
          secondNumber
        );

      }


      /*
       * If two rooms have the same
       * numeric portion, sort by
       * the room name.
       */

      return String(
        first.room_number
      ).localeCompare(
        String(
          second.room_number
        ),
        "en",
        {
          numeric: true,
          sensitivity: "base",
        }
      );

    }
  );

};


/* =========================================
   COMPONENT
========================================= */

function OtherAuthorityRooms({

  role,

  onBack,

  onContinue,

}: OtherAuthorityRoomsProps) {


  /* =========================================
     ROOMS
  ========================================= */

  const [
    rooms,
    setRooms,
  ] = useState<
    AuthorityRoom[]
  >([]);


  /* =========================================
     SELECTED ROOM
  ========================================= */

  const [
    selectedRoom,
    setSelectedRoom,
  ] = useState<
    AuthorityRoom | null
  >(null);


  /* =========================================
     BEDS
  ========================================= */

  const [
    beds,
    setBeds,
  ] = useState<
    RoomBed[]
  >([]);


  /* =========================================
     SELECTED BED
  ========================================= */

  const [
    selectedBed,
    setSelectedBed,
  ] = useState<
    RoomBed | null
  >(null);


  /* =========================================
     LOADING
  ========================================= */

  const [
    loadingRooms,
    setLoadingRooms,
  ] = useState(true);


  const [
    loadingBeds,
    setLoadingBeds,
  ] = useState(false);


  /* =========================================
     ERROR
  ========================================= */

  const [
    error,
    setError,
  ] = useState("");


  /* =========================================
     LOAD AUTHORITY ROOMS
  ========================================= */

  useEffect(() => {

    const loadRooms =
      async () => {

        try {

          setLoadingRooms(true);

          setError("");


          const response =
            await fetch(
              `http://localhost:5000/api/rooms/authority-rooms?role=${encodeURIComponent(
                role
              )}`
            );


          const data =
            await response.json();


          if (
            !response.ok ||
            !data.success
          ) {

            throw new Error(
              data.message ||
              "Unable to load authority rooms."
            );

          }


          /*
           * IMPORTANT:
           *
           * Sort rooms numerically before
           * storing them in state.
           *
           * Therefore:
           *
           * AC 1
           * AC 2
           * AC 3
           * AC 4
           * AC 5
           * AC 11
           * AC 12
           * ...
           */

          const loadedRooms =
            Array.isArray(
              data.rooms
            )
              ? data.rooms
              : [];


          const sortedRooms =
            sortRoomsChronologically(
              loadedRooms
            );


          setRooms(
            sortedRooms
          );


        } catch (err) {

          console.error(
            "Authority rooms error:",
            err
          );


          setError(
            err instanceof Error
              ? err.message
              : "Unable to load authority rooms."
          );


        } finally {

          setLoadingRooms(false);

        }

      };


    loadRooms();

  }, [role]);


  /* =========================================
     LOAD BEDS
  ========================================= */

  const loadBeds = async (
    room: AuthorityRoom
  ) => {

    try {

      setLoadingBeds(true);

      setError("");


      const response =
        await fetch(
          `http://localhost:5000/api/rooms/${room.id}/beds`
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        throw new Error(
          data.message ||
          "Unable to load room beds."
        );

      }


      /*
       * Beds are also sorted numerically.
       *
       * BED 1
       * BED 2
       * BED 3
       * ...
       */

      const loadedBeds =
        Array.isArray(
          data.beds
        )
          ? data.beds
          : [];


      const sortedBeds =
        [
          ...loadedBeds,
        ].sort(
          (
            first,
            second
          ) =>
            first.bed_number -
            second.bed_number
        );


      setBeds(
        sortedBeds
      );


    } catch (err) {

      console.error(
        "Room beds error:",
        err
      );


      setError(
        err instanceof Error
          ? err.message
          : "Unable to load room beds."
      );


    } finally {

      setLoadingBeds(false);

    }

  };


  /* =========================================
     ROOM SELECTION
  ========================================= */

  /* =========================================
   ROOM SELECTION
========================================= */

const handleRoomSelect = async (
  room: AuthorityRoom
) => {

  setSelectedRoom(room);

  setSelectedBed(null);

  setBeds([]);

  setError("");

  /*
   * ALL AUTHORITY ROOMS
   *
   * Exact bed selection is required.
   *
   * This includes:
   *
   * AC
   * VIP
   * NAC
   * DM
   * HALL
   *
   * The allotment backend requires a
   * specific bed_id, so every room must
   * load its beds before allotment.
   */

  await loadBeds(room);

};


  /* =========================================
     SELECT BED
  ========================================= */

  const handleBedSelect = (
    bed: RoomBed
  ) => {

    if (
      bed.bed_status !==
      "AVAILABLE"
    ) {

      return;

    }


    setSelectedBed(
      bed
    );

  };


  /* =========================================
     AVAILABLE BED COUNT
  ========================================= */

  const getAvailableBedCount = () => {

    return beds.filter(
      (bed) =>
        bed.bed_status ===
        "AVAILABLE"
    ).length;

  };


  /* =========================================
     CHANGE ROOM
  ========================================= */

  const handleChangeRoom = () => {

    setSelectedRoom(null);

    setSelectedBed(null);

    setBeds([]);

    setError("");

  };


  /* =========================================
     CONTINUE NORMAL ROOM
     
     Sends the selected room to App.tsx.
  ========================================= */

  const handleNormalRoomContinue = () => {

    if (
      !selectedRoom
    ) {

      alert(
        "Please select a room."
      );

      return;

    }


    onContinue({

      roomId:
        selectedRoom.id,

      roomNumber:
        selectedRoom.room_number,

      categoryName:
        selectedRoom.category_name,

      authorityRole:
        selectedRoom.authority_role,

      isMatrixRoom:
        false,

    });

  };


  /* =========================================
     CONTINUE MATRIX ROOM
     
     Sends selected room + exact bed
     to App.tsx.
  ========================================= */

  const handleMatrixRoomContinue = () => {

    if (
      !selectedRoom
    ) {

      alert(
        "Please select a room."
      );

      return;

    }


    if (
      !selectedBed
    ) {

      alert(
        "Please select an available bed."
      );

      return;

    }


    onContinue({

      roomId:
        selectedRoom.id,

      roomNumber:
        selectedRoom.room_number,

      categoryName:
        selectedRoom.category_name,

      authorityRole:
        selectedRoom.authority_role,

      bedId:
        selectedBed.id,

      bedNumber:
        selectedBed.bed_number,

      isMatrixRoom:
        true,

    });

  };


  /* =========================================
     LOADING
  ========================================= */

  if (
    loadingRooms
  ) {

    return (

      <main className="dashboard-screen">

        <section className="dashboard-content">

          <div className="dashboard-panel">

            <h2>
              Other Authority Rooms
            </h2>

            <p>
              Loading authority rooms...
            </p>

          </div>

        </section>

      </main>

    );

  }


  /* =========================================
     PAGE
  ========================================= */

  return (

    <main className="dashboard-screen">


      {/* =====================================
          HEADER
      ====================================== */}

      <header className="dashboard-header">

        <div className="dashboard-brand">

          <div className="dashboard-logo">
            ESM
          </div>

          <div>

            <h1>
              ESM REST HOUSE
            </h1>

            <p>
              Booking &amp; Management System
            </p>

          </div>

        </div>


        <div className="dashboard-user">

          <div className="user-info">

            <strong>
              Receptionist
            </strong>

            <span>
              OTHER AUTHORITY ROOMS
            </span>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={
              onBack
            }
          >

            BACK

          </button>

        </div>

      </header>


      {/* =====================================
          CONTENT
      ====================================== */}

      <section className="dashboard-content">


        {/* ===================================
            PAGE TITLE
        ==================================== */}

        <div className="dashboard-title">

          <div>

            <h2>
              Other Authority Rooms
            </h2>

            <p>
              Explicit Booking / Allotment
            </p>

          </div>


          <span className="dashboard-date">

            {new Date().toLocaleDateString(
              "en-IN",
              {
                day:
                  "2-digit",

                month:
                  "long",

                year:
                  "numeric",
              }
            )}

          </span>

        </div>


        {/* ===================================
            INFORMATION
        ==================================== */}

        <div className="dashboard-panel">

          <h3>
            Authority Room Allotment
          </h3>

          <p>

            These rooms are controlled by
            other authorities. The Receptionist
            may explicitly allot available
            accommodation, but approval remains
            with the responsible authority.

          </p>

        </div>


        {/* ===================================
            ERROR
        ==================================== */}

        {error && (

          <div className="dashboard-panel">

            <p className="restricted-message">

              {error}

            </p>

          </div>

        )}


        {/* ===================================
            ROOM LIST
        ==================================== */}

        {!selectedRoom && (

          <div className="dashboard-panel">

            <h3>
              Select Authority Room
            </h3>


            {rooms.length === 0 ? (

              <p className="restricted-message">

                No other authority rooms are
                currently available for explicit
                allotment.

              </p>

            ) : (

              <div className="dashboard-cards">

                {rooms.map(
                  (
                    room
                  ) => {

                    const matrixRoom =
                      isMatrixRoom(
                        room
                      );


                    return (

                      <button
                        key={
                          room.id
                        }
                        type="button"
                        className="stat-card"
                        onClick={() =>
                          handleRoomSelect(
                            room
                          )
                        }
                      >

                        <span>

                          {room.category_name}

                        </span>


                        <strong>

                          {room.room_number}

                        </strong>


                        <span>

                          {room.total_beds}
                          {" "}
                          beds

                        </span>


                        <span>

                          Authority:{" "}

                          {getAuthorityDisplayName(
                            room.authority_role
                          )}

                        </span>


                        <span>

                          {matrixRoom
                            ? "Exact bed selection"
                            : "Room selection"}

                        </span>

                      </button>

                    );

                  }
                )}

              </div>

            )}

          </div>

        )}


        {/* ===================================
            SELECTED NORMAL ROOM
        ==================================== */}

        {selectedRoom &&
          !isMatrixRoom(
            selectedRoom
          ) && (

            <div className="dashboard-panel">


              <div className="panel-heading">

                <div>

                  <h3>

                    {selectedRoom.room_number}

                  </h3>

                  <p>

                    {selectedRoom.category_name}

                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    handleChangeRoom
                  }
                >

                  Change Room

                </button>

              </div>


              <div className="dashboard-cards">

                <div className="stat-card">

                  <span>
                    Room
                  </span>

                  <strong>

                    {selectedRoom.room_number}

                  </strong>

                </div>


                <div className="stat-card">

                  <span>
                    Total Beds
                  </span>

                  <strong>

                    {selectedRoom.total_beds}

                  </strong>

                </div>


                <div className="stat-card">

                  <span>
                    Authority
                  </span>

                  <strong>

                    {getAuthorityDisplayName(
                      selectedRoom.authority_role
                    )}

                  </strong>

                </div>

              </div>


              <div className="dashboard-panel">

                <h3>
                  Approval Authority
                </h3>

                <p>

                  This booking requires approval
                  from:

                  <strong>

                    {" "}

                    {getAuthorityDisplayName(
                      selectedRoom.authority_role
                    )}

                  </strong>

                </p>


                <p>

                  The Receptionist can allot the
                  room, but approval does not
                  transfer to the Receptionist.

                </p>

              </div>


              <div className="dashboard-panel">

                <h3>
                  Room Selected
                </h3>


                <p>

                  <strong>
                    {selectedRoom.room_number}
                  </strong>

                  {" "}
                  has been selected.

                </p>


                <p>

                  Bed selection is not required
                  for this room. The system will
                  handle available beds internally
                  according to the number of guests
                  in the booking.

                </p>


                <button
                  type="button"
                  onClick={
                    handleNormalRoomContinue
                  }
                  style={{
                    marginTop:
                      "20px",

                    minHeight:
                      "48px",

                    padding:
                      "0 24px",

                    fontWeight:
                      700,
                  }}
                >

                  CONTINUE TO EXPLICIT BOOKING →

                </button>

              </div>

            </div>

          )}


        {/* ===================================
            SELECTED DM / HALL
        ==================================== */}

        {selectedRoom &&
          isMatrixRoom(
            selectedRoom
          ) && (

            <div className="dashboard-panel">


              <div className="panel-heading">

                <div>

                  <h3>

                    {selectedRoom.room_number}

                  </h3>

                  <p>

                    {selectedRoom.category_name}

                  </p>

                </div>


                <button
                  type="button"
                  onClick={
                    handleChangeRoom
                  }
                >

                  Change Room

                </button>

              </div>


              <div className="dashboard-panel">

                <h3>
                  Approval Authority
                </h3>

                <p>

                  This booking requires approval
                  from:

                  <strong>

                    {" "}

                    {getAuthorityDisplayName(
                      selectedRoom.authority_role
                    )}

                  </strong>

                </p>


                <p>

                  The Receptionist can allot the
                  selected bed, but approval remains
                  with the responsible authority.

                </p>

              </div>


              {loadingBeds ? (

                <div className="dashboard-panel">

                  <p>
                    Loading beds...
                  </p>

                </div>

              ) : (

                <>

                  <div className="dashboard-cards">

                    <div className="stat-card">

                      <span>
                        Total Beds
                      </span>

                      <strong>

                        {beds.length}

                      </strong>

                    </div>


                    <div className="stat-card">

                      <span>
                        Available Beds
                      </span>

                      <strong>

                        {getAvailableBedCount()}

                      </strong>

                    </div>


                    <div className="stat-card">

                      <span>
                        Selected Bed
                      </span>

                      <strong>

                        {selectedBed
                          ? `BED ${selectedBed.bed_number}`
                          : "NONE"}

                      </strong>

                    </div>

                  </div>


                  {/* REDBUS STYLE MATRIX */}

                  <div className="dashboard-panel">

                    <h3>
                      Select Exact Bed
                    </h3>

                    <p>

                      Select the exact available
                      bed number.

                    </p>


                    <div
                      className="bed-grid"
                      style={{
                        marginTop:
                          "20px",
                      }}
                    >

                      {beds.map(
                        (
                          bed
                        ) => {

                          const available =
                            bed.bed_status ===
                            "AVAILABLE";


                          const selected =
                            selectedBed?.id ===
                            bed.id;


                          return (

                            <button
                              key={
                                bed.id
                              }
                              type="button"
                              disabled={
                                !available
                              }
                              onClick={() =>
                                handleBedSelect(
                                  bed
                                )
                              }
                              className={`
                                bed-card
                                ${
                                  available
                                    ? "available"
                                    : "occupied"
                                }
                                ${
                                  selected
                                    ? "selected"
                                    : ""
                                }
                              `}
                            >

                              <span className="bed-number">

                                BED{" "}
                                {bed.bed_number}

                              </span>


                              <span className="bed-status">

                                {selected
                                  ? "SELECTED"
                                  : bed.bed_status}

                              </span>

                            </button>

                          );

                        }
                      )}

                    </div>

                  </div>


                  {/* SELECTION SUMMARY */}

                  {selectedBed && (

                    <div className="dashboard-panel">

                      <h3>
                        Selection Summary
                      </h3>


                      <p>

                        <strong>
                          Room:
                        </strong>

                        {" "}

                        {selectedRoom.room_number}

                      </p>


                      <p>

                        <strong>
                          Bed:
                        </strong>

                        {" "}

                        {selectedBed.bed_number}

                      </p>


                      <p>

                        <strong>
                          Approval Authority:
                        </strong>

                        {" "}

                        {getAuthorityDisplayName(
                          selectedRoom.authority_role
                        )}

                      </p>


                      <button
                        type="button"
                        onClick={
                          handleMatrixRoomContinue
                        }
                        style={{
                          marginTop:
                            "20px",

                          minHeight:
                            "48px",

                          padding:
                            "0 24px",

                          fontWeight:
                            700,
                        }}
                      >

                        CONTINUE TO EXPLICIT BOOKING →

                      </button>

                    </div>

                  )}

                </>

              )}

            </div>

          )}

      </section>

    </main>

  );

}


export default OtherAuthorityRooms;