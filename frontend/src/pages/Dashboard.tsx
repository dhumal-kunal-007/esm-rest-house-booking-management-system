import { useCallback, useEffect, useState } from "react";
import "../App.css";

import type { User } from "../App";

interface DashboardProps {
  user: User;
  onLogout: () => void;
  onCreateUser: () => void;
  onNewBooking: () => void;
  onAvailability: () => void;
  onOpenOtherAuthorityRooms: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  onHousekeeping: () => void;
  onApprovals: () => void;
}

interface DashboardSummary {
  totalBookings: number;
  availableBeds: number;
  occupiedBeds: number;
  todaysCheckIns: number;
  needsCleaningBeds: number;
  cleaningBeds: number;
}

interface RoomStatus {
  acRooms: number;
  nonAcRooms: number;
  dormitories: number;
  hallRooms: number;
}

interface RecentBooking {
  id: string;
  booking_reference: string;
  booking_status: string;
  approval_status: string;
  booking_type: string;
  check_in_date: string;
  expected_check_out_date: string;
  created_at: string;
  guest_name: string;
  room_number: string;
}

interface DashboardResponse {
  success: boolean;
  summary: DashboardSummary;
  roomStatus: RoomStatus;
  recentBookings: RecentBooking[];
  message?: string;
}

const dashboardInfo = {
  ADMIN: {
    title: "Administrator Dashboard",
    subtitle: "Overall system management",
  },

  DY_DIRECTOR: {
    title: "Deputy Director Dashboard",
    subtitle: "VIP room booking & management",
  },

  SUPERINTENDENT: {
    title: "Superintendent Dashboard",
    subtitle: "AC room booking & management",
  },

  WELFARE_ORGANISER: {
    title: "Welfare Organizer Dashboard",
    subtitle: "AC room booking & management",
  },

  OLC_REST_HOUSE_MANAGER: {
    title: "OLC Rest House Manager Dashboard",
    subtitle: "AC room booking & management",
  },

  RECEPTIONIST: {
    title: "Receptionist Dashboard",
    subtitle: "Room, bed & guest management",
  },
} as const;

