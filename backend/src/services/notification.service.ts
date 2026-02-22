/**
 * Notification Service
 * 
 * Handles email and in-app notifications
 */

import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export interface NotificationOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface ReviewCompletedNotification {
  repositoryName: string;
  prTitle: string;
  prUrl: string;
  securityScore: number;
  totalIssues: number;
  criticalIssues: number;
}

export interface QualityGateFailedNotification {
  repositoryName: string;
  prTitle: string;
  prUrl: string;
  securityScore: number;
  criticalIssues: number;
  message?: string;
}

/**
 * Email transporter (configured via environment variables)
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  // Check if email is configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
    logger.warn('Email not configured. SMTP settings missing. Notifications will be logged only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort, 10),
    secure: parseInt(smtpPort, 10) === 465, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPassword,
    },
  });

  return transporter;
}

/**
 * Send email notification
 */
export async function sendEmailNotification(options: NotificationOptions): Promise<boolean> {
  try {
    const emailTransporter = getTransporter();
    
    if (!emailTransporter) {
      logger.info('Email notification skipped (not configured)', {
        to: options.to,
        subject: options.subject,
      });
      return false;
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    };

    const info = await emailTransporter.sendMail(mailOptions);
    logger.info('Email notification sent', {
      to: options.to,
      subject: options.subject,
      messageId: info.messageId,
    });

    return true;
  } catch (error) {
    logger.error('Failed to send email notification:', error);
    return false;
  }
}

/**
 * Send review completed notification
 */
export async function sendReviewCompletedNotification(
  email: string,
  data: ReviewCompletedNotification
): Promise<boolean> {
  const subject = `Code Review Completed: ${data.repositoryName} - ${data.prTitle}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .score { font-size: 48px; font-weight: bold; color: #667eea; }
        .button { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { flex: 1; background: white; padding: 15px; border-radius: 6px; text-align: center; }
        .stat-value { font-size: 24px; font-weight: bold; color: #667eea; }
        .stat-label { font-size: 12px; color: #666; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Code Review Completed</h1>
        </div>
        <div class="content">
          <h2>${data.repositoryName}</h2>
          <p><strong>Pull Request:</strong> ${data.prTitle}</p>
          
          <div class="stats">
            <div class="stat">
              <div class="stat-value">${data.securityScore}</div>
              <div class="stat-label">Security Score</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.totalIssues}</div>
              <div class="stat-label">Total Issues</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.criticalIssues}</div>
              <div class="stat-label">Critical</div>
            </div>
          </div>
          
          <a href="${data.prUrl}" class="button">View Review Details</a>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmailNotification({
    to: email,
    subject,
    html,
  });
}

/**
 * Send notification when quality gate fails (critical issues or score below threshold)
 */
export async function sendQualityGateFailedNotification(
  email: string,
  data: QualityGateFailedNotification
): Promise<boolean> {
  const subject = `Quality gate failed: ${data.repositoryName} - ${data.prTitle}`;
  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Quality gate failed</h2>
      <p><strong>Repository:</strong> ${data.repositoryName}</p>
      <p><strong>PR:</strong> ${data.prTitle}</p>
      <p><strong>Score:</strong> ${data.securityScore}/100 | <strong>Critical issues:</strong> ${data.criticalIssues}</p>
      ${data.message ? `<p>${data.message}</p>` : ''}
      <p><a href="${data.prUrl}">View PR and fix issues</a></p>
    </body>
    </html>
  `;
  return sendEmailNotification({ to: email, subject, html });
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    const emailTransporter = getTransporter();
    if (!emailTransporter) {
      return false;
    }
    await emailTransporter.verify();
    logger.info('Email configuration verified');
    return true;
  } catch (error) {
    logger.error('Email configuration verification failed:', error);
    return false;
  }
}
