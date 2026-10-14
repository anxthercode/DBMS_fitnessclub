import asyncio
import smtplib
import ssl
from email.message import EmailMessage

from app.core.errors import DomainError


async def send(settings, email, purpose, token, locale):
    if not settings.smtp_host or not settings.smtp_from:
        raise DomainError("mail_unavailable", 503)
    route = "verify-email" if purpose == "verify" else "reset-password"
    # Fragment tokens do not enter HTTP access logs or referrer headers.
    url = f"{settings.frontend_url.rstrip('/')}/{route}#token={token}"
    message = EmailMessage()
    message["From"], message["To"] = settings.smtp_from, email
    message["Subject"] = (
        "NORTHSIDE — " + ("Подтверждение email" if purpose == "verify" else "Сброс пароля")
        if locale == "ru"
        else "NORTHSIDE — "
        + ("Verify your email" if purpose == "verify" else "Reset your password")
    )
    message.set_content(
        (
            "Откройте ссылку и подтвердите действие. Если это были не вы, проигнорируйте письмо.\n"
            if locale == "ru"
            else "Open the link to confirm. If you did not request this, ignore this email.\n"
        )
        + url
    )

    def deliver():
        context = ssl.create_default_context()
        if settings.smtp_security == "ssl":
            server = smtplib.SMTP_SSL(
                settings.smtp_host, settings.smtp_port, timeout=15, context=context
            )
        else:
            server = smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15)
        with server:
            if settings.smtp_security == "starttls":
                server.starttls(context=context)
            if settings.smtp_user:
                server.login(settings.smtp_user, settings.smtp_password.get_secret_value())
            server.send_message(message)

    try:
        await asyncio.to_thread(deliver)
    except (OSError, smtplib.SMTPException) as exc:
        raise DomainError("mail_unavailable", 503) from exc
