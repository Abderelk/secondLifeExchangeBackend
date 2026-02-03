// src/services/notificationService.ts

import nodemailer from 'nodemailer';
import { IWeeklyThemeDocument } from '../models/weeklyTheme';

// Configuration du transporteur email
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

interface UserForNotification {
    email: string;
    firstName: string;
}

// Template HTML pour l'email de notification de thème
const getThemeEmailTemplate = (user: UserForNotification, theme: IWeeklyThemeDocument): string => {
    const startDate = new Date(theme.startDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });
    const endDate = new Date(theme.endDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nouveau Thème de la Semaine - SecondLife Exchange</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 0;">
        <table role="presentation" style="width: 600px; max-width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 40px; border-radius: 16px 16px 0 0; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                🌿 SecondLife Exchange
              </h1>
              <p style="margin: 10px 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">
                Donnez une seconde vie à vos objets
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin: 0 0 20px; color: #1f2937; font-size: 24px; font-weight: 600;">
                Bonjour ${user.firstName} ! 👋
              </h2>
              
              <p style="margin: 0 0 30px; color: #6b7280; font-size: 16px; line-height: 1.6;">
                Bonne nouvelle ! Un nouveau thème de la semaine vient d'être lancé. C'est le moment idéal pour échanger vos objets !
              </p>

              <!-- Theme Card -->
              <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border-radius: 16px; padding: 30px; margin: 0 0 30px; text-align: center;">
                <div style="font-size: 64px; margin-bottom: 15px;">
                  ${theme.emoji}
                </div>
                <h3 style="margin: 0 0 10px; color: #166534; font-size: 24px; font-weight: 700;">
                  ${theme.title}
                </h3>
                <p style="margin: 0 0 20px; color: #15803d; font-size: 14px; line-height: 1.5;">
                  ${theme.description}
                </p>
                <div style="background: rgba(255,255,255,0.7); border-radius: 10px; padding: 15px; margin-top: 15px;">
                  <p style="margin: 0; color: #166534; font-size: 14px;">
                    📅 Du <strong>${startDate}</strong> au <strong>${endDate}</strong>
                  </p>
                </div>
              </div>

              <!-- Categories -->
              ${theme.categories && theme.categories.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <p style="margin: 0 0 15px; color: #1f2937; font-size: 16px; font-weight: 600;">
                  📦 Catégories concernées :
                </p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                  ${theme.categories.map(cat => `
                    <span style="background-color: #f3f4f6; color: #374151; padding: 6px 12px; border-radius: 20px; font-size: 13px; display: inline-block; margin: 4px;">
                      ${cat}
                    </span>
                  `).join('')}
                </div>
              </div>
              ` : ''}

              <!-- CTA Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/home" 
                   style="display: inline-block; background-color: #22C55E; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 6px rgba(34, 197, 94, 0.3);">
                  🔄 Découvrir les échanges
                </a>
              </div>

              <!-- Tips -->
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-top: 20px;">
                <p style="margin: 0 0 10px; color: #92400e; font-size: 14px; font-weight: 600;">
                  💡 Conseils pour profiter du thème :
                </p>
                <ul style="margin: 0; padding-left: 20px; color: #a16207; font-size: 14px; line-height: 1.8;">
                  <li>Publiez vos objets correspondant au thème</li>
                  <li>Parcourez les nouvelles annonces</li>
                  <li>Proposez des échanges aux autres membres</li>
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; text-align: center;">
              <p style="margin: 0 0 15px; color: #6b7280; font-size: 14px;">
                Vous recevez cet email car vous avez activé les notifications de thèmes hebdomadaires.
              </p>
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/profile?tab=settings" 
                 style="color: #22C55E; text-decoration: none; font-size: 14px;">
                Gérer mes préférences de notification
              </a>
              <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                  © ${new Date().getFullYear()} SecondLife Exchange. Tous droits réservés.
                </p>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

// Envoyer l'email de notification de thème
export const sendThemeNotificationEmail = async (
    user: UserForNotification,
    theme: IWeeklyThemeDocument
): Promise<void> => {
    const mailOptions = {
        from: `"SecondLife Exchange" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `${theme.emoji} Nouveau thème : ${theme.title} - SecondLife Exchange`,
        html: getThemeEmailTemplate(user, theme),
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de notification envoyé à ${user.email}`);
};

// Envoyer un rappel de fin de thème
export const sendThemeEndingReminderEmail = async (
    user: UserForNotification,
    theme: IWeeklyThemeDocument,
    daysRemaining: number
): Promise<void> => {
    const mailOptions = {
        from: `"SecondLife Exchange" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `⏰ Plus que ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} pour le thème "${theme.title}" !`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="margin: 0; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb;">
  <div style="max-width: 500px; margin: 0 auto; background: #fff; border-radius: 16px; padding: 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 20px;">
      <span style="font-size: 48px;">${theme.emoji}</span>
    </div>
    <h2 style="margin: 0 0 15px; color: #1f2937; text-align: center;">
      Le thème "${theme.title}" se termine bientôt !
    </h2>
    <p style="color: #6b7280; text-align: center; line-height: 1.6;">
      Bonjour ${user.firstName}, il ne reste plus que <strong style="color: #F59E0B;">${daysRemaining} jour${daysRemaining > 1 ? 's' : ''}</strong> pour profiter du thème de la semaine.
    </p>
    <div style="text-align: center; margin-top: 25px;">
      <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/home" 
         style="display: inline-block; background-color: #22C55E; color: #fff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600;">
        Voir les échanges
      </a>
    </div>
  </div>
</body>
</html>
    `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email de rappel envoyé à ${user.email}`);
};

export default {
    sendThemeNotificationEmail,
    sendThemeEndingReminderEmail,
};