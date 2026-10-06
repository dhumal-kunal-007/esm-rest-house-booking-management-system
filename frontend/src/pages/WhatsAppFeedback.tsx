import { useState } from "react";

import "../App.css";
import { useLanguage } from "../i18n/LanguageContext";
import { getWhatsAppChatUrl } from "../whatsapp";

/* =========================================
   TYPES
========================================= */

export type FeedbackStatus =
  | "PENDING"
  | "SENT"
  | "SKIPPED";

export interface WhatsAppFeedbackData {
  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;
  mobile?: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  refundMemoNumber?: string;
  refundAmount: number;

  feedbackStatus: FeedbackStatus;

  whatsappMessage: string;

  remarks: string;

  completedAt: string;
}

interface WhatsAppFeedbackProps {
  officerName: string;

  bookingId?: string;
  bookingReference?: string;

  guestId?: string;
  guestName: string;
  mobile?: string;

  guestType:
    | "ESM"
    | "SERVING"
    | "CIVILIAN";

  refundMemoNumber?: string;
  refundAmount: number;

  onBack: () => void;

  onComplete: (
    data: WhatsAppFeedbackData
  ) => void;
}

/* =========================================
   HELPERS
========================================= */

const getCurrentDateTime = (): string => {
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

  const hours =
    String(
      now.getHours()
    ).padStart(2, "0");

  const minutes =
    String(
      now.getMinutes()
    ).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
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

function WhatsAppFeedback({
  officerName,

  bookingId,
  bookingReference,

  guestId,
  guestName,
  mobile,

  guestType,

  refundMemoNumber,
  refundAmount,

  onBack,
  onComplete,
}: WhatsAppFeedbackProps) {
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
    feedbackStatus,
    setFeedbackStatus,
  ] =
    useState<FeedbackStatus>(
      "PENDING"
    );

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
     WHATSAPP MESSAGE
  ========================================= */

  const englishMessage = `Dear ${guestName},

Thank you for staying at ESM Rest House.

We value your feedback regarding your stay and request you to share your experience with us.

Booking Reference: ${
    bookingReference || "-"
  }

Refund Memo: ${
    refundMemoNumber || "-"
  }

Refund Amount: ${formatCurrency(
    refundAmount
  )}

Thank you.

ESM Rest House`;

  const marathiMessage = `प्रिय ${guestName},

ESM Rest House मध्ये मुक्काम केल्याबद्दल धन्यवाद.

आपल्या मुक्कामाबाबतचा अभिप्राय आमच्यासाठी महत्त्वाचा आहे. कृपया आपल्या अनुभवाबद्दल अभिप्राय द्यावा.

बुकिंग संदर्भ: ${
    bookingReference || "-"
  }

रिफंड मेमो: ${
    refundMemoNumber || "-"
  }

रिफंड रक्कम: ${formatCurrency(
    refundAmount
  )}

धन्यवाद.

ESM Rest House`;

  const whatsappMessage =
    isMarathi
      ? marathiMessage
      : englishMessage;

  const openWhatsApp = () => {
    if (!mobile) {
      window.alert(
        tr(
          "The guest does not have a mobile number for WhatsApp.",
          "अतिथीकडे WhatsApp साठी मोबाईल क्रमांक उपलब्ध नाही."
        )
      );
      return;
    }

    try {
      window.open(
        getWhatsAppChatUrl(mobile, whatsappMessage),
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : tr(
              "Unable to open WhatsApp.",
              "WhatsApp उघडता आले नाही."
            )
      );
    }
  };

  /* =========================================
     VALIDATION
  ========================================= */

  const validateCompletion =
    (): boolean => {
      if (
        feedbackStatus ===
        "PENDING"
      ) {
        window.alert(
          tr(
            "Please select the WhatsApp feedback status.",
            "कृपया WhatsApp फीडबॅकची स्थिती निवडा."
          )
        );

        return false;
      }

      if (
        !confirmed
      ) {
        window.alert(
          tr(
            "Please confirm completion of the WhatsApp feedback stage.",
            "कृपया WhatsApp फीडबॅक टप्पा पूर्ण झाल्याची पुष्टी करा."
          )
        );

        return false;
      }

      return true;
    };

  /* =========================================
     COMPLETE
  ========================================= */

  const handleComplete =
    () => {
      if (
        !validateCompletion()
      ) {
        return;
      }

      const data:
        WhatsAppFeedbackData =
        {
          bookingId,
          bookingReference,

          guestId,
          guestName,
          mobile,

          guestType,

          refundMemoNumber,
          refundAmount,

          feedbackStatus,

          whatsappMessage,

          remarks:
            remarks.trim(),

          completedAt:
            getCurrentDateTime(),
        };

      onComplete(
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
            WHATSAPP FEEDBACK
          </span>

          <h1>
            {tr(
              "WhatsApp Feedback",
              "WhatsApp अभिप्राय"
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
          COMPLETE WORKFLOW
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
            REGISTRATION
          </span>

          <span>→</span>

          <span className="workflow-pill">
            AVAILABILITY
          </span>

          <span>→</span>

          <span className="workflow-pill">
            CHOICE OF ROOM
          </span>

          <span>→</span>

          <span className="workflow-pill">
            ACCEPTANCE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            GUEST TYPE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            RATE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            BOOKING
          </span>

          <span>→</span>

          <span className="workflow-pill">
            APPROVAL
          </span>

          <span>→</span>

          <span className="workflow-pill">
            PAYMENT
          </span>

          <span>→</span>

          <span className="workflow-pill">
            INVOICE
          </span>

          <span>→</span>

          <span className="workflow-pill">
            ROOM LOCKED
          </span>

          <span>→</span>

          <span className="workflow-pill">
            CHECK-IN
          </span>

          <span>→</span>

          <span className="workflow-pill">
            CHECK-OUT
          </span>

          <span>→</span>

          <span className="workflow-pill">
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
            WHATSAPP FEEDBACK
          </span>

        </div>

      </section>


      {/* =====================================
          SUCCESS / END MESSAGE
      ===================================== */}

      <section
        className="booking-card"
        style={{
          padding:
            "26px 28px",
          background:
            "#f1f7ef",
          border:
            "1px solid #cadcc6",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "flex-start",
            gap:
              "16px",
          }}
        >

          <div
            style={{
              width:
                "46px",
              height:
                "46px",
              minWidth:
                "46px",
              borderRadius:
                "50%",
              background:
                "#355d3b",
              color:
                "#ffffff",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              fontSize:
                "22px",
              fontWeight:
                900,
            }}
          >
            ✓
          </div>

          <div>

            <h2
              style={{
                margin:
                  "0 0 6px",
                color:
                  "#304633",
              }}
            >
              {tr(
                "Final Stage — Guest Feedback",
                "अंतिम टप्पा — अतिथी अभिप्राय"
              )}
            </h2>

            <p
              style={{
                margin:
                  0,
                color:
                  "#526452",
                fontSize:
                  "13px",
                lineHeight:
                  1.6,
              }}
            >
              {tr(
                "The refund memo has been prepared. The guest can now be contacted through WhatsApp for feedback.",
                "रिफंड मेमो तयार आहे. आता अतिथीशी WhatsApp द्वारे संपर्क करून अभिप्राय घेता येईल."
              )}
            </p>

          </div>

        </div>

      </section>


      {/* =====================================
          BOOKING DETAILS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            01
          </span>

          <div>

            <h2>
              {tr(
                "Guest & Booking Details",
                "अतिथी आणि बुकिंग तपशील"
              )}
            </h2>

            <p>
              {tr(
                "Details of the completed booking.",
                "पूर्ण झालेल्या बुकिंगचे तपशील."
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
                "Mobile Number",
                "मोबाईल क्रमांक"
              )}
            </small>

            <strong>
              {mobile ||
                tr(
                  "Not available",
                  "उपलब्ध नाही"
                )}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          REFUND SUMMARY
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            ₹
          </span>

          <div>

            <h2>
              {tr(
                "Refund Summary",
                "रिफंड सारांश"
              )}
            </h2>

            <p>
              {tr(
                "Refund information linked to the guest feedback.",
                "अतिथी अभिप्रायाशी संबंधित रिफंड माहिती."
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

          <div className="summary-box">

            <small>
              {tr(
                "Refund Memo Number",
                "रिफंड मेमो क्रमांक"
              )}
            </small>

            <strong>
              {refundMemoNumber ||
                "-"}
            </strong>

          </div>


          <div
            className="summary-box"
            style={{
              background:
                "#f1f7ef",
              border:
                "1px solid #cadcc6",
            }}
          >

            <small>
              {tr(
                "Refund Amount",
                "रिफंड रक्कम"
              )}
            </small>

            <strong
              style={{
                color:
                  "#304f35",
                fontSize:
                  "20px",
              }}
            >
              {formatCurrency(
                refundAmount
              )}
            </strong>

          </div>

        </div>

      </section>


      {/* =====================================
          WHATSAPP MESSAGE
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            02
          </span>

          <div>

            <h2>
              {tr(
                "WhatsApp Message",
                "WhatsApp संदेश"
              )}
            </h2>

            <p>
              {tr(
                "Review the message that will be used for guest feedback.",
                "अतिथी अभिप्रायासाठी वापरला जाणारा संदेश तपासा."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            border:
              "1px solid #d7dfd3",
            borderRadius:
              "12px",
            overflow:
              "hidden",
          }}
        >

          <div
            style={{
              padding:
                "14px 18px",
              background:
                "#f4f7f2",
              borderBottom:
                "1px solid #d7dfd3",
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
            }}
          >

            <strong
              style={{
                color:
                  "#304633",
              }}
            >
              {tr(
                "Message Preview",
                "संदेश पूर्वदृश्य"
              )}
            </strong>

            <span
              style={{
                padding:
                  "5px 10px",
                borderRadius:
                  "15px",
                background:
                  "#e4eee1",
                color:
                  "#526452",
                fontSize:
                  "11px",
                fontWeight:
                  700,
              }}
            >
              WhatsApp
            </span>

          </div>


          <div
            style={{
              padding:
                "20px",
              whiteSpace:
                "pre-line",
              lineHeight:
                1.7,
              color:
                "#394439",
              fontSize:
                "13px",
              background:
                "#ffffff",
            }}
          >
            {whatsappMessage}
          </div>

        </div>

        <button
          type="button"
          onClick={openWhatsApp}
          disabled={!mobile}
          style={{
            marginTop: 14,
            padding: "12px 18px",
            border: 0,
            borderRadius: 8,
            background: mobile ? "#15803d" : "#94a3b8",
            color: "#fff",
            fontWeight: 800,
            cursor: mobile ? "pointer" : "not-allowed",
          }}
        >
          {tr(
            "Open WhatsApp with this message",
            "हा संदेश WhatsApp मध्ये उघडा"
          )}
        </button>
        <p>
          {tr(
            "The message is not sent automatically. Mark it SENT only after you send it in WhatsApp.",
            "संदेश आपोआप पाठवला जात नाही. WhatsApp मध्ये पाठवल्यानंतरच SENT निवडा."
          )}
        </p>

      </section>


      {/* =====================================
          FEEDBACK STATUS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            03
          </span>

          <div>

            <h2>
              {tr(
                "Feedback Status",
                "अभिप्राय स्थिती"
              )}
            </h2>

            <p>
              {tr(
                "Record what happened with the WhatsApp feedback request.",
                "WhatsApp अभिप्राय विनंतीचे परिणाम नोंदवा."
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

          {/* SENT */}

          <button
            type="button"
            onClick={() =>
              setFeedbackStatus(
                "SENT"
              )
            }
            style={{
              textAlign:
                "left",
              padding:
                "20px",
              borderRadius:
                "12px",
              border:
                feedbackStatus ===
                "SENT"
                  ? "2px solid #355d3b"
                  : "1px solid #d8e0d5",
              background:
                feedbackStatus ===
                "SENT"
                  ? "#f1f7ef"
                  : "#ffffff",
              cursor:
                "pointer",
            }}
          >

            <div
              style={{
                fontSize:
                  "24px",
                marginBottom:
                  "8px",
              }}
            >
              ✓
            </div>

            <strong
              style={{
                display:
                  "block",
                color:
                  "#304633",
                marginBottom:
                  "5px",
              }}
            >
              {tr(
                "Feedback Request Sent",
                "अभिप्राय विनंती पाठवली"
              )}
            </strong>

            <span
              style={{
                color:
                  "#687367",
                fontSize:
                  "12px",
                lineHeight:
                  1.5,
              }}
            >
              {tr(
                "Select this when the WhatsApp feedback request has been sent.",
                "WhatsApp अभिप्राय विनंती पाठवली असल्यास हा पर्याय निवडा."
              )}
            </span>

          </button>


          {/* SKIPPED */}

          <button
            type="button"
            onClick={() =>
              setFeedbackStatus(
                "SKIPPED"
              )
            }
            style={{
              textAlign:
                "left",
              padding:
                "20px",
              borderRadius:
                "12px",
              border:
                feedbackStatus ===
                "SKIPPED"
                  ? "2px solid #8a6b2e"
                  : "1px solid #d8e0d5",
              background:
                feedbackStatus ===
                "SKIPPED"
                  ? "#fffaf0"
                  : "#ffffff",
              cursor:
                "pointer",
            }}
          >

            <div
              style={{
                fontSize:
                  "24px",
                marginBottom:
                  "8px",
              }}
            >
              —
            </div>

            <strong
              style={{
                display:
                  "block",
                color:
                  "#5f512f",
                marginBottom:
                  "5px",
              }}
            >
              {tr(
                "Feedback Not Sent",
                "अभिप्राय पाठवला नाही"
              )}
            </strong>

            <span
              style={{
                color:
                  "#71664b",
                fontSize:
                  "12px",
                lineHeight:
                  1.5,
              }}
            >
              {tr(
                "Select this when the feedback request could not be sent or was skipped.",
                "अभिप्राय विनंती पाठवता आली नाही किंवा वगळली असल्यास हा पर्याय निवडा."
              )}
            </span>

          </button>

        </div>

      </section>


      {/* =====================================
          REMARKS
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            04
          </span>

          <div>

            <h2>
              {tr(
                "Feedback Remarks",
                "अभिप्राय शेरा"
              )}
            </h2>

            <p>
              {tr(
                "Record any relevant information.",
                "आवश्यक माहिती नोंदवा."
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
            rows={4}
            placeholder={tr(
              "Enter feedback remarks...",
              "अभिप्राय शेरा प्रविष्ट करा..."
            )}
          />

        </div>

      </section>


      {/* =====================================
          FINAL CONFIRMATION
      ===================================== */}

      <section className="booking-card">

        <div className="booking-section-title">

          <span>
            05
          </span>

          <div>

            <h2>
              {tr(
                "Complete Booking Cycle",
                "बुकिंग प्रक्रिया पूर्ण करा"
              )}
            </h2>

            <p>
              {tr(
                "This is the final stage of the defined workflow.",
                "हा निश्चित केलेल्या workflow मधील अंतिम टप्पा आहे."
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
              "20px",
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
                  "32px",
                height:
                  "32px",
                borderRadius:
                  "8px",
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
                fontSize:
                  "17px",
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
                  "I confirm that the WhatsApp feedback stage has been reviewed and the booking workflow can be completed.",
                  "WhatsApp अभिप्राय टप्प्याचा तपशील तपासला असून बुकिंग workflow पूर्ण करता येईल याची मी पुष्टी करतो."
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
                  "No further workflow stage is required after this screen.",
                  "या स्क्रीननंतर कोणताही पुढील workflow stage आवश्यक नाही."
                )}
              </span>

            </div>

          </div>

        </button>

      </section>


      {/* =====================================
          FINAL ACTIONS
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
            "BACK TO REFUND MEMO",
            "रिफंड मेमोकडे मागे"
          )}
        </button>


        <button
          type="button"
          className="continue-booking-button"
          onClick={
            handleComplete
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
            "COMPLETE WORKFLOW ✓",
            "WORKFLOW पूर्ण करा ✓"
          )}
        </button>

      </div>


      {/* =====================================
          END
      ===================================== */}

      {confirmed &&
        feedbackStatus !==
          "PENDING" && (
          <section
            className="booking-card"
            style={{
              textAlign:
                "center",
              padding:
                "30px",
              background:
                "#f1f7ef",
              border:
                "1px solid #cadcc6",
            }}
          >

            <div
              style={{
                fontSize:
                  "40px",
                marginBottom:
                  "10px",
              }}
            >
              ✓
            </div>

            <h2
              style={{
                margin:
                  "0 0 7px",
                color:
                  "#304633",
              }}
            >
              {tr(
                "Workflow Ready to Complete",
                "Workflow पूर्ण करण्यासाठी तयार आहे"
              )}
            </h2>

            <p
              style={{
                margin:
                  0,
                color:
                  "#526452",
                fontSize:
                  "13px",
              }}
            >
              {tr(
                "Click “Complete Workflow” to finish this booking cycle.",
                "ही बुकिंग प्रक्रिया पूर्ण करण्यासाठी “Complete Workflow” वर क्लिक करा."
              )}
            </p>

          </section>
        )}

    </main>
  );
}

export default WhatsAppFeedback;