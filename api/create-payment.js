import { adminDb } from "./_lib/firebase-admin.js";

async function getOmiseCharge(chargeId) {
  const response = await fetch(
    `https://api.omise.co/charges/${chargeId}`,
    {
      method: "GET",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.OMISE_SECRET_KEY}:`
          ).toString("base64"),
      },
    }
  );

  const data = await response.json();

  if (!response.ok) {
    return null;
  }

  return data;
}

async function createOmiseCharge(amountSatang, orderId) {
  const response = await fetch(
    "https://api.omise.co/charges",
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.OMISE_SECRET_KEY}:`
          ).toString("base64"),

        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(amountSatang),
        currency: "THB",
        description: `THE GAME CAFE Order ${orderId}`,
        "source[type]": "promptpay",
      }),
    }
  );

  const data = await response.json();

  return { ok: response.ok, status: response.status, data };
}

function buildResponsePayload({ orderId, chargeData, paymentStatus }) {
  return {
    success: true,
    orderId,
    chargeId: chargeData.id,
    paymentStatus,
    amount: chargeData.amount,
    currency: chargeData.currency,
   scannableCode:
        chargeData.source?.scannable_code?.image?.download_uri || null,
    authorizeUri: chargeData.authorize_uri || null,
    references: chargeData.source?.references || null,
  };
}

// charge ยังใช้งานได้ถ้าไม่ expired/failed และยังไม่ถูก paid ไปแล้ว (paid จะถูกจับที่ paymentStatus ของ order เอง)
function isChargeStillUsable(chargeData) {
  if (!chargeData) return false;
  if (chargeData.status === "failed") return false;
  if (chargeData.status === "expired") return false;
  return true;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({
        error: "orderId จำเป็นต้องมี",
      });
    }

    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({
        error: "ไม่พบ Order นี้",
      });
    }

    const order = orderSnap.data();

    const numericTotal = Number(order.total);

    if (!Number.isFinite(numericTotal) || numericTotal <= 0) {
      return res.status(400).json({
        error: "จำนวนเงินของ Order ไม่ถูกต้อง",
      });
    }

    // 1) จ่ายแล้ว ไม่ต้องสร้าง charge ใหม่
    if (order.paymentStatus === "paid") {
      return res.status(200).json({
        success: true,
        orderId,
        alreadyPaid: true,
        paymentStatus: "paid",
      });
    }

    // 2) มี charge เดิมค้างอยู่ (pending) → ตรวจสอบกับ Opn ก่อนสร้างใหม่
    if (
      order.paymentStatus === "pending" &&
      order.payment?.chargeId
    ) {
      const existingCharge = await getOmiseCharge(order.payment.chargeId);

      if (isChargeStillUsable(existingCharge)) {
        return res.status(200).json(
          buildResponsePayload({
            orderId,
            chargeData: existingCharge,
            paymentStatus: "pending",
          })
        );
      }
      // ถ้า charge เดิมใช้ไม่ได้/ไม่พบ → ปล่อยผ่านไปสร้างใหม่ด้านล่าง
    }

    // 3) สร้าง charge ใหม่ ด้วยราคาจริงจาก Firestore เท่านั้น
    const MIN_CHARGE_SATANG = 2000; // ขั้นต่ำ 20 บาท
    const rawAmountSatang = Math.round(
      numericTotal * 100
    );
    const amountSatang = Math.max(
      rawAmountSatang,
      MIN_CHARGE_SATANG
    );

    const { ok, status, data } = await createOmiseCharge(
      amountSatang,
      orderId
    );

    if (!ok) {
      console.error("Opn API error:", data);

      return res.status(status).json({
        error:
          data?.message ||
          "ไม่สามารถสร้างรายการชำระเงินได้",
      });
    }

    await orderRef.update({
      paymentStatus: "pending",
      payment: {
        chargeId: data.id,
      },
    });

    return res.status(200).json(
      buildResponsePayload({
        orderId,
        chargeData: data,
        paymentStatus: "pending",
      })
    );
  } catch (error) {
    console.error("create-payment error:", error);

    return res.status(500).json({
      error: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
}