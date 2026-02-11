// Email service for sending inventory alerts
// Uses Nodemailer with SMTP configuration

import nodemailer from 'nodemailer';

interface InventoryAlertEmail {
  alertId: string;
  title: string;
  message: string;
  priority: string;
  alertType: string;
  createdBy: string;
  projectId: string;
  inventoryManagerEmail: string;
}

// Initialize email transporter
let transporter: nodemailer.Transporter | null = null;

const initializeTransporter = () => {
  if (transporter) return transporter;

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPassword = process.env.SMTP_PASSWORD;
  const smtpFromEmail = process.env.SMTP_FROM_EMAIL;

  // Check if SMTP is configured
  if (!smtpHost || !smtpUser || !smtpPassword || !smtpFromEmail) {
    console.warn('⚠️  SMTP not configured. Emails will be logged to console only.');
    return null;
  }

  try {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword
      }
    });

    console.log('✅ SMTP transporter initialized successfully');
    return transporter;
  } catch (error) {
    console.error('❌ Failed to initialize SMTP transporter:', error);
    return null;
  }
};

export const sendInventoryAlert = async (alertData: InventoryAlertEmail): Promise<void> => {
  const emailContent = {
    to: alertData.inventoryManagerEmail,
    from: process.env.SMTP_FROM_EMAIL || 'noreply@orgeda.com',
    subject: `🚨 Inventory Alert: ${alertData.title} [${alertData.priority}]`,
    html: generateAlertEmailHTML(alertData),
    text: generateAlertEmailText(alertData)
  };

  try {
    const mailer = initializeTransporter();

    if (!mailer) {
      // SMTP not configured, log to console
      console.log('📧 INVENTORY ALERT EMAIL (Console Mode):');
      console.log('To:', emailContent.to);
      console.log('From:', emailContent.from);
      console.log('Subject:', emailContent.subject);
      console.log('Content:', emailContent.text);
      console.log('---');
      return;
    }

    // Send email via SMTP
    const info = await mailer.sendMail(emailContent);
    console.log('✅ Inventory alert email sent successfully');
    console.log('Message ID:', info.messageId);
    console.log('To:', emailContent.to);
    console.log('Subject:', emailContent.subject);
  } catch (error) {
    console.error('❌ Failed to send inventory alert email:', error);
    throw error;
  }
};

const generateAlertEmailHTML = (alertData: InventoryAlertEmail): string => {
  const priorityColor = {
    'LOW': '#28a745',
    'MEDIUM': '#ffc107', 
    'HIGH': '#fd7e14',
    'CRITICAL': '#dc3545'
  }[alertData.priority] || '#6c757d';

  return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Inventory Alert</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .priority { display: inline-block; padding: 4px 12px; border-radius: 4px; color: white; font-weight: bold; }
            .alert-type { background: #e9ecef; padding: 8px 12px; border-radius: 4px; display: inline-block; margin: 10px 0; }
            .message { background: #fff; border-left: 4px solid ${priorityColor}; padding: 15px; margin: 20px 0; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; font-size: 14px; color: #6c757d; }
            .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 10px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🚨 Inventory Alert</h1>
                <p><strong>Priority:</strong> <span class="priority" style="background-color: ${priorityColor};">${alertData.priority}</span></p>
                <p><strong>Alert Type:</strong> <span class="alert-type">${alertData.alertType.replace('_', ' ')}</span></p>
            </div>
            
            <h2>${alertData.title}</h2>
            
            <div class="message">
                <p>${alertData.message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p><strong>Reported by:</strong> ${alertData.createdBy}</p>
            <p><strong>Project ID:</strong> ${alertData.projectId}</p>
            <p><strong>Alert ID:</strong> ${alertData.alertId}</p>
            
            <a href="http://localhost:3000/projects/${alertData.projectId}" class="button">
                View Project Dashboard
            </a>
            
            <div class="footer">
                <p>This alert was generated from the OrgEDA Platform. Please take appropriate action to address the inventory concern.</p>
                <p>If you believe this alert was sent in error, please contact the system administrator.</p>
            </div>
        </div>
    </body>
    </html>
  `;
};

const generateAlertEmailText = (alertData: InventoryAlertEmail): string => {
  return `
🚨 INVENTORY ALERT

Priority: ${alertData.priority}
Alert Type: ${alertData.alertType.replace('_', ' ')}

Title: ${alertData.title}

Message:
${alertData.message}

Details:
- Reported by: ${alertData.createdBy}
- Project ID: ${alertData.projectId}
- Alert ID: ${alertData.alertId}

Please review the project dashboard and take appropriate action:
http://localhost:3000/projects/${alertData.projectId}

---
This alert was generated from the OrgEDA Platform.
  `.trim();
};

// Email templates for different alert types
export const getAlertTemplate = (alertType: string): { title: string; defaultMessage: string } => {
  const templates: Record<string, { title: string; defaultMessage: string }> = {
    'LOW_STOCK': {
      title: 'Low Stock Alert',
      defaultMessage: 'Several items are running low on stock. Please review inventory levels and consider restocking.'
    },
    'OUT_OF_STOCK': {
      title: 'Out of Stock Alert',
      defaultMessage: 'Critical: Some items are completely out of stock. Immediate restocking required.'
    },
    'OVERSTOCK': {
      title: 'Overstock Alert', 
      defaultMessage: 'Some items appear to be overstocked. Consider reviewing ordering patterns.'
    },
    'QUALITY_ISSUE': {
      title: 'Quality Issue Alert',
      defaultMessage: 'Potential quality issues detected in inventory data. Please verify and investigate.'
    },
    'CUSTOM': {
      title: 'Custom Inventory Alert',
      defaultMessage: 'Please review the inventory situation described below.'
    }
  };

  return templates[alertType] || templates['CUSTOM'];
};
