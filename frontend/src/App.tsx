import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import AppModal from "./components/AppModal";

import type {
  AppModalType,
} from "./components/AppModal";

import OtherAuthorityRooms from "./pages/OtherAuthorityRooms";

import type {
  ExplicitAuthoritySelection,
} from "./AuthoritySelection";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateUser from "./pages/CreateUser";
import Availability from "./pages/Availability";
import Booking from "./pages/Booking";
import CheckIn from "./pages/CheckIn";
import CheckOut from "./pages/CheckOut";
import Housekeeping from "./pages/Housekeeping";
import Approval from "./pages/Approval";

import type {
  BookingDraft,
} from "./pages/Booking";


/* =========================================
   USER ROLES
========================================= */

export type UserRole =
  | "ADMIN"
  | "DY_DIRECTOR"
  | "SUPERINTENDENT"
  | "WELFARE_ORGANISER"
  | "OLC_REST_HOUSE_MANAGER"
  | "RECEPTIONIST";


/* =========================================
   ACCOMMODATION CATEGORY
========================================= */

export type AccommodationCategory =
  | "AC"
  | "Non-AC"
  | "Dormitory"
  | "VIP";


/* =========================================
   USER
========================================= */

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  active: boolean;
}


/* =========================================
   ALLOTMENT SELECTION
========================================= */

interface AllotmentSelection {
  guestId: string;
  roomId: string;

  /*
   * AC / NAC / VIP:
   * Whole-room selection, therefore bedId
   * is intentionally empty/undefined.
   *
   * DM / HALL:
   * Exact bed/seat selection, therefore
   * bedId is required.
   */
  bedId?: string;

  occupantName?: string;
}


/* =========================================
   APP
========================================= */

