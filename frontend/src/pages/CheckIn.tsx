import {
  useEffect,
  useState,
} from "react";


/* =========================================
   PROPS
========================================= */

interface CheckInProps {
  userId: string;
  userName: string;
  onBack: () => void;
}


/* =========================================
   GUEST DATA
========================================= */

interface AllottedGuest {
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
  check_in_status:
    | "NOT_CHECKED_IN"
    | "CHECKED_IN";
}


/* =========================================
   CHECK-IN PAGE
========================================= */

function CheckIn({
  userId,
  userName,
  onBack,
}: CheckInProps) {

  const [
    guests,
    setGuests,
  ] = useState<AllottedGuest[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    processingId,
    setProcessingId,
  ] = useState<string | null>(null);


  const [
    search,
    setSearch,
  ] = useState("");


  const [
    error,
    setError,
  ] = useState("");


  /* =========================================
     MODAL
  ========================================= */

  const [
    selectedGuest,
    setSelectedGuest,
  ] = useState<AllottedGuest | null>(
    null
  );


  /* =========================================
     SUCCESS MESSAGE
  ========================================= */

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  /* =========================================
     LOAD ELIGIBLE GUESTS
  ========================================= */

  const loadGuests = async () => {

    setLoading(true);

    setError("");


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/check-ins/eligible"
        );


      const data =
        await response.json();


      if (!response.ok) {

        setError(
          data.message ||
          "Unable to load guests for check-in."
        );

        return;

      }


      setGuests(
        Array.isArray(data.guests)
          ? data.guests
          : []
      );

    } catch (error) {

      console.error(
        "Check-in eligible guests error:",
        error
      );


      setError(
        "Unable to connect to the check-in server. Please make sure the backend is running."
      );

    } finally {

      setLoading(false);

    }

  };


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {

    loadGuests();

  }, []);


  /* =========================================
     OPEN CHECK-IN CONFIRMATION
  ========================================= */

  const openCheckInConfirmation = (
    guest: AllottedGuest
  ) => {

    setSuccessMessage("");

    setSelectedGuest(
      guest
    );

  };


  /* =========================================
     CLOSE CHECK-IN CONFIRMATION
  ========================================= */

  const closeCheckInConfirmation = () => {

    if (processingId) {

      return;

    }


    setSelectedGuest(
      null
    );

  };


  /* =========================================
     PERFORM CHECK-IN
  ========================================= */

  const confirmCheckIn = async () => {

    if (!selectedGuest) {

      return;

    }


    const guest =
      selectedGuest;


    setProcessingId(
      guest.allotment_id
    );


    setError("");

    setSuccessMessage("");


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/check-ins",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                allotment_id:
                  guest.allotment_id,

                booking_id:
                  guest.booking_id,

                guest_id:
                  guest.guest_id,

                room_id:
                  guest.room_id,

                bed_id:
                  guest.bed_id,

                checked_in_by:
                  userId,

              }),

          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        setSelectedGuest(
          null
        );

        alert(
          data.message ||
          "Unable to complete check-in."
        );

        return;

      }


      setSelectedGuest(
        null
      );


      setSuccessMessage(
        `Check-in completed successfully for ${guest.guest_name}.`
      );


      await loadGuests();

    } catch (error) {

      console.error(
        "Check-in error:",
        error
      );


      setSelectedGuest(
        null
      );


      alert(
        "Unable to connect to the check-in server. Please make sure the backend is running."
      );

    } finally {

      setProcessingId(
        null
      );

    }

  };


  /* =========================================
     SEARCH
  ========================================= */

  const filteredGuests =
    guests.filter(
      (guest) => {

        const value =
          search
            .trim()
            .toLowerCase();


        if (!value) {

          return true;

        }


        return (

          guest.guest_name
            .toLowerCase()
            .includes(value)

          ||

          guest.booking_reference
            .toLowerCase()
            .includes(value)

          ||

          guest.room_number
            .toLowerCase()
            .includes(value)

          ||

          String(
            guest.bed_number
          ).includes(value)

          ||

          (
            guest.mobile_number ||
            ""
          )
            .toLowerCase()
            .includes(value)

        );

      }
    );


  /* =========================================
     COUNTS
  ========================================= */

  const readyCount =
    guests.filter(
      (guest) =>
        guest.check_in_status ===
        "NOT_CHECKED_IN"
    ).length;


  const checkedInCount =
    guests.filter(
      (guest) =>
        guest.check_in_status ===
        "CHECKED_IN"
    ).length;


  return (

    <div className="checkin-page">

      <style>{`

        * {
          box-sizing: border-box;
        }

        .checkin-page {
          min-height: 100vh;
          background:
            linear-gradient(
              135deg,
              #eef3f8 0%,
              #f8fafc 45%,
              #e9eef4 100%
            );
          padding: 28px;
          color: #1e293b;
          font-family:
            Inter,
            "Segoe UI",
            Arial,
            sans-serif;
        }

        .checkin-container {
          width: 100%;
          max-width: 1500px;
          margin: 0 auto;
        }

        .checkin-header {
          background: #ffffff;
          border: 1px solid #dbe3ec;
          border-radius: 18px;
          padding: 24px 28px;
          box-shadow:
            0 8px 24px
            rgba(15, 23, 42, 0.07);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 20px;
          margin-bottom: 20px;
        }

        .checkin-title-area {
          display: flex;
          align-items: center;
          gap: 18px;
        }

        .checkin-emblem {
          width: 58px;
          height: 58px;
          border-radius: 14px;
          background:
            linear-gradient(
              135deg,
              #163a63,
              #285b8f
            );
          color: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
          letter-spacing: 1px;
          box-shadow:
            0 6px 14px
            rgba(22, 58, 99, 0.25);
        }

        .checkin-title-area h1 {
          margin: 0 0 5px;
          font-size: 28px;
          font-weight: 750;
          color: #102a43;
        }

        .checkin-title-area p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        .checkin-back-button {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          padding: 11px 18px;
          border-radius: 9px;
          font-size: 14px;
          font-weight: 650;
          cursor: pointer;
          transition: 0.18s ease;
        }

        .checkin-back-button:hover {
          background: #f1f5f9;
          border-color: #94a3b8;
        }

        .checkin-summary {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .summary-card {
          background: #ffffff;
          border: 1px solid #dbe3ec;
          border-radius: 14px;
          padding: 18px 20px;
          box-shadow:
            0 5px 18px
            rgba(15, 23, 42, 0.05);
        }

        .summary-label {
          color: #64748b;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .summary-number {
          color: #102a43;
          font-size: 27px;
          font-weight: 750;
        }

        .checkin-toolbar {
          background: #ffffff;
          border: 1px solid #dbe3ec;
          border-radius: 14px;
          padding: 16px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          box-shadow:
            0 5px 18px
            rgba(15, 23, 42, 0.05);
          margin-bottom: 18px;
        }

        .checkin-user {
          min-width: 230px;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .checkin-user strong {
          color: #163a63;
          font-size: 14px;
        }

        .checkin-user span {
          color: #64748b;
          font-size: 12px;
        }

        .checkin-search {
          flex: 1;
          min-width: 220px;
          height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          padding: 0 14px;
          font-size: 14px;
          outline: none;
          background: #f8fafc;
        }

        .checkin-search:focus {
          border-color: #3b82f6;
          background: #ffffff;
          box-shadow:
            0 0 0 3px
            rgba(59, 130, 246, 0.12);
        }

        .checkin-refresh {
          height: 42px;
          padding: 0 17px;
          border: 1px solid #cbd5e1;
          border-radius: 9px;
          background: #ffffff;
          color: #334155;
          font-weight: 650;
          cursor: pointer;
        }

        .checkin-refresh:hover {
          background: #f1f5f9;
        }

        .checkin-refresh:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .checkin-success {
          background: #ecfdf5;
          border: 1px solid #a7f3d0;
          color: #047857;
          border-radius: 10px;
          padding: 13px 16px;
          margin-bottom: 18px;
          font-size: 14px;
          font-weight: 600;
        }

        .checkin-error {
          background: #fff1f2;
          border: 1px solid #fecdd3;
          color: #be123c;
          border-radius: 10px;
          padding: 13px 16px;
          margin-bottom: 18px;
          font-size: 14px;
        }

        .checkin-table-card {
          background: #ffffff;
          border: 1px solid #dbe3ec;
          border-radius: 16px;
          overflow: hidden;
          box-shadow:
            0 8px 24px
            rgba(15, 23, 42, 0.06);
        }

        .checkin-table-header {
          padding: 18px 20px;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .checkin-table-header h2 {
          margin: 0;
          color: #163a63;
          font-size: 17px;
        }

        .checkin-table-header span {
          color: #64748b;
          font-size: 13px;
        }

        .checkin-table-wrapper {
          width: 100%;
          overflow-x: auto;
        }

        .checkin-table {
          width: 100%;
          min-width: 1050px;
          border-collapse: collapse;
        }

        .checkin-table th {
          background: #f8fafc;
          color: #475569;
          text-align: left;
          padding: 13px 15px;
          font-size: 12px;
          font-weight: 750;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
        }

        .checkin-table td {
          padding: 15px;
          border-bottom: 1px solid #edf2f7;
          font-size: 13px;
          color: #334155;
          white-space: nowrap;
        }

        .checkin-table tbody tr:hover {
          background: #f8fbff;
        }

        .booking-reference {
          color: #163a63;
          font-weight: 750;
        }

        .guest-name {
          color: #172b4d;
          font-weight: 700;
        }

        .room-number {
          color: #163a63;
          font-weight: 750;
        }

        .bed-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          padding: 6px 9px;
          border-radius: 7px;
          background: #eef4fa;
          color: #24527e;
          font-weight: 700;
        }

        .status-ready {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #fff7ed;
          color: #c2410c;
          font-size: 11px;
          font-weight: 750;
        }

        .status-ready::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #f97316;
        }

        .status-checked {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 10px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #047857;
          font-size: 11px;
          font-weight: 750;
        }

        .status-checked::before {
          content: "";
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #10b981;
        }

        .checkin-action {
          border: none;
          border-radius: 8px;
          padding: 9px 14px;
          background:
            linear-gradient(
              135deg,
              #163a63,
              #24527e
            );
          color: #ffffff;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 3px 8px
            rgba(22, 58, 99, 0.18);
          transition: 0.18s ease;
        }

        .checkin-action:hover {
          transform: translateY(-1px);
          box-shadow:
            0 5px 12px
            rgba(22, 58, 99, 0.24);
        }

        .checkin-action:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        .completed-text {
          color: #047857;
          font-size: 12px;
          font-weight: 700;
        }

        .empty-state {
          background: #ffffff;
          border: 1px solid #dbe3ec;
          border-radius: 16px;
          padding: 60px 25px;
          text-align: center;
          box-shadow:
            0 8px 24px
            rgba(15, 23, 42, 0.05);
        }

        .empty-icon {
          width: 58px;
          height: 58px;
          margin: 0 auto 15px;
          border-radius: 50%;
          background: #eef4fa;
          color: #24527e;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 800;
        }

        .empty-state h2 {
          margin: 0 0 8px;
          color: #163a63;
          font-size: 19px;
        }

        .empty-state p {
          margin: 0;
          color: #64748b;
          font-size: 14px;
        }

        /* =====================================
           MODAL
        ===================================== */

        .checkin-modal-overlay {
          position: fixed;
          inset: 0;
          background:
            rgba(15, 23, 42, 0.58);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 9999;
          backdrop-filter: blur(3px);
        }

        .checkin-modal {
          width: 100%;
          max-width: 520px;
          background: #ffffff;
          border-radius: 18px;
          overflow: hidden;
          box-shadow:
            0 25px 70px
            rgba(15, 23, 42, 0.28);
          animation:
            checkinModalIn
            0.18s ease-out;
        }

        @keyframes checkinModalIn {

          from {
            opacity: 0;
            transform:
              translateY(10px)
              scale(0.98);
          }

          to {
            opacity: 1;
            transform:
              translateY(0)
              scale(1);
          }

        }

        .checkin-modal-header {
          padding: 20px 22px;
          background:
            linear-gradient(
              135deg,
              #163a63,
              #285b8f
            );
          color: #ffffff;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .checkin-modal-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .checkin-modal-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background:
            rgba(255,255,255,0.16);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 18px;
        }

        .checkin-modal-header h2 {
          margin: 0;
          font-size: 18px;
        }

        .checkin-modal-close {
          width: 34px;
          height: 34px;
          border: none;
          border-radius: 8px;
          background:
            rgba(255,255,255,0.12);
          color: #ffffff;
          font-size: 20px;
          cursor: pointer;
        }

        .checkin-modal-close:hover {
          background:
            rgba(255,255,255,0.22);
        }

        .checkin-modal-body {
          padding: 24px;
        }

        .checkin-modal-intro {
          margin: 0 0 18px;
          color: #64748b;
          font-size: 14px;
          line-height: 1.5;
        }

        .checkin-details {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .checkin-detail {
          padding: 13px 14px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
        }

        .checkin-detail-label {
          display: block;
          color: #64748b;
          font-size: 11px;
          font-weight: 650;
          margin-bottom: 5px;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .checkin-detail-value {
          display: block;
          color: #172b4d;
          font-size: 14px;
          font-weight: 700;
        }

        .checkin-confirm-note {
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 9px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #1e40af;
          font-size: 12px;
          line-height: 1.5;
        }

        .checkin-modal-footer {
          padding: 16px 24px 22px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modal-cancel-button {
          border: 1px solid #cbd5e1;
          background: #ffffff;
          color: #334155;
          border-radius: 9px;
          padding: 10px 17px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
        }

        .modal-cancel-button:hover {
          background: #f1f5f9;
        }

        .modal-confirm-button {
          border: none;
          background:
            linear-gradient(
              135deg,
              #163a63,
              #24527e
            );
          color: #ffffff;
          border-radius: 9px;
          padding: 10px 19px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          box-shadow:
            0 4px 10px
            rgba(22, 58, 99, 0.2);
        }

        .modal-confirm-button:hover {
          transform: translateY(-1px);
        }

        .modal-confirm-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
          transform: none;
        }

        @media (max-width: 900px) {

          .checkin-page {
            padding: 16px;
          }

          .checkin-summary {
            grid-template-columns: 1fr;
          }

          .checkin-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .checkin-user {
            min-width: 0;
          }

          .checkin-search {
            width: 100%;
          }

        }

        @media (max-width: 600px) {

          .checkin-header {
            flex-direction: column;
            align-items: stretch;
          }

          .checkin-back-button {
            width: 100%;
          }

          .checkin-title-area h1 {
            font-size: 23px;
          }

          .checkin-details {
            grid-template-columns: 1fr;
          }

          .checkin-modal-footer {
            flex-direction: column-reverse;
          }

          .modal-cancel-button,
          .modal-confirm-button {
            width: 100%;
          }

        }

      `}</style>


      <div className="checkin-container">


        {/* =====================================
            HEADER
        ===================================== */}

        <header className="checkin-header">

          <div className="checkin-title-area">

            <div className="checkin-emblem">
              ESM
            </div>

            <div>

              <h1>
                Guest Check-In
              </h1>

              <p>
                ESM Rest House • Pune
              </p>

            </div>

          </div>


          <button
            type="button"
            className="checkin-back-button"
            onClick={onBack}
          >
            ← Back to Dashboard
          </button>

        </header>


        {/* =====================================
            SUMMARY
        ===================================== */}

        <section className="checkin-summary">

          <div className="summary-card">

            <div className="summary-label">
              Total Allotted Guests
            </div>

            <div className="summary-number">
              {guests.length}
            </div>

          </div>


          <div className="summary-card">

            <div className="summary-label">
              Ready for Check-In
            </div>

            <div className="summary-number">
              {readyCount}
            </div>

          </div>


          <div className="summary-card">

            <div className="summary-label">
              Checked In
            </div>

            <div className="summary-number">
              {checkedInCount}
            </div>

          </div>

        </section>


        {/* =====================================
            TOOLBAR
        ===================================== */}

        <section className="checkin-toolbar">

          <div className="checkin-user">

            <strong>
              Reception Desk
            </strong>

            <span>
              Logged in as {userName}
            </span>

          </div>


          <input
            type="text"
            className="checkin-search"
            placeholder="Search guest, booking, room, bed or mobile..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />


          <button
            type="button"
            className="checkin-refresh"
            onClick={loadGuests}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

        </section>


        {/* =====================================
            SUCCESS
        ===================================== */}

        {successMessage && (

          <div className="checkin-success">
            ✓ {successMessage}
          </div>

        )}


        {/* =====================================
            ERROR
        ===================================== */}

        {error && (

          <div className="checkin-error">
            {error}
          </div>

        )}


        {/* =====================================
            CONTENT
        ===================================== */}

        {loading ? (

          <div className="empty-state">

            <div className="empty-icon">
              …
            </div>

            <h2>
              Loading Check-In List
            </h2>

            <p>
              Please wait while the system
              loads allotted guests.
            </p>

          </div>

        ) : filteredGuests.length === 0 ? (

          <div className="empty-state">

            <div className="empty-icon">
              ✓
            </div>

            <h2>
              No Guests Found
            </h2>

            <p>
              There are currently no allotted
              guests matching your search.
            </p>

          </div>

        ) : (

          <section className="checkin-table-card">


            <div className="checkin-table-header">

              <h2>
                Allotted Guests
              </h2>

              <span>
                Showing {
                  filteredGuests.length
                } guest{
                  filteredGuests.length !== 1
                    ? "s"
                    : ""
                }
              </span>

            </div>


            <div className="checkin-table-wrapper">

              <table className="checkin-table">

                <thead>

                  <tr>

                    <th>
                      Booking
                    </th>

                    <th>
                      Guest
                    </th>

                    <th>
                      Mobile
                    </th>

                    <th>
                      Room
                    </th>

                    <th>
                      Bed
                    </th>

                    <th>
                      Check-In Date
                    </th>

                    <th>
                      Expected Check-Out
                    </th>

                    <th>
                      Status
                    </th>

                    <th>
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody>

                  {filteredGuests.map(
                    (guest) => (

                      <tr
                        key={
                          guest.allotment_id
                        }
                      >

                        <td>
                          <span className="booking-reference">
                            {
                              guest.booking_reference
                            }
                          </span>
                        </td>


                        <td>
                          <span className="guest-name">
                            {
                              guest.guest_name
                            }
                          </span>
                        </td>


                        <td>
                          {
                            guest.mobile_number ||
                            "—"
                          }
                        </td>


                        <td>
                          <span className="room-number">
                            {
                              guest.room_number
                            }
                          </span>
                        </td>


                        <td>
                          <span className="bed-number">
                            Bed {
                              guest.bed_number
                            }
                          </span>
                        </td>


                        <td>
                          {
                            formatDate(
                              guest.check_in_date
                            )
                          }
                        </td>


                        <td>
                          {
                            formatDate(
                              guest.expected_check_out_date
                            )
                          }
                        </td>


                        <td>

                          {guest.check_in_status ===
                          "CHECKED_IN" ? (

                            <span className="status-checked">
                              CHECKED IN
                            </span>

                          ) : (

                            <span className="status-ready">
                              READY
                            </span>

                          )}

                        </td>


                        <td>

                          {guest.check_in_status ===
                          "CHECKED_IN" ? (

                            <span className="completed-text">
                              ✓ Completed
                            </span>

                          ) : (

                            <button
                              type="button"
                              className="checkin-action"
                              disabled={
                                processingId ===
                                guest.allotment_id
                              }
                              onClick={() =>
                                openCheckInConfirmation(
                                  guest
                                )
                              }
                            >

                              Check-In

                            </button>

                          )}

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </section>

        )}

      </div>


      {/* =======================================
          CHECK-IN CONFIRMATION MODAL
      ======================================= */}

      {selectedGuest && (

        <div
          className="checkin-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {

              closeCheckInConfirmation();

            }

          }}
        >

          <section
            className="checkin-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="checkin-modal-title"
          >


            {/* MODAL HEADER */}

            <header className="checkin-modal-header">

              <div className="checkin-modal-title">

                <div className="checkin-modal-icon">
                  ✓
                </div>

                <h2 id="checkin-modal-title">
                  Confirm Guest Check-In
                </h2>

              </div>


              <button
                type="button"
                className="checkin-modal-close"
                onClick={
                  closeCheckInConfirmation
                }
                disabled={
                  Boolean(processingId)
                }
                aria-label="Close"
              >
                ×
              </button>

            </header>


            {/* MODAL BODY */}

            <div className="checkin-modal-body">

              <p className="checkin-modal-intro">

                Please verify the following
                accommodation details before
                completing the guest check-in.

              </p>


              <div className="checkin-details">


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Guest
                  </span>

                  <span className="checkin-detail-value">
                    {
                      selectedGuest.guest_name
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Booking
                  </span>

                  <span className="checkin-detail-value">
                    {
                      selectedGuest.booking_reference
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Mobile
                  </span>

                  <span className="checkin-detail-value">
                    {
                      selectedGuest.mobile_number ||
                      "—"
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Room
                  </span>

                  <span className="checkin-detail-value">
                    {
                      selectedGuest.room_number
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Bed
                  </span>

                  <span className="checkin-detail-value">
                    Bed {
                      selectedGuest.bed_number
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Check-In Date
                  </span>

                  <span className="checkin-detail-value">
                    {
                      formatDate(
                        selectedGuest.check_in_date
                      )
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Expected Check-Out
                  </span>

                  <span className="checkin-detail-value">
                    {
                      formatDate(
                        selectedGuest.expected_check_out_date
                      )
                    }
                  </span>

                </div>


                <div className="checkin-detail">

                  <span className="checkin-detail-label">
                    Current Status
                  </span>

                  <span className="checkin-detail-value">
                    READY
                  </span>

                </div>

              </div>


              <div className="checkin-confirm-note">

                Confirming this action will record
                the current date and time as the
                guest's check-in time and record
                the logged-in user as the person
                who completed the check-in.

              </div>

            </div>


            {/* MODAL FOOTER */}

            <footer className="checkin-modal-footer">

              <button
                type="button"
                className="modal-cancel-button"
                onClick={
                  closeCheckInConfirmation
                }
                disabled={
                  Boolean(processingId)
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="modal-confirm-button"
                onClick={
                  confirmCheckIn
                }
                disabled={
                  processingId ===
                  selectedGuest.allotment_id
                }
              >

                {processingId ===
                selectedGuest.allotment_id
                  ? "Checking In..."
                  : "Confirm Check-In"}

              </button>

            </footer>

          </section>

        </div>

      )}

    </div>

  );
}


/* =========================================
   DATE FORMAT
========================================= */

function formatDate(
  value: string
): string {

  if (!value) {

    return "—";

  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {

    return value;

  }


  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }
  );

}


export default CheckIn; 