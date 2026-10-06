import { useState } from "react";
import "../App.css";
import { useLanguage } from "../i18n/LanguageContext";

/* =================================
   TYPES
================================== */

export interface LockedAccommodation {
  roomId: string;
  roomName: string;
  bedId?: string;
  bedNumber?: number;
  guestName?: string;
}

export interface RoomLockedData {
  bookingId?: string;
  bookingReference?: string;

  guestName: string;
  guestType: "ESM" | "SERVING" | "CIVILIAN";

  invoiceNumber: string;
  invoiceType: "CASH_MEMO" | "CREDIT_MEMO";

  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;

  accommodations: LockedAccommodation[];

  lockedAt: string;
}

interface RoomLockedProps {
  officerName: string;

  bookingId?: string;
  bookingReference?: string;

  guestName: string;
  guestType: "ESM" | "SERVING" | "CIVILIAN";

  invoiceNumber: string;
  invoiceType: "CASH_MEMO" | "CREDIT_MEMO";

  totalAmount: number;
  paidAmount: number;

  accommodations: LockedAccommodation[];

  onBack: () => void;

  onContinue: (
    data: RoomLockedData
  ) => void;
}

/* =================================
   HELPERS
================================== */

const formatCurrency = (
  amount: number
): string => {
  return `₹${amount.toLocaleString("en-IN", {
    maximumFractionDigits: 0,
  })}`;
};

