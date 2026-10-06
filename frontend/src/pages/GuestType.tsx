import { useState } from "react";

import "../App.css";

import { useLanguage } from "../i18n/LanguageContext";

/* =================================
   TYPES
================================== */

export type GuestTypeValue =
  | "ESM"
  | "SERVING"
  | "CIVILIAN";

interface GuestTypeProps {
  officerName: string;

  onBack: () => void;

  onContinue: (
    guestType: GuestTypeValue
  ) => void;
}

/* =================================
   COMPONENT
================================== */

function GuestType({
  officerName,
  onBack,
  onContinue,
}: GuestTypeProps) {

  const {
    language,
    setLanguage,
  } = useLanguage();

  const isMarathi =
    language === "mr";

  /* =================================
     TRANSLATION HELPER
  ================================== */

  const tr = (
    english: string,
    marathi: string
  ) =>
    isMarathi
      ? marathi
      : english;

  /* =================================
     STATE
  ================================== */

  const [
    selectedGuestType,
    setSelectedGuestType,
  ] = useState<GuestTypeValue | "">("");

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
     CONTINUE
  ================================== */

  const handleContinue = () => {

    if (!selectedGuestType) {
      window.alert(
        tr(
          "Please select the Guest Type.",
          "कृपया अतिथीचा प्रकार निवडा."
        )
      );

      return;
    }

    onContinue(
      selectedGuestType
    );
  };

  /* =================================
     GUEST TYPE CARD
  ================================== */

  const renderGuestTypeCard = (
    type: GuestTypeValue,
    number: string,
    title: string,
    marathiTitle: string,
    description: string,
    marathiDescription: string
  ) => {

    const isSelected =
      selectedGuestType === type;

    return (
      <button
        type="button"
        onClick={() =>
          setSelectedGuestType(type)
        }
        style={{
          width: "100%",
          textAlign: "left",
          border: isSelected
            ? "2px solid #355d3b"
            : "1px solid #dce3d8",
          background: isSelected
            ? "#f1f7ef"
            : "#ffffff",
          borderRadius: "14px",
          padding: "24px",
          cursor: "pointer",
          transition:
            "all 0.2s ease",
          boxShadow: isSelected
            ? "0 6px 18px rgba(53, 93, 59, 0.12)"
            : "0 2px 8px rgba(40, 55, 40, 0.04)",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "16px",
          }}
        >

          {/* NUMBER */}

          <div
            style={{
              width: "42px",
              height: "42px",
              minWidth: "42px",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: isSelected
                ? "#355d3b"
                : "#e9eee7",
              color: isSelected
                ? "#ffffff"
                : "#5d695b",
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            {isSelected
              ? "✓"
              : number}
          </div>


          {/* CONTENT */}

          <div
            style={{
              flex: 1,
            }}
          >

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: "12px",
                flexWrap: "wrap",
              }}
            >

              <h3
                style={{
                  margin: 0,
                  color: "#304633",
                  fontSize: "20px",
                  fontWeight: 800,
                }}
              >
                {tr(
                  title,
                  marathiTitle
                )}
              </h3>

              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding:
                    "5px 10px",
                  borderRadius: "20px",
                  background: isSelected
                    ? "#dcebd9"
                    : "#f0f3ee",
                  color: "#466249",
                  fontSize: "11px",
                  fontWeight: 800,
                  letterSpacing: "1px",
                }}
              >
                {type}
              </span>

            </div>


            <p
              style={{
                margin:
                  "9px 0 0",
                color: "#6d766a",
                fontSize: "13px",
                lineHeight: 1.6,
              }}
            >
              {tr(
                description,
                marathiDescription
              )}
            </p>

          </div>

        </div>

      </button>
    );
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
              "GUEST TYPE",
              "अतिथीचा प्रकार"
            )}
          </span>

          <h1>
            {tr(
              "Select Guest Type",
              "अतिथीचा प्रकार निवडा"
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
            justifyContent: "space-between",
            gap: "10px",
            flexWrap: "wrap",
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
                borderRadius: "20px",
                background:
                  "#edf1eb",
                color:
                  "#647060",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              01 REGISTRATION
            </span>

            <span
              style={{
                color: "#a1aaa0",
              }}
            >
              →
            </span>

            <span
              style={{
                padding:
                  "7px 12px",
                borderRadius: "20px",
                background:
                  "#edf1eb",
                color:
                  "#647060",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              02 AVAILABILITY
            </span>

            <span
              style={{
                color: "#a1aaa0",
              }}
            >
              →
            </span>

            <span
              style={{
                padding:
                  "7px 12px",
                borderRadius: "20px",
                background:
                  "#edf1eb",
                color:
                  "#647060",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              03 ACCEPTANCE
            </span>

            <span
              style={{
                color: "#a1aaa0",
              }}
            >
              →
            </span>

            <span
              style={{
                padding:
                  "7px 12px",
                borderRadius: "20px",
                background:
                  "#355d3b",
                color:
                  "#ffffff",
                fontSize: "11px",
                fontWeight: 800,
              }}
            >
              04 GUEST TYPE
            </span>

          </div>

        </div>

      </section>


      {/* =================================
          INTRODUCTION
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "28px",
        }}
      >

        <div
          style={{
            maxWidth: "850px",
          }}
        >

          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "1.8px",
              color: "#6f796c",
              textTransform: "uppercase",
              marginBottom: "8px",
            }}
          >
            {tr(
              "Accommodation Classification",
              "निवास वर्गीकरण"
            )}
          </div>

          <h2
            style={{
              margin:
                "0 0 10px",
              color:
                "#304633",
              fontSize:
                "24px",
            }}
          >
            {tr(
              "Who is staying at the Rest House?",
              "रेस्ट हाऊसमध्ये कोण मुक्काम करणार आहे?"
            )}
          </h2>

          <p
            style={{
              margin: 0,
              color:
                "#6c766b",
              fontSize:
                "14px",
              lineHeight:
                1.7,
            }}
          >
            {tr(
              "Select the guest category. This selection will be used in the next stage to calculate the applicable accommodation rate.",
              "अतिथीचा प्रकार निवडा. पुढील टप्प्यात लागू निवास दर निश्चित करण्यासाठी या निवडीचा वापर केला जाईल."
            )}
          </p>

        </div>

      </section>


      {/* =================================
          GUEST TYPE OPTIONS
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "28px",
        }}
      >

        <div className="booking-section-title">

          <span>
            04
          </span>

          <div>

            <h2>
              {tr(
                "Guest Type",
                "अतिथीचा प्रकार"
              )}
            </h2>

            <p>
              {tr(
                "Choose one category before proceeding to Rate.",
                "दराच्या टप्प्यावर जाण्यापूर्वी एक प्रकार निवडा."
              )}
            </p>

          </div>

        </div>


        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(3, minmax(0, 1fr))",
            gap: "16px",
          }}
        >

          {renderGuestTypeCard(
            "ESM",
            "1",
            "ESM",
            "माजी सैनिक",
            "Ex-Serviceman / eligible ESM guest.",
            "माजी सैनिक / पात्र ESM अतिथी."
          )}

          {renderGuestTypeCard(
            "SERVING",
            "2",
            "Serving",
            "सेवारत",
            "Serving personnel guest.",
            "सेवारत सैनिक / कर्मचारी अतिथी."
          )}

          {renderGuestTypeCard(
            "CIVILIAN",
            "3",
            "Civilian",
            "नागरिक",
            "Civilian guest.",
            "नागरिक अतिथी."
          )}

        </div>

      </section>


      {/* =================================
          SELECTED SUMMARY
      ================================== */}

      <section
        className="booking-card"
        style={{
          padding: "22px 28px",
          background:
            selectedGuestType
              ? "#f2f7f1"
              : "#fafbf9",
          border:
            selectedGuestType
              ? "1px solid #cdddc9"
              : "1px solid #e2e7df",
        }}
      >

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >

          <div>

            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "1.2px",
                color: "#6f796c",
                textTransform: "uppercase",
                marginBottom: "5px",
              }}
            >
              {tr(
                "Selected Guest Type",
                "निवडलेला अतिथी प्रकार"
              )}
            </div>

            <div
              style={{
                fontSize: "17px",
                fontWeight: 800,
                color: "#304633",
              }}
            >
              {selectedGuestType
                ? selectedGuestType
                : tr(
                    "Not selected",
                    "निवडलेले नाही"
                  )}
            </div>

          </div>


          <div
            style={{
              fontSize: "12px",
              color: "#687367",
              lineHeight: 1.5,
              maxWidth: "450px",
            }}
          >
            {selectedGuestType
              ? tr(
                  "Guest type selected. Continue to Rate.",
                  "अतिथीचा प्रकार निवडला आहे. दराच्या टप्प्यावर पुढे जा."
                )
              : tr(
                  "Select ESM, Serving or Civilian to continue.",
                  "पुढे जाण्यासाठी ESM, सेवारत किंवा नागरिक निवडा."
                )}
          </div>

        </div>

      </section>


      {/* =================================
          FOOTER ACTIONS
      ================================== */}

      <div className="booking-actions">

        <button
          type="button"
          className="secondary-action"
          onClick={onBack}
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
        >
          {tr(
            "CONTINUE TO RATE →",
            "दराच्या टप्प्यावर पुढे जा →"
          )}
        </button>

      </div>

    </main>
  );
}

export default GuestType;