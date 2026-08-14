import "../App.css";

import type { User } from "../App";

interface DashboardProps {
  user: User;

  onLogout: () => void;

  onCreateUser: () => void;

  onAvailability: () => void;
}

const dashboardInfo = {
  "Super Admin": {
    title: "Super Admin Dashboard",
    subtitle:
      "Overall System Management",
  },

  "AC Officer": {
    title: "AC Room Dashboard",
    subtitle:
      "AC Room Booking & Management",
  },

  "Non-AC Officer": {
    title: "Non-AC Room Dashboard",
    subtitle:
      "Non-AC Room Booking & Management",
  },

  "Dormitory Officer": {
    title: "Dormitory Dashboard",
    subtitle:
      "Dormitory & Mattress Booking Management",
  },

  "VIP Officer": {
    title: "VIP Booking Dashboard",
    subtitle:
      "VIP Booking & Management",
  },
};

function Dashboard({
  user,
  onLogout,
  onCreateUser,
  onAvailability,
}: DashboardProps) {
  const information =
    dashboardInfo[user.role];

  return (
    <main className="dashboard-screen">

      {/* ================================
          HEADER
      ================================= */}

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
              {user.name}
            </strong>

            <span>
              {user.role}
            </span>

          </div>

          <button
            className="logout-button"
            onClick={onLogout}
          >
            LOGOUT
          </button>

        </div>

      </header>

      {/* ================================
          MAIN CONTENT
      ================================= */}

      <section className="dashboard-content">

        {/* Page Title */}

        <div className="dashboard-title">

          <div>

            <h2>
              {information.title}
            </h2>

            <p>
              {information.subtitle}
            </p>

          </div>

          <span className="dashboard-date">
            14 August 2026
          </span>

        </div>

        {/* ================================
            STATISTICS
        ================================= */}

        <div className="dashboard-cards">

          <div className="stat-card">

            <span>
              Total Bookings
            </span>

            <strong>
              24
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Available
            </span>

            <strong>
              18
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Occupied
            </span>

            <strong>
              12
            </strong>

          </div>

          <div className="stat-card">

            <span>
              Today's Check-ins
            </span>

            <strong>
              5
            </strong>

          </div>

        </div>

        {/* ================================
            DASHBOARD PANELS
        ================================= */}

        <div className="dashboard-panels">

          {/* Quick Actions */}

          <div className="dashboard-panel">

            <h3>
              Quick Actions
            </h3>

            <div className="quick-actions">

              <button>
                New Booking
              </button>

              <button
                onClick={onAvailability}
              >
                Availability
              </button>

              <button>
                Check-in
              </button>

              <button>
                Check-out
              </button>

            </div>

          </div>

          {/* Administration */}

          <div className="dashboard-panel">

            <h3>
              Administration
            </h3>

            {user.role === "Super Admin" ? (

              <button
                className="create-user-main-button"
                onClick={onCreateUser}
              >
                + Create New User
              </button>

            ) : (

              <p className="restricted-message">
                User management is available
                only to the Super Admin.
              </p>

            )}

          </div>

        </div>

        {/* ================================
            RECENT BOOKINGS
        ================================= */}

        <div className="dashboard-panel recent-bookings-panel">

          <div className="panel-heading">

            <div>
              <h3>
                Recent Bookings
              </h3>

              <p>
                Latest booking activity
              </p>
            </div>

          </div>

          <div className="booking-table">

            <div className="booking-row booking-header">

              <span>
                Booking ID
              </span>

              <span>
                Guest
              </span>

              <span>
                Room
              </span>

              <span>
                Status
              </span>

            </div>

            <div className="booking-row">

              <span>
                ESM-2026-00124
              </span>

              <span>
                Rahul Patil
              </span>

              <span>
                AC-01
              </span>

              <span className="status-confirmed">
                Confirmed
              </span>

            </div>

            <div className="booking-row">

              <span>
                ESM-2026-00123
              </span>

              <span>
                Amit Sharma
              </span>

              <span>
                AC-02
              </span>

              <span className="status-occupied">
                Checked In
              </span>

            </div>

            <div className="booking-row">

              <span>
                ESM-2026-00122
              </span>

              <span>
                Sunil More
              </span>

              <span>
                AC-03
              </span>

              <span className="status-pending">
                Pending
              </span>

            </div>

          </div>

        </div>

      </section>

    </main>
  );
}

export default Dashboard;