function App() {

  /* =========================================
     SPLASH
  ========================================= */

  const [
    showSplash,
    setShowSplash,
  ] = useState(true);


  /* =========================================
     USERS
  ========================================= */

  const [
    users,
    setUsers,
  ] = useState<User[]>([]);


  /* =========================================
     LOGGED IN USER
  ========================================= */

  const [
    loggedInUser,
    setLoggedInUser,
  ] = useState<User | null>(null);


  /* =========================================
     CURRENT PAGE
  ========================================= */

  const [
    currentPage,
    setCurrentPage,
  ] = useState<
    | "dashboard"
    | "booking"
    | "availability"
    | "create-user"
    | "otherAuthorityRooms"
    | "check-in"
    | "check-out"
    | "housekeeping"
    | "approvals"
  >("dashboard");


  /* =========================================
     BOOKING DRAFT
  ========================================= */

  const [
    bookingDraft,
    setBookingDraft,
  ] = useState<BookingDraft | null>(null);


  /* =========================================
     EXPLICIT AUTHORITY SELECTION
  ========================================= */

  const [
    explicitAuthoritySelection,
    setExplicitAuthoritySelection,
  ] = useState<
    ExplicitAuthoritySelection | null
  >(null);


  /* =========================================
     PROFESSIONAL APP MODAL
  ========================================= */

  const [
    modal,
    setModal,
  ] = useState<{
    type: AppModalType;
    title: string;
    message: string;
    onCloseAction?: () => void;
  } | null>(null);


  /* =========================================
     CLOSE MODAL
  ========================================= */

  const closeModal = () => {

    const action =
      modal?.onCloseAction;

    setModal(null);

    if (action) {
      action();
    }
  };


    /* =========================================
     LOAD USERS FROM POSTGRESQL
  ========================================= */

  useEffect(() => {

    const loadUsers = async () => {

      try {

        const response =
          await fetch(
            "http://localhost:5000/api/users"
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Failed to load users."
          );

        }


        if (
          !Array.isArray(
            data.users
          )
        ) {

          throw new Error(
            "Invalid user data received from server."
          );

        }


        const databaseUsers:
          User[] =
          data.users.map(
            (user: {
              id: string;
              name: string;
              username: string;
              role: string;
              active: boolean;
            }) => ({

              id:
                user.id,

              name:
                user.name,

              username:
                user.username,

              role:
                user.role as UserRole,

              active:
                user.active,

            })
          );


        setUsers(
          databaseUsers
        );


      } catch (error) {

        console.error(
          "Failed to load users from PostgreSQL:",
          error
        );


        /*
         * Fallback to localStorage only if
         * PostgreSQL cannot be reached.
         */
        const savedUsers =
          localStorage.getItem(
            "esm-users"
          );


        if (!savedUsers) {

          setUsers([]);

          return;
        }


        try {

          const parsedUsers =
            JSON.parse(
              savedUsers
            );


          if (
            Array.isArray(
              parsedUsers
            )
          ) {

            setUsers(
              parsedUsers
            );

          } else {

            setUsers([]);

          }

        } catch {

          setUsers([]);

        }

      }

    };


    loadUsers();

  }, []);

  /* =========================================
     SAVE LOCAL USERS
  ========================================= */

  useEffect(() => {

    localStorage.setItem(
      "esm-users",
      JSON.stringify(users)
    );

  }, [users]);


  /* =========================================
     SPLASH TIMER
  ========================================= */

  useEffect(() => {

    const timer =
      setTimeout(() => {

        setShowSplash(false);

      }, 2600);

    return () => {

      clearTimeout(timer);

    };

  }, []);


  /* =========================================
     LOGIN
  ========================================= */

  const handleLogin = (
    user: User
  ) => {

    setLoggedInUser(
      user
    );

    setCurrentPage(
      "dashboard"
    );

    setBookingDraft(
      null
    );

    setExplicitAuthoritySelection(
      null
    );

    setModal(null);

  };


  /* =========================================
     LOGOUT
  ========================================= */

  const handleLogout = () => {

    setLoggedInUser(
      null
    );

    setCurrentPage(
      "dashboard"
    );

    setBookingDraft(
      null
    );

    setExplicitAuthoritySelection(
      null
    );

    setModal(null);

  };


  /* =========================================
     CREATE USER
  ========================================= */

  const handleCreateUser = (
    newUser: User
  ) => {

    setUsers(
      (currentUsers) => [
        ...currentUsers,
        newUser,
      ]
    );

    setCurrentPage(
      "dashboard"
    );

  };


  /* =========================================
     DELETE / DEACTIVATE USER
  ========================================= */

  const handleDeleteUser = async (
    userId: string
  ) => {

    if (!loggedInUser) {

      setModal({

        type:
          "error",

        title:
          "Session Expired",

        message:
          "Your user session is missing. Please login again.",

      });

      return;
    }


    if (
      loggedInUser.role !==
      "ADMIN"
    ) {

      setModal({

        type:
          "error",

        title:
          "Access Denied",

        message:
          "Only an ADMIN can delete or deactivate users.",

      });

      return;
    }


    if (
      loggedInUser.id ===
      userId
    ) {

      setModal({

        type:
          "warning",

        title:
          "Action Not Allowed",

        message:
          "You cannot deactivate your own account.",

      });

      return;
    }


    try {

      const response =
        await fetch(
          `http://localhost:5000/api/users/${userId}`,
          {
            method:
              "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                adminUserId:
                  loggedInUser.id,
              }),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        console.error(
          "Delete user API error:",
          data
        );

        setModal({

          type:
            "error",

          title:
            "User Could Not Be Deleted",

          message:
            data.message ||
            "Unable to deactivate the selected user.",

        });

        return;
      }


      /*
       * Update the local user list immediately
       * so the Admin portal shows the user
       * as inactive.
       */
      setUsers(
        (currentUsers) =>
          currentUsers.map(
            (user) =>
              user.id === userId
                ? {
                    ...user,
                    active:
                      false,
                  }
                : user
          )
      );


      setModal({

        type:
          "success",

        title:
          "User Deactivated",

        message:
          data.message ||
          "The user has been deactivated successfully.",

      });

    } catch (error) {

      console.error(
        "Delete user connection error:",
        error
      );

      setModal({

        type:
          "error",

        title:
          "Server Unavailable",

        message:
          "Unable to connect to the user management server. Please make sure the backend is running.",

      });

    }

  };


  /* =========================================
     ROLE → ACCOMMODATION CATEGORY
  ========================================= */

  const getAccommodationCategory = (
    role: UserRole
  ): AccommodationCategory => {

    switch (role) {

      case "DY_DIRECTOR":
        return "VIP";

      case "SUPERINTENDENT":
        return "AC";

      case "WELFARE_ORGANISER":
        return "AC";

      case "OLC_REST_HOUSE_MANAGER":
        return "AC";

      case "RECEPTIONIST":
        return "Non-AC";

      case "ADMIN":
      default:
        return "AC";

    }

  };


  /* =========================================
     AUTHORITY ROOM CATEGORY
  ========================================= */

  const getAuthorityBookingCategory = (
    categoryName: string
  ): AccommodationCategory => {

    switch (
      String(
        categoryName
      ).toUpperCase()
    ) {

      case "VIP":
        return "VIP";

      case "NON_AC":
        return "Non-AC";

      case "DORMITORY":
        return "Dormitory";

      case "AC":
      default:
        return "AC";

    }

  };


  /* =========================================
     NEW BOOKING
  ========================================= */

  const handleNewBooking = () => {

    setBookingDraft(
      null
    );

    setExplicitAuthoritySelection(
      null
    );

    setCurrentPage(
      "booking"
    );

  };


  /* =========================================
     OTHER AUTHORITY ROOM SELECTED
  ========================================= */

  const handleExplicitAuthoritySelection = (
    selection: ExplicitAuthoritySelection
  ) => {

    setExplicitAuthoritySelection(
      selection
    );

    setBookingDraft(
      null
    );

    setCurrentPage(
      "booking"
    );

  };


  /* =========================================
     BOOKING FORM → DATABASE
  ========================================= */

  const handleBookingContinue = async (
    booking: BookingDraft
  ) => {

    if (!loggedInUser) {

      setModal({

        type: "error",

        title:
          "Session Expired",

        message:
          "Your user session is missing. Please login again.",

      });

      return;
    }

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/bookings",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                booking_type:
                  booking.bookingType,

                check_in_date:
                  booking.checkIn
                    .split("T")[0],

                expected_check_out_date:
                  booking.checkOut
                    .split("T")[0],

                number_of_guests:
                  booking.guests.length,

                purpose_of_visit:
                  "Rest House Accommodation",

                special_requirements:
                  null,

                is_emergency:
                  false,

                created_by:
                  loggedInUser.id,

                guests:
                  booking.guests.map(
                    (guest) => ({

                      name:
                        guest.name,

                      relationship:
                        guest.relationship,

                      mobile:
                        guest.mobile,

                      identityProofType:
                        guest.identityProofType,

                      identityProofNumber:
                        guest.identityProofNumber,

                      relationshipProofType:
                        guest.relationshipProofType,

                      relationshipProofNumber:
                        guest.relationshipProofNumber,

                    })
                  ),

              }),

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        setModal({

          type: "error",

          title:
            "Booking Could Not Be Created",

          message:
            data.message ||
            "Unable to create the booking. Please check the details and try again.",

        });

        return;
      }


      if (!data.booking?.id) {

        console.error(
          "Booking API returned no booking ID:",
          data
        );

        setModal({

          type: "error",

          title:
            "Booking ID Missing",

          message:
            "The booking was created, but the database booking ID was not returned. Please contact the administrator before proceeding.",

        });

        return;
      }


      if (
        !Array.isArray(
          data.guests
        ) ||
        data.guests.length !==
          booking.guests.length
      ) {

        console.error(
          "Guest API response mismatch:",
          data
        );

        setModal({

          type: "error",

          title:
            "Guest Information Error",

          message:
            "The booking was created, but guest information could not be linked correctly. Please contact the administrator.",

        });

        return;
      }


      const bookingWithDatabaseIds:
        BookingDraft = {

        ...booking,

        id:
          data.booking.id,

        guests:
          booking.guests.map(
            (guest, index) => ({

              ...guest,

              id:
                data.guests[index]?.id,

            })
          ),

      };


      setBookingDraft(
        bookingWithDatabaseIds
      );


      setModal({

        type: "success",

        title:
          "Booking Created Successfully",

        message:
          `Booking Reference: ${data.booking.booking_reference}`,

        onCloseAction: () => {

          setCurrentPage(
            "availability"
          );

        },

      });

    } catch (error) {

      console.error(
        "Booking API error:",
        error
      );

      setModal({

        type: "error",

        title:
          "Booking Server Unavailable",

        message:
          "Unable to connect to the booking server. Please make sure the backend is running and try again.",

      });

    }

  };


  /* =========================================
     CONFIRM ALLOTMENT
  ========================================= */

  const handleConfirmAllotment = async (
    selections: AllotmentSelection[]
  ) => {

    if (!loggedInUser) {

      setModal({

        type: "error",

        title:
          "Session Expired",

        message:
          "Your user session is missing. Please login again.",

      });

      return;
    }


    if (!bookingDraft?.id) {

      setModal({

        type: "error",

        title:
          "Booking ID Missing",

        message:
          "The database booking ID is missing. Please create the booking again.",

      });

      return;
    }


    if (
      !Array.isArray(
        selections
      ) ||
      selections.length === 0
    ) {

      setModal({

        type: "warning",

        title:
          "Room or Bed Required",

        message:
          "Please select at least one room or bed before confirming the allotment.",

      });

      return;
    }


    /*
     * IMPORTANT:
     *
     * AC / NAC / VIP = WHOLE ROOM
     * --------------------------------
     * bedId is intentionally empty.
     * Do NOT reject the selection.
     *
     * DM / HALL = INDIVIDUAL BED/SEAT
     * --------------------------------
     * bedId must be present.
     *
     * A selection array must never contain
     * a mixture of room-only and bed
     * selections.
     */

    const isWholeRoomSelection =
      selections.every(
        (selection) =>
          !selection.bedId
      );

    const isBedSelection =
      selections.every(
        (selection) =>
          Boolean(
            selection.bedId
          )
      );


    if (
      !isWholeRoomSelection &&
      !isBedSelection
    ) {

      setModal({

        type: "error",

        title:
          "Invalid Accommodation Selection",

        message:
          "Please select either a complete room or individual beds/seats. Do not mix the two selection types.",

      });

      return;
    }


    for (
      const selection
      of selections
    ) {

      if (!selection.guestId) {

        setModal({

          type: "warning",

          title:
            "Guest Assignment Required",

          message:
            isBedSelection
              ? "Please assign a guest to every selected bed."
              : "Please make sure every guest is assigned to the selected room.",

        });

        return;
      }


      if (!selection.roomId) {

        setModal({

          type: "error",

          title:
            "Room Selection Error",

          message:
            "A selected room is missing. Please review your room selection.",

        });

        return;
      }


      /*
       * ONLY DM / HALL requires a bed.
       *
       * AC / NAC / VIP deliberately has
       * no bedId because the complete room
       * is being allotted.
       */
      if (
        isBedSelection &&
        !selection.bedId
      ) {

        setModal({

          type: "error",

          title:
            "Bed Selection Error",

          message:
            "A selected bed is missing. Please review your bed selection.",

        });

        return;
      }

    }


    const guestIds =
      selections.map(
        (selection) =>
          selection.guestId
      );


    const uniqueGuestIds =
      new Set(
        guestIds
      );


    if (
      uniqueGuestIds.size !==
      guestIds.length
    ) {

      setModal({

        type: "warning",

        title:
          "Duplicate Guest Assignment",

        message:
          isBedSelection
            ? "The same guest cannot be allotted to multiple beds."
            : "Each guest can only be assigned once to the selected room.",

      });

      return;
    }


    /*
     * Duplicate bed checking is ONLY
     * applicable to DM / HALL.
     *
     * Whole-room selections intentionally
     * have no bed IDs.
     */
    if (isBedSelection) {

      const bedIds =
        selections.map(
          (selection) =>
            selection.bedId
        );


      const uniqueBedIds =
        new Set(
          bedIds
        );


      if (
        uniqueBedIds.size !==
        bedIds.length
      ) {

        setModal({

          type: "warning",

          title:
            "Duplicate Bed Selection",

          message:
            "The same bed cannot be selected more than once.",

        });

        return;
      }

    }


    const bookingGuestIds =
      bookingDraft.guests
        .map(
          (guest) =>
            guest.id
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        );


    for (
      const guestId
      of guestIds
    ) {

      if (
        !bookingGuestIds.includes(
          guestId
        )
      ) {

        setModal({

          type: "error",

          title:
            "Invalid Guest Assignment",

          message:
            "One or more selected guests do not belong to this booking.",

        });

        return;
      }

    }


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/allotments/bulk",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                booking_id:
                  bookingDraft.id,

                allotted_by:
                  loggedInUser.id,

                is_emergency_allotment:
                  false,

                remarks:
                  null,

                selections:
                  selections.map(
                    (selection) => ({

                      guest_id:
                        selection.guestId,

                      room_id:
                        selection.roomId,

                      /*
                       * Whole-room AC/NAC/VIP
                       * allotment intentionally sends
                       * no bed ID.
                       *
                       * DM/HALL sends the exact
                       * selected bed/seat.
                       */
                      ...(selection.bedId
                        ? {
                            bed_id:
                              selection.bedId,
                          }
                        : {}),

                    })
                  ),

              }),

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        console.error(
          "Bulk allotment API error:",
          data
        );

        setModal({

          type: "error",

          title:
            "Allotment Could Not Be Completed",

          message:
            data.message ||
            "Unable to complete room/bed allotment.",

        });

        return;
      }


      setModal({

        type: "success",

        title:
          "Allotment Completed Successfully",

        message:
          isWholeRoomSelection
            ? "The complete room allotment has been recorded successfully."
            : "The selected bed/seat allotment has been recorded successfully.",

        onCloseAction: () => {

          setBookingDraft(
            null
          );

          setExplicitAuthoritySelection(
            null
          );

          setCurrentPage(
            "dashboard"
          );

        },

      });

    } catch (error) {

      console.error(
        "Bulk allotment connection error:",
        error
      );

      setModal({

        type: "error",

        title:
          "Allotment Server Unavailable",

        message:
          "Unable to connect to the allotment server. Please make sure the backend is running and try again.",

      });

    }

  };


  /* =========================================
     NAVIGATION
  ========================================= */

  const handleAvailability = () => {

    setCurrentPage(
      "availability"
    );

  };


  const handleCheckIn = () => {

    setCurrentPage(
      "check-in"
    );

  };


  const handleCheckOut = () => {

    setCurrentPage(
      "check-out"
    );

  };


  const handleHousekeeping = () => {

    setCurrentPage(
      "housekeeping"
    );

  };


  /* =========================================
     PENDING APPROVALS
  ========================================= */

  const handleApprovals = () => {

    setCurrentPage(
      "approvals"
    );

  };


  /* =========================================
     BACK TO DASHBOARD
  ========================================= */

  const handleBackToDashboard = () => {

    setCurrentPage(
      "dashboard"
    );

  };


  /* =========================================
     SHARED MODAL
  ========================================= */

  const renderModal = () => {

    if (!modal) {
      return null;
    }

    return (

      <AppModal

        type={
          modal.type
        }

        title={
          modal.title
        }

        message={
          modal.message
        }

        confirmText="OK"

        showCancel={
          false
        }

        onClose={
          closeModal
        }

      />

    );

  };


  /* =========================================
     MODERN SPLASH SCREEN
  ========================================= */

  if (showSplash) {

    return (

      <main className="modern-splash-screen">

        <div className="splash-background-orb splash-orb-one" />

        <div className="splash-background-orb splash-orb-two" />

        <div className="splash-background-orb splash-orb-three" />

        <div className="modern-splash-card">

          <div className="splash-top-line">

            <span />

            <span />

            <span />

          </div>


          <div className="modern-splash-content">

            <div className="modern-splash-emblem">

              <div className="modern-splash-emblem-inner">
                ESM
              </div>

            </div>


            <div className="modern-splash-heading">

              <span className="splash-overline">
                GOVERNMENT REST HOUSE
              </span>

              <h1>
                ESM REST HOUSE
              </h1>

              <p>
                Booking &amp; Management System
              </p>

            </div>


            <div className="splash-divider">

              <span />

              <b>
                •
              </b>

              <span />

            </div>


            <div className="splash-location">

              <span className="location-dot" />

              <span>
                PUNE
              </span>

            </div>


            <div className="splash-loading">

              <div className="splash-loading-track">

                <div className="splash-loading-fill" />

              </div>

              <div className="splash-loading-text">

                <span>
                  SECURE SYSTEM
                </span>

                <span>
                  INITIALIZING
                </span>

              </div>

            </div>

          </div>


          <div className="modern-splash-footer">

            <span>
              ESM Rest House • Pune
            </span>

            <span>
              v0.1.0
            </span>

          </div>

        </div>

      </main>

    );

  }


  /* =========================================
     LOGIN
  ========================================= */

  if (!loggedInUser) {

    return (

      <Login
        onLogin={
          handleLogin
        }
      />

    );

  }


  /* =========================================
     CREATE USER
  ========================================= */

  if (
    loggedInUser.role ===
      "ADMIN" &&
    currentPage ===
      "create-user"
  ) {

    return (

      <>

        <CreateUser

          users={
            users
          }

          onCreateUser={
            handleCreateUser
          }

          onDeleteUser={
            handleDeleteUser
          }

          currentUserId={
            loggedInUser.id
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     BOOKING
  ========================================= */

  if (
    currentPage ===
    "booking"
  ) {

    const bookingCategory =
      explicitAuthoritySelection
        ? getAuthorityBookingCategory(
            explicitAuthoritySelection.categoryName
          )
        : getAccommodationCategory(
            loggedInUser.role
          );


    return (

      <>

        <Booking

          category={
            bookingCategory
          }

          officerName={
            loggedInUser.name
          }

          userId={
            loggedInUser.id
          }

          onBack={
            handleBackToDashboard
          }

          onContinue={
            handleBookingContinue
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     AVAILABILITY
  ========================================= */

  if (
    currentPage ===
    "availability"
  ) {

    return (

      <>

        <Availability

          category={
            getAccommodationCategory(
              loggedInUser.role
            )
          }

          role={
            loggedInUser.role
          }

          booking={
            bookingDraft
          }

          authoritySelection={
            explicitAuthoritySelection
          }

          onConfirmBooking={
            handleConfirmAllotment
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     CHECK-IN
  ========================================= */

  if (
    currentPage ===
    "check-in"
  ) {

    return (

      <>

        <CheckIn

          userId={
            loggedInUser.id
          }

          userName={
            loggedInUser.name
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     CHECK-OUT
  ========================================= */

  if (
    currentPage ===
    "check-out"
  ) {

    return (

      <>

        <CheckOut

          userId={
            loggedInUser.id
          }

          userName={
            loggedInUser.name
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     HOUSEKEEPING
  ========================================= */

  if (
    loggedInUser.role ===
      "RECEPTIONIST" &&
    currentPage ===
      "housekeeping"
  ) {

    return (

      <>

        <Housekeeping

          userId={
            loggedInUser.id
          }

          userName={
            loggedInUser.name
          }

          userRole={
            loggedInUser.role
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     OTHER AUTHORITY ROOMS
  ========================================= */

  if (
    loggedInUser.role ===
      "RECEPTIONIST" &&
    currentPage ===
      "otherAuthorityRooms"
  ) {

    return (

      <>

        <OtherAuthorityRooms

          role={
            loggedInUser.role
          }

          onBack={
            handleBackToDashboard
          }

          onContinue={
            handleExplicitAuthoritySelection
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     PENDING APPROVALS
  ========================================= */

  if (
    (
      loggedInUser.role ===
        "DY_DIRECTOR" ||
      loggedInUser.role ===
        "SUPERINTENDENT" ||
      loggedInUser.role ===
        "WELFARE_ORGANISER" ||
      loggedInUser.role ===
        "OLC_REST_HOUSE_MANAGER"
    ) &&
    currentPage ===
      "approvals"
  ) {

    return (

      <>

        <Approval

          user={
            loggedInUser
          }

          onBack={
            handleBackToDashboard
          }

        />

        {renderModal()}

      </>

    );

  }


  /* =========================================
     DASHBOARD
  ========================================= */

  return (

    <>

      <Dashboard

        user={
          loggedInUser
        }

        onLogout={
          handleLogout
        }

        onCreateUser={() => {

          setCurrentPage(
            "create-user"
          );

        }}

        onNewBooking={
          handleNewBooking
        }

        onAvailability={
          handleAvailability
        }

        onOpenOtherAuthorityRooms={() => {

          setCurrentPage(
            "otherAuthorityRooms"
          );

        }}

        onCheckIn={
          handleCheckIn
        }

        onCheckOut={
          handleCheckOut
        }

        onHousekeeping={
          handleHousekeeping
        }

        onApprovals={
          handleApprovals
        }

      />

      {renderModal()}

    </>

  );

}


export default App;