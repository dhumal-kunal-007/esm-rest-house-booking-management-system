import {
  useEffect,
  useState,
} from "react";

import "../App.css";

import type {
  User,
  UserRole,
} from "../App";


interface LoginProps {
  onLogin: (user: User) => void;
}


interface LoginResponse {
  success: boolean;
  message: string;

  user?: {
    id: string;
    full_name: string;
    username: string;
    role_id: number;
    role_name: string;
    description: string;
  };
}


/* =========================================
   LOGIN ROLES
========================================= */

const roles: {
  value: UserRole;
  label: string;
  shortLabel: string;
}[] = [

  {
    value: "ADMIN",
    label: "Administrator",
    shortLabel: "Administrator",
  },

  {
    value: "DY_DIRECTOR",
    label: "Deputy Director",
    shortLabel: "Deputy Director",
  },

  {
    value: "SUPERINTENDENT",
    label: "Superintendent",
    shortLabel: "Superintendent",
  },

  {
    value: "WELFARE_ORGANISER",
    label: "Welfare Organizer",
    shortLabel: "Welfare Organizer",
  },

  {
    value: "OLC_REST_HOUSE_MANAGER",
    label: "OLC Rest House Manager",
    shortLabel: "OLC Rest House Manager",
  },

  {
    value: "RECEPTIONIST",
    label: "Receptionist",
    shortLabel: "Receptionist",
  },

];


/* =========================================
   LOCAL STORAGE KEYS
========================================= */

const SAVED_USERNAME_KEY =
  "esm-saved-username";

const SAVED_PASSWORD_KEY =
  "esm-saved-password";

const REMEMBER_LOGIN_KEY =
  "esm-remember-login";

const SAVED_ROLE_KEY =
  "esm-saved-role";


/* =========================================
   COMPONENT
========================================= */

