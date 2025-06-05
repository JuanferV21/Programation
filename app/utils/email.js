const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

async function sendResetEmail(to, token) {
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset.html`;
  await transporter.sendMail({
    from: process.env.GMAIL_USER,
    to,
    subject: 'Restablecer contraseña',
    html: `<p>Utiliza el siguiente token para restablecer tu contraseña:</p><p><b>${token}</b></p><p><a href="${resetUrl}">${resetUrl}</a></p>`
  });
}

module.exports = { sendResetEmail };
