import {
  useEffect,
  useState,
} from "react";

import "../App.css";

import type {
  User,
  UserRole,
} from "../App";


/* =================================
   PROPS
================================== */

interface CreateUserProps {

  users: User[];

  onCreateUser: (
    user: User
  ) => void;

  onDeleteUser: (
    userId: string
  ) => void;

  currentUserId?: string;

  onBack: () => void;

}


/* =================================
   AVAILABLE ROLES
================================== */

const roles: {
  value: UserRole;
  label: string;
}[] = [

  {
    value: "ADMIN",
    label: "Administrator",
  },

  {
    value: "DY_DIRECTOR",
    label: "Deputy Director",
  },

  {
    value: "SUPERINTENDENT",
    label: "Superintendent",
  },

  {
    value: "WELFARE_ORGANISER",
    label: "Welfare Organizer",
  },

  {
    value: "OLC_REST_HOUSE_MANAGER",
    label: "OLC Rest House Manager",
  },

  {
    value: "RECEPTIONIST",
    label: "Receptionist",
  },

];


/* =================================
   ROLE LABEL
================================== */

const getRoleLabel = (
  role: UserRole
): string => {

  const foundRole =
    roles.find(
      (roleOption) =>
        roleOption.value === role
    );

  return (
    foundRole?.label ||
    role
  );

};


/* =================================
   COMPONENT
================================== */

