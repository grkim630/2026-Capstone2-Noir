import { QRCodeCanvas } from "qrcode.react";
import { DESIGN_HEIGHT, DESIGN_WIDTH } from "../constants.js";

const backgroundSrc = "/data/images/end_background.png";
const logoSrc = "/data/images/logo_red.png";
const qrLogoSrc = "/data/images/qrlogo_white.png";

export default function EndingPage({ mobileResultUrl }) {
  const qrValue = mobileResultUrl || "about:blank";

  return (
    <div
      className="ending-screen"
      style={{
        position: "relative",
        width: DESIGN_WIDTH,
        height: DESIGN_HEIGHT,
        overflow: "hidden",
        background: "#ffffff",
        fontFamily: "Pretendard, sans-serif",
      }}
    >
      <img
        src={backgroundSrc}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />

      <img
        src={logoSrc}
        alt="MUZIGAE MANSION x NOIR"
        draggable={false}
        style={{
          position: "absolute",
          top: 80,
          left: "50%",
          width: 116,
          height: "auto",
          transform: "translateX(-50%)",
          objectFit: "contain",
        }}
      />

      <div
        className="ending-qr-wrap"
        style={{
          position: "absolute",
          left: 320,
          top: 284,
          width: 250,
          height: 250,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "7px solid #101010",
          background: "#ffffff",
          padding: 6,
        }}
      >
        <QRCodeCanvas
          value={qrValue}
          size={225}
          bgColor="#ffffff"
          fgColor="#000000"
          level="H"
          includeMargin={false}
        />
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 46,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 2,
            background: "#101010",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }}
        >
          <img
            src={qrLogoSrc}
            alt=""
            draggable={false}
            style={{
              width: 38,
              height: "auto",
              objectFit: "contain",
            }}
          />
        </div>
      </div>

      <p
        style={{
          position: "absolute",
          left: 620,
          top: 389,
          margin: 0,
          width: 430,
          color: "#101010",
          fontSize: 20,
          fontWeight: 400,
          lineHeight: 1.35,
          letterSpacing: 0,
        }}
      >
        QR을 통해 컬러프로필과
        <br />
        추천 받은 제품의 구매페이지를 확인해보세요.
      </p>
    </div>
  );
}
