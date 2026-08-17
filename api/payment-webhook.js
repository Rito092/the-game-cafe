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
    console.error("Omise GET charge error:", data);
    return null;
  }

  return data;
}

async function findOrderByChargeId(chargeId) {
  const snapshot = await adminDb
    .collection("orders")
    .where("payment.chargeId", "==", chargeId)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  const doc = snapshot.docs[0];

  return { id: doc.id, ref: doc.ref, data: doc.data() };
}

function resolvePaymentStatus(chargeStatus) {
  if (chargeStatus === "successful") return "paid";
  if (chargeStatus === "failed") return "failed";
  if (chargeStatus === "expired") return "failed";
  if (chargeStatus === "pending") return "pending";
  return null; // สถานะที่ไม่รู้จัก - ไม่ทำอะไร
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const event = req.body;

    // Opn ส่ง event ทุกประเภทมาที่ webhook เดียวกัน (static webhook)
    // สนใจเฉพาะ event ที่เกี่ยวกับ charge เท่านั้น
    if (!event || event.data?.object !== "charge") {
      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const chargeId = event.data.id;

    if (!chargeId) {
      console.error("Webhook missing charge id in data:", event);
      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    // ห้ามเชื่อ payload ตรงๆ — ยิง GET ไปยืนยันกับ Opn อีกครั้งเสมอ
    const charge = await getOmiseCharge(chargeId);

    if (!charge) {
      // ดึง charge ไม่สำเร็จ (network / Opn ชั่วคราว) → ให้ Opn retry webhook นี้ใหม่
      return res.status(500).json({
        error: "ไม่สามารถตรวจสอบ Charge กับ Opn ได้ในขณะนี้",
      });
    }

    const order = await findOrderByChargeId(chargeId);

    if (!order) {
      // หา order ที่ผูกกับ charge นี้ไม่เจอ - retry ก็ไม่ช่วย ไม่ log เป็น error รุนแรง แค่บันทึกไว้
      console.error(
        "ไม่พบ order ที่ผูกกับ chargeId นี้:",
        chargeId
      );
      return res.status(200).json({
        received: true,
        matchedOrder: false,
      });
    }

    // Idempotency: จ่ายแล้วอยู่แล้ว ไม่ต้องทำอะไรซ้ำ
    if (order.data.paymentStatus === "paid") {
      return res.status(200).json({
        received: true,
        alreadyPaid: true,
      });
    }

    const MIN_CHARGE_SATANG = 2000; // ยอดชำระขั้นต่ำของ Opn = 20 บาท

    const rawAmountSatang = Math.round(
      Number(order.data.total) * 100
    );

    const expectedAmountSatang =
      Number.isFinite(rawAmountSatang) && rawAmountSatang > 0
        ? Math.max(rawAmountSatang, MIN_CHARGE_SATANG)
        : rawAmountSatang;

    const amountMatches =
      Number.isFinite(expectedAmountSatang) &&
      charge.amount === expectedAmountSatang;

    const currencyMatches = charge.currency === "THB";

    const targetStatus = resolvePaymentStatus(charge.status);

    if (!targetStatus) {
      // สถานะ charge ยังไม่เข้าเงื่อนไขที่รู้จัก (เช่น pending ที่ resolvePaymentStatus คืน "pending")
      return res.status(200).json({
        received: true,
        chargeStatus: charge.status,
      });
    }

    if (targetStatus === "pending") {
      // ยังไม่จบ ไม่ต้องเขียนอะไรเพิ่ม
      return res.status(200).json({
        received: true,
        paymentStatus: "pending",
      });
    }

    if (targetStatus === "paid") {
      if (!amountMatches || !currencyMatches) {
        console.error(
          "จำนวนเงินหรือสกุลเงินไม่ตรงกับ Order:",
          {
            orderId: order.id,
            chargeId,
            chargeAmount: charge.amount,
            chargeCurrency: charge.currency,
            expectedAmountSatang,
          }
        );

        // ห้ามตั้ง paid เมื่อจำนวนเงินไม่ตรง - ไม่ใช่ปัญหาที่ retry แล้วหาย
        return res.status(200).json({
          received: true,
          error: "จำนวนเงินหรือสกุลเงินไม่ตรงกับ Order",
        });
      }

      await order.ref.update({
        paymentStatus: "paid",
        payment: {
          ...order.data.payment,
          chargeId,
          chargeStatus: charge.status,
          paidAt: new Date().toISOString(),
        },
      });

      return res.status(200).json({
        received: true,
        paymentStatus: "paid",
      });
    }

    // targetStatus === "failed"
    if (order.data.paymentStatus === "failed") {
      // ยิงซ้ำแต่ผลเดิม ไม่ต้องเขียนซ้ำ
      return res.status(200).json({
        received: true,
        alreadyFailed: true,
      });
    }

    await order.ref.update({
      paymentStatus: "failed",
      payment: {
        ...order.data.payment,
        chargeId,
        chargeStatus: charge.status,
      },
    });

    return res.status(200).json({
      received: true,
      paymentStatus: "failed",
    });
  } catch (error) {
    console.error("payment-webhook error:", error);

    // error ไม่คาดคิด → ให้ Opn retry
    return res.status(500).json({
      error: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
}