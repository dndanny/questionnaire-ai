import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_SENDER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendGradeEmail(to: string, studentName: string, quizTitle: string, score: number, maxScore: number, feedbackLink: string) {
  if (!to || !process.env.EMAIL_SENDER) {
      console.log("Skipping email: No recipient or missing EMAIL_SENDER in .env");
      return;
  }

  const html = `
    <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #00BCD4;">Quiz Results: ${quizTitle}</h2>
      <p>Hi <strong>${studentName}</strong>,</p>
      <p>Your quiz has been marked.</p>
      
      <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h1 style="margin: 0; color: #166534;">${score} / ${maxScore}</h1>
      </div>

      <p>Click the link below to see your detailed feedback:</p>
      <a href="${feedbackLink}" style="background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Feedback</a>
      
      <p style="margin-top: 30px; font-size: 12px; color: #666;">Sent by QuizAI.</p>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"QuizAI Bot" <${process.env.EMAIL_SENDER}>`,
      to,
      subject: `Grade Update: ${quizTitle}`,
      html,
    });
    console.log(`Email sent to ${to} (MessageID: ${info.messageId})`);
  } catch (error) {
    console.error("Email Failed:", error);
  }
}