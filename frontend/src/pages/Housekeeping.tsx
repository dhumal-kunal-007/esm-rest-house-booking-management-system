import {
  useCallback,
  useEffect,
  useState,
} from "react";

import "../App.css";


/* =========================================
   TYPES
========================================= */

interface HousekeepingTask {

  id: string;

  task_status: string;

  room_id: string;

  room_number: string;

  bed_id: string | null;

  bed_number: number | null;

  guest_id: string | null;

  guest_name: string | null;

  allotted_by_name: string | null;

  assigned_to_name: string | null;

  created_at: string;

  updated_at: string | null;

}


/* =========================================
   PROPS
========================================= */

interface HousekeepingProps {

  userId: string;

  userName: string;

  userRole: string;

  onBack: () => void;

}


/* =========================================
   HOUSEKEEPING
========================================= */

function Housekeeping({
  userId,
  userName,
  userRole,
  onBack,
}: HousekeepingProps) {


  /* =========================================
     STATE
  ========================================= */

  const [
    tasks,
    setTasks,
  ] = useState<HousekeepingTask[]>([]);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    actionLoading,
    setActionLoading,
  ] = useState<string | null>(null);


  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");


  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");


  const [
    confirmation,
    setConfirmation,
  ] = useState<{
    task: HousekeepingTask;
    action: "assign" | "complete";
  } | null>(null);


  /* =========================================
     LOAD TASKS
  ========================================= */

  const loadTasks = useCallback(
    async () => {

      setLoading(true);

      setErrorMessage("");

      try {

        const response =
          await fetch(
            "http://localhost:5000/api/housekeeping/tasks"
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Unable to load housekeeping tasks."
          );

        }


        setTasks(
          Array.isArray(data.tasks)
            ? data.tasks
            : []
        );

      } catch (error) {

        console.error(
          "Housekeeping task loading error:",
          error
        );


        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load housekeeping tasks. Please make sure the backend is running."
        );

      } finally {

        setLoading(false);

      }

    },
    []
  );


  /* =========================================
     INITIAL LOAD
  ========================================= */

  useEffect(() => {

    loadTasks();

  }, [loadTasks]);


  /* =========================================
     CLEAR MESSAGES
  ========================================= */

  useEffect(() => {

    if (!successMessage) {

      return;

    }


    const timer =
      window.setTimeout(() => {

        setSuccessMessage("");

      }, 4000);


    return () => {

      window.clearTimeout(timer);

    };

  }, [successMessage]);


  /* =========================================
     REQUEST ACTION
  ========================================= */

  const requestAction = (
    task: HousekeepingTask,
    action: "assign" | "complete"
  ) => {

    setErrorMessage("");

    setSuccessMessage("");

    setConfirmation({
      task,
      action,
    });

  };


  /* =========================================
     PERFORM ACTION
  ========================================= */

  const performAction = async () => {

    if (!confirmation) {

      return;

    }


    const {
      task,
      action,
    } = confirmation;


    setActionLoading(
      task.id
    );


    setErrorMessage("");

    setSuccessMessage("");


    try {

      const endpoint =
        action === "assign"
          ? `http://localhost:5000/api/housekeeping/${task.id}/assign`
          : `http://localhost:5000/api/housekeeping/${task.id}/complete`;


      const body =
        action === "assign"
          ? {
              assigned_to:
                userId,
            }
          : {
              completed_by:
                userId,
            };


      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                body
              ),
          }
        );


      const data =
        await response.json();


      if (!response.ok) {

        throw new Error(
          data.message ||
          "The housekeeping action could not be completed."
        );

      }


      setConfirmation(
        null
      );


      if (action === "assign") {

        setSuccessMessage(
          `Room ${task.room_number}${task.bed_number ? `, Bed ${task.bed_number}` : ""} has been assigned to housekeeping.`
        );

      } else {

        setSuccessMessage(
          `Cleaning completed for Room ${task.room_number}${task.bed_number ? `, Bed ${task.bed_number}` : ""}. The bed is now available.`
        );

      }


      await loadTasks();

    } catch (error) {

      console.error(
        "Housekeeping action error:",
        error
      );


      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to complete the housekeeping action."
      );

    } finally {

      setActionLoading(
        null
      );

    }

  };


  /* =========================================
     STATUS LABEL
  ========================================= */

  const getStatusLabel = (
    status: string
  ) => {

    switch (
      status.toUpperCase()
    ) {

      case "NEEDS CLEANING":

        return "WAITING FOR HOUSEKEEPING";


      case "CLEANING":

        return "CLEANING IN PROGRESS";


      case "CLEARED":

        return "CLEANING COMPLETED";


      default:

        return status;

    }

  };


  /* =========================================
     STATUS CLASS
  ========================================= */

  const getStatusClass = (
    status: string
  ) => {

    switch (
      status.toUpperCase()
    ) {

      case "NEEDS CLEANING":

        return "housekeeping-status-needs";


      case "CLEANING":

        return "housekeeping-status-cleaning";


      case "CLEARED":

        return "housekeeping-status-cleared";


      default:

        return "housekeeping-status-default";

    }

  };


  /* =========================================
     DATE FORMAT
  ========================================= */

  const formatDate = (
    value: string
  ) => {

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


    return date.toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );

  };


  /* =========================================
     COUNTS
  ========================================= */

  const waitingCount =
    tasks.filter(
      (task) =>
        task.task_status.toUpperCase() ===
        "NEEDS CLEANING"
    ).length;


  const cleaningCount =
    tasks.filter(
      (task) =>
        task.task_status.toUpperCase() ===
        "CLEANING"
    ).length;


  const completedCount =
    tasks.filter(
      (task) =>
        task.task_status.toUpperCase() ===
        "CLEARED"
    ).length;


  /* =========================================
     RENDER
  ========================================= */

  return (

    <main className="dashboard-screen">


      {/* =====================================
          HEADER
      ===================================== */}

      <header className="dashboard-header">

        <div className="dashboard-brand">

          <button
            type="button"
            className="housekeeping-back-button"
            onClick={onBack}
          >
            ← Back
          </button>


          <div className="dashboard-logo">
            ESM
          </div>


          <div>

            <h1>
              ESM REST HOUSE
            </h1>

            <p>
              Housekeeping Management
            </p>

          </div>

        </div>


        <div className="dashboard-user">

          <div className="user-info">

            <strong>
              {userName}
            </strong>

            <span>
              {userRole}
            </span>

          </div>

        </div>

      </header>


      {/* =====================================
          CONTENT
      ===================================== */}

      <section className="dashboard-content">


        {/* PAGE TITLE */}

        <div className="dashboard-title">

          <div>

            <h2>
              Housekeeping
            </h2>

            <p>
              Manage rooms and beds waiting for
              cleaning after guest checkout.
            </p>

          </div>


          <button
            type="button"
            className="housekeeping-refresh-button"
            onClick={loadTasks}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>

        </div>


        {/* ===================================
            MESSAGE
        =================================== */}

        {errorMessage && (

          <div className="housekeeping-message housekeeping-error">

            <strong>
              Action Required
            </strong>

            <span>
              {errorMessage}
            </span>

          </div>

        )}


        {successMessage && (

          <div className="housekeeping-message housekeeping-success">

            <strong>
              Success
            </strong>

            <span>
              {successMessage}
            </span>

          </div>

        )}


        {/* ===================================
            SUMMARY CARDS
        =================================== */}

        <div className="dashboard-cards">


          <div className="stat-card">

            <span>
              Waiting for Housekeeping
            </span>

            <strong>
              {waitingCount}
            </strong>

          </div>


          <div className="stat-card">

            <span>
              Cleaning in Progress
            </span>

            <strong>
              {cleaningCount}
            </strong>

          </div>


          <div className="stat-card">

            <span>
              Cleaning Completed
            </span>

            <strong>
              {completedCount}
            </strong>

          </div>


          <div className="stat-card">

            <span>
              Total Tasks
            </span>

            <strong>
              {tasks.length}
            </strong>

          </div>

        </div>


        {/* ===================================
            HOUSEKEEPING PANEL
        =================================== */}

        <div className="dashboard-panel housekeeping-panel">

          <div className="panel-heading">

            <div>

              <h3>
                Housekeeping Tasks
              </h3>

              <p>
                Rooms and beds requiring
                housekeeping attention.
              </p>

            </div>

          </div>


          {/* LOADING */}

          {loading ? (

            <div className="housekeeping-empty">

              <div className="housekeeping-spinner">
              </div>

              <p>
                Loading housekeeping tasks...
              </p>

            </div>

          ) : tasks.length === 0 ? (

            /* NO TASKS */

            <div className="housekeeping-empty">

              <div className="housekeeping-empty-icon">
                ✓
              </div>

              <h4>
                No Pending Housekeeping Tasks
              </h4>

              <p>
                All rooms and beds are currently
                clear for use.
              </p>

            </div>

          ) : (

            /* TASK LIST */

            <div className="housekeeping-table-wrapper">

              <div className="housekeeping-table">


                {/* TABLE HEADER */}

                <div className="housekeeping-row housekeeping-table-header">

                  <span>
                    Room / Bed
                  </span>

                  <span>
                    Guest
                  </span>

                  <span>
                    Status
                  </span>

                  <span>
                    Task Created
                  </span>

                  <span>
                    Action
                  </span>

                </div>


                {/* TASKS */}

                {tasks.map(
                  (task) => (

                    <div
                      key={
                        task.id
                      }
                      className="housekeeping-row"
                    >


                      {/* ROOM / BED */}

                      <div className="housekeeping-room-cell">

                        <strong>
                          {task.room_number}
                        </strong>

                        {task.bed_number ? (

                          <span>
                            Bed {task.bed_number}
                          </span>

                        ) : (

                          <span>
                            Room
                          </span>

                        )}

                      </div>


                      {/* GUEST */}

                      <div className="housekeeping-guest-cell">

                        <strong>
                          {task.guest_name ||
                            "Guest information unavailable"}
                        </strong>

                        {task.allotted_by_name && (

                          <span>
                            Allotted by{" "}
                            {task.allotted_by_name}
                          </span>

                        )}

                      </div>


                      {/* STATUS */}

                      <div>

                        <span
                          className={`housekeeping-status ${getStatusClass(
                            task.task_status
                          )}`}
                        >
                          {getStatusLabel(
                            task.task_status
                          )}
                        </span>


                        {task.assigned_to_name && (

                          <small className="housekeeping-assigned-text">

                            Assigned to{" "}
                            {task.assigned_to_name}

                          </small>

                        )}

                      </div>


                      {/* DATE */}

                      <div className="housekeeping-date-cell">

                        {formatDate(
                          task.created_at
                        )}

                      </div>


                      {/* ACTION */}

                      <div className="housekeeping-action-cell">


                        {task.task_status.toUpperCase() ===
                          "NEEDS CLEANING" && (

                          <button
                            type="button"
                            className="housekeeping-action-button housekeeping-assign-button"
                            onClick={() =>
                              requestAction(
                                task,
                                "assign"
                              )
                            }
                            disabled={
                              actionLoading ===
                              task.id
                            }
                          >
                            {actionLoading ===
                            task.id
                              ? "Processing..."
                              : "Assign to Housekeeping"}
                          </button>

                        )}


                        {task.task_status.toUpperCase() ===
                          "CLEANING" && (

                          <button
                            type="button"
                            className="housekeeping-action-button housekeeping-complete-button"
                            onClick={() =>
                              requestAction(
                                task,
                                "complete"
                              )
                            }
                            disabled={
                              actionLoading ===
                              task.id
                            }
                          >
                            {actionLoading ===
                            task.id
                              ? "Processing..."
                              : "Cleaning Completed"}
                          </button>

                        )}


                        {task.task_status.toUpperCase() ===
                          "CLEARED" && (

                          <span className="housekeeping-completed-label">
                            ✓ Completed
                          </span>

                        )}

                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          )}

        </div>


        {/* ===================================
            WORKFLOW INFORMATION
        =================================== */}

        <div className="dashboard-panel housekeeping-workflow-panel">

          <h3>
            Housekeeping Workflow
          </h3>


          <div className="housekeeping-workflow">


            <div className="workflow-step">

              <div className="workflow-number">
                1
              </div>

              <div>

                <strong>
                  Guest Checks Out
                </strong>

                <p>
                  The room/bed becomes
                  <b> RED — Needs Cleaning</b>.
                </p>

              </div>

            </div>


            <div className="workflow-arrow">
              →
            </div>


            <div className="workflow-step">

              <div className="workflow-number">
                2
              </div>

              <div>

                <strong>
                  Assign to Housekeeping
                </strong>

                <p>
                  Receptionist changes the
                  status to <b>YELLOW — Cleaning
                  in Progress</b>.
                </p>

              </div>

            </div>


            <div className="workflow-arrow">
              →
            </div>


            <div className="workflow-step">

              <div className="workflow-number">
                3
              </div>

              <div>

                <strong>
                  Cleaning Completed
                </strong>

                <p>
                  Receptionist completes the
                  task and the bed becomes
                  <b> GREEN — Available</b>.
                </p>

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =====================================
          CONFIRMATION PANEL
      ===================================== */}

      {confirmation && (

        <div className="housekeeping-confirmation-overlay">

          <div className="housekeeping-confirmation-card">


            <div className="housekeeping-confirmation-icon">
              ?
            </div>


            <h3>

              {confirmation.action === "assign"
                ? "Assign Room to Housekeeping?"
                : "Complete Cleaning?"}

            </h3>


            <p>

              {confirmation.action === "assign"
                ? `Room ${confirmation.task.room_number}${
                    confirmation.task.bed_number
                      ? `, Bed ${confirmation.task.bed_number}`
                      : ""
                  } will be marked as Cleaning in Progress.`
                : `Room ${confirmation.task.room_number}${
                    confirmation.task.bed_number
                      ? `, Bed ${confirmation.task.bed_number}`
                      : ""
                  } will be marked as Available after cleaning is completed.`}

            </p>


            <div className="housekeeping-confirmation-details">

              <div>

                <span>
                  Room
                </span>

                <strong>
                  {confirmation.task.room_number}
                </strong>

              </div>


              {confirmation.task.bed_number && (

                <div>

                  <span>
                    Bed
                  </span>

                  <strong>
                    {confirmation.task.bed_number}
                  </strong>

                </div>

              )}


              <div>

                <span>
                  Guest
                </span>

                <strong>
                  {confirmation.task.guest_name ||
                    "—"}
                </strong>

              </div>

            </div>


            <div className="housekeeping-confirmation-actions">

              <button
                type="button"
                className="housekeeping-cancel-button"
                onClick={() =>
                  setConfirmation(
                    null
                  )
                }
                disabled={
                  actionLoading !== null
                }
              >
                Cancel
              </button>


              <button
                type="button"
                className="housekeeping-confirm-button"
                onClick={
                  performAction
                }
                disabled={
                  actionLoading !== null
                }
              >
                {actionLoading
                  ? "Processing..."
                  : confirmation.action === "assign"
                    ? "Assign to Housekeeping"
                    : "Confirm Cleaning Completed"}
              </button>

            </div>

          </div>

        </div>

      )}

    </main>

  );

}


export default Housekeeping;