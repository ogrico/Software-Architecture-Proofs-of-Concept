'use strict';

/*
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         DEMO — Patrón Circuit Breaker en acción             ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * Escenario: una aplicación de e-commerce procesa pagos a través
 * de un servicio externo. Cuando ese servicio falla, el Circuit
 * Breaker protege la aplicación y permite su recuperación grácil.
 *
 * Fases del demo:
 *   Fase 1 — Operación normal (circuito CERRADO)
 *   Fase 2 — El servicio externo empieza a fallar → circuito se ABRE
 *   Fase 3 — Circuito ABIERTO: fast-fail, el servicio NO es contactado
 *   Fase 4 — Período de espera y reparación del servicio
 *   Fase 5 — Circuito SEMI-ABIERTO: prueba de recuperación
 *   Fase 6 — Operación normal restaurada (circuito CERRADO)
 *
 * Ejecutar: node src/demo.js
 */

const { CircuitBreaker, CircuitBreakerOpenError, STATE } = require('./CircuitBreaker');
const { PaymentService }                                  = require('./PaymentService');
const chalk                                               = require('chalk');

// ─── Utilidades ──────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/** Retorna una etiqueta visual coloreada para cada estado del circuito. */
function badge(state) {
  switch (state) {
    case STATE.CLOSED:    return chalk.bgGreen.black('  CERRADO   ');
    case STATE.OPEN:      return chalk.bgRed.white(  '  ABIERTO   ');
    case STATE.HALF_OPEN: return chalk.bgYellow.black(' SEMI-AB.  ');
    default:              return chalk.bgGray.white(`  ${state}  `);
  }
}

/** Imprime el encabezado de una fase. */
function phase(title, ...descLines) {
  console.log('\n' + chalk.cyan('─'.repeat(68)));
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(chalk.cyan('─'.repeat(68)));
  descLines.forEach(l => console.log(chalk.gray(`  ${l}`)));
  console.log();
}

/** Cuenta regresiva visual en la misma línea. */
async function countdown(seconds, label) {
  process.stdout.write(chalk.yellow(`  ⏳ ${label}: `));
  for (let i = seconds; i > 0; i--) {
    process.stdout.write(chalk.yellow(`${i}… `));
    await sleep(1000);
  }
  console.log(chalk.green('listo.\n'));
}

// ─── Demo ────────────────────────────────────────────────────────────────────

