import { useEffect, useState } from "react";

import AppModal from "../components/AppModal";
import type { AppModalType } from "../components/AppModal";

interface CheckOutProps {
  userId: string;
  userName: string;
  onBack: () => void;
}

interface EligibleGuest {
  allotment_id: string;
  booking_id: string;
  booking_reference: string;

  guest_id: string;
  guest_name: string;
  mobile_number: string | null;

  room_id: string;
  room_number: string;

  bed_id: string;
  bed_number: number;

  check_in_date: string;
  expected_check_out_date: string;

  allotment_status: string;
  check_in_status: "NOT_CHECKED_IN" | "CHECKED_IN";
}

function CheckOut({
  userId,
  userName,
  onBack,
}: CheckOutProps) {
  const [guests, setGuests] = useState<EligibleGuest[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedGuest, setSelectedGuest] =
    useState<EligibleGuest | null>(null);

  const [remarks, setRemarks] = useState("");

  const [confirmingCheckOut, setConfirmingCheckOut] =
    useState(false);

  const [processingCheckOut, setProcessingCheckOut] =
    useState(false);

  const [modal, setModal] = useState<{
    type: AppModalType;
    title: string;
    message: string;
  } | null>(null);

  const closeModal = () => {
    setModal(null);
  };


  /* =========================================
     LOAD CURRENT OCCUPANTS
  ========================================= */

  const loadEligibleGuests = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/check-outs/eligible"
      );

      const data = await response.json();

      if (!response.ok) {
        setModal({
          type: "error",
          title: "Unable to Load Check-Out List",
          message:
            data.message ||
            "The check-out list could not be loaded.",
        });

        return;
      }

      setGuests(
        Array.isArray(data)
          ? data
          : []
      );

    } catch (error) {

      console.error(
        "Check-out eligible guests error:",
        error
      );

      setModal({
        type: "error",
        title: "Check-Out Server Unavailable",
        message:
          "Unable to connect to the check-out server. Please make sure the backend is running.",
      });

    } finally {

      setLoading(false);

    }
  };


  useEffect(() => {
    loadEligibleGuests();
  }, []);


  /* =========================================
     FORMAT DATE
  ========================================= */

  const formatDate = (
    dateValue: string
  ) => {

    if (!dateValue) {
      return "-";
    }

    const date =
      new Date(dateValue);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return dateValue;
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  };


  /* =========================================
     SELECT GUEST
     OPENS OVERLAY
  ========================================= */

  const selectGuest = (
    guest: EligibleGuest
  ) => {

    setSelectedGuest(guest);

    setRemarks("");

    setConfirmingCheckOut(false);
  };


  /* =========================================
     CLOSE CHECK-OUT OVERLAY
  ========================================= */

  const closeCheckOutOverlay = () => {

    if (processingCheckOut) {
      return;
    }

    setSelectedGuest(null);

    setRemarks("");

    setConfirmingCheckOut(false);
  };


  /* =========================================
     START CHECK-OUT CONFIRMATION
  ========================================= */

  const handleCheckOut = () => {

    if (!selectedGuest) {
      return;
    }

    if (
      selectedGuest.check_in_status !==
      "CHECKED_IN"
    ) {

      setModal({
        type: "warning",
        title: "Guest Not Checked In",
        message:
          "This guest has not been checked in yet. Check-out can only be completed for a checked-in guest.",
      });

      return;
    }

    setConfirmingCheckOut(true);
  };


  /* =========================================
     PROCESS CHECK-OUT
  ========================================= */

  const processCheckOut = async () => {

    if (!selectedGuest) {
      return;
    }

    try {

      setProcessingCheckOut(true);

      const response = await fetch(
        "http://localhost:5000/api/check-outs",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({

            booking_id:
              selectedGuest.booking_id,

            guest_id:
              selectedGuest.guest_id,

            allotment_id:
              selectedGuest.allotment_id,

            checked_out_by:
              userId,

            remarks:
              remarks.trim() ||
              null,

          }),
        }
      );


      const data =
        await response.json();


      if (!response.ok) {

        setModal({
          type: "error",
          title: "Check-Out Failed",
          message:
            data.message ||
            "The guest could not be checked out.",
        });

        return;
      }


      const guestName =
        selectedGuest.guest_name;

      const roomNumber =
        selectedGuest.room_number;

      const bedNumber =
        selectedGuest.bed_number;


      /* =================================
         CLOSE OVERLAY
      ================================= */

      setSelectedGuest(null);

      setRemarks("");

      setConfirmingCheckOut(false);


      /* =================================
         SUCCESS MESSAGE
      ================================= */

      setModal({
        type: "success",
        title: "Check-Out Completed",
        message:
          `${guestName} has been checked out successfully.\n\nRoom: ${roomNumber}\nBed: ${bedNumber}\n\nThe room is now waiting for housekeeping.`,
      });


      /* =================================
         REFRESH OCCUPANTS
      ================================= */

      await loadEligibleGuests();


    } catch (error) {

      console.error(
        "Check-out API error:",
        error
      );

      setModal({
        type: "error",
        title:
          "Check-Out Server Unavailable",
        message:
          "Unable to connect to the check-out server. Please make sure the backend is running and try again.",
      });

    } finally {

      setProcessingCheckOut(false);

    }
  };


  return (
    <main className="dashboard-screen">

      {/* =====================================
          HEADER
      ===================================== */}

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
              {userName}
            </strong>

            <span>
              CHECK-OUT
            </span>

          </div>

        </div>

      </header>


      {/* =====================================
          MAIN CONTENT
      ===================================== */}

      <section className="dashboard-content">

        <div className="dashboard-title">

          <div>

            <h2>
              Guest Check-Out
            </h2>

            <p>
              Select a checked-in guest to complete check-out
            </p>

          </div>


          <button
            type="button"
            className="logout-button"
            onClick={onBack}
          >
            BACK TO DASHBOARD
          </button>

        </div>


        {/* =====================================
            CURRENT OCCUPANTS
        ===================================== */}

        <div className="dashboard-panel">

          <div className="panel-heading">

            <div>

              <h3>
                Current Occupants
              </h3>

              <p>
                Guests currently allotted to rooms and beds
              </p>

            </div>

          </div>


          {loading ? (

            <div className="checkout-empty-state">
              Loading current occupants...
            </div>

          ) : guests.length === 0 ? (

            <div className="checkout-empty-state">
              No guests are currently available for check-out.
            </div>

          ) : (

            <div className="checkout-table">

              {/* TABLE HEADER */}

              <div className="checkout-row checkout-header">

                <span>
                  Booking
                </span>

                <span>
                  Guest
                </span>

                <span>
                  Room
                </span>

                <span>
                  Bed
                </span>

                <span>
                  Check-In
                </span>

                <span>
                  Expected Check-Out
                </span>

                <span>
                  Status
                </span>

              </div>


              {/* GUEST ROWS */}

              {guests.map(
                (guest) => (

                  <button
                    key={
                      guest.allotment_id
                    }
                    type="button"
                    className={`checkout-row checkout-select-row ${
                      selectedGuest?.allotment_id ===
                      guest.allotment_id
                        ? "checkout-row-selected"
                        : ""
                    }`}
                    onClick={() =>
                      selectGuest(guest)
                    }
                  >

                    <span>
                      {
                        guest.booking_reference
                      }
                    </span>


                    <span>

                      <strong>
                        {
                          guest.guest_name
                        }
                      </strong>

                      {guest.mobile_number && (

                        <small>
                          {
                            guest.mobile_number
                          }
                        </small>

                      )}

                    </span>


                    <span>
                      {
                        guest.room_number
                      }
                    </span>


                    <span>
                      Bed{" "}
                      {
                        guest.bed_number
                      }
                    </span>


                    <span>
                      {
                        formatDate(
                          guest.check_in_date
                        )
                      }
                    </span>


                    <span>
                      {
                        formatDate(
                          guest.expected_check_out_date
                        )
                      }
                    </span>


                    <span>

                      {guest.check_in_status ===
                      "CHECKED_IN" ? (

                        <span className="status-confirmed">
                          Checked In
                        </span>

                      ) : (

                        <span className="status-pending">
                          Not Checked In
                        </span>

                      )}

                    </span>

                  </button>

                )
              )}

            </div>

          )}

        </div>

      </section>


      {/* =====================================================
          CHECK-OUT DETAILS OVERLAY

          IMPORTANT:
          This is position: fixed.
          It therefore sits OVER the Current Occupants page
          instead of pushing the page down.
      ===================================================== */}

      {selectedGuest && (

        <div
          className="checkout-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-overlay-title"
        >

          {/* BACKDROP */}

          <div
            className="checkout-overlay-backdrop"
            onClick={
              processingCheckOut
                ? undefined
                : closeCheckOutOverlay
            }
          />


          {/* MODAL */}

          <div className="checkout-overlay-card">

            {/* MODAL HEADER */}

            <div className="checkout-overlay-header">

              <div>

                <div className="checkout-overlay-eyebrow">
                  GUEST CHECK-OUT
                </div>

                <h3
                  id="checkout-overlay-title"
                >
                  Check-Out Details
                </h3>

                <p>
                  Review the selected occupant before completing check-out.
                </p>

              </div>


              <button
                type="button"
                className="checkout-overlay-close"
                onClick={
                  closeCheckOutOverlay
                }
                disabled={
                  processingCheckOut
                }
                aria-label="Close"
              >
                ×
              </button>

            </div>


            {/* DETAILS */}

            <div className="checkout-overlay-details">

              <div className="checkout-detail-card">

                <span>
                  Guest
                </span>

                <strong>
                  {
                    selectedGuest.guest_name
                  }
                </strong>

                {selectedGuest.mobile_number && (

                  <small>
                    {
                      selectedGuest.mobile_number
                    }
                  </small>

                )}

              </div>


              <div className="checkout-detail-card">

                <span>
                  Booking Reference
                </span>

                <strong>
                  {
                    selectedGuest.booking_reference
                  }
                </strong>

              </div>


              <div className="checkout-detail-card">

                <span>
                  Room
                </span>

                <strong>
                  {
                    selectedGuest.room_number
                  }
                </strong>

              </div>


              <div className="checkout-detail-card">

                <span>
                  Bed
                </span>

                <strong>
                  Bed{" "}
                  {
                    selectedGuest.bed_number
                  }
                </strong>

              </div>


              <div className="checkout-detail-card">

                <span>
                  Check-In
                </span>

                <strong>
                  {
                    formatDate(
                      selectedGuest.check_in_date
                    )
                  }
                </strong>

              </div>


              <div className="checkout-detail-card">

                <span>
                  Expected Check-Out
                </span>

                <strong>
                  {
                    formatDate(
                      selectedGuest.expected_check_out_date
                    )
                  }
                </strong>

              </div>

            </div>


            {/* REMARKS */}

            <div className="checkout-overlay-remarks">

              <label
                htmlFor="checkout-remarks"
              >
                Remarks
              </label>

              <textarea
                id="checkout-remarks"
                value={remarks}
                onChange={(event) =>
                  setRemarks(
                    event.target.value
                  )
                }
                placeholder="Optional checkout remarks"
                rows={4}
                disabled={
                  processingCheckOut
                }
              />

            </div>


            {/* =================================
                NORMAL ACTIONS
            ================================= */}

            {!confirmingCheckOut && (

              <div className="checkout-overlay-actions">

                <button
                  type="button"
                  className="checkout-overlay-cancel"
                  onClick={
                    closeCheckOutOverlay
                  }
                  disabled={
                    processingCheckOut
                  }
                >
                  Cancel
                </button>


                <button
                  type="button"
                  className="checkout-overlay-primary"
                  onClick={
                    handleCheckOut
                  }
                  disabled={
                    selectedGuest.check_in_status !==
                      "CHECKED_IN" ||
                    processingCheckOut
                  }
                >
                  Complete Check-Out
                </button>

              </div>

            )}


            {/* =================================
                CONFIRMATION
            ================================= */}

            {confirmingCheckOut && (

              <div className="checkout-overlay-confirmation">

                <div className="checkout-confirm-icon">
                  !
                </div>


                <div className="checkout-confirm-content">

                  <h4>
                    Confirm Check-Out
                  </h4>

                  <p>

                    Are you sure you want to check out{" "}

                    <strong>
                      {
                        selectedGuest.guest_name
                      }
                    </strong>

                    {" "}from{" "}

                    <strong>
                      {
                        selectedGuest.room_number
                      }
                    </strong>

                    , Bed{" "}

                    <strong>
                      {
                        selectedGuest.bed_number
                      }
                    </strong>
                    ?

                  </p>

                  <span>
                    The allotment will be released and the room/bed will be sent to housekeeping.
                  </span>

                </div>


                <div className="checkout-overlay-actions">

                  <button
                    type="button"
                    className="checkout-overlay-cancel"
                    onClick={() =>
                      setConfirmingCheckOut(
                        false
                      )
                    }
                    disabled={
                      processingCheckOut
                    }
                  >
                    Back
                  </button>


                  <button
                    type="button"
                    className="checkout-overlay-primary checkout-confirm-final"
                    onClick={
                      processCheckOut
                    }
                    disabled={
                      processingCheckOut
                    }
                  >
                    {processingCheckOut
                      ? "Processing..."
                      : "Confirm Check-Out"}
                  </button>

                </div>

              </div>

            )}

          </div>

        </div>

      )}


      {/* =====================================
          RESULT MODAL
      ===================================== */}

      {modal && (

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
          showCancel={false}
          onClose={
            closeModal
          }
        />

      )}

    </main>
  );
}

export default CheckOut;