function Login({
  onLogin,
}: LoginProps) {

  const [
    selectedRole,
    setSelectedRole,
  ] = useState<UserRole | "">("");


  const [
    username,
    setUsername,
  ] = useState("");


  const [
    password,
    setPassword,
  ] = useState("");


  const [
    showPassword,
    setShowPassword,
  ] = useState(false);


  const [
    rememberLogin,
    setRememberLogin,
  ] = useState(false);


  const [
    error,
    setError,
  ] = useState("");


  const [
    isLoading,
    setIsLoading,
  ] = useState(false);


  /* =========================================
     LOAD SAVED LOGIN
  ========================================= */

  useEffect(() => {

    const savedUsername =
      localStorage.getItem(
        SAVED_USERNAME_KEY
      );

    const savedPassword =
      localStorage.getItem(
        SAVED_PASSWORD_KEY
      );

    const savedRemember =
      localStorage.getItem(
        REMEMBER_LOGIN_KEY
      );

    const savedRole =
      localStorage.getItem(
        SAVED_ROLE_KEY
      );


    if (savedRemember === "true") {

      setRememberLogin(true);

    }


    if (savedUsername) {

      setUsername(
        savedUsername
      );

    }


    if (
      savedPassword &&
      savedRemember === "true"
    ) {

      setPassword(
        savedPassword
      );

    }


    if (
      savedRole &&
      roles.some(
        (role) =>
          role.value === savedRole
      )
    ) {

      setSelectedRole(
        savedRole as UserRole
      );

    }

  }, []);


  /* =========================================
     SAVE / CLEAR REMEMBERED LOGIN
  ========================================= */

  const saveLoginDetails = () => {

    if (!rememberLogin) {

      localStorage.removeItem(
        SAVED_USERNAME_KEY
      );

      localStorage.removeItem(
        SAVED_PASSWORD_KEY
      );

      localStorage.removeItem(
        SAVED_ROLE_KEY
      );

      localStorage.setItem(
        REMEMBER_LOGIN_KEY,
        "false"
      );

      return;
    }


    localStorage.setItem(
      SAVED_USERNAME_KEY,
      username.trim()
    );


    localStorage.setItem(
      SAVED_PASSWORD_KEY,
      password
    );


    localStorage.setItem(
      SAVED_ROLE_KEY,
      selectedRole
    );


    localStorage.setItem(
      REMEMBER_LOGIN_KEY,
      "true"
    );

  };


  /* =========================================
     LOGIN
  ========================================= */

  const handleLogin = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError("");


    /* -------------------------------
       ROLE VALIDATION
    -------------------------------- */

    if (!selectedRole) {

      setError(
        "Please select your login role."
      );

      return;
    }


    /* -------------------------------
       USERNAME VALIDATION
    -------------------------------- */

    if (!username.trim()) {

      setError(
        "Please enter your username."
      );

      return;
    }


    /* -------------------------------
       PASSWORD VALIDATION
    -------------------------------- */

    if (!password) {

      setError(
        "Please enter your password."
      );

      return;
    }


    setIsLoading(true);


    try {

      const response =
        await fetch(
          "http://localhost:5000/api/auth/login",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({

                username:
                  username.trim(),

                password,

              }),

          }
        );


      let data:
        LoginResponse;


      try {

        data =
          await response.json();

      } catch {

        setError(
          "The server returned an invalid response."
        );

        return;
      }


      /* -------------------------------
         LOGIN FAILED
      -------------------------------- */

      if (
        !response.ok ||
        !data.success ||
        !data.user
      ) {

        setError(
          data.message ||
          "Invalid username or password."
        );

        return;
      }


      /* -------------------------------
         ROLE VERIFICATION
      -------------------------------- */

      if (
        data.user.role_name !==
        selectedRole
      ) {

        setError(
          "The selected role does not match this account."
        );

        return;
      }


      /* -------------------------------
         SAVE LOGIN
      -------------------------------- */

      saveLoginDetails();


      /* -------------------------------
         CREATE FRONTEND USER
      -------------------------------- */

      const loggedInUser:
        User = {

        id:
          data.user.id,

        name:
          data.user.full_name,

        username:
          data.user.username,

        role:
          data.user.role_name as UserRole,

        active:
          true,

      };


      /* -------------------------------
         SEND USER TO APP
      -------------------------------- */

      onLogin(
        loggedInUser
      );

    } catch (requestError) {

      console.error(
        "Login request failed:",
        requestError
      );


      setError(
        "Unable to connect to the backend server. Please make sure the backend is running."
      );

    } finally {

      setIsLoading(false);

    }

  };


  /* =========================================
     FORGOT PASSWORD
  ========================================= */

  const handleForgotPassword = () => {

    setError(
      "Please contact the Administrator to reset your password."
    );

  };


  /* =========================================
     UI
  ========================================= */

  return (

    <main className="modern-login-screen">

      {/* -------------------------------------
          BACKGROUND DECORATION
      -------------------------------------- */}

      <div className="login-background-shape login-shape-one" />

      <div className="login-background-shape login-shape-two" />

      <div className="login-background-shape login-shape-three" />


      {/* -------------------------------------
          MAIN LOGIN CONTAINER
      -------------------------------------- */}

      <div className="modern-login-shell">


        {/* =================================
            BRAND PANEL
        ================================== */}

        <section className="login-brand-panel">

          <div className="login-brand-top">

            <div className="login-brand-mark">
              ESM
            </div>

            <div>

              <span className="login-brand-mini">
                GOVERNMENT REST HOUSE
              </span>

              <h1>
                ESM REST HOUSE
              </h1>

            </div>

          </div>


          <div className="login-brand-main">

            <span className="login-brand-overline">
              SECURE MANAGEMENT PORTAL
            </span>

            <h2>
              Accommodation
              <br />
              made simple.
            </h2>

            <p>
              Manage bookings, rooms, beds,
              guest arrivals, departures and
              housekeeping from one secure
              platform.
            </p>


            <div className="login-brand-features">

              <div className="login-feature">

                <span className="login-feature-icon">
                  ✓
                </span>

                <div>

                  <strong>
                    Centralized Management
                  </strong>

                  <small>
                    One system for the entire
                    rest house operation.
                  </small>

                </div>

              </div>


              <div className="login-feature">

                <span className="login-feature-icon">
                  ◆
                </span>

                <div>

                  <strong>
                    Role-Based Access
                  </strong>

                  <small>
                    Access is controlled according
                    to your official responsibility.
                  </small>

                </div>

              </div>


              <div className="login-feature">

                <span className="login-feature-icon">
                  ↗
                </span>

                <div>

                  <strong>
                    Live Room Management
                  </strong>

                  <small>
                    Monitor room and bed availability
                    in real time.
                  </small>

                </div>

              </div>

            </div>

          </div>


          <div className="login-brand-footer">

            <span>
              ESM Rest House • Pune
            </span>

            <span>
              Authorized Personnel
            </span>

          </div>

        </section>


        {/* =================================
            LOGIN PANEL
        ================================== */}

        <section className="modern-login-panel">


          <div className="login-panel-header">

            <div className="login-panel-icon">
              →
            </div>

            <div>

              <span>
                SECURE ACCESS
              </span>

              <h2>
                Welcome back
              </h2>

              <p>
                Sign in to continue to the
                management portal.
              </p>

            </div>

          </div>


          {/* ---------------------------------
              ERROR
          ---------------------------------- */}

          {error && (

            <div
              className="modern-login-error"
              role="alert"
            >

              <span className="login-error-icon">
                !
              </span>

              <div>

                <strong>
                  Unable to sign in
                </strong>

                <p>
                  {error}
                </p>

              </div>

            </div>

          )}


          {/* ---------------------------------
              FORM
          ---------------------------------- */}

          <form
            className="modern-login-form"
            onSubmit={handleLogin}
          >


            {/* ROLE */}

            <div className="modern-form-group">

              <label htmlFor="role">
                Login As
              </label>

              <div className="modern-input-wrapper">

                <span className="modern-input-icon">
                  ◉
                </span>

                <select
                  id="role"
                  value={selectedRole}
                  onChange={(event) => {

                    setSelectedRole(
                      event.target.value as UserRole
                    );

                    setError("");

                  }}
                  disabled={isLoading}
                  required
                >

                  <option value="">
                    Select your official role
                  </option>

                  {roles.map(
                    (role) => (

                      <option
                        key={
                          role.value
                        }
                        value={
                          role.value
                        }
                      >
                        {
                          role.label
                        }
                      </option>

                    )
                  )}

                </select>

              </div>

            </div>


            {/* USERNAME */}

            <div className="modern-form-group">

              <div className="modern-label-row">

                <label htmlFor="username">
                  Username
                </label>

                {username && (

                  <button
                    type="button"
                    className="clear-field-button"
                    onClick={() => {

                      setUsername("");

                      if (!rememberLogin) {

                        localStorage.removeItem(
                          SAVED_USERNAME_KEY
                        );

                      }

                    }}
                    tabIndex={-1}
                  >
                    Clear
                  </button>

                )}

              </div>


              <div className="modern-input-wrapper">

                <span className="modern-input-icon">
                  @
                </span>

                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(event) => {

                    setUsername(
                      event.target.value
                    );

                    setError("");

                  }}
                  autoComplete="username"
                  disabled={isLoading}
                  autoFocus
                  required
                />

              </div>

            </div>


            {/* PASSWORD */}

            <div className="modern-form-group">

              <label htmlFor="password">
                Password
              </label>


              <div className="modern-input-wrapper">

                <span className="modern-input-icon">
                  •••
                </span>

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => {

                    setPassword(
                      event.target.value
                    );

                    setError("");

                  }}
                  autoComplete="current-password"
                  disabled={isLoading}
                  required
                />


                <button
                  type="button"
                  className="password-toggle-button"
                  onClick={() =>
                    setShowPassword(
                      (current) =>
                        !current
                    )
                  }
                  disabled={isLoading}
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >

                  {showPassword
                    ? "Hide"
                    : "Show"}

                </button>

              </div>

            </div>


            {/* REMEMBER OPTIONS */}

            <div className="login-options">

              <label className="remember-login">

                <input
                  type="checkbox"
                  checked={
                    rememberLogin
                  }
                  onChange={(event) => {

                    const checked =
                      event.target.checked;

                    setRememberLogin(
                      checked
                    );


                    if (!checked) {

                      localStorage.removeItem(
                        SAVED_USERNAME_KEY
                      );

                      localStorage.removeItem(
                        SAVED_PASSWORD_KEY
                      );

                      localStorage.removeItem(
                        SAVED_ROLE_KEY
                      );

                      localStorage.setItem(
                        REMEMBER_LOGIN_KEY,
                        "false"
                      );

                    }

                  }}
                  disabled={isLoading}
                />

                <span className="custom-checkbox">
                  ✓
                </span>

                <span>
                  Remember me
                </span>

              </label>


              <button
                type="button"
                className="forgot-password-modern"
                onClick={
                  handleForgotPassword
                }
                disabled={isLoading}
              >
                Forgot password?
              </button>

            </div>


            {/* SECURITY NOTE */}

            {rememberLogin && (

              <div className="remember-note">

                <span>
                  🔒
                </span>

                <p>
                  Your login details will be
                  remembered on this computer.
                </p>

              </div>

            )}


            {/* SIGN IN */}

            <button
              type="submit"
              className="modern-login-button"
              disabled={isLoading}
            >

              {isLoading ? (

                <>

                  <span className="login-spinner" />

                  <span>
                    Signing in...
                  </span>

                </>

              ) : (

                <>

                  <span>
                    Sign in securely
                  </span>

                  <span className="login-button-arrow">
                    →
                  </span>

                </>

              )}

            </button>


          </form>


          {/* ---------------------------------
              FOOTER
          ---------------------------------- */}

          <div className="modern-login-panel-footer">

            <div>

              <span className="security-dot" />

              Secure connection

            </div>

            <span>
              Version 0.1.0
            </span>

          </div>


        </section>

      </div>


      {/* -------------------------------------
          COPYRIGHT
      -------------------------------------- */}

      <div className="modern-login-copyright">

        ESM REST HOUSE • PUNE
        <span />
        BOOKING &amp; MANAGEMENT SYSTEM
        <span />
        © 2026

      </div>

    </main>

  );
}


export default Login;