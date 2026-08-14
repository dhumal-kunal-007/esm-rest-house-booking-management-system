import { useState } from "react";
import "../App.css";
import type { User, UserRole } from "../App";

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
}

const roles: UserRole[] = [
  "Super Admin",
  "AC Officer",
  "Non-AC Officer",
  "Dormitory Officer",
  "VIP Officer",
];

function Login({
  users,
  onLogin,
}: LoginProps) {
  const [selectedRole, setSelectedRole] =
    useState<UserRole | "">("");

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const handleLogin = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    if (!selectedRole) {
      setError("Please select your login role.");
      return;
    }

    const user = users.find(
      (account) =>
        account.username === username &&
        account.password === password &&
        account.role === selectedRole &&
        account.active
    );

    if (!user) {
      setError(
        "Invalid credentials or incorrect role."
      );
      return;
    }

    onLogin(user);
  };

  return (
    <main className="login-screen">

      <div className="login-card">

        <div className="login-emblem">
          <span>ESM</span>
        </div>

        <div className="login-header">
          <h1>WELCOME BACK</h1>

          <p>
            ESM Rest House Booking &amp;
            Management System
          </p>

          <span>PUNE</span>
        </div>

        <form
          className="login-form"
          onSubmit={handleLogin}
        >

          <div className="form-group">

            <label htmlFor="role">
              Login As
            </label>

            <select
              id="role"
              value={selectedRole}
              onChange={(event) => {
                setSelectedRole(
                  event.target.value as UserRole
                );

                setError("");
              }}
              required
            >
              <option value="">
                Select your role
              </option>

              {roles.map((role) => (
                <option
                  key={role}
                  value={role}
                >
                  {role}
                </option>
              ))}
            </select>

          </div>

          <div className="form-group">

            <label htmlFor="username">
              Username
            </label>

            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              autoComplete="username"
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="password">
              Password
            </label>

            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              required
            />

          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
          >
            SIGN IN
          </button>

          <button
            type="button"
            className="forgot-password"
            onClick={() =>
              setError(
                "Please contact the Super Admin to reset your password."
              )
            }
          >
            Forgot Password?
          </button>

        </form>

        <div className="login-footer">
          <span>
            Authorized Personnel Only
          </span>

          <span>
            Version 0.1.0
          </span>
        </div>

      </div>

    </main>
  );
}

export default Login;