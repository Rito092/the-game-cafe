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

  return {
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
  };
}

function resolvePaymentStatus(chargeStatus) {
  if (chargeStatus === "successful") return "paid";
  if (chargeStatus === "failed") return "failed";
  if (chargeStatus === "expired") return "failed";
  if (chargeStatus === "pending") return "pending";

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const event = req.body;

    console.log("========== OPN WEBHOOK ==========");
    console.log("Webhook received:", {
      object: event?.data?.object,
      event: event?.key,
      chargeId: event?.data?.id,
    });

    // รับเฉพาะ event ที่เกี่ยวข้องกับ Charge
    if (!event || event.data?.object !== "charge") {
      console.log("Webhook ignored: not a charge event");

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    const chargeId = event.data.id;

    if (!chargeId) {
      console.error(
        "Webhook missing charge id:",
        event
      );

      return res.status(200).json({
        received: true,
        ignored: true,
      });
    }

    // --------------------------------------------------
    // 1. ตรวจสอบ Charge กับ Opn โดยตรง
    // --------------------------------------------------

    const charge = await getOmiseCharge(chargeId);

    if (!charge) {
      console.error(
        "ไม่สามารถตรวจสอบ Charge กับ Opn ได้:",
        chargeId
      );

      // ให้ Opn retry
      return res.status(500).json({
        error:
          "ไม่สามารถตรวจสอบ Charge กับ Opn ได้ในขณะนี้",
      });
    }

    console.log("Charge verified:", {
      chargeId: charge.id,
      status: charge.status,
      amount: charge.amount,
      currency: charge.currency,
    });

    // --------------------------------------------------
    // 2. หา Order จาก chargeId
    // --------------------------------------------------

    const order = await findOrderByChargeId(chargeId);

    if (!order) {
      console.error(
        "ไม่พบ Order ที่ผูกกับ chargeId:",
        chargeId
      );

      return res.status(200).json({
        received: true,
        matchedOrder: false,
      });
    }

    console.log("Order matched:", {
      orderId: order.id,
      currentPaymentStatus:
        order.data.paymentStatus,
      total: order.data.total,
    });

    // --------------------------------------------------
    // 3. ถ้าจ่ายแล้ว ไม่ต้องทำซ้ำ
    // --------------------------------------------------

    if (order.data.paymentStatus === "paid") {
      console.log(
        "Order already paid:",
        order.id
      );

      return res.status(200).json({
        received: true,
        alreadyPaid: true,
        orderId: order.id,
        paymentStatus: "paid",
      });
    }

    // --------------------------------------------------
    // 4. ตรวจสอบยอดเงิน
    // --------------------------------------------------

    const MIN_CHARGE_SATANG = 2000;

    const rawAmountSatang = Math.round(
      Number(order.data.total) * 100
    );

    const expectedAmountSatang =
      Number.isFinite(rawAmountSatang) &&
      rawAmountSatang > 0
        ? Math.max(
            rawAmountSatang,
            MIN_CHARGE_SATANG
          )
        : rawAmountSatang;

    const amountMatches =
      Number.isFinite(expectedAmountSatang) &&
      charge.amount === expectedAmountSatang;

    const currencyMatches =
      charge.currency === "THB";

    console.log("Payment validation:", {
      orderId: order.id,
      expectedAmountSatang,
      actualAmountSatang: charge.amount,
      amountMatches,
      expectedCurrency: "THB",
      actualCurrency: charge.currency,
      currencyMatches,
    });

    // --------------------------------------------------
    // 5. แปลงสถานะ Opn → สถานะระบบ
    // --------------------------------------------------

    const targetStatus =
      resolvePaymentStatus(charge.status);

    if (!targetStatus) {
      console.log(
        "ไม่รู้จัก Charge status:",
        charge.status
      );

      return res.status(200).json({
        received: true,
        orderId: order.id,
        chargeStatus: charge.status,
      });
    }

    // --------------------------------------------------
    // 6. ยังรอชำระเงิน
    // --------------------------------------------------

    if (targetStatus === "pending") {
      console.log(
        "Payment still pending:",
        order.id
      );

      return res.status(200).json({
        received: true,
        orderId: order.id,
        paymentStatus: "pending",
      });
    }

    // --------------------------------------------------
    // 7. ชำระเงินสำเร็จ
    // --------------------------------------------------

    if (targetStatus === "paid") {
      // ป้องกันยอดเงินผิด
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

        return res.status(200).json({
          received: true,
          orderId: order.id,
          error:
            "จำนวนเงินหรือสกุลเงินไม่ตรงกับ Order",
        });
      }

      // สำคัญ:
      // paymentStatus อยู่ระดับเดียวกับ total/status
      // เพื่อให้ Customer.jsx ที่ใช้ onSnapshot()
      // ตรวจจับได้ทันที
      await order.ref.update({
        paymentStatus: "paid",

        payment: {
          ...order.data.payment,

          chargeId,
          chargeStatus: charge.status,

          paidAt: new Date().toISOString(),
        },
      });

      console.log(
        "================================"
      );
      console.log(
        "PAYMENT SUCCESSFULLY UPDATED"
      );
      console.log("Order ID:", order.id);
      console.log("Charge ID:", chargeId);
      console.log("Payment Status: paid");
      console.log(
        "================================"
      );

      return res.status(200).json({
        received: true,
        orderId: order.id,
        paymentStatus: "paid",
      });
    }

    // --------------------------------------------------
    // 8. ชำระเงินไม่สำเร็จ
    // --------------------------------------------------

    if (targetStatus === "failed") {
      if (order.data.paymentStatus === "failed") {
        console.log(
          "Order already marked failed:",
          order.id
        );

        return res.status(200).json({
          received: true,
          alreadyFailed: true,
          orderId: order.id,
          paymentStatus: "failed",
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

      console.log(
        "Payment marked as failed:",
        order.id
      );

      return res.status(200).json({
        received: true,
        orderId: order.id,
        paymentStatus: "failed",
      });
    }

    return res.status(200).json({
      received: true,
    });
  } catch (error) {
    console.error(
      "payment-webhook error:",
      error
    );

    // ให้ Opn retry
    return res.status(500).json({
      error: "เกิดข้อผิดพลาดภายในระบบ",
    });
  }
}