async function runDemo() {
  const TIMEOUT_SECS = 5;

  // ── Instancias ─────────────────────────────────────────────────────────────
  const paymentService = new PaymentService();

  const breaker = new CircuitBreaker({
    failureThreshold: 3,                  // Abre el circuito tras 3 fallos consecutivos
    successThreshold: 2,                  // Cierra el circuito tras 2 éxitos en HALF_OPEN
    timeout:          TIMEOUT_SECS * 1000, // Espera 5 s antes de pasar a HALF_OPEN

    // Callback llamado en cada transición de estado
    onStateChange: ({ from, to }) => {
      if (to === STATE.HALF_OPEN) halfOpenProbeCount = 0; // reiniciar contador de pruebas
      const messages = {
        [STATE.OPEN]:      chalk.red('⚠  CIRCUITO ABIERTO  — el sistema deja de llamar al servicio caído'),
        [STATE.HALF_OPEN]: chalk.yellow('↻  CIRCUITO SEMI-ABIERTO — probando si el servicio se recuperó'),
        [STATE.CLOSED]:    chalk.green('✅ CIRCUITO CERRADO  — servicio verificado, operación normal'),
      };
      console.log(
        chalk.bold(`\n  ┌── TRANSICIÓN ──────────────────────────────────────────────┐`)
      );
      console.log(chalk.bold(`  │  ${badge(from)}  ──►  ${badge(to)}`));
      console.log(chalk.bold(`  │  ${messages[to] || to}`));
      console.log(chalk.bold(`  └───────────────────────────────────────────────────────────┘\n`));
    },
  });

  // ── Función auxiliar: realizar una solicitud de pago ───────────────────────
  let reqNum            = 0;
  let halfOpenProbeCount = 0; // Contador local de pruebas en HALF_OPEN

  async function pay(amount) {
    reqNum++;
    const n          = reqNum;
    const stateAntes = breaker.state; // Estado en el momento de iniciar la llamada

    try {
      const result = await breaker.execute(() => paymentService.processPayment(amount, n));

      // Cuando stateAntes era OPEN y la llamada tuvo éxito, execute() transitó
      // internamente a HALF_OPEN antes de invocar al servicio → mostrar SEMI-AB.
      const badgeState = stateAntes === STATE.OPEN ? STATE.HALF_OPEN : stateAntes;

      let probeInfo = '';
      if (badgeState === STATE.HALF_OPEN) {
        halfOpenProbeCount++;
        probeInfo = chalk.yellow(`  [prueba ${halfOpenProbeCount}/${breaker.successThreshold}]`);
      }

      console.log(
        `  ${chalk.green('✓')} ${badge(badgeState)} ` +
        `Req #${String(n).padEnd(2)}  ` +
        chalk.green(`$${String(amount).padStart(4)} procesado`) +
        `  ${chalk.gray(result.transactionId)}` +
        probeInfo
      );
    } catch (err) {
      if (err instanceof CircuitBreakerOpenError) {
        // Fast-fail: el Circuit Breaker rechazó sin llamar al servicio
        console.log(
          `  ${chalk.yellow('⚡')} ${badge(STATE.OPEN)} ` +
          `Req #${String(n).padEnd(2)}  ` +
          chalk.yellow('RECHAZADA — fast fail') +
          chalk.gray('  ← el servicio externo NO fue contactado  ') +
          chalk.gray(`(${err.message})`)
        );
      } else {
        // El servicio externo devolvió un error
        const { failureCount } = breaker.getStatus();
        const umbralInfo = breaker.state !== STATE.OPEN
          ? chalk.gray(`  [fallos: ${failureCount}/${breaker.failureThreshold}]`)
          : chalk.red(`  [umbral superado → circuito abierto]`);

        console.log(
          `  ${chalk.red('✗')} ${badge(stateAntes)} ` +
          `Req #${String(n).padEnd(2)}  ` +
          chalk.red('FALLO del servicio') +
          chalk.gray(`  — ${err.message}`) +
          umbralInfo
        );
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // INICIO
  // ════════════════════════════════════════════════════════════════════════════

  console.log('\n' + chalk.bold('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║       PATRÓN CIRCUIT BREAKER — Prueba de Concepto               ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝'));

  console.log(chalk.gray('\n  Contexto: aplicación de e-commerce que cobra pagos vía servicio externo.'));
  console.log(chalk.gray('  El Circuit Breaker actúa como disyuntor automático ante fallas.\n'));

  console.log(chalk.bold('  Configuración del Circuit Breaker:'));
  console.log(chalk.gray(`    failureThreshold : ${breaker.failureThreshold}  → fallos consecutivos para ABRIR el circuito`));
  console.log(chalk.gray(`    successThreshold : ${breaker.successThreshold}  → éxitos en SEMI-ABIERTO para CERRAR el circuito`));
  console.log(chalk.gray(`    timeout          : ${TIMEOUT_SECS}s → espera antes de pasar de ABIERTO → SEMI-ABIERTO`));

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 1 — Operación normal
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    'FASE 1 — Operación Normal  [Estado inicial: CERRADO]',
    'El servicio de pagos funciona correctamente.',
    'Todas las solicitudes cruzan el circuit breaker y llegan al servicio sin problema.'
  );

  for (const amount of [100, 250, 75, 500, 180]) {
    await pay(amount);
    await sleep(150);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 2 — El servicio externo falla → umbral alcanzado → circuito se ABRE
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    'FASE 2 — El Servicio Externo Falla  [CERRADO → ABIERTO]',
    'Se simula una caída del servidor de pagos (ej: falla de red, reinicio inesperado).',
    `Tras ${breaker.failureThreshold} fallos consecutivos, el circuit breaker ABRE el circuito automáticamente.`
  );

  console.log(chalk.red('  ⚠  Evento externo: ¡El servidor de pagos ha caído!\n'));
  paymentService.setUnhealthy();

  for (const amount of [300, 420, 200]) {
    await pay(amount);
    await sleep(150);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 3 — Circuito ABIERTO: fast fail activo
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    'FASE 3 — Circuito Abierto: Protección por Fast Fail  [Estado: ABIERTO]',
    'El circuito está ABIERTO. Las solicitudes son rechazadas INMEDIATAMENTE,',
    'sin llegar al servicio externo. Beneficios clave:',
    '  • Evita sobrecargar un servidor ya caído.',
    '  • Responde rápido al cliente en lugar de esperar un timeout largo.',
    '  • Libera recursos del sistema (hilos, conexiones, memoria).'
  );

  for (const amount of [150, 320, 90]) {
    await pay(amount);
    await sleep(150);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 4 — Período de espera y reparación
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    `FASE 4 — Período de Espera  (timeout: ${TIMEOUT_SECS}s)`,
    `El circuit breaker espera ${TIMEOUT_SECS}s antes de volver a intentar (evita reintentos agresivos).`,
    'Mientras tanto, el equipo de infraestructura restaura el servicio de pagos.'
  );

  await sleep(200);
  paymentService.setHealthy();
  console.log(chalk.green('  ✅  Evento externo: ¡El servidor de pagos fue reparado! (el circuit breaker aún no lo sabe)\n'));

  await countdown(TIMEOUT_SECS, `Esperando que expire el timeout del circuit breaker`);

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 5 — Circuito SEMI-ABIERTO: prueba de recuperación
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    'FASE 5 — Prueba de Recuperación  [ABIERTO → SEMI-ABIERTO → CERRADO]',
    'El timeout expiró. El circuit breaker pasa a SEMI-ABIERTO y deja pasar',
    `${breaker.successThreshold} solicitudes de prueba para verificar que el servicio se recuperó.`,
    'Si todas tienen éxito → cierra el circuito. Si falla alguna → vuelve a abrir.'
  );

  for (const amount of [200, 350]) {
    await pay(amount);
    await sleep(400);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // FASE 6 — Operación normal restaurada
  // ════════════════════════════════════════════════════════════════════════════
  phase(
    'FASE 6 — Operación Normal Restaurada  [Estado: CERRADO]',
    `El servicio superó las ${breaker.successThreshold} pruebas. Circuito cerrado. Todo fluye con normalidad.`
  );

  for (const amount of [600, 125, 450]) {
    await pay(amount);
    await sleep(150);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // MÉTRICAS FINALES
  // ════════════════════════════════════════════════════════════════════════════
  const m = breaker.getMetrics();

  console.log('\n' + chalk.bold('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║                      MÉTRICAS FINALES                           ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝\n'));

  console.log(`  Total de solicitudes recibidas         : ${chalk.bold(m.totalRequests)}`);
  console.log(`  ${chalk.green('✓')} Procesadas exitosamente            : ${chalk.green.bold(m.successfulRequests)}`);
  console.log(`  ${chalk.red('✗')} Fallidas (llegaron al servicio)    : ${chalk.red.bold(m.failedRequests)}  ${chalk.gray('← el servicio sí fue contactado')}`);
  console.log(`  ${chalk.yellow('⚡')} Bloqueadas por fast-fail           : ${chalk.yellow.bold(m.rejectedRequests)}  ${chalk.gray('← el servicio NO fue contactado')}`);
  console.log();
  console.log(`  Llamadas reales al servicio externo    : ${chalk.bold(paymentService.callCount)}`);
  console.log(chalk.gray(`  Sin circuit breaker habría habido ${m.totalRequests} llamadas;`));
  console.log(chalk.gray(`  el circuit breaker evitó ${m.rejectedRequests} llamadas innecesarias a un servidor caído.`));
  console.log();
  console.log(`  Historial de transiciones de estado:`);

  m.stateChanges.forEach(({ from, to, timestamp }) => {
    const hora = new Date(timestamp).toLocaleTimeString('es');
    console.log(`    ${badge(from)}  ──►  ${badge(to)}   ${chalk.gray(hora)}`);
  });

  console.log('\n' + chalk.bold.green('  ✓ Demo completado exitosamente.\n'));
}

// ─── Arrancar ─────────────────────────────────────────────────────────────────
runDemo().catch(err => {
  console.error(chalk.red('\n[Error inesperado]'), err.message);
  process.exit(1);
});
