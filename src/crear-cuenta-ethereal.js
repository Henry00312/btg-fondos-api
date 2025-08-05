// scripts/crear-cuenta-ethereal.js
const nodemailer = require('nodemailer');

(async () => {
  const testAccount = await nodemailer.createTestAccount();

  console.log('✅ Cuenta Ethereal creada:');
  console.log('Usuario:', testAccount.user);
  console.log('Contraseña:', testAccount.pass);
  console.log('Host SMTP:', testAccount.smtp.host);
  console.log('Puerto SMTP:', testAccount.smtp.port);
  console.log('Seguridad:', testAccount.smtp.secure);
  console.log('🔗 URL de acceso:', testAccount.web);
})();
