import { useState } from "react";

import "../App.css";

import { useLanguage } from "../i18n/LanguageContext";

/* =================================
   TYPES
================================== */

export type ApprovalAuthority =
  | "RECEPTIONIST"
  | "SUPERINTENDENT"
  | "WELFARE_ORGANISER"
  | "OLC_REST_HOUSE_MANAGER"
  | "DY_DIRECTOR";

export type ApprovalDecision =
  | "APPROVED"
  | "REJECTED";

export interface ApprovalAccommodation {
  roomId: string;
  roomName: string;
  category: string;
  bedId?: string;
  bedNumber?: number;
  guestId?: string;
  guestName?: string;
}

export interface BookingApprovalData {
  bookingId?: string;
  bookingReference?: string;

  bookingType:
    | "CURRENT"
    | "ADVANCE";

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  category: string;

  serviceman: {
    number: string;
    rank: string;
    name: string;
    address: string;
  };

  guests: Array<{
    id?: string;
    name: string;
    relationship: string;
    mobile: string;
    relationshipProofType: string;
    relationshipProofNumber: string;
  }>;

  checkIn: string;
  checkOut: string;

  acceptedAccommodation: ApprovalAccommodation[];

  accommodationAmount: number;
  additionalMemberAmount: number;
  totalAmount: number;
}

interface BookingApprovalProps {
  officerName: string;

  booking: BookingApprovalData;

  alreadyApproved: boolean;

  onBack: () => void;

  onContinueToPayment: () => void;

  onDecision: (
    decision: ApprovalDecision,
    remarks: string
  ) => void;
}

/* =================================
   HELPERS
================================== */

const formatCurrency = (
  amount: number
): string => {
  return `₹${amount.toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 0,
    }
  )}`;
};

const formatDateTime = (
  value: string
): string => {

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

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );
};

/* =================================
   AUTHORITY
================================== */

const getAuthorityForRoom = (
  roomName: string
): ApprovalAuthority => {

  const normalized =
    roomName
      .trim()
      .toUpperCase();

  /*
     NAC / DM / HALL
     → Receptionist
  */

  if (
    normalized.startsWith("NAC") ||
    normalized.startsWith("DM") ||
    normalized === "HALL"
  ) {
    return "RECEPTIONIST";
  }

  /*
     AC 1–3
     → Superintendent
  */

  const acMatch =
    normalized.match(
      /^AC\s*(\d+)$/
    );

  if (acMatch) {

    const roomNumber =
      Number(
        acMatch[1]
      );

    if (
      roomNumber >= 1 &&
      roomNumber <= 3
    ) {
      return "SUPERINTENDENT";
    }

    /*
       AC 4–5
       → Welfare Organiser
    */

    if (
      roomNumber >= 4 &&
      roomNumber <= 5
    ) {
      return "WELFARE_ORGANISER";
    }

    /*
       AC 11–21, 24
       → OLC Rest House Manager
    */

    if (
      (
        roomNumber >= 11 &&
        roomNumber <= 21
      ) ||
      roomNumber === 24
    ) {
      return "OLC_REST_HOUSE_MANAGER";
    }
  }

  /*
     VIP 22–23
     → Dy. Director
  */

  if (
    normalized ===
      "AC VIP 22" ||
    normalized ===
      "AC VIP 23" ||
    normalized.includes(
      "VIP 22"
    ) ||
    normalized.includes(
      "VIP 23"
    )
  ) {
    return "DY_DIRECTOR";
  }

  /*
     If the room name does not
     match a configured authority,
     do not silently assign an
     authority.
  */

  return "RECEPTIONIST";
};

