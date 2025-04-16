// app/api/contact/route.ts
import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(request: NextRequest) {
  try {
    console.log('Contact form API route called');
    
    // Parse request body
    const { name, email, subject, message } = await request.json()
    
    // Validate required fields
    if (!name || !email || !message) {
      console.error('Missing required fields');
      return NextResponse.json(
        { message: 'Name, email, and message are required' },
        { status: 400 }
      )
    }
    
    // Log environment check for debugging
    console.log('Environment variables check:');
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtpdm-ap-southeast-1.aliyun.com');
    console.log('SMTP_PORT:', process.env.SMTP_PORT || '465');
    console.log('SMTP_USERNAME available:', !!process.env.SMTP_USERNAME);
    console.log('SMTP_PASSWORD available:', !!process.env.SMTP_PASSWORD);
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'contact@vuetour.com');
    console.log('EMAIL_TO:', process.env.EMAIL_TO || 'contact@vuetour.com');
    
    // Configure transporter with the exact credentials
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtpdm-ap-southeast-1.aliyun.com',
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USERNAME || 'contact@vuetour.com',
        pass: process.env.SMTP_PASSWORD || 'VueTour121'
      },
      debug: true // Enable debug output
    })
    
    console.log('Nodemailer transporter configured');
    
    // Prepare email content
    const emailContent = `
      <h2>New Message from ${name}</h2>
      <div style="padding: 15px; border-left: 4px solid #0070f3; background-color: #f5f5f5; margin-bottom: 20px;">
        <p><strong>From:</strong> ${name} (${email})</p>
        <p><strong>Subject:</strong> ${subject || 'No subject'}</p>
        <p><strong>Sent via:</strong> VueTour Contact Form</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
      </div>
      <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h3 style="margin-top: 0;">Message:</h3>
        <p style="white-space: pre-line;">${message.replace(/\n/g, '<br>')}</p>
      </div>
      <p style="color: #666; font-size: 12px; margin-top: 20px;">
        To reply to this message, simply reply to this email and your response will be sent directly to ${name}.
      </p>
    `
    
    // Get email addresses from env vars or use defaults
    const fromEmail = process.env.EMAIL_FROM || 'contact@vuetour.com';
    const toEmail = process.env.EMAIL_TO || 'contact@vuetour.com';
    
    console.log(`Sending email from ${fromEmail} to ${toEmail}`);
    
    // Send email
    try {
      const info = await transporter.sendMail({
        from: `"VueTour Contact Form" <${fromEmail}>`,
        to: toEmail,
        replyTo: email, // This ensures replies go directly to the user
        subject: `[Contact Form] Message from ${name}: ${subject || 'No subject'}`,
        html: emailContent,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || 'N/A'}\nMessage: ${message}`
      })
      
      console.log('Message sent: %s', info.messageId);
      console.log('Message response:', info.response);
      
      // Send auto-reply to the user (optional)
      await transporter.sendMail({
        from: `"VueTour Support" <${fromEmail}>`,
        to: email,
        subject: `Thank you for contacting VueTour Support`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0070f3;">Thank You for Contacting Us</h2>
            <p>Dear ${name},</p>
            <p>Thank you for reaching out to VueTour. This is an automatic confirmation that we have received your message regarding:</p>
            <p style="padding: 10px; background-color: #f5f5f5; border-left: 4px solid #0070f3;"><strong>${subject || 'Your inquiry'}</strong></p>
            <p>Our support team will review your message and respond as soon as possible. We typically respond to inquiries within 24-48 business hours.</p>
            <p>For your reference, here's a copy of your message:</p>
            <div style="padding: 15px; border: 1px solid #e0e0e0; border-radius: 5px; background-color: #fafafa; margin: 15px 0;">
              <p style="white-space: pre-line;">${message.replace(/\n/g, '<br>')}</p>
            </div>
            <p>If you have any additional information to add, please reply to this email.</p>
            <p>Best regards,<br>The VueTour Support Team</p>
          </div>
        `,
        text: `Thank you for contacting VueTour Support!

Dear ${name},

Thank you for reaching out to VueTour. This is an automatic confirmation that we have received your message regarding:

"${subject || 'Your inquiry'}"

Our support team will review your message and respond as soon as possible. We typically respond to inquiries within 24-48 business hours.

For your reference, here's a copy of your message:

${message}

If you have any additional information to add, please reply to this email.

Best regards,
The VueTour Support Team`
      });
      
      return NextResponse.json(
        { message: 'Email sent successfully', id: info.messageId },
        { status: 200 }
      )
    } catch (mailError: any) {
      console.error('Transporter error:', mailError);
      console.error('Error code:', mailError.code);
      console.error('Error response:', mailError.response);
      
      throw mailError; // Re-throw to be handled by the outer catch
    }
  } catch (error: any) {
    console.error('Error sending email:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    
    return NextResponse.json(
      { 
        message: 'Failed to send email', 
        error: error.message || 'Unknown error',
        code: error.code,
        name: error.name
      },
      { status: 500 }
    )
  }
}