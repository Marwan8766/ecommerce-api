exports.createOrderConfirmationEmail = (order, user) => {
  const itemsHtml = order.items
    .map(
      (item) => `
    <tr>
      <td>${item.productName}</td>
      <td>${item.quantity}</td>
      <td>${item.price.toFixed(2)} LE</td>
    </tr>
  `
    )
    .join('');

  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }
          
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
            border: 1px solid #ddd;
            border-radius: 8px;
            background-color: #f9f9f9;
          }
          
          h1 {
            color: #333;
            font-size: 24px;
            margin-bottom: 16px;
          }
          
          p {
            font-size: 16px;
            line-height: 1.5;
            color: #666;
            margin-bottom: 24px;
          }
          
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 24px;
          }
          
          th, td {
            padding: 8px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          
          th {
            background-color: #333;
            color: #fff;
          }
          
          .total {
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Order Confirmation</h1>
          <p>Thank you ${
            user.firstName
          } for your order. Your order details are as follows:</p>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Quantity</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr>
                <td class="total" colspan="2">Total:</td>
                <td class="total">${order.totalPrice.toFixed(2)} LE</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </body>
    </html>
  `;

  return {
    email: user.email,
    subject: 'Order Confirmation',
    html,
  };
};

exports.createPaymentInstructionsEmail = (user, billReference) => {
  const html = `
    <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
          }

          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 24px;
          }

          h1 {
            color: #0066cc;
            font-size: 24px;
            margin-bottom: 16px;
          }

          p {
            font-size: 16px;
            line-height: 1.5;
            color: #333333;
            margin-bottom: 24px;
          }

          .payment-instructions {
            background-color: #f7f7f7;
            border: 1px solid #dddddd;
            padding: 16px;
            border-radius: 8px;
          }

          .instruction-title {
            color: #333333;
            font-size: 18px;
            margin-bottom: 12px;
          }

          .instruction-text {
            font-size: 16px;
            color: #666666;
            margin-bottom: 8px;
          }

          .bill-reference {
            font-size: 20px;
            font-weight: bold;
            color: #0066cc;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Payment Instructions</h1>
          <p>Dear ${user.firstName},</p>
          <div class="payment-instructions">
            <div class="instruction-title">Payment Details:</div>
            <div class="instruction-text">
              To complete your payment, please follow these instructions:
            </div>
            <div class="instruction-text">
              1. Visit the nearest Madfouaat Mutanouea Accept (مدفوعات متنوعة اكسبت) kiosk.
            </div>
            <div class="instruction-text">
              2. Provide the following bill reference number:
            </div>
            <div class="bill-reference">${billReference}</div>
          </div>
          <p>If you have any questions or need assistance, please contact us.</p>
          <p>Thank you for choosing our service!</p>
        </div>
      </body>
    </html>
  `;

  return {
    email: user.email,
    subject: 'Payment Instructions',
    html,
  };
};
