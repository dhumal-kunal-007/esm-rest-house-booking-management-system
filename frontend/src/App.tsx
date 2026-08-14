import {
  useEffect,
  useState,
} from "react";

import "./App.css";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import CreateUser from "./pages/CreateUser";
import Availability from "./pages/Availability";

export type UserRole =
  | "Super Admin"
  | "AC Officer"
  | "Non-AC Officer"
  | "Dormitory Officer"
  | "VIP Officer";

export interface User {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  active: boolean;
}

const defaultAdmin: User = {
  id: "admin-001",
  name: "System Administrator",
  username: "admin",
  password: "admin123",
  role: "Super Admin",
  active: true,
};

function App() {

  const [showSplash, setShowSplash] =
    useState(true);

  const [users, setUsers] =
    useState<User[]>(() => {

      const savedUsers =
        localStorage.getItem(
          "esm-users"
        );

      if (savedUsers) {
        try {
          return JSON.parse(
            savedUsers
          );
        } catch {
          return [defaultAdmin];
        }
      }

      return [defaultAdmin];
    });

  const [loggedInUser, setLoggedInUser] =
    useState<User | null>(null);

  const [showCreateUser, setShowCreateUser] =
    useState(false);

  const [showAvailability, setShowAvailability] =
    useState(false);

  /* Save users for demo */

  useEffect(() => {

    localStorage.setItem(
      "esm-users",
      JSON.stringify(users)
    );

  }, [users]);

  /* Splash timer */

  useEffect(() => {

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);

  }, []);

  /* Login */

  const handleLogin = (user: User) => {

    setLoggedInUser(user);

    setShowCreateUser(false);
    setShowAvailability(false);

  };

  /* Logout */

  const handleLogout = () => {

    setLoggedInUser(null);

    setShowCreateUser(false);
    setShowAvailability(false);

  };

  /* Create user */

  const handleCreateUser = (
    newUser: User
  ) => {

    setUsers((currentUsers) => [
      ...currentUsers,
      newUser,
    ]);

    setShowCreateUser(false);

  };

  /* =================================
     SPLASH SCREEN
  ================================== */

  if (showSplash) {

    return (

      <main className="splash-screen">

        <div className="splash-card">

          <div className="emblem">
            <span>ESM</span>
          </div>

          <div className="title-section">

            <h1>
              ESM REST HOUSE
            </h1>

            <p>
              Booking &amp; Management System
            </p>

            <span className="location">
              PUNE
            </span>

          </div>

          <div className="loading-section">

            <div className="loading-line">

              <div className="loading-progress"></div>

            </div>

            <p>
              Initializing system...
            </p>

          </div>

          <div className="footer">

            <span>
              ESM Rest House, Pune
            </span>

            <span>
              Version 0.1.0
            </span>

          </div>

        </div>

      </main>

    );
  }

  /* =================================
     LOGIN
  ================================== */

  if (!loggedInUser) {

    return (

      <Login
        users={users}
        onLogin={handleLogin}
      />

    );
  }

  /* =================================
     CREATE USER
  ================================== */

  if (
    loggedInUser.role ===
      "Super Admin" &&
    showCreateUser
  ) {

    return (

      <CreateUser
        users={users}
        onCreateUser={
          handleCreateUser
        }
        onBack={() =>
          setShowCreateUser(false)
        }
      />

    );
  }

  /* =================================
     AC AVAILABILITY MATRIX
  ================================== */

  if (showAvailability) {

    return (

      <Availability
        onBack={() =>
          setShowAvailability(false)
        }
      />

    );
  }

  /* =================================
     DASHBOARD
  ================================== */

  return (

    <Dashboard
      user={loggedInUser}
      onLogout={handleLogout}
      onCreateUser={() =>
        setShowCreateUser(true)
      }
      onAvailability={() =>
        setShowAvailability(true)
      }
    />

  );
}

export default App;