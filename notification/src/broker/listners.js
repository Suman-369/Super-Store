const { consumeFromQueue } = require("./broker");
const { sendEmail } = require("../email");

module.exports = function () {
  consumeFromQueue("AUTH_NOTIFICATION.USER_CREATED", async (data) => {
    const emailHTMLTemplate = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome To Suman's Store</title>
        <style>
          body {
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f9f9f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background: #fff;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            padding: 32px 24px;
          }
          h1 {
            color: #2d7ff9;
            margin-bottom: 16px;
          }
          p {
            color: #333;
            font-size: 16px;
            line-height: 1.6;
          }
          .footer {
            margin-top: 32px;
            font-size: 14px;
            color: #888;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Welcome To Suman's Store</h1>
          <p>Hi <strong>${
            data.fullName.firstName + " " + (data.fullName.lastName || " ")
          }</strong>,</p>
          <p>Thank you for registering at Suman's Store. We're excited to have you with us!<br>
          Explore our products and happy shopping!</p>
          <div class="footer">
            <p>Best Regards,<br>Suman's Store Team</p>
          </div>
        </div>
      </body>
      </html>
    `;
    await sendEmail(
      data.email,
      "Welcome to Suman's Store",
      "",
      emailHTMLTemplate
    );
  });

  consumeFromQueue("PAYMENT_NOTIFICATION.PAYMENT_COMPLETED", async (data) => {
    const emailHTMLTemplate = `
      <h1>Your Payment was Successful!</h1>
      <p>Dear Customer,</p>
      <p>We are pleased to inform you that your payment for order <strong>${
        data.orderId  
      }</strong> has been successfully processed.</p>
      <p><strong>Payment Details:</strong></p>
      <ul>
        <li>Payment ID: ${data.paymentId}</li>
        <li>Amount Paid: ${data.amount} ${data.currency}</li>
      </ul>
      <p>Thank you for shopping with us!</p>
      <p>Best Regards,<br/>Suman's Store Team</p>
    `
    await sendEmail(
      data.email,
      "Payment Successful - Suman's Store",
      "",
      emailHTMLTemplate
    );
  })


  consumeFromQueue("PAYMENT_NOTIFICATION.PAYMENT_FAILED", async (data) => {
    const emailHTMLTemplate = `
      <h1>Your Payment Failed</h1>
      <p>Dear Customer,</p>
      <p>We regret to inform you that your payment for order <strong>${
        data.orderId
      }</strong> was unsuccessful.</p>
      <p>Please try again or contact our support team for assistance.</p>
      <p>Best Regards,<br/>Suman's Store Team</p>
    `
    await sendEmail(
      data.email,
      "Payment Failed - Suman's Store",
      "",
      emailHTMLTemplate
    );
  });
};
