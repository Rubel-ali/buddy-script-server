import nodemailer from "nodemailer";
import config from "../../config";

const emailSender = async (email: string, html: string, p0: string) => {
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Use true for port 465, false for port 587
    auth: {
      user: config.emailSender.email,
      pass: config.emailSender.app_pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  const info = await transporter.sendMail({
    from: '"Learning Management System" <melonali200@gmail.com>',
    to: email,
    subject: "Reset Password Link",
    text: "Hello world?", // Plain-text version of the message
    html, // HTML version of the message
  });

  console.log("Message sent:", info.messageId);
};

export default emailSender;
