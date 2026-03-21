'use strict';

// ─── Estados del circuito ────────────────────────────────────────────────────
const STATE = {
  CLOSED:    'CLOSED',     // Cerrado: tráfico normal
  OPEN:      'OPEN',       // Abierto: tráfico bloqueado
  HALF_OPEN: 'HALF_OPEN',  // Semi-abierto: en prueba
};

// ─── Clase principal ─────────────────────────────────────────────────────────
class CircuitBreaker {
  /**
   * @param {object}   options
   * @param {number}   options.failureThreshold  — Nº de fallos consecutivos para ABRIR el circuito  (default: 3)
   * @param {number}   options.successThreshold  — Nº de éxitos en HALF_OPEN para CERRAR el circuito (default: 2)
   * @param {number}   options.timeout           — Milisegundos antes de pasar de OPEN → HALF_OPEN    (default: 5000)
   * @param {Function} options.onStateChange     — Callback invocado en cada transición de estado
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold ?? 3;
    this.successThreshold = options.successThreshold ?? 2;
    this.timeout          = options.timeout          ?? 5000;
    this.onStateChange    = options.onStateChange    ?? null;

    // ── Estado interno ──────────────────────────────────────────
    this.state           = STATE.CLOSED;
    this.failureCount    = 0;   // Fallos consecutivos en CLOSED
    this.successCount    = 0;   // Éxitos consecutivos en HALF_OPEN
    this.nextAttemptTime = null; // Momento en que se puede volver a reintentar

    // ── Métricas acumuladas ─────────────────────────────────────
    this.metrics = {
      totalRequests:      0,
      successfulRequests: 0,
      failedRequests:     0,
      rejectedRequests:   0,  // Rechazadas por fast-fail (sin tocar el servicio)
      stateChanges:       [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODO PÚBLICO: execute()
  // ─────────────────────────────────────────────────────────────────────────
  /**
   * Ejecuta una función protegida por el Circuit Breaker.
   *
   * @param {Function} fn  Función asíncrona que representa la llamada al servicio externo.
   * @returns {Promise}    El resultado de `fn` si el circuito lo permite.
   * @throws {CircuitBreakerOpenError}  Si el circuito está OPEN (fast fail).
   * @throws {Error}                    Si el servicio externo lanza un error.
   */
  async execute(fn) {
    this.metrics.totalRequests++;

    // ── Comprobar si el circuito está ABIERTO ────────────────────
    if (this.state === STATE.OPEN) {
      const ahora = Date.now();

      if (ahora < this.nextAttemptTime) {
        // El timeout aún no ha expirado → rechazar inmediatamente (fast fail)
        const esperaMs = this.nextAttemptTime - ahora;
        this.metrics.rejectedRequests++;
        throw new CircuitBreakerOpenError(
          `Reintento en ${Math.ceil(esperaMs / 1000)}s`,
          this.getStatus()
        );
      }

      // El timeout expiró → pasar a HALF_OPEN para probar si el servicio se recuperó
      this._transitionTo(STATE.HALF_OPEN);
    }

    // ── Intentar llamar al servicio externo ──────────────────────
    try {
      const result = await fn();
      this._onSuccess();
      this.metrics.successfulRequests++;
      return result;
    } catch (error) {
      this._onFailure();
      this.metrics.failedRequests++;
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODOS PRIVADOS
  // ─────────────────────────────────────────────────────────────────────────

  /** Maneja una respuesta exitosa del servicio externo. */
  _onSuccess() {
    if (this.state === STATE.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        // Suficientes éxitos → el servicio se recuperó, cerrar el circuito
        this._transitionTo(STATE.CLOSED);
      }
    } else if (this.state === STATE.CLOSED) {
      // Reiniciar contador de fallos en cada éxito
      this.failureCount = 0;
    }
  }

  /** Maneja un fallo del servicio externo. */
  _onFailure() {
    this.failureCount++;

    if (this.state === STATE.HALF_OPEN) {
      // Cualquier fallo durante la prueba vuelve a abrir el circuito
      this._transitionTo(STATE.OPEN);
    } else if (this.failureCount >= this.failureThreshold) {
      // Se superó el umbral de fallos → abrir el circuito
      this._transitionTo(STATE.OPEN);
    }
  }

  /** Realiza una transición de estado y notifica al observador. */
  _transitionTo(newState) {
    const oldState = this.state;
    this.state = newState;

    if (newState === STATE.OPEN) {
      this.nextAttemptTime = Date.now() + this.timeout;
    } else if (newState === STATE.CLOSED) {
      this.failureCount    = 0;
      this.successCount    = 0;
      this.nextAttemptTime = null;
    } else if (newState === STATE.HALF_OPEN) {
      this.successCount = 0;
    }

    const cambio = { from: oldState, to: newState, timestamp: new Date().toISOString() };
    this.metrics.stateChanges.push(cambio);

    if (this.onStateChange) {
      this.onStateChange(cambio);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE CONSULTA
  // ─────────────────────────────────────────────────────────────────────────

  /** Retorna el estado actual del circuito. */
  getStatus() {
    return {
      state:           this.state,
      failureCount:    this.failureCount,
      successCount:    this.successCount,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /** Retorna las métricas acumuladas. */
  getMetrics() {
    return { ...this.metrics };
  }
}

// ─── Error específico del Circuit Breaker ────────────────────────────────────
class CircuitBreakerOpenError extends Error {
  constructor(message, status) {
    super(`Circuito ABIERTO — ${message}`);
    this.name   = 'CircuitBreakerOpenError';
    this.status = status;
  }
}

module.exports = { CircuitBreaker, CircuitBreakerOpenError, STATE };
