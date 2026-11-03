import { emailConfig } from "@/lib/config";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export type EmailStatus = "SENT" | "SKIPPED" | "FAILED";

export interface EmailSendResult {
  status: EmailStatus;
  provider: string;
  error?: string;
}

/**
 * Antarmuka penyedia email. Logika bisnis hanya bergantung pada kontrak ini,
 * sehingga penyedia dapat diganti (SMTP, Resend, SendGrid, dsb.) tanpa
 * menyentuh alur peminjaman.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<EmailSendResult>;
}

/**
 * Driver pengembangan: email TIDAK dikirim, hanya dicatat metadatanya.
 * Body tidak ditulis ke log agar data pribadi tidak bocor.
 */
class LogEmailProvider implements EmailProvider {
  readonly name = "log";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    console.info(
      `[email:log] status=SKIPPED to=${message.to} subject="${message.subject}" (EMAIL_PROVIDER=log, email tidak benar-benar dikirim)`,
    );
    return { status: "SKIPPED", provider: this.name };
  }
}

class SmtpEmailProvider implements EmailProvider {
  readonly name = "smtp";

  async send(message: EmailMessage): Promise<EmailSendResult> {
    const { host, port, secure, user, password } = emailConfig.smtp;
    if (!host) {
      return {
        status: "FAILED",
        provider: this.name,
        error: "SMTP_HOST belum diatur",
      };
    }
    try {
      const nodemailer = await import("nodemailer");
      const transport = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass: password } : undefined,
      });
      await transport.sendMail({
        from: emailConfig.from,
        to: message.to,
        subject: message.subject,
        text: message.text,
      });
      return { status: "SENT", provider: this.name };
    } catch (error) {
      const message2 = error instanceof Error ? error.message : "unknown error";
      // Catat penyebab teknis tanpa isi email / kredensial.
      console.error(`[email:smtp] status=FAILED error=${message2}`);
      return { status: "FAILED", provider: this.name, error: message2 };
    }
  }
}

export function getEmailProvider(): EmailProvider {
  if (emailConfig.provider === "smtp") return new SmtpEmailProvider();
  return new LogEmailProvider();
}

export function emailTransportConfigured(): boolean {
  return emailConfig.provider === "smtp" && Boolean(emailConfig.smtp.host);
}