const getAuthorityLabel = (
  authority: ApprovalAuthority,
  isMarathi: boolean
): string => {

  if (
    authority ===
    "RECEPTIONIST"
  ) {
    return isMarathi
      ? "रिसेप्शनिस्ट"
      : "Receptionist";
  }

  if (
    authority ===
    "SUPERINTENDENT"
  ) {
    return isMarathi
      ? "अधीक्षक"
      : "Superintendent";
  }

  if (
    authority ===
    "WELFARE_ORGANISER"
  ) {
    return isMarathi
      ? "कल्याण संघटक"
      : "Welfare Organiser";
  }

  if (
    authority ===
    "OLC_REST_HOUSE_MANAGER"
  ) {
    return isMarathi
      ? "OLC रेस्ट हाऊस व्यवस्थापक"
      : "OLC Rest House Manager";
  }

  return isMarathi
    ? "उपसंचालक"
    : "Dy. Director";
};

/* =================================
   COMPONENT
================================== */

function BookingApproval({
  officerName,
  booking,
  alreadyApproved,
  onBack,
  onContinueToPayment,
  onDecision,
}: BookingApprovalProps) {

  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi =
    language === "mr";

  /* =================================
     STATE
  ================================== */

  const [
    remarks,
    setRemarks,
  ] = useState("");

  /* =================================
     TRANSLATION
  ================================== */

  const tr = (
    english: string,
    marathi: string
  ) =>
    isMarathi
      ? marathi
      : english;

  /* =================================
     LANGUAGE SWITCHER
  ================================== */

  const languageSwitcher = (
    <div
      className="language-switcher"
      aria-label="Language selection"
    >
      <button
        type="button"
        className={`language-button ${
          language === "en"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setLanguage("en")
        }
      >
        English
      </button>

      <span className="language-divider">
        |
      </span>

      <button
        type="button"
        className={`language-button ${
          language === "mr"
            ? "active"
            : ""
        }`}
        onClick={() =>
          setLanguage("mr")
        }
      >
        मराठी
      </button>
    </div>
  );

  /* =================================
     AUTHORITY LIST
  ================================== */

  const authorities =
    Array.from(
      new Set(
        booking.acceptedAccommodation.map(
          (accommodation) =>
            getAuthorityForRoom(
              accommodation.roomName
            )
        )
      )
    );

  /* =================================
     DECISION
  ================================== */

  const handleDecision = (
    decision: ApprovalDecision
  ) => {

    if (
      decision ===
      "REJECTED" &&
      !remarks.trim()
    ) {
      window.alert(
        tr(
          "Please enter remarks before rejecting the booking.",
          "बुकिंग नाकारण्यापूर्वी कृपया कारण / शेरा प्रविष्ट करा."
        )
      );

      return;
    }

    onDecision(
      decision,
      remarks.trim()
    );
  };

  /* =================================
     LABELS
  ================================== */

  const guestTypeLabel =
    booking.guestType ===
    "ESM"
      ? tr(
          "ESM",
          "माजी सैनिक"
        )
      : booking.guestType ===
        "SERVING"
      ? tr(
          "Serving",
          "सेवारत"
        )
      : tr(
          "Civilian",
          "नागरिक"
        );

  const bookingTypeLabel =
    booking.bookingType ===
    "CURRENT"
      ? tr(
          "Current",
          "सध्याचे"
        )
      : tr(
          "Advance",
          "आगाऊ"
        );

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
            {tr(
              "BOOKING APPROVAL",
              "बुकिंग मंजुरी"
            )}
          </span>

          <h1>
            {tr(
              "Booking Approval",
              "बुकिंग मंजुरी"
            )}
          </h1>

          <p>
            {tr(
              "Officer",
              "अधिकारी"
            )}
            : {officerName}
          </p>

        </div>


        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
            justifyContent: "flex-end",
          }}
        >

          {languageSwitcher}

          <button
            type="button"
            className="availability-back-button"
            onClick={onBack}
          >
            ←{" "}
            {tr(
              "Back",
              "मागे"
            )}
          </button>

        </div>

      </header>


      {/* =================================
          PROGRESS
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "20px 24px",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            01 REGISTRATION
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            02 AVAILABILITY
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
                fontWeight: 800,
            }}
          >
            03 ACCEPTANCE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            04 GUEST TYPE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            05 RATE
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#edf1eb",
              color:
                "#647060",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            06 BOOKING
          </span>

          <span>→</span>

          <span
            style={{
              padding:
                "7px 12px",
              borderRadius:
                "20px",
              background:
                "#355d3b",
              color:
                "#ffffff",
              fontSize:
                "11px",
              fontWeight: 800,
            }}
          >
            07 APPROVAL
          </span>

        </div>

      </section>


      {/* =================================
          APPROVAL STATUS
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "24px 28px",
          background:
            "#fffaf0",
          border:
            "1px solid #eadfbd",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems:
              "flex-start",
            gap: "15px",
          }}
        >

          <div
            style={{
              width: "44px",
              height: "44px",
              minWidth: "44px",
              borderRadius:
                "50%",
              background:
                "#e7d7a8",
              color:
                "#65552d",
              display: "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontWeight: 900,
              fontSize:
                "18px",
            }}
          >
            !
          </div>

          <div>

            <h2
              style={{
                margin:
                  "0 0 6px",
                color:
                  "#554b30",
                fontSize:
                  "18px",
              }}
            >
              {tr(
                "Approval is required before payment and invoice.",
                "पेमेंट आणि इनव्हॉइसपूर्वी मंजुरी आवश्यक आहे."
              )}
            </h2>

            <p
              style={{
                margin: 0,
                color:
                  "#746a4c",
                fontSize:
                  "13px",
                lineHeight:
                  1.6,
              }}
            >
              {tr(
                "Approving this booking does not physically lock the room or bed. Physical room locking happens only after approval → payment → invoice.",
                "या बुकिंगला मंजुरी दिल्याने खोली किंवा बेड प्रत्यक्ष लॉक होणार नाही. मंजुरी → पेमेंट → इनव्हॉइसनंतरच प्रत्यक्ष रूम लॉक होईल."
              )}
            </p>

          </div>

        </div>

      </section>


      {/* =================================
          BOOKING REFERENCE
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            07
          </span>

          <div>

            <h2>
              {tr(
                "Booking Information",
                "बुकिंग माहिती"
              )}
            </h2>

            <p>
              {tr(
                "Booking record submitted for approval.",
                "मंजुरीसाठी सादर केलेला बुकिंग रेकॉर्ड."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap:
              "14px",
          }}
        >

          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Booking Reference",
                "बुकिंग संदर्भ क्रमांक"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {booking.bookingReference ??
                tr(
                  "Pending",
                  "प्रलंबित"
                )}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Booking Type",
                "बुकिंग प्रकार"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {bookingTypeLabel}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Guest Type",
                "अतिथी प्रकार"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {guestTypeLabel}
            </strong>

          </div>


          <div
            style={{
              padding:
                "15px",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
              background:
                "#fafbf9",
            }}
          >

            <small>
              {tr(
                "Total Amount",
                "एकूण रक्कम"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304f35",
                fontSize:
                  "17px",
              }}
            >
              {formatCurrency(
                booking.totalAmount
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================
          SERVICEMAN
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>

          <div>

            <h2>
              {tr(
                "Serviceman Information",
                "सैनिकांची माहिती"
              )}
            </h2>

            <p>
              {tr(
                "Registered serviceman details.",
                "नोंदणीकृत सैनिकांची माहिती."
              )}
            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              {tr(
                "Number",
                "क्रमांक"
              )}
            </label>

            <input
              value={
                booking.serviceman
                  .number
              }
              readOnly
            />

          </div>


          <div className="form-field">

            <label>
              {tr(
                "Rank",
                "हुद्दा"
              )}
            </label>

            <input
              value={
                booking.serviceman
                  .rank
              }
              readOnly
            />

          </div>


          <div className="form-field">

            <label>
              {tr(
                "Name",
                "नाव"
              )}
            </label>

            <input
              value={
                booking.serviceman
                  .name
              }
              readOnly
            />

          </div>


          <div className="form-field full">

            <label>
              {tr(
                "Address",
                "पत्ता"
              )}
            </label>

            <textarea
              value={
                booking.serviceman
                  .address
              }
              readOnly
              rows={3}
            />

          </div>

        </div>

      </section>


      {/* =================================
          STAY
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>

          <div>

            <h2>
              {tr(
                "Stay Details",
                "मुक्काम तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Duration selected for the booking.",
                "बुकिंगसाठी निवडलेला मुक्काम कालावधी."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap:
              "14px",
          }}
        >

          <div
            style={{
              padding:
                "17px",
              background:
                "#fafbf9",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
            }}
          >

            <small>
              {tr(
                "Check-In",
                "चेक-इन"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {formatDateTime(
                booking.checkIn
              )}
            </strong>

          </div>


          <div
            style={{
              padding:
                "17px",
              background:
                "#fafbf9",
              border:
                "1px solid #dfe5dc",
              borderRadius:
                "10px",
            }}
          >

            <small>
              {tr(
                "Check-Out",
                "चेक-आउट"
              )}
            </small>

            <strong
              style={{
                display:
                  "block",
                marginTop:
                  "6px",
                color:
                  "#304633",
              }}
            >
              {formatDateTime(
                booking.checkOut
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================
          GUESTS
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>

          <div>

            <h2>
              {tr(
                "Guests / Occupants",
                "अतिथी / रहिवासी"
              )}
            </h2>

            <p>
              {booking.guests.length}{" "}
              {tr(
                "guest(s)",
                "अतिथी"
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap:
              "14px",
          }}
        >

          {booking.guests.map(
            (
              guest,
              index
            ) => (

              <div
                key={
                  guest.id ??
                  index
                }
                style={{
                  padding:
                    "18px",
                  border:
                    "1px solid #dfe5dc",
                  borderRadius:
                    "11px",
                  background:
                    "#fafbf9",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                    color:
                      "#687467",
                    letterSpacing:
                      "1px",
                  }}
                >
                  {tr(
                    "Guest",
                    "अतिथी"
                  )}{" "}
                  {index + 1}
                </div>

                <h3
                  style={{
                    margin:
                      "8px 0 10px",
                    color:
                      "#304633",
                  }}
                >
                  {guest.name}
                </h3>

                <div
                  style={{
                    display:
                      "grid",
                    gap:
                      "6px",
                    color:
                      "#687467",
                    fontSize:
                      "12px",
                  }}
                >

                  <div>
                    <strong>
                      {tr(
                        "Relationship:",
                        "नाते:"
                      )}
                    </strong>{" "}
                    {
                      guest.relationship
                    }
                  </div>

                  <div>
                    <strong>
                      {tr(
                        "Mobile:",
                        "मोबाईल:"
                      )}
                    </strong>{" "}
                    {guest.mobile}
                  </div>

                  <div>
                    <strong>
                      {tr(
                        "Relationship Proof:",
                        "नातेसंबंधाचा पुरावा:"
                      )}
                    </strong>{" "}
                    {
                      guest.relationshipProofType || "-"
                    }
                  </div>

                </div>

              </div>

            )
          )}

        </div>

      </section>


      {/* =================================
          ACCOMMODATION
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            04
          </span>

          <div>

            <h2>
              {tr(
                "Accepted Accommodation",
                "स्वीकारलेले निवास"
              )}
            </h2>

            <p>
              {tr(
                "Accommodation accepted before booking approval.",
                "बुकिंग मंजुरीपूर्वी स्वीकारलेले निवास."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gap:
              "10px",
          }}
        >

          {booking.acceptedAccommodation.map(
            (
              accommodation,
              index
            ) => {

              const authority =
                getAuthorityForRoom(
                  accommodation.roomName
                );

              return (
                <div
                  key={
                    `${accommodation.roomId}-${accommodation.bedId ?? index}`
                  }
                  style={{
                    display:
                      "grid",
                    gridTemplateColumns:
                      "1fr auto",
                    gap:
                      "15px",
                    alignItems:
                      "center",
                    padding:
                      "17px",
                    border:
                      "1px solid #dfe5dc",
                    borderRadius:
                      "10px",
                    background:
                      "#fafbf9",
                  }}
                >

                  <div>

                    <strong
                      style={{
                        color:
                          "#304633",
                        fontSize:
                          "15px",
                      }}
                    >
                      {
                        accommodation.roomName
                      }
                    </strong>

                    <div
                      style={{
                        marginTop:
                          "5px",
                        color:
                          "#717a70",
                        fontSize:
                          "12px",
                      }}
                    >
                      {accommodation.bedNumber
                        ? `${tr(
                            "Bed",
                            "बेड"
                          )} ${
                            accommodation.bedNumber
                          }`
                        : tr(
                            "Whole room",
                            "संपूर्ण खोली"
                          )}

                      {accommodation.guestName
                        ? ` • ${accommodation.guestName}`
                        : ""}
                    </div>

                  </div>


                  <div
                    style={{
                      textAlign:
                        "right",
                    }}
                  >

                    <div
                      style={{
                        fontSize:
                          "10px",
                        fontWeight:
                          800,
                        letterSpacing:
                          "0.9px",
                        color:
                          "#6d776a",
                        textTransform:
                          "uppercase",
                        marginBottom:
                          "5px",
                      }}
                    >
                      {tr(
                        "Required Approver",
                        "मंजुरी अधिकारी"
                      )}
                    </div>

                    <strong
                      style={{
                        color:
                          "#355d3b",
                        fontSize:
                          "12px",
                      }}
                    >
                      {getAuthorityLabel(
                        authority,
                        isMarathi
                      )}
                    </strong>

                  </div>

                </div>
              );
            }
          )}

        </div>

      </section>


      {/* =================================
          AUTHORITY SUMMARY
      ================================== */}

      <section
        className="booking-card"
        style={{
          background:
            "#f6f8f4",
        }}
      >

        <div className="booking-section-title">

          <span>
            ✓
          </span>

          <div>

            <h2>
              {tr(
                "Approval Authority",
                "मंजुरी अधिकार"
              )}
            </h2>

            <p>
              {tr(
                "Authority is determined from the selected accommodation.",
                "निवडलेल्या निवासाच्या आधारावर मंजुरी अधिकारी निश्चित केला जातो."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(2, minmax(0, 1fr))",
            gap:
              "12px",
          }}
        >

          {authorities.map(
            (
              authority
            ) => (

              <div
                key={
                  authority
                }
                style={{
                  padding:
                    "16px",
                  border:
                    "1px solid #d7e0d4",
                  borderRadius:
                    "10px",
                  background:
                    "#ffffff",
                }}
              >

                <div
                  style={{
                    fontSize:
                      "10px",
                    fontWeight:
                      800,
                    letterSpacing:
                      "1px",
                    color:
                      "#748071",
                    textTransform:
                      "uppercase",
                  }}
                >
                  {tr(
                    "Required Approval",
                    "आवश्यक मंजुरी"
                  )}
                </div>

                <strong
                  style={{
                    display:
                      "block",
                    marginTop:
                      "7px",
                    color:
                      "#304f35",
                    fontSize:
                      "15px",
                  }}
                >
                  {getAuthorityLabel(
                    authority,
                    isMarathi
                  )}
                </strong>

              </div>

            )
          )}

        </div>

      </section>


      {/* =================================
          FINANCIAL SUMMARY
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>

            <h2>
              {tr(
                "Financial Summary",
                "आर्थिक सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Amount calculated before payment.",
                "पेमेंटपूर्वी गणना केलेली रक्कम."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display:
              "grid",
            gap:
              "10px",
          }}
        >

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              padding:
                "13px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Accommodation Charges",
                "निवास शुल्क"
              )}
            </span>

            <strong>
              {formatCurrency(
                booking.accommodationAmount
              )}
            </strong>

          </div>


          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              padding:
                "13px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Additional Member Charges",
                "अतिरिक्त सदस्य शुल्क"
              )}
            </span>

            <strong>
              {formatCurrency(
                booking.additionalMemberAmount
              )}
            </strong>

          </div>


          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              padding:
                "18px 16px",
              background:
                "#f1f7ef",
              borderRadius:
                "10px",
                marginTop:
                "5px",
            }}
          >

            <strong
              style={{
                color:
                  "#304633",
                fontSize:
                  "16px",
              }}
            >
              {tr(
                "Total",
                "एकूण"
              )}
            </strong>

            <strong
              style={{
                color:
                  "#304f35",
                fontSize:
                  "24px",
              }}
            >
              {formatCurrency(
                booking.totalAmount
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =================================
          REMARKS
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            08
          </span>

          <div>

            <h2>
              {tr(
                "Approval Remarks",
                "मंजुरी शेरा"
              )}
            </h2>

            <p>
              {tr(
                "Remarks are required when rejecting a booking.",
                "बुकिंग नाकारताना शेरा आवश्यक आहे."
              )}
            </p>

          </div>

        </div>


        <div className="form-field">

          <label>
            {tr(
              "Remarks",
              "शेरा"
            )}
          </label>

          <textarea
            value={
              remarks
            }
            onChange={(event) =>
              setRemarks(
                event.target.value
              )
            }
            placeholder={tr(
              "Enter approval remarks...",
              "मंजुरीसाठी शेरा प्रविष्ट करा..."
            )}
            rows={5}
          />

        </div>

      </section>


      {/* =================================
          ACTION NOTICE
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "20px 24px",
          background:
            "#f7f8f5",
        }}
      >

        <div
          style={{
            fontSize:
              "12px",
            lineHeight:
              1.7,
            color:
              "#687367",
          }}
        >

          <strong
            style={{
              color:
                "#405040",
            }}
          >
            {tr(
              "Workflow:",
              "प्रक्रिया:"
            )}
          </strong>{" "}

          {tr(
            "Approve → Payment → Invoice → Room Locked",
            "मंजुरी → पेमेंट → इनव्हॉइस → रूम लॉक"
          )}

          <br />

          {tr(
            "Reject → Booking returns for correction / cancellation.",
            "नकार → बुकिंग दुरुस्ती / रद्द करण्यासाठी परत जाईल."
          )}

        </div>

      </section>


      {/* =================================
          FOOTER ACTIONS
      ================================== */}

      <div
        className="booking-actions"
        style={{
          justifyContent:
            "space-between",
        }}
      >

        <button
          type="button"
          className="secondary-action"
          onClick={onBack}
        >
          {tr("BACK", "मागे")}
        </button>


        <div
          style={{
            display:
              "flex",
            gap:
              "12px",
            flexWrap:
              "wrap",
            justifyContent:
              "flex-end",
          }}
        >

          {alreadyApproved ? (
            <button
              type="button"
              className="continue-booking-button"
              onClick={onContinueToPayment}
            >
              {tr("CONTINUE TO PAYMENT →", "पेमेंटसाठी पुढे जा →")}
            </button>
          ) : (
            <>

          <button
            type="button"
            onClick={() =>
              handleDecision(
                "REJECTED"
              )
            }
            style={{
              border:
                "1px solid #a94b4b",
              background:
                "#fff5f5",
              color:
                "#9a3f3f",
              borderRadius:
                "9px",
              padding:
                "13px 24px",
              fontSize:
                "12px",
              fontWeight:
                800,
              letterSpacing:
                "0.8px",
              cursor:
                "pointer",
            }}
          >
            {tr(
              "REJECT BOOKING",
              "बुकिंग नाकारावी"
            )}
          </button>


          <button
            type="button"
            className="continue-booking-button"
            onClick={() =>
              handleDecision(
                "APPROVED"
              )
            }
          >
            {tr(
              "APPROVE BOOKING →",
              "बुकिंग मंजूर करा →"
            )}
          </button>

            </>
          )}

        </div>

      </div>

    </main>
  );
}

export default BookingApproval;