// src/config/email.ts

import nodemailer from 'nodemailer';

// Configuration du transporteur Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // ton email gmail
    pass: process.env.GMAIL_APP_PASSWORD, // mot de passe d'application (pas ton mot de passe Gmail !)
  },
});

// Vérifier la connexion au démarrage
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Erreur configuration email:', error);
  } else {
    console.log('✅ Serveur email prêt');
  }
});

export const sendEmail = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  try {
    const mailOptions = {
      from: `"SecondLife Exchange" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('📧 Email envoyé:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Erreur envoi email:', error);
    throw error;
  }
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  firstName: string
) => {
  const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Réinitialisation de mot de passe</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f9ff;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background-color: #ffffff; border-radius: 24px; padding: 40px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Logo -->
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #22C55E; font-size: 28px; margin: 0;">🌱 SecondLife Exchange</h1>
          </div>
          
          <!-- Contenu -->
          <h2 style="color: #1F2937; font-size: 24px; margin-bottom: 16px;">
            Bonjour ${firstName} 👋
          </h2>
          
          <p style="color: #6B7280; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
            Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :
          </p>
          
          <!-- Bouton -->
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" 
               style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 12px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 14px rgba(34, 197, 94, 0.4);">
              Réinitialiser mon mot de passe
            </a>
          </div>
          
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Ce lien est valable pendant <strong>1 heure</strong>. Après ce délai, vous devrez faire une nouvelle demande.
          </p>
          
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
          </p>
          
          <hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">
          
          <!-- Lien alternatif -->
          <p style="color: #9CA3AF; font-size: 12px; line-height: 1.6;">
            Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :
            <br>
            <a href="${resetUrl}" style="color: #22C55E; word-break: break-all;">${resetUrl}</a>
          </p>
          
          <!-- Footer -->
          <div style="text-align: center; margin-top: 32px;">
            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} SecondLife Exchange - Rien ne se perd, tout s'échange
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe - SecondLife Exchange',
    html,
  });
};

export default transporter;