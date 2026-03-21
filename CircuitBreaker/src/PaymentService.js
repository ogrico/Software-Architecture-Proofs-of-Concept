'use strict';

/*
 * Simulación de un servicio externo de procesamiento de pagos.
 *
 * En un sistema real, esto representaría una API de terceros (Stripe, PayPal, etc.)
 * al que nuestra aplicación llama. Este servicio puede:
 *   - Responder con éxito (isHealthy = true)
 *   - Fallar / no estar disponible (isHealthy = false)
 *
 * El Circuit Breaker envuelve las llamadas a este servicio para detectar
 * y gestionar esas fallas de forma automática.
 */
class PaymentService {
  constructor() {
    this.isHealthy = true;  // Controla si el servicio está disponible
    this.callCount = 0;     // Total de llamadas recibidas (incluyendo rechazadas por CB)
  }

  /**
   * Simula el procesamiento de un pago contra el servicio externo.
   * Tiene una latencia de red simulada para hacerlo más realista.
   *
   * @param {number} amount   Monto del pago
   * @param {number} orderId  Identificador de la orden
   * @returns {Promise<object>} Resultado de la transacción
   */
  async processPayment(amount, orderId) {
    this.callCount++;

    // Simular latencia de red (~80ms)
    await new Promise(resolve => setTimeout(resolve, 80));

    if (!this.isHealthy) {
      throw new Error(`El servidor de pagos no responde (timeout de conexión)`);
    }

    // Generar un ID de transacción único
    const txnId = `TXN-${String(orderId).padStart(3, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

    return {
      success:       true,
      transactionId: txnId,
      amount,
      orderId,
      timestamp:     new Date().toISOString(),
    };
  }

  /** Simula una caída del servidor externo (ej: falla de infraestructura). */
  setUnhealthy() {
    this.isHealthy = false;
  }

  /** Simula la recuperación del servidor externo (ej: restart, hotfix). */
  setHealthy() {
    this.isHealthy = true;
  }
}

module.exports = { PaymentService };
