import {
  useState,
} from "react";

import "../App.css";

import type {
  AccommodationCategory,
} from "../App";

/* =================================
   CONSTANTS
================================== */

const relationshipOptions = [
  "SELF",
  "WIFE",
  "SON",
  "DAUGHTER",
  "MOTHER",
  "FATHER",
] as const;

const selfIdentityProofOptions = [
  "ESM CARD",
  "WIDOW CARD",
  "ECHS CARD",
  "CSD CARD",
];

const relativeIdentityProofOptions = [
  "DEPARTMENT CARD",
  "AADHAAR CARD",
  "PAN CARD",
];

const relationshipProofOptions = [
  "DEPARTMENT CARD",
  "AADHAAR CARD",
  "PAN CARD",
];

/* =================================
   TYPES
================================== */

export interface Guest {

  id?: string;

  name: string;

  relationship: string;

  mobile: string;

  identityProofType: string;

  identityProofNumber: string;

  relationshipProofType: string;

  relationshipProofNumber: string;

  /*
   * Legacy fields retained temporarily
   * for compatibility with the existing
   * application.
   */
  aadhaar: string;

  identityProof: string;
}

/* =================================
   BOOKING DRAFT
================================== */

export interface BookingDraft {

  /*
   * PostgreSQL booking UUID.
   *
   * This is filled after the booking
   * is successfully created in the backend.
   */
  id?: string;

  category: AccommodationCategory;

  bookingType:
    | "CURRENT"
    | "ADVANCE";

  serviceman: {

    number: string;

    rank: string;

    name: string;

    address: string;

    identityNo: string;

  };

  guests: Guest[];

  checkIn: string;

  checkOut: string;

  payment: {

    mode: string;

    transactionNo: string;

    amount: string;

    date: string;

  };

}

/* =================================
   PROPS
================================== */

interface BookingProps {

  category:
    AccommodationCategory;

  officerName: string;

  userId: string;

  onBack: () => void;

  onContinue: (
    booking: BookingDraft
  ) => void;
}

/* =================================
   DATE HELPERS
================================== */

/*
 * Returns local system date as:
 *
 * YYYY-MM-DD
 *
 * We intentionally do not use
 * toISOString() because UTC conversion
 * can shift the date.
 */
const getTodayDate = (): string => {

  const now =
    new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      now.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;

};


/*
 * Returns tomorrow as:
 *
 * YYYY-MM-DD
 */
const getTomorrowDate = (): string => {

  const tomorrow =
    new Date();

  tomorrow.setDate(
    tomorrow.getDate() + 1
  );

  const year =
    tomorrow.getFullYear();

  const month =
    String(
      tomorrow.getMonth() + 1
    ).padStart(
      2,
      "0"
    );

  const day =
    String(
      tomorrow.getDate()
    ).padStart(
      2,
      "0"
    );

  return `${year}-${month}-${day}`;

};


/*
 * Creates a datetime-local value.
 *
 * Example:
 *
 * 2026-09-18T09:00
 */
const createDateTime = (
  date: string,
  time: string
): string => {

  return `${date}T${time}`;

};


/*
 * Extracts YYYY-MM-DD from a
 * datetime-local value.
 */
const getDatePart = (
  value: string
): string => {

  if (
    !value
  ) {

    return "";

  }

  return value.slice(
    0,
    10
  );

};


/* =================================
   EMPTY GUEST
================================== */

const createEmptyGuest =
  (): Guest => ({

    id: undefined,

    name: "",

    relationship: "",

    mobile: "",

    identityProofType: "",

    identityProofNumber: "",

    relationshipProofType: "",

    relationshipProofNumber: "",

    /*
     * Legacy compatibility fields.
     */
    aadhaar: "",

    identityProof: "",

  });


/* =================================
   COMPONENT
================================== */