function Dashboard({
  user,
  onLogout,
  onCreateUser,
  onNewBooking,
  onAvailability,
  onOpenOtherAuthorityRooms,
  onCheckIn,
  onCheckOut,
  onHousekeeping,
  onApprovals,
}: DashboardProps) {
  const information = dashboardInfo[user.role];

  const [summary, setSummary] =
    useState<DashboardSummary>({
      totalBookings: 0,
      availableBeds: 0,
      occupiedBeds: 0,
      todaysCheckIns: 0,
      needsCleaningBeds: 0,
      cleaningBeds: 0,
    });

  const [roomStatus, setRoomStatus] =
    useState<RoomStatus>({
      acRooms: 0,
      nonAcRooms: 0,
      dormitories: 0,
      hallRooms: 0,
    });

  const [recentBookings, setRecentBookings] =
    useState<RecentBooking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [lastUpdated, setLastUpdated] =
    useState<Date | null>(null);

  const [errorMessage, setErrorMessage] =
    useState("");

  /*
  |--------------------------------------------------------------------------
  | LOAD LIVE DASHBOARD DATA
  |--------------------------------------------------------------------------
  */

  const loadDashboardData = useCallback(
    async () => {
      try {
        const response = await fetch(
          "http://localhost:5000/api/dashboard/summary",
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            cache: "no-store",
          }
        );

        const data: DashboardResponse =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Unable to load dashboard information."
          );
        }

        /*
        |--------------------------------------------------------------------------
        | LIVE SUMMARY
        |--------------------------------------------------------------------------
        */

        setSummary({
          totalBookings:
            Number(
              data.summary?.totalBookings
            ) || 0,

          availableBeds:
            Number(
              data.summary?.availableBeds
            ) || 0,

          occupiedBeds:
            Number(
              data.summary?.occupiedBeds
            ) || 0,

          todaysCheckIns:
            Number(
              data.summary?.todaysCheckIns
            ) || 0,

          needsCleaningBeds:
            Number(
              data.summary?.needsCleaningBeds
            ) || 0,

          cleaningBeds:
            Number(
              data.summary?.cleaningBeds
            ) || 0,
        });

        /*
        |--------------------------------------------------------------------------
        | LIVE ROOM STATUS
        |--------------------------------------------------------------------------
        */

        setRoomStatus({
          acRooms:
            Number(
              data.roomStatus?.acRooms
            ) || 0,

          nonAcRooms:
            Number(
              data.roomStatus?.nonAcRooms
            ) || 0,

          dormitories:
            Number(
              data.roomStatus?.dormitories
            ) || 0,

          hallRooms:
            Number(
              data.roomStatus?.hallRooms
            ) || 0,
        });

        /*
        |--------------------------------------------------------------------------
        | LIVE RECENT BOOKINGS
        |--------------------------------------------------------------------------
        */

        setRecentBookings(
          Array.isArray(
            data.recentBookings
          )
            ? data.recentBookings
            : []
        );

        setErrorMessage("");
        setLastUpdated(new Date());

      } catch (error) {
        console.error(
          "Dashboard data error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to connect to dashboard server."
        );

      } finally {
        setLoading(false);
      }
    },
    []
  );

  /*
  |--------------------------------------------------------------------------
  | INITIAL LOAD + AUTOMATIC REFRESH
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadDashboardData();

    const refreshTimer =
      window.setInterval(() => {
        loadDashboardData();
      }, 30000);

    return () => {
      window.clearInterval(
        refreshTimer
      );
    };
  }, [loadDashboardData]);

  /*
  |--------------------------------------------------------------------------
  | DATE FORMATTING
  |--------------------------------------------------------------------------
  */

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

  /*
  |--------------------------------------------------------------------------
  | BOOKING STATUS
  |--------------------------------------------------------------------------
  */

  const getBookingStatus = (
    booking: RecentBooking
  ) => {
    const bookingStatus =
      String(
        booking.booking_status || ""
      ).toUpperCase();

    const approvalStatus =
      String(
        booking.approval_status || ""
      ).toUpperCase();

    if (
      bookingStatus.includes(
        "CHECK"
      ) ||
      bookingStatus === "OCCUPIED"
    ) {
      return {
        label: "Checked In",
        className:
          "dashboard-status dashboard-status-green",
      };
    }

    if (
      bookingStatus === "ALLOTTED"
    ) {
      return {
        label: "Allotted",
        className:
          "dashboard-status dashboard-status-blue",
      };
    }

    if (
      bookingStatus.includes(
        "CANCEL"
      )
    ) {
      return {
        label: "Cancelled",
        className:
          "dashboard-status dashboard-status-red",
      };
    }

    if (
      approvalStatus === "REJECTED"
    ) {
      return {
        label: "Rejected",
        className:
          "dashboard-status dashboard-status-red",
      };
    }

    if (
      approvalStatus === "APPROVED"
    ) {
      return {
        label: "Approved",
        className:
          "dashboard-status dashboard-status-green",
      };
    }

    return {
      label: "Pending",
      className:
        "dashboard-status dashboard-status-amber",
    };
  };

  /*
  |--------------------------------------------------------------------------
  | CURRENT DATE
  |--------------------------------------------------------------------------
  */

  const today = new Date();

  const formattedToday =
    today.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );

  /*
  |--------------------------------------------------------------------------
  | AUTHORITY APPROVAL ACCESS
  |--------------------------------------------------------------------------
  */

  const canApproveBookings =
    user.role ===
      "DY_DIRECTOR" ||
    user.role ===
      "SUPERINTENDENT" ||
    user.role ===
      "WELFARE_ORGANISER" ||
    user.role ===
      "OLC_REST_HOUSE_MANAGER";

  /*
  |--------------------------------------------------------------------------
  | RENDER
  |--------------------------------------------------------------------------
  */

  return (
    <main className="modern-dashboard">

      {/* ============================================================
          HEADER
      ============================================================ */}

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
              {formattedToday}
            </strong>

          </div>

          <div className="modern-user">

            <div className="modern-user-avatar">
              {user.name
                ?.charAt(0)
                .toUpperCase() || "U"}
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
            onClick={onLogout}
          >
            Logout
          </button>

        </div>

      </header>

      {/* ============================================================
          MAIN
      ============================================================ */}

      <section className="modern-dashboard-content">

        {/* ============================================================
            WELCOME
        ============================================================ */}

        <section className="dashboard-welcome">

          <div>

            <span className="dashboard-eyebrow">
              WELCOME BACK
            </span>

            <h2>
              {information.title}
            </h2>

            <p>
              {information.subtitle}
            </p>

          </div>

          <div className="dashboard-welcome-meta">

            <strong>
              {formattedToday}
            </strong>

            <span>
              ESM Rest House Management Portal
            </span>

          </div>

        </section>

        {/* ============================================================
            LIVE DATA INDICATOR
        ============================================================ */}

        <div className="dashboard-live-bar">

          <div className="dashboard-live-left">

            <span className="dashboard-live-dot" />

            <strong>
              Live System Data
            </strong>

            <span>
              Connected to PostgreSQL
            </span>

          </div>

          <div className="dashboard-live-right">

            {loading
              ? "Loading..."
              : lastUpdated
                ? `Updated ${lastUpdated.toLocaleTimeString(
                    "en-IN",
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    }
                  )}`
                : "Waiting for update"}

            <button
              type="button"
              onClick={
                loadDashboardData
              }
              disabled={loading}
              className="dashboard-refresh-button"
            >
              Refresh
            </button>

          </div>

        </div>

        {/* ============================================================
            ERROR
        ============================================================ */}

        {errorMessage && (

          <div className="dashboard-error">

            <strong>
              Dashboard data unavailable
            </strong>

            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={
                loadDashboardData
              }
            >
              Try Again
            </button>

          </div>

        )}

        {/* ============================================================
            LIVE STATISTICS
        ============================================================ */}

        <section className="dashboard-stat-grid">

          {/* TOTAL BOOKINGS */}

          <article className="dashboard-stat-card stat-blue">

            <div className="dashboard-stat-top">

              <div className="dashboard-stat-icon">
                B
              </div>

              <span className="dashboard-stat-badge">
                LIVE
              </span>

            </div>

            <span className="dashboard-stat-label">
              Total Bookings
            </span>

            <strong className="dashboard-stat-value">
              {loading
                ? "—"
                : summary.totalBookings}
            </strong>

            <span className="dashboard-stat-description">
              All bookings recorded in the system
            </span>

          </article>

          {/* AVAILABLE BEDS */}

          <article className="dashboard-stat-card stat-green">

            <div className="dashboard-stat-top">

              <div className="dashboard-stat-icon">
                A
              </div>

              <span className="dashboard-stat-badge">
                AVAILABLE
              </span>

            </div>

            <span className="dashboard-stat-label">
              Available Beds
            </span>

            <strong className="dashboard-stat-value">
              {loading
                ? "—"
                : summary.availableBeds}
            </strong>

            <span className="dashboard-stat-description">
              Ready for guest allotment
            </span>

          </article>

          {/* OCCUPIED BEDS */}

          <article className="dashboard-stat-card stat-red">

            <div className="dashboard-stat-top">

              <div className="dashboard-stat-icon">
                O
              </div>

              <span className="dashboard-stat-badge">
                OCCUPIED
              </span>

            </div>

            <span className="dashboard-stat-label">
              Occupied Beds
            </span>

            <strong className="dashboard-stat-value">
              {loading
                ? "—"
                : summary.occupiedBeds}
            </strong>

            <span className="dashboard-stat-description">
              Currently allotted to guests
            </span>

          </article>

          {/* TODAY CHECK-IN */}

          <article className="dashboard-stat-card stat-purple">

            <div className="dashboard-stat-top">

              <div className="dashboard-stat-icon">
                IN
              </div>

              <span className="dashboard-stat-badge">
                TODAY
              </span>

            </div>

            <span className="dashboard-stat-label">
              Today's Check-ins
            </span>

            <strong className="dashboard-stat-value">
              {loading
                ? "—"
                : summary.todaysCheckIns}
            </strong>

            <span className="dashboard-stat-description">
              Guests checked in today
            </span>

          </article>

        </section>

        {/* ============================================================
            HOUSEKEEPING STATUS
        ============================================================ */}

        <section className="dashboard-attention-grid">

          <div className="dashboard-attention-card attention-red">

            <div>

              <span>
                HOUSEKEEPING
              </span>

              <strong>
                {loading
                  ? "—"
                  : summary.needsCleaningBeds}
              </strong>

              <p>
                Beds waiting for housekeeping
              </p>

            </div>

            <span className="attention-indicator">
              NEEDS CLEANING
            </span>

          </div>

          <div className="dashboard-attention-card attention-amber">

            <div>

              <span>
                CLEANING IN PROGRESS
              </span>

              <strong>
                {loading
                  ? "—"
                  : summary.cleaningBeds}
              </strong>

              <p>
                Beds currently being cleaned
              </p>

            </div>

            <span className="attention-indicator">
              IN PROGRESS
            </span>

          </div>

        </section>

        {/* ============================================================
            OPERATIONS + ROOM STATUS
        ============================================================ */}

        <section className="dashboard-main-grid">

          {/* QUICK ACTIONS */}

          <section className="dashboard-section-card">

            <div className="dashboard-section-header">

              <div>

                <span className="dashboard-eyebrow">
                  OPERATIONS
                </span>

                <h3>
                  Quick Actions
                </h3>

                <p>
                  Frequently used management functions
                </p>

              </div>

            </div>

            <div className="dashboard-action-grid">

              {/* NEW BOOKING */}

              <button
                type="button"
                className="dashboard-action action-blue"
                onClick={
                  onNewBooking
                }
              >

                <span className="action-symbol">
                  +
                </span>

                <span>

                  <strong>
                    New Booking
                  </strong>

                  <small>
                    Create a new guest booking
                  </small>

                </span>

                <b>
                  →
                </b>

              </button>

              {/* AVAILABILITY */}

              <button
                type="button"
                className="dashboard-action action-green"
                onClick={
                  onAvailability
                }
              >

                <span className="action-symbol">
                  A
                </span>

                <span>

                  <strong>
                    Availability
                  </strong>

                  <small>
                    View rooms and beds
                  </small>

                </span>

                <b>
                  →
                </b>

              </button>

              {/* =====================================================
                  PENDING APPROVALS
                  AUTHORITY ROLES ONLY
              ===================================================== */}

              {canApproveBookings && (

                <button
                  type="button"
                  className="dashboard-action action-purple"
                  onClick={
                    onApprovals
                  }
                >

                  <span className="action-symbol">
                    ✓
                  </span>

                  <span>

                    <strong>
                      Pending Approvals
                    </strong>

                    <small>
                      Review room booking approvals
                    </small>

                  </span>

                  <b>
                    →
                  </b>

                </button>

              )}

              {/* AUTHORITY ROOMS */}

              {user.role ===
                "RECEPTIONIST" && (

                <button
                  type="button"
                  className="dashboard-action action-purple"
                  onClick={
                    onOpenOtherAuthorityRooms
                  }
                >

                  <span className="action-symbol">
                    R
                  </span>

                  <span>

                    <strong>
                      Authority Rooms
                    </strong>

                    <small>
                      Manage authority room access
                    </small>

                  </span>

                  <b>
                    →
                  </b>

                </button>

              )}

              {/* CHECK-IN */}

              <button
                type="button"
                className="dashboard-action action-cyan"
                onClick={
                  onCheckIn
                }
              >

                <span className="action-symbol">
                  IN
                </span>

                <span>

                  <strong>
                    Check-In
                  </strong>

                  <small>
                    Register arriving guests
                  </small>

                </span>

                <b>
                  →
                </b>

              </button>

              {/* CHECK-OUT */}

              <button
                type="button"
                className="dashboard-action action-orange"
                onClick={
                  onCheckOut
                }
              >

                <span className="action-symbol">
                  OUT
                </span>

                <span>

                  <strong>
                    Check-Out
                  </strong>

                  <small>
                    Complete guest departure
                  </small>

                </span>

                <b>
                  →
                </b>

              </button>

              {/* HOUSEKEEPING */}

              {user.role ===
                "RECEPTIONIST" && (

                <button
                  type="button"
                  className="dashboard-action action-amber"
                  onClick={
                    onHousekeeping
                  }
                >

                  <span className="action-symbol">
                    H
                  </span>

                  <span>

                    <strong>
                      Housekeeping
                    </strong>

                    <small>
                      Manage cleaning tasks
                    </small>

                  </span>

                  <b>
                    →
                  </b>

                </button>

              )}

            </div>

          </section>

          {/* ROOM STATUS */}

          <section className="dashboard-section-card">

            <div className="dashboard-section-header">

              <div>

                <span className="dashboard-eyebrow">
                  LIVE OVERVIEW
                </span>

                <h3>
                  Room Inventory
                </h3>

                <p>
                  Current accommodation structure
                </p>

              </div>

            </div>

            <div className="room-status-list">

              {/* AC ROOMS */}

              <div className="room-status-item">

                <div className="room-status-name">

                  <span className="room-status-dot dot-blue" />

                  <div>

                    <strong>
                      AC Rooms
                    </strong>

                    <small>
                      Premium accommodation
                    </small>

                  </div>

                </div>

                <strong className="room-status-number">
                  {loading
                    ? "—"
                    : roomStatus.acRooms}
                </strong>

              </div>

              {/* NON AC */}

              <div className="room-status-item">

                <div className="room-status-name">

                  <span className="room-status-dot dot-green" />

                  <div>

                    <strong>
                      Non-AC Rooms
                    </strong>

                    <small>
                      Standard accommodation
                    </small>

                  </div>

                </div>

                <strong className="room-status-number">
                  {loading
                    ? "—"
                    : roomStatus.nonAcRooms}
                </strong>

              </div>

              {/* DORMITORIES */}

              <div className="room-status-item">

                <div className="room-status-name">

                  <span className="room-status-dot dot-purple" />

                  <div>

                    <strong>
                      Dormitories
                    </strong>

                    <small>
                      Shared accommodation
                    </small>

                  </div>

                </div>

                <strong className="room-status-number">
                  {loading
                    ? "—"
                    : roomStatus.dormitories}
                </strong>

              </div>

              {/* HALL */}

              <div className="room-status-item">

                <div className="room-status-name">

                  <span className="room-status-dot dot-orange" />

                  <div>

                    <strong>
                      Hall
                    </strong>

                    <small>
                      Common accommodation
                    </small>

                  </div>

                </div>

                <strong className="room-status-number">
                  {loading
                    ? "—"
                    : roomStatus.hallRooms}
                </strong>

              </div>

            </div>

          </section>

        </section>

        {/* ============================================================
            RECENT BOOKINGS
        ============================================================ */}

        <section className="dashboard-section-card dashboard-recent-card">

          <div className="dashboard-section-header">

            <div>

              <span className="dashboard-eyebrow">
                ACTIVITY
              </span>

              <h3>
                Recent Bookings
              </h3>

              <p>
                Latest booking activity from PostgreSQL
              </p>

            </div>

            <button
              type="button"
              className="dashboard-new-booking-button"
              onClick={
                onNewBooking
              }
            >
              + New Booking
            </button>

          </div>

          {loading ? (

            <div className="dashboard-table-message">
              Loading live booking activity...
            </div>

          ) : recentBookings.length ===
            0 ? (

            <div className="dashboard-table-message">
              No bookings have been recorded yet.
            </div>

          ) : (

            <div className="dashboard-booking-table">

              <div className="dashboard-booking-row dashboard-booking-header">

                <span>
                  BOOKING ID
                </span>

                <span>
                  GUEST
                </span>

                <span>
                  ROOM
                </span>

                <span>
                  TYPE
                </span>

                <span>
                  CHECK-IN
                </span>

                <span>
                  STATUS
                </span>

              </div>

              {recentBookings.map(
                (booking) => {

                  const status =
                    getBookingStatus(
                      booking
                    );

                  return (

                    <div
                      key={booking.id}
                      className="dashboard-booking-row"
                    >

                      <span className="booking-reference">
                        {
                          booking.booking_reference
                        }
                      </span>

                      <span className="booking-guest">
                        {
                          booking.guest_name
                        }
                      </span>

                      <span>
                        {
                          booking.room_number
                        }
                      </span>

                      <span className="booking-type">
                        {
                          booking.booking_type
                        }
                      </span>

                      <span>
                        {
                          formatDate(
                            booking.check_in_date
                          )
                        }
                      </span>

                      <span>

                        <span
                          className={
                            status.className
                          }
                        >
                          {
                            status.label
                          }
                        </span>

                      </span>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

        {/* ============================================================
            ADMINISTRATION
        ============================================================ */}

        <section className="dashboard-admin-section">

          <div>

            <span className="dashboard-eyebrow">
              ADMINISTRATION
            </span>

            <h3>
              User Management
            </h3>

            <p>
              Manage system users and access permissions.
            </p>

          </div>

          {user.role ===
            "ADMIN" ? (

            <button
              type="button"
              className="dashboard-admin-button"
              onClick={
                onCreateUser
              }
            >
              Manage Users
            </button>

          ) : (

            <span className="dashboard-admin-restricted">
              Administrator access required
            </span>

          )}

        </section>

      </section>

      {/* ============================================================
          FOOTER
      ============================================================ */}

      <footer className="modern-dashboard-footer">

        <span>
          ESM REST HOUSE
        </span>

        <span>
          |
        </span>

        <span>
          Secure Management Portal
        </span>

        <span>
          |
        </span>

        <span>
          © {new Date().getFullYear()}
        </span>

      </footer>

    </main>
  );
}

export default Dashboard;