import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(to: string, code: string) {
  if (!to || !process.env.EMAIL_SENDER) return;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; text-align: center;">
      <h2>Verify your Account</h2>
      <p>Your code is:</p>
      <h1 style="font-size: 40px; color: #00BCD4; letter-spacing: 5px;">${code}</h1>
      <p>Expires in 5 minutes.</p>
    </div>
  `;
  try { await transporter.sendMail({ from: `"Questionnaire AI" <${process.env.EMAIL_SENDER}>`, to, subject: "Verification Code", html }); } catch (e) { console.error(e); }
}

export async function sendPasswordResetEmail(to: string, code: string) {
  if (!to || !process.env.EMAIL_SENDER) return;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; text-align: center; border: 2px solid #000; border-radius: 10px;">
      <h2 style="color: #FF80AB;">Reset Your Password</h2>
      <p>Someone requested a password reset for your account.</p>
      <p>Your secure reset code is:</p>
      <h1 style="font-size: 40px; letter-spacing: 5px;">${code}</h1>
      <p>If this wasn't you, ignore this email.</p>
    </div>
  `;
  try { await transporter.sendMail({ from: `"Questionnaire AI" <${process.env.EMAIL_SENDER}>`, to, subject: "Reset Password Request", html }); } catch (e) { console.error(e); }
}

export async function sendGradeEmail(to: string, studentName: string, quizTitle: string, score: number, maxScore: number, feedbackLink: string) {
  if (!to || !process.env.EMAIL_SENDER) return;
  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #00BCD4;">Result: ${quizTitle}</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h1 style="margin: 0; color: #166534;">${score} / ${maxScore}</h1>
      </div>
      <a href="${feedbackLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Feedback</a>
    </div>
  `;
  try { await transporter.sendMail({ from: `"Questionnaire AI" <${process.env.EMAIL_SENDER}>`, to, subject: `Results: ${quizTitle}`, html }); } catch (e) { console.error(e); }
}