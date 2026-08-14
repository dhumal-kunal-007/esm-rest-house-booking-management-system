import { useState } from "react";
import "../App.css";
import type { User, UserRole } from "../App";

interface CreateUserProps {
  users: User[];
  onCreateUser: (user: User) => void;
  onBack: () => void;
}

const roles: UserRole[] = [
  "Super Admin",
  "AC Officer",
  "Non-AC Officer",
  "Dormitory Officer",
  "VIP Officer",
];

function CreateUser({
  users,
  onCreateUser,
  onBack,
}: CreateUserProps) {

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] =
    useState<UserRole>("AC Officer");

  const [error, setError] = useState("");

  const handleSubmit = (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");

    const usernameExists = users.some(
      (user) =>
        user.username.toLowerCase() ===
        username.toLowerCase()
    );

    if (usernameExists) {
      setError(
        "This username already exists."
      );
      return;
    }

    if (password.length < 6) {
      setError(
        "Password must contain at least 6 characters."
      );
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      username,
      password,
      role,
      active: true,
    };

    onCreateUser(newUser);
  };

  return (
    <main className="create-user-screen">

      <div className="create-user-card">

        <div className="create-user-header">

          <div>
            <span className="section-label">
              SUPER ADMIN
            </span>

            <h1>Create New User</h1>

            <p>
              Create an account and assign
              the appropriate system role.
            </p>
          </div>

          <button
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>

        </div>

        <form
          className="create-user-form"
          onSubmit={handleSubmit}
        >

          <div className="form-group">

            <label htmlFor="name">
              Full Name
            </label>

            <input
              id="name"
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="new-username">
              Username
            </label>

            <input
              id="new-username"
              type="text"
              placeholder="Create username"
              value={username}
              onChange={(event) =>
                setUsername(event.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="new-password">
              Password
            </label>

            <input
              id="new-password"
              type="password"
              placeholder="Create password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              required
            />

          </div>

          <div className="form-group">

            <label htmlFor="user-role">
              Assign Role
            </label>

            <select
              id="user-role"
              value={role}
              onChange={(event) =>
                setRole(
                  event.target.value as UserRole
                )
              }
              required
            >

              {roles.map((roleOption) => (
                <option
                  key={roleOption}
                  value={roleOption}
                >
                  {roleOption}
                </option>
              ))}

            </select>

          </div>

          {error && (
            <div className="create-user-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="create-user-button"
          >
            CREATE USER
          </button>

        </form>

      </div>

    </main>
  );
}

export default CreateUser;