import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import "../App.css";

import type { User } from "../App";

/* =========================================================
   TYPES
========================================================= */

interface ApprovalRecord {
  booking_id: string;
  booking_reference: string;
  booking_type: string;
  booking_date: string;
  check_in_date: string;
  expected_check_out_date: string;
  number_of_guests: number;
  booking_status: string;
  approval_status: string;
  purpose_of_visit: string | null;
  special_requirements: string | null;
  is_emergency: boolean;
  created_at: string;

  created_by: string;
  created_by_name: string;
  created_by_username: string;

  allotment_id: string;
  room_id: string;
  bed_id: string;
  guest_id: string;
  allotted_by: string;
  is_emergency_allotment: boolean;
  allotted_at: string;
  allotment_remarks: string | null;

  room_number: string;
  room_status: string;

  bed_number: number;
  bed_status: string;

  category_name: string;

  guest_name: string;
  gender: string | null;
  mobile_number: string | null;
  relationship: string | null;
  rank: string | null;

  responsible_role: string;
}

interface ApprovalResponse {
  success: boolean;
  approvals: ApprovalRecord[];
  message?: string;
}

/* =========================================================
   PROPS
========================================================= */

interface ApprovalProps {
  user: User;
  onBack: () => void;
}

/* =========================================================
   COMPONENT
========================================================= */

