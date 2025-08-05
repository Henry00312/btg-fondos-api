const nodemailer = require('nodemailer');

class NotificationService {
  constructor() {
    this.emailTransporter = this.configureEmailTransporter();
    this.smsProvider = this.configureSMSProvider();
  }

  // Configurar transportador de email
  configureEmailTransporter() {
    if (process.env.NODE_ENV === 'production') {
      // Para producción, usar un servicio real
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER || 'demo@btgpactual.com',
          pass: process.env.EMAIL_PASS || 'demo_password'
        }
      });
    } else {
      // Para desarrollo, usar Ethereal (emails de prueba)
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user:  process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }
  }

  // ✅ NUEVO: Configurar proveedor SMS (Twilio/AWS SNS)
  configureSMSProvider() {
    if (process.env.SMS_PROVIDER === 'twilio') {
      // Configuración para Twilio
      return {
        provider: 'twilio',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_PHONE_NUMBER
      };
    } else if (process.env.SMS_PROVIDER === 'aws') {
      // Configuración para AWS SNS
      return {
        provider: 'aws',
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      };
    }
    
    return { provider: 'simulado' };
  }

  // Enviar notificación de suscripción
  async enviarNotificacionSuscripcion(cliente, fondo, transaccion) {
    try {
      const templateData = {
        nombreCliente: cliente.nombre,
        nombreFondo: fondo.nombre,
        montoInvertido: fondo.montoMinimo,
        saldoActual: cliente.saldo,
        fechaTransaccion: new Date().toLocaleDateString('es-CO'),
        transaccionId: transaccion.transaccionId || transaccion._id
      };

      let resultado = { success: false };

      if (cliente.preferenciaNotificacion === 'email') {
        resultado = await this.enviarEmailTemplate(cliente.email, 'suscripcion', templateData);
      } else if (cliente.preferenciaNotificacion === 'sms' && cliente.telefono) {
        resultado = await this.enviarSMSSuscripcion(cliente.telefono, templateData);
      }

      console.log(`✅ Notificación de suscripción enviada a ${cliente.email} vía ${cliente.preferenciaNotificacion}`);
      
      return { success: true, tipo: cliente.preferenciaNotificacion, ...resultado };
    } catch (error) {
      console.error('❌ Error enviando notificación de suscripción:', error.message);
      return { success: false, error: error.message };
    }
  }

  // Enviar notificación de cancelación
  async enviarNotificacionCancelacion(cliente, fondo, transaccion, montoDevuelto) {
    try {
      const templateData = {
        nombreCliente: cliente.nombre,
        nombreFondo: fondo.nombre,
        montoDevuelto: montoDevuelto,
        saldoActual: cliente.saldo,
        fechaTransaccion: new Date().toLocaleDateString('es-CO'),
        transaccionId: transaccion.transaccionId || transaccion._id
      };

      let resultado = { success: false };

      if (cliente.preferenciaNotificacion === 'email') {
        resultado = await this.enviarEmailTemplate(cliente.email, 'cancelacion', templateData);
      } else if (cliente.preferenciaNotificacion === 'sms' && cliente.telefono) {
        resultado = await this.enviarSMSCancelacion(cliente.telefono, templateData);
      }

      console.log(`✅ Notificación de cancelación enviada a ${cliente.email} vía ${cliente.preferenciaNotificacion}`);
      
      return { success: true, tipo: cliente.preferenciaNotificacion, ...resultado };
    } catch (error) {
      console.error('❌ Error enviando notificación de cancelación:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO: Email de bienvenida
  async enviarEmailBienvenida(cliente, passwordTemporal = null) {
    try {
      const templateData = {
        nombreCliente: cliente.nombre,
        email: cliente.email,
        saldoInicial: cliente.saldo,
        passwordTemporal
      };

      await this.enviarEmailTemplate(cliente.email, 'bienvenida', templateData);
      
      console.log(`✅ Email de bienvenida enviado a ${cliente.email}`);
      return { success: true, tipo: 'email' };
    } catch (error) {
      console.error('❌ Error enviando email de bienvenida:', error.message);
      return { success: false, error: error.message };
    }
  }

  // ✅ NUEVO: Sistema de templates unificado
  async enviarEmailTemplate(email, tipoTemplate, data) {
    const templates = {
      bienvenida: this.getBienvenidaTemplate(data),
      suscripcion: this.getSuscripcionTemplate(data),
      cancelacion: this.getCancelacionTemplate(data),
      reporte: this.getReporteTemplate(data)
    };

    const template = templates[tipoTemplate];
    if (!template) {
      throw new Error(`Template '${tipoTemplate}' no encontrado`);
    }

    const mailOptions = {
      from: '"BTG Pactual" <noreply@btgpactual.com>',
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text
    };

    // En desarrollo, solo loggeamos el email
    if (process.env.NODE_ENV !== 'production') {
      console.log(`📧 Email simulado enviado (${tipoTemplate}):`, {
        to: email,
        subject: mailOptions.subject,
        content: template.preview
      });
      return { messageId: 'simulated-' + Date.now() };
    }

    const result = await this.emailTransporter.sendMail(mailOptions);
    return { messageId: result.messageId };
  }

  // ✅ NUEVO: Template de bienvenida
 getBienvenidaTemplate(data) {
  const formatCOP = (n) => typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

  return {
    subject: '🎉 Bienvenido a BTG Pactual - Fondos de Inversión',
    preview: `Bienvenida para ${data.nombreCliente}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 25px; background: #f8fafc; }
          .welcome { color: #4a5568; font-size: 18px; text-align: center; margin: 20px 0; }
          .highlight { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; color: #718096; }
          .cta-button { background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🚀 ¡Bienvenido a BTG Pactual!</h1>
          <p>Tu futuro financiero comienza aquí</p>
        </div>
        
        <div class="content">
          <div class="welcome">
            <h2>Hola <strong>${data.nombreCliente}</strong> 👋</h2>
            <p>¡Nos emociona tenerte como parte de nuestra familia de inversionistas!</p>
          </div>
          
          <div class="highlight">
            <h3>📊 Tu cuenta está lista:</h3>
            <p><strong>Email:</strong> ${data.email}</p>
            <p><strong>Saldo inicial:</strong> $${formatCOP(data.saldoInicial)} COP</p>
            ${data.passwordTemporal ? `<p><strong>⚠️ Contraseña temporal:</strong> ${data.passwordTemporal}</p>` : ''}
          </div>
          
          ${data.passwordTemporal ? 
            '<div style="background: #fed7d7; padding: 15px; border-radius: 6px; color: #c53030; margin: 15px 0;"><strong>🔒 Importante:</strong> Por seguridad, cambia tu contraseña temporal en tu primer inicio de sesión.</div>' 
            : ''
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="#" class="cta-button">🏦 Explorar Fondos Disponibles</a>
          </div>
          
          <div class="highlight">
            <h3>🎯 Próximos pasos:</h3>
            <ul>
              <li>Explora nuestros fondos de inversión (FPV y FIC)</li>
              <li>Revisa los montos mínimos de cada fondo</li>
              <li>Realiza tu primera inversión</li>
              <li>Configura tus preferencias de notificación</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>Este es un mensaje automático. Para soporte, contacta a support@btgpactual.com</p>
          <p>© 2025 BTG Pactual. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      ¡Bienvenido a BTG Pactual, ${data.nombreCliente}!

      Tu cuenta está lista:
      - Email: ${data.email}
      - Saldo inicial: $${formatCOP(data.saldoInicial)} COP
      ${data.passwordTemporal ? `- Contraseña temporal: ${data.passwordTemporal}` : ''}

      ¡Comienza a invertir hoy mismo!

      BTG Pactual - Tu futuro financiero
    `
  };
}

  // Template de suscripción (mantenemos el existente)
getSuscripcionTemplate(data) {
  const formatCOP = (n) => typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

  return {
    subject: `🎉 Confirmación de suscripción - ${data.nombreFondo || 'Fondo desconocido'}`,
    preview: `Suscripción a ${data.nombreFondo || 'Fondo desconocido'} por $${formatCOP(data.montoInvertido)} COP`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
          .header { background: #1a365d; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f7fafc; }
          .success { color: #38a169; font-weight: bold; font-size: 18px; }
          .amount { font-size: 24px; color: #1a365d; font-weight: bold; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #38a169; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 BTG Pactual</h1>
          <h2>Confirmación de Suscripción</h2>
        </div>
        
        <div class="content">
          <p>Estimado/a <strong>${data.nombreCliente}</strong>,</p>
          <p class="success">✅ Su suscripción al fondo ha sido exitosa</p>
          <div class="details">
            <h3>📊 Detalles de la transacción:</h3>
            <p><strong>Fondo:</strong> ${data.nombreFondo}</p>
            <p><strong>Monto invertido:</strong> <span class="amount">$${formatCOP(data.montoInvertido)} COP</span></p>
            <p><strong>Saldo actual:</strong> $${formatCOP(data.saldoActual)} COP</p>
            <p><strong>Fecha:</strong> ${data.fechaTransaccion}</p>
            <p><strong>ID Transacción:</strong> ${data.transaccionId}</p>
          </div>
          <p>🚀 Su inversión está activa y comenzará a generar rentabilidad según las condiciones del fondo.</p>
        </div>
        
        <div class="footer">
          <p>© 2025 BTG Pactual. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Estimado/a ${data.nombreCliente},

      Su suscripción al fondo ${data.nombreFondo} ha sido exitosa.

      Detalles:
      - Monto invertido: $${formatCOP(data.montoInvertido)} COP
      - Saldo actual: $${formatCOP(data.saldoActual)} COP
      - ID Transacción: ${data.transaccionId}

      Gracias por confiar en BTG Pactual.
    `
  };
}


  // Template de cancelación (mantenemos el existente)
getCancelacionTemplate(data) {
  const formatCOP = (n) => typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

  return {
    subject: `📋 Confirmación de cancelación - ${data.nombreFondo || 'Fondo desconocido'}`,
    preview: `Cancelación de ${data.nombreFondo || 'Fondo desconocido'} - $${formatCOP(data.montoDevuelto)} COP devuelto`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
          .header { background: #c53030; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f7fafc; }
          .info { color: #2b6cb0; font-weight: bold; font-size: 18px; }
          .amount { font-size: 24px; color: #38a169; font-weight: bold; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; }
          .details { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; border-left: 4px solid #2b6cb0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>💰 BTG Pactual</h1>
          <h2>Confirmación de Cancelación</h2>
        </div>
        
        <div class="content">
          <p>Estimado/a <strong>${data.nombreCliente}</strong>,</p>
          <p class="info">ℹ️ Su cancelación del fondo ha sido procesada exitosamente</p>
          <div class="details">
            <h3>📊 Detalles de la cancelación:</h3>
            <p><strong>Fondo:</strong> ${data.nombreFondo}</p>
            <p><strong>Monto devuelto:</strong> <span class="amount">$${formatCOP(data.montoDevuelto)} COP</span></p>
            <p><strong>Saldo actual:</strong> $${formatCOP(data.saldoActual)} COP</p>
            <p><strong>Fecha:</strong> ${data.fechaTransaccion}</p>
            <p><strong>ID Transacción:</strong> ${data.transaccionId}</p>
          </div>
          <p>💳 El monto ha sido devuelto a su saldo disponible.</p>
        </div>
        
        <div class="footer">
          <p>© 2025 BTG Pactual. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Estimado/a ${data.nombreCliente},

      Su cancelación del fondo ${data.nombreFondo} ha sido procesada.

      Detalles:
      - Monto devuelto: $${formatCOP(data.montoDevuelto)} COP
      - Saldo actual: $${formatCOP(data.saldoActual)} COP
      - ID Transacción: ${data.transaccionId}

      Gracias por confiar en BTG Pactual.
    `
  };
}

  // ✅ NUEVO: Template de reporte mensual
getReporteTemplate(data) {
  const formatCOP = (n) => typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

  return {
    subject: '📈 Reporte Mensual de Inversiones - BTG Pactual',
    preview: `Reporte mensual para ${data.nombreCliente}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; }
          .header { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 25px; text-align: center; }
          .content { padding: 20px; background: #f7fafc; }
          .stat-box { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #4facfe; }
          .footer { background: #e2e8f0; padding: 15px; text-align: center; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📈 Reporte Mensual</h1>
          <p>Resumen de tus inversiones</p>
        </div>
        
        <div class="content">
          <p>Estimado/a <strong>${data.nombreCliente}</strong>,</p>
          <div class="stat-box">
            <h3>💼 Portfolio Actual:</h3>
            <p><strong>Total Invertido:</strong> $${formatCOP(data.totalInvertido)}</p>
            <p><strong>Saldo Disponible:</strong> $${formatCOP(data.saldoDisponible)}</p>
            <p><strong>Fondos Activos:</strong> ${data.fondosActivos || 0}</p>
          </div>
          <p>📊 Consulta el detalle completo en tu portal BTG Pactual.</p>
        </div>
        
        <div class="footer">
          <p>© 2025 BTG Pactual. Todos los derechos reservados.</p>
        </div>
      </body>
      </html>
    `,
    text: `
      Reporte Mensual - ${data.nombreCliente}

      Portfolio Actual:
      - Total Invertido: $${formatCOP(data.totalInvertido)} COP
      - Saldo Disponible: $${formatCOP(data.saldoDisponible)} COP
      - Fondos Activos: ${data.fondosActivos || 0}

      BTG Pactual
    `
  };
}

  // ✅ MEJORADO: SMS real con Twilio (opcional)
  async enviarSMSSuscripcion(telefono, data) {
    const formatCOP = (n) =>
    typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

    const mensaje = `BTG Pactual: Suscripción exitosa a ${data.nombreFondo || 'Fondo desconocido'}. Monto: $${formatCOP(data.montoInvertido)} COP. Saldo: $${formatCOP(data.saldoActual)} COP. ID: ${data.transaccionId || 'N/A'}`;

    if (this.smsProvider.provider === 'twilio' && process.env.NODE_ENV === 'production') {
      try {
        const twilio = require('twilio')(
          this.smsProvider.accountSid,
          this.smsProvider.authToken
        );

        const result = await twilio.messages.create({
          body: mensaje,
          from: this.smsProvider.fromNumber,
          to: telefono
        });

        console.log(`📱 SMS enviado via Twilio: ${result.sid}`);
        return { success: true, messageId: result.sid };
      } catch (error) {
        console.error('❌ Error enviando SMS via Twilio:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      // En desarrollo, simulamos el SMS
      console.log('📱 SMS simulado enviado:', {
        to: telefono,
        message: mensaje
      });
      return { success: true, messageId: 'simulated-sms-' + Date.now() };
    }
  }

  // ✅ MEJORADO: SMS cancelación con Twilio
  async enviarSMSCancelacion(telefono, data) {
    
    const formatCOP = (n) =>
    typeof n === 'number' ? n.toLocaleString('es-CO') : '0';

    const mensaje = `BTG Pactual: Cancelación de ${data.nombreFondo || 'Fondo desconocido'} procesada. Devuelto: $${formatCOP(data.montoDevuelto)} COP. Saldo: $${formatCOP(data.saldoActual)} COP. ID: ${data.transaccionId || 'N/A'}`;

    if (this.smsProvider.provider === 'twilio' && process.env.NODE_ENV === 'production') {
      try {
        const twilio = require('twilio')(
          this.smsProvider.accountSid,
          this.smsProvider.authToken
        );

        const result = await twilio.messages.create({
          body: mensaje,
          from: this.smsProvider.fromNumber,
          to: telefono
        });

        console.log(`📱 SMS enviado via Twilio: ${result.sid}`);
        return { success: true, messageId: result.sid };
      } catch (error) {
        console.error('❌ Error enviando SMS via Twilio:', error.message);
        return { success: false, error: error.message };
      }
    } else {
      // En desarrollo, simulamos el SMS
      console.log('📱 SMS simulado enviado:', {
        to: telefono,
        message: mensaje
      });
      return { success: true, messageId: 'simulated-sms-' + Date.now() };
    }
  }

  // ✅ NUEVO: Método para pruebas
  async enviarEmailPrueba(email, tipo = 'bienvenida') {
    const dataPrueba = {
      nombreCliente: 'Usuario de Prueba',
      email: email,
      saldoInicial: 500000,
      nombreFondo: 'FPV_BTG_PACTUAL_RECAUDADORA',
      montoInvertido: 75000,
      saldoActual: 425000,
      fechaTransaccion: new Date().toLocaleDateString('es-CO'),
      transaccionId: 'TEST-' + Date.now()
    };

    try {
      await this.enviarEmailTemplate(email, tipo, dataPrueba);
      return { success: true, message: `Email de prueba (${tipo}) enviado a ${email}` };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new NotificationService();