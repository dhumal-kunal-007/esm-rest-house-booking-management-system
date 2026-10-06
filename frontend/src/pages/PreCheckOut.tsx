import { useState } from "react";

import "../App.css";
import { useLanguage } from "../i18n/LanguageContext";

/* =========================================
   TYPES
========================================= */

export interface PreCheckOutAccommodation {
  roomId: string;
  roomName: string;
  bedId?: string;
  bedNumber?: number;
}

export interface PreCheckOutData {
  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  accommodations: PreCheckOutAccommodation[];

  scheduledCheckOutDate: string;

  preCheckOutDate: string;

  preCheckOutTime: string;

  reason: string;

  totalAmount: number;

  paidAmount: number;

  remarks: string;
}

interface PreCheckOutProps {
  officerName: string;

  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  accommodations: PreCheckOutAccommodation[];

  scheduledCheckOutDate: string;

  totalAmount: number;

  paidAmount: number;

  onBack: () => void;

  onContinue: (
    data: PreCheckOutData
  ) => void;
}

/* =========================================
   HELPERS
========================================= */

const getTodayDate = (): string => {
  const now = new Date();

  const year =
    now.getFullYear();

  const month =
    String(
      now.getMonth() + 1
    ).padStart(2, "0");

  const day =
    String(
      now.getDate()
    ).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentTime = (): string => {
  const now = new Date();

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  return `${hours}:${minutes}`;
};

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

/* =========================================
   COMPONENT
========================================= */

function PreCheckOut({
  officerName,
  bookingId,
  bookingReference,
  guestId,
  guestName,
  guestType,
  accommodations,
  scheduledCheckOutDate,
  totalAmount,
  paidAmount,
  onBack,
  onContinue,
}: PreCheckOutProps) {
  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi =
    language === "mr";

  /* =========================================
     STATE
  ========================================= */

  const [
    preCheckOutDate,
    setPreCheckOutDate,
  ] = useState(
    getTodayDate()
  );

  const [
    preCheckOutTime,
    setPreCheckOutTime,
  ] = useState(
    getCurrentTime()
  );

  const [
    reason,
    setReason,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    confirmed,
    setConfirmed,
  ] = useState(false);

  /* =========================================
     TRANSLATION
  ========================================= */

  const tr = (
    english: string,
    marathi: string
  ) =>
    isMarathi
      ? marathi
      : english;

  /* =========================================
     GUEST TYPE
  ========================================= */

  const guestTypeLabel =
    guestType === "ESM"
      ? tr(
          "ESM",
          "माजी सैनिक"
        )
      : guestType ===
        "SERVING"
      ? tr(
          "Serving",
          "सेवारत"
        )
      : tr(
          "Civilian",
          "नागरिक"
        );

  /* =========================================
     FINANCIAL VALUES
  ========================================= */

  const safeTotal =
    Math.max(
      0,
      totalAmount
    );

  const safePaid =
    Math.max(
      0,
      Math.min(
        paidAmount,
        safeTotal
      )
    );

  const currentBalance =
    Math.max(
      0,
      safeTotal -
        safePaid
    );

  /* =========================================
     VALIDATION
  ========================================= */

  const validateForm =
    (): boolean => {
      if (
        !preCheckOutDate
      ) {
        window.alert(
          tr(
            "Please select the pre check-out date.",
            "कृपया प्री चेक-आउट तारीख निवडा."
          )
        );

        return false;
      }

      if (
        !preCheckOutTime
      ) {
        window.alert(
          tr(
            "Please select the pre check-out time.",
            "कृपया प्री चेक-आउट वेळ निवडा."
          )
        );

        return false;
      }

      if (
        !reason.trim()
      ) {
        window.alert(
          tr(
            "Please enter the reason for pre check-out.",
            "कृपया प्री चेक-आउटचे कारण प्रविष्ट करा."
          )
        );

        return false;
      }

      if (
        accommodations.length === 0
      ) {
        window.alert(
          tr(
            "No room or bed information is available for this booking.",
            "या बुकिंगसाठी खोली किंवा बेडची माहिती उपलब्ध नाही."
          )
        );

        return false;
      }

      if (
        !confirmed
      ) {
        window.alert(
          tr(
            "Please confirm the pre check-out details.",
            "कृपया प्री चेक-आउट तपशीलाची पुष्टी करा."
          )
        );

        return false;
      }

      return true;
    };

  /* =========================================
     CONTINUE
  ========================================= */

  const handleContinue =
    () => {
      if (
        !validateForm()
      ) {
        return;
      }

      const data:
        PreCheckOutData = {
        bookingId,
        bookingReference,

        guestId,
        guestName,

        guestType,

        accommodations,

        scheduledCheckOutDate,

        preCheckOutDate,

        preCheckOutTime,

        reason:
          reason.trim(),

        totalAmount:
          safeTotal,

        paidAmount:
          safePaid,

        remarks:
          remarks.trim(),
      };

      onContinue(
        data
      );
    };

  /* =========================================
     LANGUAGE SWITCHER
  ========================================= */

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

  /* =========================================
     UI
  ========================================= */

  return (
    <main className="booking-screen">

      {/* =====================================
          HEADER
      ===================================== */}

      <header className="booking-header">

        <div>

          <span className="section-label">
            {tr(
              "PRE CHECK-OUT",
              "प्री चेक-आउट"
            )}
          </span>

          <h1>
            {tr(
              "Pre Check-Out",
              "प्री चेक-आउट"
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
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "14px",
            flexWrap:
              "wrap",
            justifyContent:
              "flex-end",
          }}
        >

          {languageSwitcher}

          <button
            type="button"
            className="availability-back-button"
            onClick={
              onBack
            }
          >
            ←{" "}
            {tr(
              "Back",
              "मागे"
            )}
          </button>

        </div>

      </header>


      {/* =====================================
          WORKFLOW
      ===================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "20px 24px",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
            flexWrap:
              "wrap",
          }}
        >

          <span className="workflow-pill">
            CHECK-IN
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
              fontWeight:
                800,
            }}
          >
            PRE CHECK-OUT
          </span>

          <span>→</span>

          <span className="workflow-pill">
            REFUND CALCULATION
          </span>

          <span>→</span>

          <span className="workflow-pill">
            REFUND MEMO
          </span>

        </div>

      </section>


      {/* =====================================
          NOTICE
      ===================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "22px 28px",
          background:
            "#fffaf0",
          border:
            "1px solid #eadfbd",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "flex-start",
            gap:
              "14px",
          }}
        >

          <div
            style={{
              width:
                "42px",
              height:
                "42px",
              minWidth:
                "42px",
              borderRadius:
                "50%",
              background:
                "#f1e4bd",
              color:
                "#765f25",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontWeight:
                900,
              fontSize:
                "18px",
            }}
          >
            !
          </div>

          <div>

            <strong
              style={{
                display:
                  "block",
                color:
                  "#5f512f",
                fontSize:
                  "15px",
                marginBottom:
                  "5px",
              }}
            >
              {tr(
                "Pre Check-Out Request",
                "प्री चेक-आउट विनंती"
              )}
            </strong>

            <span
              style={{
                color:
                  "#71664b",
                fontSize:
                  "12px",
                lineHeight:
                  1.6,
              }}
            >
              {tr(
                "This stage records that the guest is checking out before the scheduled check-out date. Refund calculation is handled in the next stage.",
                "या टप्प्यात अतिथी नियोजित चेक-आउट तारखेपूर्वी चेक-आउट करत असल्याची नोंद केली जाते. रिफंडची गणना पुढील टप्प्यात केली जाईल."
              )}
            </span>

          </div>

        </div>

      </section>


      {/* =====================================
          BOOKING SUMMARY
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>

          <div>

            <h2>
              {tr(
                "Booking & Guest Details",
                "बुकिंग आणि अतिथी तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Review the guest and accommodation information.",
                "अतिथी आणि निवास व्यवस्थेची माहिती तपासा."
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

          <div className="summary-box">

            <small>
              {tr(
                "Booking Reference",
                "बुकिंग संदर्भ"
              )}
            </small>

            <strong>
              {bookingReference ||
                "-"}
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
              {bookingId ||
                "-"}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          ACCOMMODATION
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>

          <div>

            <h2>
              {tr(
                "Current Accommodation",
                "सध्याची निवास व्यवस्था"
              )}
            </h2>

            <p>
              {tr(
                "Accommodation currently associated with this booking.",
                "या बुकिंगशी सध्या संबंधित निवास व्यवस्था."
              )}
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

          {accommodations.map(
            (
              accommodation,
              index
            ) => (

              <div
                key={`${accommodation.roomId}-${accommodation.bedId || index}`}
                style={{
                  padding:
                    "17px",
                  border:
                    "1px solid #dce3d8",
                  borderRadius:
                    "11px",
                  background:
                    "#fafbf9",
                  display:
                    "flex",
                  justifyContent:
                    "space-between",
                  alignItems:
                    "center",
                  gap:
                    "14px",
                  flexWrap:
                    "wrap",
                }}
              >

                <div>

                  <strong
                    style={{
                      display:
                        "block",
                      color:
                        "#304633",
                      fontSize:
                        "15px",
                    }}
                  >
                    {accommodation.roomName}
                  </strong>

                  <span
                    style={{
                      display:
                        "block",
                      marginTop:
                        "5px",
                      color:
                        "#687367",
                      fontSize:
                        "12px",
                    }}
                  >
                    {accommodation.bedId
                      ? tr(
                          `Bed ${accommodation.bedNumber ?? "-"}`,
                          `बेड ${accommodation.bedNumber ?? "-"}`
                        )
                      : tr(
                          "Whole Room",
                          "संपूर्ण खोली"
                        )}
                  </span>

                </div>

                <span
                  style={{
                    padding:
                      "7px 12px",
                    borderRadius:
                      "20px",
                    background:
                      "#edf2eb",
                    color:
                      "#526452",
                    fontSize:
                      "11px",
                    fontWeight:
                      800,
                  }}
                >
                  {tr(
                    "CURRENT ALLOCATION",
                    "सध्याचे वाटप"
                  )}
                </span>

              </div>

            )
          )}

        </div>

      </section>


      {/* =====================================
          CHECKOUT DATES
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>

          <div>

            <h2>
              {tr(
                "Check-Out Details",
                "चेक-आउट तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Record the actual pre check-out date and time.",
                "प्रत्यक्ष प्री चेक-आउट तारीख आणि वेळ नोंदवा."
              )}
            </p>

          </div>

        </div>


        <div className="booking-grid">

          <div className="form-field">

            <label>
              {tr(
                "Scheduled Check-Out Date",
                "नियोजित चेक-आउट तारीख"
              )}
            </label>

            <input
              type="date"
              value={
                scheduledCheckOutDate
              }
              readOnly
            />

          </div>


          <div className="form-field">

            <label>
              {tr(
                "Pre Check-Out Date *",
                "प्री चेक-आउट तारीख *"
              )}
            </label>

            <input
              type="date"
              value={
                preCheckOutDate
              }
              max={
                getTodayDate()
              }
              onChange={(
                event
              ) =>
                setPreCheckOutDate(
                  event.target
                    .value
                )
              }
            />

          </div>


          <div className="form-field">

            <label>
              {tr(
                "Pre Check-Out Time *",
                "प्री चेक-आउट वेळ *"
              )}
            </label>

            <input
              type="time"
              value={
                preCheckOutTime
              }
              onChange={(
                event
              ) =>
                setPreCheckOutTime(
                  event.target
                    .value
                )
              }
            />

          </div>

        </div>

      </section>


      {/* =====================================
          REASON
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            04
          </span>

          <div>

            <h2>
              {tr(
                "Reason for Pre Check-Out",
                "प्री चेक-आउटचे कारण"
              )}
            </h2>

            <p>
              {tr(
                "Record why the guest is checking out early.",
                "अतिथी लवकर चेक-आउट का करत आहे याची नोंद करा."
              )}
            </p>

          </div>

        </div>


        <div className="form-field">

          <label>
            {tr(
              "Reason *",
              "कारण *"
            )}
          </label>

          <textarea
            value={
              reason
            }
            onChange={(
              event
            ) =>
              setReason(
                event.target
                  .value
              )
            }
            rows={4}
            placeholder={tr(
              "Enter the reason for pre check-out...",
              "प्री चेक-आउटचे कारण प्रविष्ट करा..."
            )}
          />

        </div>

      </section>


      {/* =====================================
          FINANCIAL SUMMARY
      ===================================== */}

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
                "Current booking financial information. Refund calculation will be performed separately.",
                "सध्याची बुकिंग आर्थिक माहिती. रिफंडची गणना स्वतंत्रपणे केली जाईल."
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
                "14px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Total Amount",
                "एकूण रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                safeTotal
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
                "14px 16px",
              borderBottom:
                "1px solid #e5e9e2",
            }}
          >

            <span>
              {tr(
                "Paid Amount",
                "भरलेली रक्कम"
              )}
            </span>

            <strong>
              {formatCurrency(
                safePaid
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
                "16px",
              marginTop:
                "5px",
              borderRadius:
                "10px",
              background:
                "#f1f7ef",
            }}
          >

            <strong>
              {tr(
                "Current Balance",
                "सध्याची बाकी"
              )}
            </strong>

            <strong
              style={{
                fontSize:
                  "19px",
              }}
            >
              {formatCurrency(
                currentBalance
              )}
            </strong>

          </div>

        </div>


        <div
          style={{
            marginTop:
              "15px",
            padding:
              "13px 15px",
            borderRadius:
              "9px",
            background:
              "#fffaf0",
            border:
              "1px solid #eadfbd",
            color:
              "#6c6044",
            fontSize:
              "12px",
            lineHeight:
              1.6,
          }}
        >
          <strong>
            {tr(
              "Note:",
              "टीप:"
            )}
          </strong>{" "}
          {tr(
            "No refund amount is calculated on this screen. The next Refund Calculation stage will determine the applicable amount.",
            "या स्क्रीनवर रिफंडची रक्कम मोजली जात नाही. पुढील Refund Calculation टप्प्यात लागू रक्कम निश्चित केली जाईल."
          )}
        </div>

      </section>


      {/* =====================================
          REMARKS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            05
          </span>

          <div>

            <h2>
              {tr(
                "Additional Remarks",
                "अतिरिक्त शेरा"
              )}
            </h2>

            <p>
              {tr(
                "Optional information related to the pre check-out.",
                "प्री चेक-आउटशी संबंधित ऐच्छिक माहिती."
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
            onChange={(
              event
            ) =>
              setRemarks(
                event.target
                  .value
              )
            }
            rows={3}
            placeholder={tr(
              "Enter additional remarks if required...",
              "आवश्यक असल्यास अतिरिक्त शेरा प्रविष्ट करा..."
            )}
          />

        </div>

      </section>


      {/* =====================================
          CONFIRMATION
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            06
          </span>

          <div>

            <h2>
              {tr(
                "Confirmation",
                "पुष्टी"
              )}
            </h2>

            <p>
              {tr(
                "Confirm the information before moving to refund calculation.",
                "रिफंड गणनेकडे जाण्यापूर्वी माहितीची पुष्टी करा."
              )}
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={() =>
            setConfirmed(
              !confirmed
            )
          }
          style={{
            width:
              "100%",
            textAlign:
              "left",
            padding:
              "19px",
            borderRadius:
              "12px",
            border:
              confirmed
                ? "2px solid #355d3b"
                : "1px solid #d8e0d5",
            background:
              confirmed
                ? "#f1f7ef"
                : "#ffffff",
            cursor:
              "pointer",
          }}
        >

          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap:
                "14px",
            }}
          >

            <div
              style={{
                width:
                  "30px",
                height:
                  "30px",
                borderRadius:
                  "7px",
                background:
                  confirmed
                    ? "#355d3b"
                    : "#e8ece6",
                color:
                  confirmed
                    ? "#ffffff"
                    : "#647060",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                fontWeight:
                  900,
              }}
            >
              {confirmed
                ? "✓"
                : ""}
            </div>

            <div>

              <strong
                style={{
                  display:
                    "block",
                  color:
                    "#304633",
                  fontSize:
                    "14px",
                }}
              >
                {tr(
                  "I confirm that the pre check-out details are correct and the guest is proceeding to refund calculation.",
                  "प्री चेक-आउट तपशील योग्य आहेत आणि अतिथी रिफंड गणनेकडे जात आहे याची मी पुष्टी करतो."
                )}
              </strong>

              <span
                style={{
                  display:
                    "block",
                  marginTop:
                    "5px",
                  color:
                    "#687367",
                  fontSize:
                    "12px",
                }}
              >
                {tr(
                  "The refund amount will be calculated in the next stage.",
                  "रिफंडची रक्कम पुढील टप्प्यात मोजली जाईल."
                )}
              </span>

            </div>

          </div>

        </button>

      </section>


      {/* =====================================
          FOOTER
      ===================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={
            onBack
          }
        >
          {tr(
            "BACK",
            "मागे"
          )}
        </button>


        <button
          type="button"
          className="continue-booking-button"
          onClick={
            handleContinue
          }
          disabled={
            !confirmed
          }
          style={{
            opacity:
              confirmed
                ? 1
                : 0.55,
            cursor:
              confirmed
                ? "pointer"
                : "not-allowed",
          }}
        >
          {tr(
            "PROCEED TO REFUND CALCULATION →",
            "रिफंड गणनेकडे जा →"
          )}
        </button>

      </div>

    </main>
  );
}

export default PreCheckOut;