function Approval({
  user,
  onBack,
}: ApprovalProps) {

  /* =======================================================
     STATE
  ======================================================= */

  const [
    approvals,
    setApprovals,
  ] = useState<ApprovalRecord[]>([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    selectedBooking,
    setSelectedBooking,
  ] = useState<string | null>(null);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    actionType,
    setActionType,
  ] = useState<
    "APPROVE" | "REJECT" | null
  >(null);

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  /* =======================================================
     LOAD PENDING APPROVALS
  ======================================================= */

  const loadApprovals = useCallback(
    async (
      showRefresh = false
    ) => {

      if (!user?.id) {
        setErrorMessage(
          "Logged-in user information is missing."
        );

        setLoading(false);

        return;
      }

      try {

        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setErrorMessage("");

        const response =
          await fetch(
            `http://localhost:5000/api/approvals/pending/${user.id}`,
            {
              method: "GET",
              headers: {
                "Content-Type":
                  "application/json",
              },
              cache: "no-store",
            }
          );

        const data:
          ApprovalResponse =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.message ||
              "Unable to load pending approvals."
          );
        }

        if (!data.success) {

          throw new Error(
            data.message ||
              "Unable to load pending approvals."
          );
        }

        setApprovals(
          Array.isArray(
            data.approvals
          )
            ? data.approvals
            : []
        );

      } catch (error) {

        console.error(
          "Approval loading error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to connect to the approval server."
        );

      } finally {

        setLoading(false);
        setRefreshing(false);

      }
    },
    [user.id]
  );

  /* =======================================================
     INITIAL LOAD
  ======================================================= */

  useEffect(() => {

    loadApprovals();

  }, [
    loadApprovals,
  ]);

  /* =======================================================
     GROUP BOOKINGS
  ======================================================= */

  const groupedBookings =
    useMemo(() => {

      const groups =
        new Map<
          string,
          ApprovalRecord[]
        >();

      approvals.forEach(
        (approval) => {

          const existing =
            groups.get(
              approval.booking_id
            );

          if (existing) {

            existing.push(
              approval
            );

          } else {

            groups.set(
              approval.booking_id,
              [approval]
            );

          }
        }
      );

      return Array.from(
        groups.entries()
      ).map(
        ([
          bookingId,
          records,
        ]) => ({
          bookingId,
          booking:
            records[0],
          records,
        })
      );

    }, [approvals]);

  /* =======================================================
     DATE FORMAT
  ======================================================= */

  const formatDate = (
    value: string
  ) => {

    if (!value) {
      return "-";
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
        month: "short",
        year: "numeric",
      }
    );
  };

  /* =======================================================
     ROLE LABEL
  ======================================================= */

  const getRoleLabel = (
    role: string
  ) => {

    switch (role) {

      case "SUPERINTENDENT":
        return "SUPERINTENDENT";

      case "WELFARE_ORGANISER":
        return "WELFARE ORGANISER";

      case "OLC_REST_HOUSE_MANAGER":
        return "OLC REST HOUSE MANAGER";

      case "DY_DIRECTOR":
        return "DEPUTY DIRECTOR";

      default:
        return role;
    }
  };

  /* =======================================================
     OPEN APPROVAL ACTION
  ======================================================= */

  const openAction = (
    bookingId: string,
    type:
      | "APPROVE"
      | "REJECT"
  ) => {

    setSelectedBooking(
      bookingId
    );

    setActionType(
      type
    );

    setRemarks("");

    setSuccessMessage("");
  };

  /* =======================================================
     CLOSE ACTION
  ======================================================= */

  const closeAction = () => {

    if (actionLoading) {
      return;
    }

    setSelectedBooking(
      null
    );

    setActionType(
      null
    );

    setRemarks("");
  };

  /* =======================================================
     EXECUTE APPROVAL / REJECTION
  ======================================================= */

  const executeAction =
    async () => {

      if (
        !selectedBooking ||
        !actionType
      ) {
        return;
      }

      if (
        actionType ===
          "REJECT" &&
        !remarks.trim()
      ) {

        setErrorMessage(
          "Remarks are required when rejecting a booking."
        );

        return;
      }

      try {

        setActionLoading(
          true
        );

        setErrorMessage("");

        const endpoint =
          actionType ===
          "APPROVE"
            ? "approve"
            : "reject";

        const response =
          await fetch(
            `http://localhost:5000/api/approvals/${selectedBooking}/${endpoint}`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify({
                  approver_id:
                    user.id,

                  remarks:
                    remarks.trim() ||
                    null,
                }),
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data.message ||
              `Unable to ${endpoint} the booking.`
          );
        }

        if (!data.success) {

          throw new Error(
            data.message ||
              `Unable to ${endpoint} the booking.`
          );
        }

        setSelectedBooking(
          null
        );

        setActionType(
          null
        );

        setRemarks("");

        setSuccessMessage(
          actionType ===
            "APPROVE"
            ? "Booking approved successfully."
            : "Booking rejected successfully."
        );

        await loadApprovals(
          true
        );

      } catch (error) {

        console.error(
          "Approval action error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to complete the approval action."
        );

      } finally {

        setActionLoading(
          false
        );

      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (

    <main className="approval-screen">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="modern-dashboard-header">

        <div className="modern-brand">

          <div className="modern-brand-mark">
            ESM
          </div>

          <div className="modern-brand-text">

            <h1>
              ESM REST HOUSE
            </h1>

            <p>
              Booking &amp; Management System
            </p>

          </div>

        </div>

        <div className="modern-header-right">

          <div className="modern-header-date">

            <span>
              TODAY
            </span>

            <strong>
              {new Date().toLocaleDateString(
                "en-IN",
                {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                }
              )}
            </strong>

          </div>

          <div className="modern-user">

            <div className="modern-user-avatar">

              {user.name
                ?.charAt(0)
                .toUpperCase() ||
                "U"}

            </div>

            <div className="modern-user-details">

              <strong>
                {user.name}
              </strong>

              <span>
                {user.role}
              </span>

            </div>

          </div>

          <button
            type="button"
            className="modern-logout"
            onClick={onBack}
          >
            Back
          </button>

        </div>

      </header>

      {/* =====================================================
          CONTENT
      ===================================================== */}

      <section className="approval-content">

        {/* ===================================================
            PAGE INTRO
        =================================================== */}

        <section className="approval-welcome">

          <div>

            <span className="approval-eyebrow">
              APPROVAL MANAGEMENT
            </span>

            <h2>
              Pending Approvals
            </h2>

            <p>
              Review room booking requests
              assigned to your authority.
            </p>

          </div>

          <div className="approval-welcome-meta">

            <strong>
              {getRoleLabel(
                user.role
              )}
            </strong>

            <span>
              Approval Authority
            </span>

          </div>

        </section>

        {/* ===================================================
            MESSAGES
        =================================================== */}

        {errorMessage && (

          <div className="approval-message approval-error">

            <div>

              <strong>
                Approval Centre Error
              </strong>

              <span>
                {errorMessage}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                loadApprovals()
              }
            >
              Try Again
            </button>

          </div>

        )}

        {successMessage && (

          <div className="approval-message approval-success">

            <div>

              <strong>
                Action Completed
              </strong>

              <span>
                {successMessage}
              </span>

            </div>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage("")
              }
            >
              Dismiss
            </button>

          </div>

        )}

        {/* ===================================================
            APPROVAL CENTRE
        =================================================== */}

        <section className="approval-panel">

          <div className="approval-panel-header">

            <div>

              <span className="approval-section-eyebrow">
                WORKFLOW
              </span>

              <h3>
                Approval Centre
              </h3>

              <p>
                {loading
                  ? "Loading pending approval records..."
                  : `${groupedBookings.length} pending booking${
                      groupedBookings.length === 1
                        ? ""
                        : "s"
                    } awaiting your decision.`}
              </p>

            </div>

            <button
              type="button"
              className="approval-refresh-button"
              onClick={() =>
                loadApprovals(
                  true
                )
              }
              disabled={
                loading ||
                refreshing
              }
            >
              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          {/* =================================================
              LOADING
          ================================================= */}

          {loading && (

            <div className="approval-empty-state">

              <div className="approval-spinner" />

              <strong>
                Loading Pending Approvals
              </strong>

              <span>
                Connecting to PostgreSQL...
              </span>

            </div>

          )}

          {/* =================================================
              NO RECORDS
          ================================================= */}

          {!loading &&
            !errorMessage &&
            groupedBookings.length ===
              0 && (

              <div className="approval-empty-state">

                <div className="approval-empty-icon">
                  ✓
                </div>

                <strong>
                  No Pending Approvals
                </strong>

                <span>
                  There are currently no
                  room bookings waiting for
                  your approval.
                </span>

              </div>

            )}

          {/* =================================================
              BOOKINGS
          ================================================= */}

          {!loading &&
            groupedBookings.length >
              0 && (

              <div className="approval-list">

                {groupedBookings.map(
                  ({
                    bookingId,
                    booking,
                    records,
                  }) => (

                    <article
                      key={
                        bookingId
                      }
                      className="approval-card"
                    >

                      {/* ===================================
                          CARD HEADER
                      =================================== */}

                      <div className="approval-card-header">

                        <div>

                          <span className="approval-reference">
                            {booking.booking_reference}
                          </span>

                          <h4>
                            {booking.guest_name}
                          </h4>

                          <p>
                            Created by{" "}
                            <strong>
                              {
                                booking.created_by_name
                              }
                            </strong>
                          </p>

                        </div>

                        <div className="approval-card-status">

                          <span className="approval-status-badge">
                            PENDING APPROVAL
                          </span>

                          {booking.is_emergency && (

                            <span className="approval-emergency-badge">
                              EMERGENCY
                            </span>

                          )}

                        </div>

                      </div>

                      {/* ===================================
                          DETAILS
                      =================================== */}

                      <div className="approval-detail-grid">

                        <div className="approval-detail-box">

                          <span>
                            BOOKING TYPE
                          </span>

                          <strong>
                            {
                              booking.booking_type
                            }
                          </strong>

                        </div>

                        <div className="approval-detail-box">

                          <span>
                            CHECK-IN
                          </span>

                          <strong>
                            {formatDate(
                              booking.check_in_date
                            )}
                          </strong>

                        </div>

                        <div className="approval-detail-box">

                          <span>
                            CHECK-OUT
                          </span>

                          <strong>
                            {formatDate(
                              booking.expected_check_out_date
                            )}
                          </strong>

                        </div>

                        <div className="approval-detail-box">

                          <span>
                            GUESTS
                          </span>

                          <strong>
                            {
                              booking.number_of_guests
                            }
                          </strong>

                        </div>

                      </div>

                      {/* ===================================
                          ROOM / BED INFORMATION
                      =================================== */}

                      <div className="approval-room-section">

                        <div className="approval-room-heading">

                          <div>

                            <span>
                              ALLOTTED ACCOMMODATION
                            </span>

                            <strong>
                              {
                                booking.category_name
                              }
                            </strong>

                          </div>

                          <span className="approval-responsible-role">
                            {
                              getRoleLabel(
                                booking.responsible_role
                              )
                            }
                          </span>

                        </div>

                        <div className="approval-room-list">

                          {records.map(
                            (
                              record
                            ) => (

                              <div
                                key={
                                  record.allotment_id
                                }
                                className="approval-room-row"
                              >

                                <div>

                                  <strong>
                                    Room{" "}
                                    {
                                      record.room_number
                                    }
                                  </strong>

                                  <span>
                                    Bed{" "}
                                    {
                                      record.bed_number
                                    }
                                  </span>

                                </div>

                                <div>

                                  <strong>
                                    {
                                      record.guest_name
                                    }
                                  </strong>

                                  <span>
                                    {
                                      record.mobile_number ||
                                      "Mobile not provided"
                                    }
                                  </span>

                                </div>

                                <span className="approval-room-status">
                                  ALLOTTED
                                </span>

                              </div>

                            )
                          )}

                        </div>

                      </div>

                      {/* ===================================
                          PURPOSE
                      =================================== */}

                      {booking.purpose_of_visit && (

                        <div className="approval-purpose">

                          <span>
                            PURPOSE OF VISIT
                          </span>

                          <p>
                            {
                              booking.purpose_of_visit
                            }
                          </p>

                        </div>

                      )}

                      {/* ===================================
                          ACTIONS
                      =================================== */}

                      <div className="approval-card-actions">

                        <button
                          type="button"
                          className="approval-reject-button"
                          onClick={() =>
                            openAction(
                              bookingId,
                              "REJECT"
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          Reject
                        </button>

                        <button
                          type="button"
                          className="approval-approve-button"
                          onClick={() =>
                            openAction(
                              bookingId,
                              "APPROVE"
                            )
                          }
                          disabled={
                            actionLoading
                          }
                        >
                          Approve Booking
                        </button>

                      </div>

                    </article>

                  )
                )}

              </div>

            )}

        </section>

        {/* ===================================================
            BACK BUTTON
        =================================================== */}

        <div className="approval-bottom-actions">

          <button
            type="button"
            className="approval-back-button"
            onClick={onBack}
          >
            Back to Dashboard
          </button>

        </div>

      </section>

      {/* =====================================================
          ACTION MODAL
      ===================================================== */}

      {actionType &&
        selectedBooking && (

        <div className="approval-modal-overlay">

          <div className="approval-modal">

            <div className="approval-modal-icon">

              {actionType ===
              "APPROVE"
                ? "✓"
                : "!"}

            </div>

            <span className="approval-modal-eyebrow">
              {actionType ===
              "APPROVE"
                ? "APPROVAL CONFIRMATION"
                : "REJECTION CONFIRMATION"}
            </span>

            <h3>
              {actionType ===
              "APPROVE"
                ? "Approve this booking?"
                : "Reject this booking?"}
            </h3>

            <p>

              {actionType ===
              "APPROVE"
                ? "This booking will be marked as approved and can proceed to check-in."
                : "This booking will be rejected and its allotted room and bed will be released."}

            </p>

            <div className="approval-modal-booking">

              <span>
                BOOKING
              </span>

              <strong>

                {
                  approvals.find(
                    (item) =>
                      item.booking_id ===
                      selectedBooking
                  )
                    ?.booking_reference ||
                  selectedBooking
                }

              </strong>

            </div>

            <div className="approval-remarks-field">

              <label>
                Remarks{" "}

                {actionType ===
                  "REJECT" && (
                  <span>
                    *
                  </span>
                )}

              </label>

              <textarea
                value={
                  remarks
                }
                onChange={(
                  event
                ) =>
                  setRemarks(
                    event.target.value
                  )
                }
                placeholder={
                  actionType ===
                  "REJECT"
                    ? "Please enter the reason for rejection..."
                    : "Optional approval remarks..."
                }
                rows={4}
                disabled={
                  actionLoading
                }
              />

            </div>

            <div className="approval-modal-actions">

              <button
                type="button"
                className="approval-modal-cancel"
                onClick={
                  closeAction
                }
                disabled={
                  actionLoading
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className={
                  actionType ===
                  "APPROVE"
                    ? "approval-modal-confirm approval-modal-confirm-approve"
                    : "approval-modal-confirm approval-modal-confirm-reject"
                }
                onClick={
                  executeAction
                }
                disabled={
                  actionLoading ||
                  (
                    actionType ===
                      "REJECT" &&
                    !remarks.trim()
                  )
                }
              >
                {actionLoading
                  ? "Processing..."
                  : actionType ===
                    "APPROVE"
                    ? "Confirm Approval"
                    : "Confirm Rejection"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>
  );
}

export default Approval;