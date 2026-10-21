const nodemailer = require('nodemailer');

module.exports = async function sendVerification(email, code) {
    if (!process.env.SMTP_HOST || !process.env.MAIL_FROM) {
        throw new Error('Configure SMTP_HOST e MAIL_FROM.');
    }
    if (typeof code !== 'string' || !/^[0-9]{6}$/.test(code)) {
        throw new Error('Código de confirmação inválido.');
    }

    const transport = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
            ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
            : undefined,
        connectionTimeout: 10000,
        socketTimeout: 15000
    });

    await transport.sendMail({
        from: process.env.MAIL_FROM,
        to: email,
        subject: 'Seu código de confirmação do Nythra',
        text: [
            'Confirme seu cadastro no Nythra.',
            '',
            `Seu código de confirmação é: ${code}`,
            '',
            'Digite esse código na tela de confirmação do Nythra.',
            'O código expira em 10 minutos e só pode ser usado uma vez.',
            'Ao solicitar outro código, utilize o mais recente.',
            'Se você não solicitou esse cadastro, ignore esta mensagem.'
        ].join('\n')
    });
};