function CreateUser({
  users,
  onCreateUser,
  onDeleteUser,
  currentUserId,
  onBack,
}: CreateUserProps) {


  /* =================================
     FORM STATE
  ================================== */

  const [
    name,
    setName,
  ] = useState("");

  const [
    username,
    setUsername,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    role,
    setRole,
  ] = useState<UserRole>(
    "RECEPTIONIST"
  );

  const [
    error,
    setError,
  ] = useState("");

  const [
    creatingUser,
    setCreatingUser,
  ] = useState(false);

  const [
    removingUserId,
    setRemovingUserId,
  ] = useState<string | null>(
    null
  );


  /* =================================
     LOCAL DATABASE USERS
  ================================== */

  const [
    databaseUsers,
    setDatabaseUsers,
  ] = useState<User[]>([]);

  const [
    loadingUsers,
    setLoadingUsers,
  ] = useState(true);


  /* =================================
     LOAD USERS FROM POSTGRESQL
  ================================== */

  const loadUsers =
    async () => {

      try {

        setLoadingUsers(
          true
        );

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


        const loadedUsers:
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


        setDatabaseUsers(
          loadedUsers
        );


      } catch (loadError) {

        console.error(
          "Failed to load users:",
          loadError
        );

        setDatabaseUsers(
          users
        );

      } finally {

        setLoadingUsers(
          false
        );

      }

    };


  /* =================================
     LOAD USERS WHEN PAGE OPENS
  ================================== */

  useEffect(() => {

    loadUsers();

  }, []);


  /* =================================
     KEEP DATABASE USER LIST IN SYNC
  ================================== */

  useEffect(() => {

    if (
      users.length > 0
    ) {

      setDatabaseUsers(
        (currentUsers) => {

          if (
            currentUsers.length > 0
          ) {

            return currentUsers;

          }

          return users;

        }
      );

    }

  }, [users]);


  /* =================================
     CREATE USER
  ================================== */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {

    event.preventDefault();

    setError("");


    /* =================================
       VALIDATE NAME
    ================================= */

    if (!name.trim()) {

      setError(
        "Please enter the full name."
      );

      return;

    }


    /* =================================
       VALIDATE USERNAME
    ================================= */

    if (!username.trim()) {

      setError(
        "Please enter a username."
      );

      return;

    }


    /* =================================
       CHECK USERNAME
    ================================= */

    const usernameExists =
      databaseUsers.some(
        (user) =>
          user.username
            .toLowerCase() ===
          username
            .trim()
            .toLowerCase()
      );


    if (usernameExists) {

      setError(
        "This username already exists."
      );

      return;

    }


    /* =================================
       PASSWORD
    ================================= */

    if (
      password.length < 6
    ) {

      setError(
        "Password must contain at least 6 characters."
      );

      return;

    }


    /* =================================
       PREVENT DOUBLE SUBMIT
    ================================= */

    if (
      creatingUser
    ) {

      return;

    }


    setCreatingUser(
      true
    );


    /* =================================
       CREATE IN POSTGRESQL
    ================================= */

    try {

      const response =
        await fetch(
          "http://localhost:5000/api/users",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({

              name:
                name.trim(),

              username:
                username.trim(),

              password,

              role,

            }),

          }
        );


      const data =
        await response.json();


      if (
        !response.ok
      ) {

        setError(
          data.message ||
          "Failed to create user."
        );

        return;

      }


      if (
        !data.user
      ) {

        setError(
          "User was created, but no user data was returned."
        );

        return;

      }


      /* =================================
         CREATED USER
      ================================== */

      const createdUser:
        User = {

        id:
          data.user.id,

        name:
          data.user.name,

        username:
          data.user.username,

        role:
          data.user.role as UserRole,

        active:
          data.user.active,

      };


      /* =================================
         UPDATE LIST
      ================================== */

      setDatabaseUsers(
        (currentUsers) => [

          ...currentUsers,

          createdUser,

        ]
      );


      onCreateUser(
        createdUser
      );


      /* =================================
         CLEAR FORM
      ================================== */

      setName("");

      setUsername("");

      setPassword("");

      setRole(
        "RECEPTIONIST"
      );

      setError("");


      window.alert(
        `User "${createdUser.username}" has been created successfully.`
      );


    } catch (createError) {

      console.error(
        "Create user error:",
        createError
      );


      setError(
        "Unable to connect to the backend. Please make sure the ESM Rest House backend is running."
      );

    } finally {

      setCreatingUser(
        false
      );

    }

  };


  /* =================================
     DEACTIVATE USER
  ================================== */

  const handleDeleteUser = (
    user: User
  ) => {

    setError("");


    if (
      currentUserId &&
      user.id === currentUserId
    ) {

      setError(
        "You cannot delete the currently logged-in user."
      );

      return;

    }


    if (
      !user.active
    ) {

      setError(
        "This user is already inactive."
      );

      return;

    }


    const confirmed =
      window.confirm(
        `Are you sure you want to deactivate the user "${user.name}" (${user.username})?\n\nThe user will no longer be able to log in. Existing booking and approval history will be preserved.`
      );


    if (!confirmed) {

      return;

    }


    onDeleteUser(
      user.id
    );


    setDatabaseUsers(
      (currentUsers) =>
        currentUsers.map(
          (currentUser) =>
            currentUser.id ===
            user.id
              ? {
                  ...currentUser,
                  active:
                    false,
                }
              : currentUser
        )
    );

  };


  /* =================================
     PERMANENTLY REMOVE USER
  ================================== */

  const handlePermanentRemove = async (
    user: User
  ) => {

    setError("");


    /* =================================
       ADMIN SELF-PROTECTION
    ================================== */

    if (
      currentUserId &&
      user.id === currentUserId
    ) {

      setError(
        "You cannot permanently remove the currently logged-in user."
      );

      return;

    }


    /* =================================
       ONLY INACTIVE USERS
    ================================== */

    if (
      user.active
    ) {

      setError(
        "Only inactive users can be permanently removed."
      );

      return;

    }


    /* =================================
       FIRST CONFIRMATION
    ================================== */

    const confirmed =
      window.confirm(
        `PERMANENTLY REMOVE USER?\n\nUser: ${user.name}\nUsername: ${user.username}\nRole: ${getRoleLabel(user.role)}\n\nThis action will permanently remove the account from PostgreSQL and cannot be undone.\n\nDo you want to continue?`
      );


    if (!confirmed) {

      return;

    }


    /* =================================
       SECOND CONFIRMATION
    ================================== */

    const finalConfirmation =
      window.confirm(
        `FINAL CONFIRMATION\n\nPermanently remove "${user.username}"?\n\nClick OK only if you are absolutely sure.`
      );


    if (!finalConfirmation) {

      return;

    }


    setRemovingUserId(
      user.id
    );


    /* =================================
       BACKEND REQUEST
    ================================== */

    try {

      const response =
        await fetch(
          `http://localhost:5000/api/users/${user.id}/permanent`,
          {
            method: "DELETE",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              adminUserId:
                currentUserId,
            }),

          }
        );


      const data =
        await response.json();


      /* =================================
         SERVER ERROR
      ================================== */

      if (
        !response.ok
      ) {

        setError(
          data.message ||
          "Failed to permanently remove user."
        );

        return;

      }


      /* =================================
         REMOVE FROM DISPLAY
      ================================== */

      setDatabaseUsers(
        (currentUsers) =>
          currentUsers.filter(
            (currentUser) =>
              currentUser.id !==
              user.id
          )
      );


      /* =================================
         REMOVE FROM APP STATE
      ================================== */

      /*
       * App.tsx currently stores its own
       * user list. Send the deactivated
       * user's ID through the existing
       * callback only when appropriate.
       *
       * The PostgreSQL list above is the
       * authoritative list for this page.
       */


      window.alert(
        `User "${user.username}" has been permanently removed.`
      );


    } catch (removeError) {

      console.error(
        "Permanent user removal error:",
        removeError
      );


      setError(
        "Unable to connect to the backend. Please make sure the ESM Rest House backend is running."
      );

    } finally {

      setRemovingUserId(
        null
      );

    }

  };


  /* =================================
     DISPLAY USERS
  ================================== */

  const displayUsers =
    databaseUsers.length > 0
      ? databaseUsers
      : users;


  /* =================================
     RENDER
  ================================== */

  return (

    <main className="create-user-screen">

      <div className="create-user-card">


        {/* =================================
            HEADER
        ================================== */}

        <div className="create-user-header">

          <div>

            <span className="section-label">
              ADMINISTRATOR
            </span>

            <h1>
              User Management
            </h1>

            <p>
              Create, review and deactivate
              system user accounts.
            </p>

          </div>


          <button
            type="button"
            className="back-button"
            onClick={onBack}
          >
            ← Back
          </button>

        </div>


        {/* =================================
            USER LIST
        ================================== */}

        <section
          style={{
            marginBottom:
              "32px",
          }}
        >

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              marginBottom:
                "16px",
            }}
          >

            <div>

              <h2
                style={{
                  margin: 0,
                }}
              >
                System Users
              </h2>

              <p
                style={{
                  margin:
                    "5px 0 0",
                  opacity: 0.7,
                }}
              >

                {loadingUsers
                  ? "Loading users..."
                  : `${displayUsers.length} user${
                      displayUsers.length ===
                      1
                        ? ""
                        : "s"
                    } registered`}

              </p>

            </div>

          </div>


          <div
            style={{
              display:
                "grid",
              gap:
                "12px",
            }}
          >

            {loadingUsers ? (

              <div
                style={{
                  padding:
                    "24px",
                  textAlign:
                    "center",
                  border:
                    "1px dashed #ccd2dc",
                  borderRadius:
                    "12px",
                  opacity:
                    0.7,
                }}
              >

                Loading users from
                PostgreSQL...

              </div>

            ) : displayUsers.length ===
              0 ? (

              <div
                style={{
                  padding:
                    "24px",
                  textAlign:
                    "center",
                  border:
                    "1px dashed #ccd2dc",
                  borderRadius:
                    "12px",
                  opacity:
                    0.7,
                }}
              >

                No users found.

              </div>

            ) : (

              displayUsers.map(
                (user) => (

                  <div
                    key={
                      user.id
                    }
                    style={{
                      display:
                        "grid",
                      gridTemplateColumns:
                        "minmax(180px, 1.4fr) minmax(140px, 1fr) minmax(170px, 1fr) auto",
                      gap:
                        "16px",
                      alignItems:
                        "center",
                      padding:
                        "16px 18px",
                      border:
                        "1px solid #e1e5eb",
                      borderRadius:
                        "12px",
                      background:
                        "#ffffff",
                    }}
                  >


                    {/* USER */}

                    <div>

                      <strong>
                        {
                          user.name
                        }
                      </strong>

                      <div
                        style={{
                          marginTop:
                            "4px",
                          fontSize:
                            "13px",
                          opacity:
                            0.65,
                        }}
                      >

                        @
                        {
                          user.username
                        }

                      </div>

                    </div>


                    {/* ROLE */}

                    <div>

                      <span
                        style={{
                          fontSize:
                            "13px",
                          fontWeight:
                            600,
                        }}
                      >

                        {
                          getRoleLabel(
                            user.role
                          )
                        }

                      </span>

                    </div>


                    {/* STATUS */}

                    <div>

                      <span
                        style={{
                          display:
                            "inline-flex",
                          alignItems:
                            "center",
                          padding:
                            "5px 10px",
                          borderRadius:
                            "999px",
                          fontSize:
                            "12px",
                          fontWeight:
                            700,
                          background:
                            user.active
                              ? "#eaf7ed"
                              : "#f3f3f3",
                          color:
                            user.active
                              ? "#26733b"
                              : "#777777",
                        }}
                      >

                        {
                          user.active
                            ? "ACTIVE"
                            : "INACTIVE"
                        }

                      </span>

                    </div>


                    {/* ACTION */}

                    {user.active ? (

                      <button
                        type="button"
                        onClick={() =>
                          handleDeleteUser(
                            user
                          )
                        }
                        disabled={
                          currentUserId ===
                          user.id
                        }
                        style={{
                          border:
                            "1px solid #d6a3a3",
                          background:
                            currentUserId ===
                            user.id
                              ? "#f3f3f3"
                              : "#fff5f5",
                          color:
                            currentUserId ===
                            user.id
                              ? "#999999"
                              : "#a12a2a",
                          padding:
                            "9px 14px",
                          borderRadius:
                            "8px",
                          fontWeight:
                            700,
                          fontSize:
                            "12px",
                          cursor:
                            currentUserId ===
                            user.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >

                        {
                          currentUserId ===
                          user.id
                            ? "CURRENT USER"
                            : "DELETE USER"
                        }

                      </button>

                    ) : (

                      <button
                        type="button"
                        onClick={() =>
                          handlePermanentRemove(
                            user
                          )
                        }
                        disabled={
                          removingUserId ===
                          user.id
                        }
                        style={{
                          border:
                            "1px solid #c98b8b",
                          background:
                            "#fff0f0",
                          color:
                            "#8f1d1d",
                          padding:
                            "9px 14px",
                          borderRadius:
                            "8px",
                          fontWeight:
                            700,
                          fontSize:
                            "12px",
                          cursor:
                            removingUserId ===
                            user.id
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >

                        {
                          removingUserId ===
                          user.id
                            ? "REMOVING..."
                            : "PERMANENTLY REMOVE"
                        }

                      </button>

                    )}

                  </div>

                )
              )

            )}

          </div>

        </section>


        {/* =================================
            CREATE USER
        ================================== */}

        <section>

          <div
            style={{
              marginBottom:
                "18px",
            }}
          >

            <h2
              style={{
                margin:
                  0,
              }}
            >
              Create New User
            </h2>

            <p
              style={{
                margin:
                  "5px 0 0",
                opacity:
                  0.7,
              }}
            >

              Create an account and assign
              the appropriate system role.

            </p>

          </div>


          <form
            className="create-user-form"
            onSubmit={
              handleSubmit
            }
          >


            {/* FULL NAME */}

            <div className="form-group">

              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                placeholder="Enter full name"
                value={
                  name
                }
                onChange={(
                  event
                ) =>
                  setName(
                    event.target.value
                  )
                }
                required
              />

            </div>


            {/* USERNAME */}

            <div className="form-group">

              <label htmlFor="new-username">
                Username
              </label>

              <input
                id="new-username"
                type="text"
                placeholder="Create username"
                value={
                  username
                }
                onChange={(
                  event
                ) =>
                  setUsername(
                    event.target.value
                  )
                }
                required
              />

            </div>


            {/* PASSWORD */}

            <div className="form-group">

              <label htmlFor="new-password">
                Password
              </label>

              <input
                id="new-password"
                type="password"
                placeholder="Create password"
                value={
                  password
                }
                onChange={(
                  event
                ) =>
                  setPassword(
                    event.target.value
                  )
                }
                required
              />

            </div>


            {/* ROLE */}

            <div className="form-group">

              <label htmlFor="user-role">
                Assign Role
              </label>

              <select
                id="user-role"
                value={
                  role
                }
                onChange={(
                  event
                ) =>
                  setRole(
                    event.target.value as UserRole
                  )
                }
                required
              >

                <option value="">
                  Select role
                </option>

                {
                  roles.map(
                    (
                      roleOption
                    ) => (

                      <option
                        key={
                          roleOption.value
                        }
                        value={
                          roleOption.value
                        }
                      >

                        {
                          roleOption.label
                        }

                      </option>

                    )
                  )
                }

              </select>

            </div>


            {/* ERROR */}

            {error && (

              <div
                className="create-user-error"
              >

                {
                  error
                }

              </div>

            )}


            {/* SUBMIT */}

            <button
              type="submit"
              className="create-user-button"
              disabled={
                creatingUser
              }
            >

              {
                creatingUser
                  ? "CREATING USER..."
                  : "CREATE USER"
              }

            </button>

          </form>

        </section>

      </div>

    </main>

  );

}


export default CreateUser;