function Booking({
  category,
  officerName,
  userId: _userId,
  onBack,
  onContinue,
}: BookingProps) {

  /* =================================
     CURRENT DATE
  ================================== */

  const today =
    getTodayDate();

  const tomorrow =
    getTomorrowDate();


  /* =================================
     BOOKING TYPE
  ================================== */

  const [
    bookingType,
    setBookingType,
  ] = useState<
    "CURRENT" | "ADVANCE"
  >("CURRENT");


  /* =================================
     SERVICEMAN
  ================================== */

  const [
    serviceman,
    setServiceman,
  ] = useState({

    number: "",

    rank: "",

    name: "",

    address: "",

    identityNo: "",

  });


  /* =================================
     GUEST COUNT
  ================================== */

  const [
    guestCount,
    setGuestCount,
  ] = useState(1);


  /* =================================
     GUESTS
  ================================== */

  const [
    guests,
    setGuests,
  ] = useState<Guest[]>([
    createEmptyGuest(),
  ]);


  /* =================================
     DURATION
  ================================== */

  /*
   * CURRENT starts with today's date.
   *
   * We intentionally leave checkout
   * blank so the user chooses the
   * actual checkout date/time.
   */
  const [
    checkIn,
    setCheckIn,
  ] = useState(
    createDateTime(
      today,
      "09:00"
    )
  );

  const [
    checkOut,
    setCheckOut,
  ] = useState("");


  /* =================================
     PAYMENT
  ================================== */

  const [
    payment,
    setPayment,
  ] = useState({

    mode: "Cash",

    transactionNo: "",

    amount: "",

    date: "",

  });


  /* =================================
     CATEGORY LABEL
  ================================== */

  const categoryLabel =
    category === "AC"
      ? "AC"
      : category === "Non-AC"
      ? "Non-AC"
      : category === "Dormitory"
      ? "Dormitory"
      : "VIP";


  /* =================================
     BOOKING TYPE CHANGE
  ================================== */

  const handleBookingTypeChange = (
    newType:
      | "CURRENT"
      | "ADVANCE"
  ) => {

    setBookingType(
      newType
    );


    /*
     * CURRENT booking
     *
     * Always start today.
     */
    if (
      newType ===
      "CURRENT"
    ) {

      setCheckIn(
        createDateTime(
          today,
          "09:00"
        )
      );

      setCheckOut(
        ""
      );

      return;

    }


    /*
     * ADVANCE booking
     *
     * Start with tomorrow at 09:00.
     */
    setCheckIn(
      createDateTime(
        tomorrow,
        "09:00"
      )
    );

    setCheckOut(
      ""
    );

  };


  /* =================================
     SERVICEMAN UPDATE
  ================================== */

  const updateServiceman = (
    field: keyof typeof serviceman,
    value: string
  ) => {

    setServiceman(
      (current) => ({

        ...current,

        [field]: value,

      })
    );

  };


  /* =================================
     GUEST COUNT CHANGE
  ================================== */

  const handleGuestCountChange = (
    value: number
  ) => {

    const count =
      Math.max(
        1,
        Math.min(
          10,
          value
        )
      );

    setGuestCount(
      count
    );

    setGuests(
      (current) => {

        const updated = [
          ...current,
        ];

        while (
          updated.length <
          count
        ) {

          updated.push(
            createEmptyGuest()
          );

        }

        return updated.slice(
          0,
          count
        );

      }
    );

  };


  /* =================================
     GUEST UPDATE
  ================================== */

  const updateGuest = (
    index: number,
    field: keyof Guest,
    value: string
  ) => {

    setGuests(
      (current) =>
        current.map(
          (
            guest,
            guestIndex
          ) => {

            if (
              guestIndex !==
              index
            ) {

              return guest;

            }


            /*
             * When relationship changes,
             * clear proof fields because
             * the allowed proof options
             * have changed.
             */
            if (
              field ===
              "relationship"
            ) {

              return {

                ...guest,

                relationship:
                  value,

                identityProofType:
                  "",

                identityProofNumber:
                  "",

                relationshipProofType:
                  "",

                relationshipProofNumber:
                  "",

                /*
                 * Legacy compatibility.
                 */
                aadhaar:
                  "",

                identityProof:
                  "",

              };

            }


            return {

              ...guest,

              [field]:
                value,

            };

          }
        )
    );

  };


  /* =================================
     IDENTITY PROOF TYPE
  ================================== */

  const updateIdentityProofType = (
    index: number,
    value: string
  ) => {

    setGuests(
      (current) =>
        current.map(
          (
            guest,
            guestIndex
          ) =>
            guestIndex ===
            index
              ? {

                  ...guest,

                  identityProofType:
                    value,

                  /*
                   * Legacy compatibility.
                   */
                  identityProof:
                    value,

                }
              : guest
        )
    );

  };


  /* =================================
     IDENTITY PROOF NUMBER
  ================================== */

  const updateIdentityProofNumber = (
    index: number,
    value: string
  ) => {

    setGuests(
      (current) =>
        current.map(
          (
            guest,
            guestIndex
          ) =>
            guestIndex ===
            index
              ? {

                  ...guest,

                  identityProofNumber:
                    value,

                  /*
                   * Legacy compatibility.
                   */
                  aadhaar:
                    value,

                }
              : guest
        )
    );

  };


  /* =================================
     RELATIONSHIP PROOF TYPE
  ================================== */

  const updateRelationshipProofType = (
    index: number,
    value: string
  ) => {

    setGuests(
      (current) =>
        current.map(
          (
            guest,
            guestIndex
          ) =>
            guestIndex ===
            index
              ? {

                  ...guest,

                  relationshipProofType:
                    value,

                }
              : guest
        )
    );

  };


  /* =================================
     RELATIONSHIP PROOF NUMBER
  ================================== */

  const updateRelationshipProofNumber = (
    index: number,
    value: string
  ) => {

    setGuests(
      (current) =>
        current.map(
          (
            guest,
            guestIndex
          ) =>
            guestIndex ===
            index
              ? {

                  ...guest,

                  relationshipProofNumber:
                    value,

                }
              : guest
        )
    );

  };


  /* =================================
     CHECK-IN DATE CHANGE
  ================================== */

  const handleCheckInChange = (
    value: string
  ) => {

    const selectedDate =
      getDatePart(
        value
      );


    /*
     * CURRENT:
     * only today is permitted.
     */
    if (
      bookingType ===
      "CURRENT" &&
      selectedDate !==
      today
    ) {

      alert(
        `CURRENT booking must start today (${today}).`
      );

      return;

    }


    /*
     * ADVANCE:
     * today and past dates are not
     * permitted.
     */
    if (
      bookingType ===
      "ADVANCE" &&
      selectedDate <=
      today
    ) {

      alert(
        `ADVANCE booking must start from tomorrow (${tomorrow}) or later.`
      );

      return;

    }


    setCheckIn(
      value
    );


    /*
     * Existing checkout becomes invalid
     * if it is not after the new check-in.
     */
    if (
      checkOut &&
      checkOut <=
      value
    ) {

      setCheckOut(
        ""
      );

    }

  };


  /* =================================
     CHECK-OUT DATE CHANGE
  ================================== */

  const handleCheckOutChange = (
    value: string
  ) => {

    if (
      checkIn &&
      value <=
      checkIn
    ) {

      alert(
        "Check-out must be after check-in."
      );

      return;

    }

    setCheckOut(
      value
    );

  };


  /* =================================
     FORM VALIDATION
  ================================== */

  const validateForm = () => {

    /* =================================
       SERVICEMAN
    ================================== */

    if (
      !serviceman.number ||
      !serviceman.rank ||
      !serviceman.name ||
      !serviceman.address ||
      !serviceman.identityNo
    ) {

      alert(
        "Please complete all Serving / Ex-Servicemen details."
      );

      return false;

    }


    /* =================================
       DATE PRESENCE
    ================================== */

    if (
      !checkIn ||
      !checkOut
    ) {

      alert(
        "Please enter check-in and check-out date/time."
      );

      return false;

    }


    /* =================================
       BOOKING TYPE DATE RULES
    ================================== */

    const selectedCheckInDate =
      getDatePart(
        checkIn
      );

    const selectedCheckOutDate =
      getDatePart(
        checkOut
      );


    /*
     * CURRENT must start today.
     */
    if (
      bookingType ===
      "CURRENT" &&
      selectedCheckInDate !==
      today
    ) {

      alert(
        `CURRENT booking must start today (${today}).`
      );

      return false;

    }


    /*
     * ADVANCE must start after today.
     */
    if (
      bookingType ===
      "ADVANCE" &&
      selectedCheckInDate <=
      today
    ) {

      alert(
        `ADVANCE booking must start from tomorrow (${tomorrow}) or later.`
      );

      return false;

    }


    /*
     * Checkout must contain a date.
     */
    if (
      !selectedCheckOutDate
    ) {

      alert(
        "Please enter a valid check-out date."
      );

      return false;

    }


    /*
     * Checkout must be strictly after
     * check-in.
     */
    if (
      new Date(checkOut) <=
      new Date(checkIn)
    ) {

      alert(
        "Check-out must be after check-in."
      );

      return false;

    }


    /* =================================
       GUEST VALIDATION
    ================================== */

    for (
      let i = 0;
      i < guests.length;
      i++
    ) {

      const guest =
        guests[i];


      if (
        !guest.name ||
        !guest.relationship ||
        !guest.mobile ||
        !guest.identityProofType ||
        !guest.identityProofNumber
      ) {

        alert(
          `Please complete identity details for Guest ${i + 1}.`
        );

        return false;

      }


      /*
       * Relationship proof is required
       * for everyone except SELF.
       */
      if (
        guest.relationship !==
          "SELF" &&
        (
          !guest.relationshipProofType ||
          !guest.relationshipProofNumber
        )
      ) {

        alert(
          `Please complete relationship proof details for Guest ${i + 1}.`
        );

        return false;

      }

    }


    /* =================================
       PAYMENT VALIDATION
    ================================== */

    if (
      !payment.amount
    ) {

      alert(
        "Please enter the paid amount."
      );

      return false;

    }


    if (
      !payment.date
    ) {

      alert(
        "Please enter the payment date."
      );

      return false;

    }


    return true;

  };


  /* =================================
     CONTINUE
  ================================== */

  const handleContinue = () => {

    if (
      !validateForm()
    ) {

      return;

    }


    onContinue({

      /*
       * New booking does not have a
       * database ID yet.
       *
       * App.tsx receives the ID from
       * the backend and adds it later.
       */
      id: undefined,

      category,

      bookingType,

      serviceman,

      guests,

      checkIn,

      checkOut,

      payment,

    });

  };


  /* =================================
     UI
  ================================== */

  return (

    <main className="booking-screen">

      {/* =================================
          HEADER
      ================================== */}

      <header className="booking-header">

        <div>

          <span className="section-label">

            NEW BOOKING

          </span>


          <h1>

            Accommodation Booking Form

          </h1>


          <p>

            {categoryLabel}

            {" accommodation"}

            {" • "}

            Officer: {officerName}

          </p>

        </div>


        <button
          type="button"
          className="availability-back-button"
          onClick={
            onBack
          }
        >

          ← Back

        </button>

      </header>


      {/* =================================
          BOOKING TYPE
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "0",
          overflow: "hidden",
        }}
      >

        <div
          style={{
            padding:
              "24px 28px 18px",
            borderBottom:
              "1px solid #e2e7df",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent:
                "space-between",
              gap: "20px",
              flexWrap:
                "wrap",
            }}
          >

            <div>

              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing:
                    "1.8px",
                  color:
                    "#6f796c",
                  textTransform:
                    "uppercase",
                  marginBottom:
                    "6px",
                }}
              >

                Booking Type

              </div>


              <div
                style={{
                  fontSize: "13px",
                  color:
                    "#747d72",
                }}
              >

                Select whether the guest is
                staying now or making a future
                reservation.

              </div>

            </div>


            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "8px",
                padding:
                  "5px",
                background:
                  "#f1f4ef",
                border:
                  "1px solid #dce3d8",
                borderRadius:
                  "12px",
              }}
            >

              <button
                type="button"
                onClick={() =>
                  handleBookingTypeChange(
                    "CURRENT"
                  )
                }
                style={{
                  border:
                    bookingType ===
                    "CURRENT"
                      ? "1px solid #355d3b"
                      : "1px solid transparent",
                  background:
                    bookingType ===
                    "CURRENT"
                      ? "#355d3b"
                      : "transparent",
                  color:
                    bookingType ===
                    "CURRENT"
                      ? "#ffffff"
                      : "#52604f",
                  borderRadius:
                    "9px",
                  padding:
                    "12px 22px",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "1px",
                  cursor:
                    "pointer",
                  minWidth:
                    "125px",
                  transition:
                    "all 0.2s ease",
                }}
              >

                {bookingType ===
                  "CURRENT" &&
                  "✓ "}

                CURRENT

              </button>


              <button
                type="button"
                onClick={() =>
                  handleBookingTypeChange(
                    "ADVANCE"
                  )
                }
                style={{
                  border:
                    bookingType ===
                    "ADVANCE"
                      ? "1px solid #355d3b"
                      : "1px solid transparent",
                  background:
                    bookingType ===
                    "ADVANCE"
                      ? "#355d3b"
                      : "transparent",
                  color:
                    bookingType ===
                    "ADVANCE"
                      ? "#ffffff"
                      : "#52604f",
                  borderRadius:
                    "9px",
                  padding:
                    "12px 22px",
                  fontSize:
                    "12px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "1px",
                  cursor:
                    "pointer",
                  minWidth:
                    "125px",
                  transition:
                    "all 0.2s ease",
                }}
              >

                {bookingType ===
                  "ADVANCE" &&
                  "✓ "}

                ADVANCE

              </button>

            </div>

          </div>

        </div>


        {/* =================================
            TYPE INFORMATION
        ================================== */}

        <div
          style={{
            padding:
              "18px 28px 22px",
            background:
              "#fbfcfa",
          }}
        >

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(2, minmax(0, 1fr))",
              gap: "14px",
            }}
          >

            {/* CURRENT INFO */}

            <div
              onClick={() =>
                handleBookingTypeChange(
                  "CURRENT"
                )
              }
              style={{
                border:
                  bookingType ===
                  "CURRENT"
                    ? "1px solid #4f7654"
                    : "1px solid #dfe5dc",
                background:
                  bookingType ===
                  "CURRENT"
                    ? "#f2f7f1"
                    : "#ffffff",
                borderRadius:
                  "10px",
                padding:
                  "15px 17px",
                cursor:
                  "pointer",
                transition:
                  "all 0.2s ease",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  marginBottom:
                    "7px",
                }}
              >

                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius:
                      "50%",
                    background:
                      bookingType ===
                      "CURRENT"
                        ? "#355d3b"
                        : "#e8ede6",
                    color:
                      bookingType ===
                      "CURRENT"
                        ? "#ffffff"
                        : "#647060",
                    fontWeight:
                      800,
                    fontSize:
                      "13px",
                  }}
                >

                  {bookingType ===
                  "CURRENT"
                    ? "✓"
                    : "1"}

                </span>


                <strong
                  style={{
                    fontSize:
                      "14px",
                    color:
                      "#304633",
                  }}
                >

                  CURRENT

                </strong>

              </div>


              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#697368",
                  lineHeight:
                    "1.5",
                }}
              >

                Stay starts today.
                The allotted room/bed will
                represent the current stay.

              </div>


              <div
                style={{
                  marginTop:
                    "9px",
                  fontSize:
                    "11px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "0.8px",
                  color:
                    "#4b654d",
                }}
              >

                CHECK-IN: {today}

              </div>

            </div>


            {/* ADVANCE INFO */}

            <div
              onClick={() =>
                handleBookingTypeChange(
                  "ADVANCE"
                )
              }
              style={{
                border:
                  bookingType ===
                  "ADVANCE"
                    ? "1px solid #4f7654"
                    : "1px solid #dfe5dc",
                background:
                  bookingType ===
                  "ADVANCE"
                    ? "#f2f7f1"
                    : "#ffffff",
                borderRadius:
                  "10px",
                padding:
                  "15px 17px",
                cursor:
                  "pointer",
                transition:
                  "all 0.2s ease",
              }}
            >

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: "10px",
                  marginBottom:
                    "7px",
                }}
              >

                <span
                  style={{
                    width: "28px",
                    height: "28px",
                    display:
                      "inline-flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius:
                      "50%",
                    background:
                      bookingType ===
                      "ADVANCE"
                        ? "#355d3b"
                        : "#e8ede6",
                    color:
                      bookingType ===
                      "ADVANCE"
                        ? "#ffffff"
                        : "#647060",
                    fontWeight:
                      800,
                    fontSize:
                      "13px",
                  }}
                >

                  {bookingType ===
                  "ADVANCE"
                    ? "✓"
                    : "2"}

                </span>


                <strong
                  style={{
                    fontSize:
                      "14px",
                    color:
                      "#304633",
                  }}
                >

                  ADVANCE

                </strong>

              </div>


              <div
                style={{
                  fontSize:
                    "12px",
                  color:
                    "#697368",
                  lineHeight:
                    "1.5",
                }}
              >

                Future reservation.
                The allotted room/bed will
                remain booked until the stay
                begins.

              </div>


              <div
                style={{
                  marginTop:
                    "9px",
                  fontSize:
                    "11px",
                  fontWeight:
                    800,
                  letterSpacing:
                    "0.8px",
                  color:
                    "#4b654d",
                }}
              >

                CHECK-IN: {tomorrow} OR LATER

              </div>

            </div>

          </div>

        </div>

      </section>


      {/* =================================
          SECTION 1
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>


          <div>

            <h2>

              Serving / Ex-Servicemen Information

            </h2>


            <p>

              Enter the details of the serviceman.

            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              Number *
            </label>


            <input
              value={
                serviceman.number
              }
              onChange={(e) =>
                updateServiceman(
                  "number",
                  e.target.value
                )
              }
              placeholder="Service / Registration No."
            />

          </div>


          <div className="form-field">

            <label>
              Rank *
            </label>


            <input
              value={
                serviceman.rank
              }
              onChange={(e) =>
                updateServiceman(
                  "rank",
                  e.target.value
                )
              }
              placeholder="Rank"
            />

          </div>


          <div className="form-field">

            <label>
              Name *
            </label>


            <input
              value={
                serviceman.name
              }
              onChange={(e) =>
                updateServiceman(
                  "name",
                  e.target.value
                )
              }
              placeholder="Full name"
            />

          </div>


          <div className="form-field full">

            <label>
              Address *
            </label>


            <textarea
              value={
                serviceman.address
              }
              onChange={(e) =>
                updateServiceman(
                  "address",
                  e.target.value
                )
              }
              placeholder="Complete address"
              rows={3}
            />

          </div>


          <div className="form-field">

            <label>
              Identity No. *
            </label>


            <input
              value={
                serviceman.identityNo
              }
              onChange={(e) =>
                updateServiceman(
                  "identityNo",
                  e.target.value
                )
              }
              placeholder="Identity number"
            />

          </div>

        </div>

      </section>


      {/* =================================
          SECTION 2
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>


          <div>

            <h2>
              Guest / Occupant Information
            </h2>


            <p>
              Enter the details of every person staying.
            </p>

          </div>

        </div>


        <div className="guest-count">

          <label>
            Number of Guests / Occupants *
          </label>


          <input
            type="number"
            min="1"
            max="10"
            value={
              guestCount
            }
            onChange={(e) =>
              handleGuestCountChange(
                Number(
                  e.target.value
                )
              )
            }
          />


          <span>

            {guestCount === 1
              ? "1 bed will be required"
              : `${guestCount} beds will be required`}

          </span>

        </div>


        {guests.map(
          (
            guest,
            index
          ) => (

            <div
              className="guest-card"
              key={index}
            >

              <h3>

                Guest / Occupant{" "}
                {index + 1}

              </h3>


              <div className="booking-grid">

                {/* =========================
                    NAME
                ========================== */}

                <div className="form-field">

                  <label>
                    Name *
                  </label>


                  <input
                    value={
                      guest.name
                    }
                    onChange={(e) =>
                      updateGuest(
                        index,
                        "name",
                        e.target.value
                      )
                    }
                    placeholder="Guest name"
                  />

                </div>


                {/* =========================
                    RELATIONSHIP
                ========================== */}

                <div className="form-field">

                  <label>
                    Relationship with Soldier *
                  </label>


                  <select
                    value={
                      guest.relationship
                    }
                    onChange={(e) =>
                      updateGuest(
                        index,
                        "relationship",
                        e.target.value
                      )
                    }
                  >

                    <option value="">
                      Select relationship
                    </option>


                    {relationshipOptions.map(
                      (
                        relationship
                      ) => (

                        <option
                          key={
                            relationship
                          }
                          value={
                            relationship
                          }
                        >

                          {relationship}

                        </option>

                      )
                    )}

                  </select>

                </div>


                {/* =========================
                    MOBILE
                ========================== */}

                <div className="form-field">

                  <label>
                    Mobile Number *
                  </label>


                  <input
                    value={
                      guest.mobile
                    }
                    onChange={(e) =>
                      updateGuest(
                        index,
                        "mobile",
                        e.target.value
                      )
                    }
                    placeholder="Mobile number"
                  />

                </div>


                {/* =========================
                    IDENTITY PROOF TYPE
                ========================== */}

                <div className="form-field">

                  <label>
                    Identity Proof Type *
                  </label>


                  <select
                    value={
                      guest.identityProofType
                    }
                    onChange={(e) =>
                      updateIdentityProofType(
                        index,
                        e.target.value
                      )
                    }
                    disabled={
                      !guest.relationship
                    }
                  >

                    <option value="">

                      {guest.relationship
                        ? "Select identity proof"
                        : "Select relationship first"}

                    </option>


                    {guest.relationship ===
                    "SELF"
                      ? selfIdentityProofOptions.map(
                          (
                            proof
                          ) => (

                            <option
                              key={
                                proof
                              }
                              value={
                                proof
                              }
                            >

                              {proof}

                            </option>

                          )
                        )
                      : relativeIdentityProofOptions.map(
                          (
                            proof
                          ) => (

                            <option
                              key={
                                proof
                              }
                              value={
                                proof
                              }
                            >

                              {proof}

                            </option>

                          )
                        )}

                  </select>

                </div>


                {/* =========================
                    IDENTITY PROOF NUMBER
                ========================== */}

                <div className="form-field">

                  <label>
                    Identity Proof Number *
                  </label>


                  <input
                    value={
                      guest.identityProofNumber
                    }
                    onChange={(e) =>
                      updateIdentityProofNumber(
                        index,
                        e.target.value
                      )
                    }
                    placeholder="Identity proof number"
                    disabled={
                      !guest.relationship
                    }
                  />

                </div>


                {/* =========================
                    RELATIONSHIP PROOF
                ========================== */}

                {guest.relationship &&
                  guest.relationship !==
                    "SELF" && (

                    <>

                      <div className="form-field">

                        <label>
                          Relationship Proof Type *
                        </label>


                        <select
                          value={
                            guest.relationshipProofType
                          }
                          onChange={(e) =>
                            updateRelationshipProofType(
                              index,
                              e.target.value
                            )
                          }
                        >

                          <option value="">
                            Select relationship proof
                          </option>


                          {relationshipProofOptions.map(
                            (
                              proof
                            ) => (

                              <option
                                key={
                                  proof
                                }
                                value={
                                  proof
                                }
                              >

                                {proof}

                              </option>

                            )
                          )}

                        </select>

                      </div>


                      <div className="form-field">

                        <label>
                          Relationship Proof Number *
                        </label>


                        <input
                          value={
                            guest.relationshipProofNumber
                          }
                          onChange={(e) =>
                            updateRelationshipProofNumber(
                              index,
                              e.target.value
                            )
                          }
                          placeholder="Relationship proof number"
                        />

                      </div>

                    </>

                  )}

              </div>

            </div>

          )
        )}

      </section>


      {/* =================================
          SECTION 3
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>


          <div>

            <h2>
              Duration of Stay
            </h2>


            <p>
              Enter the complete stay duration.
            </p>

          </div>

        </div>


        {/* =================================
            DATE TYPE SUMMARY
        ================================== */}

        <div
          style={{
            marginBottom:
              "18px",
            padding:
              "13px 16px",
            borderRadius:
              "9px",
            background:
              bookingType ===
              "CURRENT"
                ? "#f2f7f1"
                : "#f5f7f3",
            border:
              "1px solid #dfe6dc",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            gap:
              "15px",
            flexWrap:
              "wrap",
          }}
        >

          <div>

            <div
              style={{
                fontSize:
                  "11px",
                fontWeight:
                  800,
                letterSpacing:
                  "1px",
                color:
                  "#53604f",
                textTransform:
                  "uppercase",
              }}
            >

              {bookingType ===
              "CURRENT"
                ? "CURRENT STAY"
                : "ADVANCE RESERVATION"}

            </div>


            <div
              style={{
                marginTop:
                  "4px",
                fontSize:
                  "13px",
                color:
                  "#6e776b",
              }}
            >

              {bookingType ===
              "CURRENT"
                ? `Check-in must be today (${today}).`
                : `Check-in must be ${tomorrow} or later.`}

            </div>

          </div>


          <div
            style={{
              fontSize:
                "11px",
              fontWeight:
                800,
              letterSpacing:
                "0.7px",
              color:
                "#355d3b",
            }}
          >

            {bookingType ===
            "CURRENT"
              ? "CURRENT → OCCUPIED"
              : "ADVANCE → BOOKED"}

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              From Date &amp; Time *
            </label>


            <input
              type="datetime-local"
              min={
                bookingType ===
                "CURRENT"
                  ? `${today}T00:00`
                  : `${tomorrow}T00:00`
              }
              max={
                bookingType ===
                "CURRENT"
                  ? `${today}T23:59`
                  : undefined
              }
              value={
                checkIn
              }
              onChange={(e) =>
                handleCheckInChange(
                  e.target.value
                )
              }
            />


            <small
              style={{
                display:
                  "block",
                marginTop:
                  "7px",
                color:
                  "#7b8478",
                fontSize:
                  "11px",
              }}
            >

              {bookingType ===
              "CURRENT"
                ? `Today only: ${today}`
                : `Tomorrow onward: ${tomorrow} or later`}

            </small>

          </div>


          <div className="form-field">

            <label>
              To Date &amp; Time *
            </label>


            <input
              type="datetime-local"
              min={
                checkIn ||
                undefined
              }
              value={
                checkOut
              }
              onChange={(e) =>
                handleCheckOutChange(
                  e.target.value
                )
              }
            />


            <small
              style={{
                display:
                  "block",
                marginTop:
                  "7px",
                color:
                  "#7b8478",
                fontSize:
                  "11px",
              }}
            >

              Must be after the check-in
              date and time.

            </small>

          </div>

        </div>

      </section>


      {/* =================================
          SECTION 4
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            04
          </span>


          <div>

            <h2>
              Payment Details
            </h2>


            <p>
              Record the amount received.
            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              Payment Mode *
            </label>


            <select
              value={
                payment.mode
              }
              onChange={(e) =>
                setPayment(
                  (current) => ({

                    ...current,

                    mode:
                      e.target.value,

                  })
                )
              }
            >

              <option value="Cash">
                Cash
              </option>


              <option value="Online">
                Online
              </option>


              <option value="UPI">
                UPI
              </option>


              <option value="Cheque">
                Cheque
              </option>

            </select>

          </div>


          <div className="form-field">

            <label>
              Online Transaction No.
            </label>


            <input
              value={
                payment.transactionNo
              }
              onChange={(e) =>
                setPayment(
                  (current) => ({

                    ...current,

                    transactionNo:
                      e.target.value,

                  })
                )
              }
              placeholder="Transaction number"
            />

          </div>


          <div className="form-field">

            <label>
              Date *
            </label>


            <input
              type="date"
              value={
                payment.date
              }
              onChange={(e) =>
                setPayment(
                  (current) => ({

                    ...current,

                    date:
                      e.target.value,

                  })
                )
              }
            />

          </div>


          <div className="form-field">

            <label>
              Paid Amount *
            </label>


            <input
              type="number"
              min="0"
              value={
                payment.amount
              }
              onChange={(e) =>
                setPayment(
                  (current) => ({

                    ...current,

                    amount:
                      e.target.value,

                  })
                )
              }
              placeholder="₹ Amount"
            />

          </div>

        </div>

      </section>


      {/* =================================
          FOOTER ACTION
      ================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={
            onBack
          }
        >

          CANCEL

        </button>


        <button
          type="button"
          className="continue-booking-button"
          onClick={
            handleContinue
          }
        >

          CONTINUE TO SEAT MATRIX →

        </button>

      </div>

    </main>

  );

}

export default Booking;