const getCurrentDateTime = (): string => {
  const now = new Date();

  const date = now.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const time = now.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${date} ${time}`;
};

/* =================================
   COMPONENT
================================== */

function RoomLocked({
  officerName,
  bookingId,
  bookingReference,
  guestName,
  guestType,
  invoiceNumber,
  invoiceType,
  totalAmount,
  paidAmount,
  accommodations,
  onBack,
  onContinue,
}: RoomLockedProps) {
  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi = language === "mr";

  const [lockConfirmed, setLockConfirmed] =
    useState(false);

  /* =================================
     TRANSLATION
  ================================== */

  const tr = (
    english: string,
    marathi: string
  ) => (isMarathi ? marathi : english);

  /* =================================
     VALUES
  ================================== */

  const safeTotal = Math.max(0, totalAmount);

  const safePaid = Math.max(
    0,
    Math.min(paidAmount, safeTotal)
  );

  const balanceAmount = Math.max(
    0,
    safeTotal - safePaid
  );

  const guestTypeLabel =
    guestType === "ESM"
      ? tr("ESM", "माजी सैनिक")
      : guestType === "SERVING"
      ? tr("Serving", "सेवारत")
      : tr("Civilian", "नागरिक");

  const invoiceTypeLabel =
    invoiceType === "CASH_MEMO"
      ? tr("Cash Memo", "रोख मेमो")
      : tr("Credit Memo", "क्रेडिट मेमो");

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
          language === "en" ? "active" : ""
        }`}
        onClick={() => setLanguage("en")}
      >
        English
      </button>

      <span className="language-divider">|</span>

      <button
        type="button"
        className={`language-button ${
          language === "mr" ? "active" : ""
        }`}
        onClick={() => setLanguage("mr")}
      >
        मराठी
      </button>
    </div>
  );

  /* =================================
     LOCK CONFIRMATION
  ================================== */

  const handleLockConfirmation = () => {
    setLockConfirmed(true);
  };

  /* =================================
     CONTINUE
  ================================== */

  const handleContinue = () => {
    if (!lockConfirmed) {
      window.alert(
        tr(
          "Please confirm that the room/bed lock details have been reviewed.",
          "कृपया खोली / बेड लॉक तपशील तपासून पुष्टी करा."
        )
      );

      return;
    }

    const data: RoomLockedData = {
      bookingId,
      bookingReference,

      guestName,
      guestType,

      invoiceNumber,
      invoiceType,

      totalAmount: safeTotal,
      paidAmount: safePaid,
      balanceAmount,

      accommodations,

      lockedAt: getCurrentDateTime(),
    };

    onContinue(data);
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
            {tr(
              "ROOM LOCKED",
              "खोली लॉक केली"
            )}
          </span>

          <h1>
            {tr(
              "Room / Bed Lock Confirmation",
              "खोली / बेड लॉक पुष्टी"
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
            ← {tr("Back", "मागे")}
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

          <span className="workflow-pill">
            01 REGISTRATION
          </span>

          <span>→</span>

          <span className="workflow-pill">
            02 AVAILABILITY
          </span>

          <span>→</span>

          <span className="workflow-pill">
            03 ACCEPTANCE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            04 GUEST TYPE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            05 RATE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            06 BOOKING
          </span>

          <span>→</span>

          <span className="workflow-pill">
            07 APPROVAL
          </span>

          <span>→</span>

          <span className="workflow-pill">
            08 PAYMENT
          </span>

          <span>→</span>

          <span className="workflow-pill">
            09 INVOICE
          </span>

          <span>→</span>

          <span
            style={{
              padding: "7px 12px",
              borderRadius: "20px",
              background: "#355d3b",
              color: "#ffffff",
              fontSize: "11px",
              fontWeight: 800,
            }}
          >
            10 ROOM LOCKED
          </span>

        </div>
      </section>

      {/* =================================
          SUCCESS HEADER
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "28px",
          background: "#f1f7ef",
          border: "1px solid #c9ddc5",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
          }}
        >

          <div
            style={{
              width: "62px",
              height: "62px",
              minWidth: "62px",
              borderRadius: "50%",
              background: "#355d3b",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 900,
            }}
          >
            ✓
          </div>

          <div>

            <h2
              style={{
                margin: "0 0 7px",
                color: "#304633",
                fontSize: "23px",
              }}
            >
              {tr(
                "Room / Bed Ready for Lock",
                "खोली / बेड लॉक करण्यासाठी तयार"
              )}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#657064",
                lineHeight: 1.6,
                fontSize: "13px",
              }}
            >
              {tr(
                "Approval, payment and invoice stages have been completed. Review the allocation below before confirming the physical lock.",
                "मंजुरी, पेमेंट आणि इनव्हॉइसचे टप्पे पूर्ण झाले आहेत. प्रत्यक्ष लॉकची पुष्टी करण्यापूर्वी खालील वाटप तपासा."
              )}
            </p>

          </div>

        </div>

      </section>

      {/* =================================
          BOOKING SUMMARY
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>

          <div>
            <h2>
              {tr(
                "Booking Summary",
                "बुकिंग सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Details of the booking being locked.",
                "लॉक केल्या जाणाऱ्या बुकिंगचा तपशील."
              )}
            </p>
          </div>

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "14px",
          }}
        >

          <div className="summary-box">
            <small>
              {tr(
                "Booking Reference",
                "बुकिंग संदर्भ"
              )}
            </small>

            <strong>
              {bookingReference || "-"}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Guest Name",
                "अतिथीचे नाव"
              )}
            </small>

            <strong>
              {guestName}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Guest Type",
                "अतिथी प्रकार"
              )}
            </small>

            <strong>
              {guestTypeLabel}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Booking ID",
                "बुकिंग ID"
              )}
            </small>

            <strong>
              {bookingId || "-"}
            </strong>
          </div>

        </div>

      </section>

      {/* =================================
          ACCOMMODATION
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>

          <div>
            <h2>
              {tr(
                "Accommodation to be Locked",
                "लॉक करावयाची निवास व्यवस्था"
              )}
            </h2>

            <p>
              {tr(
                "Review every room and bed before confirming the physical lock.",
                "प्रत्यक्ष लॉकची पुष्टी करण्यापूर्वी प्रत्येक खोली आणि बेड तपासा."
              )}
            </p>
          </div>

        </div>

        {accommodations.length === 0 ? (

          <div
            style={{
              padding: "22px",
              borderRadius: "10px",
              background: "#fff6f4",
              border: "1px solid #e6c8c3",
              color: "#7c4942",
            }}
          >
            <strong>
              {tr(
                "No accommodation selection found.",
                "निवास व्यवस्थेची निवड आढळली नाही."
              )}
            </strong>

            <p
              style={{
                margin: "7px 0 0",
                fontSize: "12px",
              }}
            >
              {tr(
                "A room or bed must be selected before the room can be locked.",
                "खोली लॉक करण्यापूर्वी खोली किंवा बेड निवडणे आवश्यक आहे."
              )}
            </p>
          </div>

        ) : (

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >

            {accommodations.map(
              (accommodation, index) => (

                <div
                  key={`${accommodation.roomId}-${accommodation.bedId || index}`}
                  style={{
                    padding: "18px",
                    border: "1px solid #d9e2d6",
                    borderRadius: "11px",
                    background: "#fafbf9",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "15px",
                    flexWrap: "wrap",
                  }}
                >

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "14px",
                    }}
                  >

                    <div
                      style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "9px",
                        background: "#e8f0e6",
                        color: "#355d3b",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 900,
                      }}
                    >
                      {index + 1}
                    </div>

                    <div>

                      <strong
                        style={{
                          display: "block",
                          color: "#304633",
                          fontSize: "16px",
                        }}
                      >
                        {accommodation.roomName}
                      </strong>

                      {accommodation.bedId ? (
                        <span
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#687367",
                            fontSize: "12px",
                          }}
                        >
                          {tr(
                            `Bed ${accommodation.bedNumber ?? "-"}`,
                            `बेड ${accommodation.bedNumber ?? "-"}`
                          )}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: "block",
                            marginTop: "5px",
                            color: "#687367",
                            fontSize: "12px",
                          }}
                        >
                          {tr(
                            "Whole Room",
                            "संपूर्ण खोली"
                          )}
                        </span>
                      )}

                      {accommodation.guestName && (
                        <span
                          style={{
                            display: "block",
                            marginTop: "4px",
                            color: "#687367",
                            fontSize: "12px",
                          }}
                        >
                          {tr(
                            "Guest",
                            "अतिथी"
                          )}
                          :{" "}
                          {accommodation.guestName}
                        </span>
                      )}

                    </div>

                  </div>

                  <span
                    style={{
                      padding: "7px 12px",
                      borderRadius: "20px",
                      background: "#e6f2e3",
                      color: "#355d3b",
                      fontSize: "11px",
                      fontWeight: 800,
                    }}
                  >
                    {tr(
                      "READY TO LOCK",
                      "लॉकसाठी तयार"
                    )}
                  </span>

                </div>

              )
            )}

          </div>

        )}

      </section>

      {/* =================================
          INVOICE SUMMARY
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>
            <h2>
              {tr(
                "Invoice & Payment Summary",
                "इनव्हॉइस आणि पेमेंट सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Financial documentation completed before room locking.",
                "खोली लॉक करण्यापूर्वी पूर्ण केलेले आर्थिक दस्तऐवजीकरण."
              )}
            </p>
          </div>

        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(4, minmax(0, 1fr))",
            gap: "14px",
          }}
        >

          <div className="summary-box">
            <small>
              {tr(
                "Invoice Number",
                "इनव्हॉइस क्रमांक"
              )}
            </small>

            <strong>
              {invoiceNumber}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Invoice Type",
                "इनव्हॉइस प्रकार"
              )}
            </small>

            <strong>
              {invoiceTypeLabel}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Total Amount",
                "एकूण रक्कम"
              )}
            </small>

            <strong>
              {formatCurrency(safeTotal)}
            </strong>
          </div>

          <div className="summary-box">
            <small>
              {tr(
                "Paid Amount",
                "भरलेली रक्कम"
              )}
            </small>

            <strong>
              {formatCurrency(safePaid)}
            </strong>
          </div>

        </div>

        <div
          style={{
            marginTop: "14px",
            padding: "16px 18px",
            borderRadius: "10px",
            background:
              balanceAmount > 0
                ? "#fff8e9"
                : "#f1f7ef",
            border:
              balanceAmount > 0
                ? "1px solid #eadfbd"
                : "1px solid #cadcc6",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >

          <strong>
            {tr(
              "Balance Amount",
              "बाकी रक्कम"
            )}
          </strong>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {formatCurrency(balanceAmount)}
          </strong>

        </div>

      </section>

      {/* =================================
          LOCK CONFIRMATION
      ================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>

          <div>
            <h2>
              {tr(
                "Physical Lock Confirmation",
                "प्रत्यक्ष लॉक पुष्टी"
              )}
            </h2>

            <p>
              {tr(
                "Confirm that the accommodation details have been reviewed.",
                "निवास व्यवस्थेचा तपशील तपासला असल्याची पुष्टी करा."
              )}
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={
            handleLockConfirmation
          }
          style={{
            width: "100%",
            textAlign: "left",
            padding: "20px",
            borderRadius: "12px",
            border: lockConfirmed
              ? "2px solid #355d3b"
              : "1px solid #d8e0d5",
            background: lockConfirmed
              ? "#f1f7ef"
              : "#ffffff",
            cursor: "pointer",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >

            <div
              style={{
                width: "30px",
                height: "30px",
                borderRadius: "7px",
                background: lockConfirmed
                  ? "#355d3b"
                  : "#e8ece6",
                color: lockConfirmed
                  ? "#ffffff"
                  : "#647060",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 900,
              }}
            >
              {lockConfirmed ? "✓" : ""}
            </div>

            <div>

              <strong
                style={{
                  color: "#304633",
                  fontSize: "14px",
                }}
              >
                {tr(
                  "I confirm that the room/bed allocation shown above has been reviewed and is ready to be physically locked.",
                  "वरील खोली / बेड वाटप तपासले असून ते प्रत्यक्ष लॉक करण्यासाठी तयार आहे याची मी पुष्टी करतो."
                )}
              </strong>

              <p
                style={{
                  margin: "6px 0 0",
                  color: "#687367",
                  fontSize: "12px",
                  lineHeight: 1.5,
                }}
              >
                {tr(
                  "Once confirmed, the booking proceeds to the Check-In stage.",
                  "पुष्टी केल्यानंतर बुकिंग Check-In टप्प्यावर जाईल."
                )}
              </p>

            </div>

          </div>

        </button>

      </section>

      {/* =================================
          LOCK STATUS
      ================================== */}

      {lockConfirmed && (
        <section
          className="booking-card"
          style={{
            padding: "22px 26px",
            background: "#edf7eb",
            border: "1px solid #c4ddbf",
          }}
        >

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >

            <span
              style={{
                fontSize: "25px",
              }}
            >
              🔒
            </span>

            <div>

              <strong
                style={{
                  display: "block",
                  color: "#304f35",
                  fontSize: "17px",
                }}
              >
                {tr(
                  "ROOM / BED LOCK CONFIRMED",
                  "खोली / बेड लॉक पुष्टी झाली"
                )}
              </strong>

              <span
                style={{
                  display: "block",
                  marginTop: "5px",
                  color: "#657064",
                  fontSize: "12px",
                }}
              >
                {tr(
                  "Ready to proceed to Check-In.",
                  "Check-In साठी पुढे जाण्यास तयार."
                )}
              </span>

            </div>

          </div>

        </section>
      )}

      {/* =================================
          FOOTER
      ================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={onBack}
        >
          {tr(
            "BACK TO INVOICE",
            "इनव्हॉसकडे मागे"
          )}
        </button>

        <button
          type="button"
          className="continue-booking-button"
          onClick={handleContinue}
          disabled={!lockConfirmed}
          style={{
            opacity: lockConfirmed
              ? 1
              : 0.55,
            cursor: lockConfirmed
              ? "pointer"
              : "not-allowed",
          }}
        >
          {tr(
            "PROCEED TO CHECK-IN →",
            "CHECK-IN कडे जा →"
          )}
        </button>

      </div>

    </main>
  );
}

export default RoomLocked;