'use strict';

const { PaymentService } = require('./PaymentService');
const { CircuitBreaker, CircuitBreakerOpenError, STATE } = require('./CircuitBreaker');
const chalk = require('chalk');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ════════════════════════════════════════════════════════════════════════════
// ESCENARIO 1: SIN Circuit Breaker
// ════════════════════════════════════════════════════════════════════════════

async function scenarioWithoutCircuitBreaker() {
  console.log('\n' + chalk.bold('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║           ESCENARIO 1: SIN Circuit Breaker                        ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝\n'));

  const service = new PaymentService();
  service.setUnhealthy(); // Servicio caído desde el inicio

  console.log(chalk.gray('  Contexto: El servicio de pagos está caído.'));
  console.log(chalk.gray('  Sin CB, cada solicitud intenta conectar y espera el timeout.\n'));

  let totalTime = 0;
  let successCount = 0;
  let failureCount = 0;

  // Intentar 5 solicitudes
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();

    try {
      // SIN Circuit Breaker: intenta directamente, sin protección
      await service.processPayment(100, i);
      successCount++;
      console.log(chalk.green(`  ✓ Req #${i}: EXITOSA`));
    } catch (err) {
      const elapsed = Date.now() - start;
      totalTime += elapsed;
      failureCount++;

      console.log(
        chalk.red(`  ✗ Req #${i}: FALLO`) +
        chalk.gray(` (esperó ${elapsed}ms — timeout de latencia simulada)`)
      );
    }

    await sleep(100);
  }

  const avgTime = totalTime / Math.max(failureCount, 1);

  console.log(chalk.yellow(`\n  Resultados SIN Circuit Breaker:`));
  console.log(`    Solicitudes exitosas  : ${chalk.green(successCount)}`);
  console.log(`    Solicitudes fallidas  : ${chalk.red(failureCount)}`);
  console.log(`    Tiempo promedio/fallo : ${chalk.red(avgTime.toFixed(0))}ms`);
  console.log(`    Llamadas al servicio  : ${chalk.red(service.callCount)} (todas intentan contactar)`);
  console.log(
    chalk.red(
      `    ⚠  PROBLEMA: Cada fallo esperó ~${avgTime.toFixed(0)}ms. Con 10,000 req/min = COLAPSO`
    )
  );

  return { successCount, failureCount, totalTime };
}

// ════════════════════════════════════════════════════════════════════════════
// ESCENARIO 2: CON Circuit Breaker
// ════════════════════════════════════════════════════════════════════════════

async function scenarioWithCircuitBreaker() {
  console.log(
    '\n' +
      chalk.bold('╔══════════════════════════════════════════════════════════════════╗')
  );
  console.log(chalk.bold('║            ESCENARIO 2: CON Circuit Breaker                    ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝\n'));

  const service = new PaymentService();
  service.setUnhealthy(); // Servicio caído desde el inicio

  const breaker = new CircuitBreaker({
    failureThreshold: 2,  // Abre tras 2 fallos (menos para demo rápido)
    timeout: 1000,        // 1 segundo de timeout
    onStateChange: ({ from, to }) => {
      const messages = {
        OPEN: chalk.red('⚠  CIRCUITO ABIERTO'),
        HALF_OPEN: chalk.yellow('↻  SEMI-ABIERTO'),
        CLOSED: chalk.green('✅ CERRADO'),
      };
      console.log(chalk.bold(`\n  [TRANSICIÓN: ${from} ──► ${to}]  ${messages[to]}\n`));
    },
  });

  console.log(chalk.gray('  Contexto: El servicio de pagos está caído.'));
  console.log(chalk.gray('  CON CB, las solicitudes se rechazan rápidamente tras detectar fallos.\n'));

  let totalTime = 0;
  let successCount = 0;
  let failureCount = 0;
  let rejectedCount = 0;

  // Intentar 5 solicitudes
  for (let i = 1; i <= 5; i++) {
    const start = Date.now();

    try {
      // CON Circuit Breaker: protegido automáticamente
      await breaker.execute(() => service.processPayment(100, i));
      successCount++;
      console.log(chalk.green(`  ✓ Req #${i}: EXITOSA`));
    } catch (err) {
      const elapsed = Date.now() - start;
      totalTime += elapsed;

      if (err instanceof CircuitBreakerOpenError) {
        rejectedCount++;
        console.log(
          chalk.yellow(`  ⚡ Req #${i}: RECHAZADA`) +
            chalk.gray(` (${elapsed}µs — fast fail, servicio NO contactado)`)
        );
      } else {
        failureCount++;
        console.log(
          chalk.red(`  ✗ Req #${i}: FALLO`) +
            chalk.gray(` (${elapsed}ms — llegó al servicio)`)
        );
      }
    }

    await sleep(100);
  }

  const avgTime = totalTime / 5;

  console.log(chalk.yellow(`\n  Resultados CON Circuit Breaker:`));
  console.log(`    Solicitudes exitosas   : ${chalk.green(successCount)}`);
  console.log(`    Solicitudes fallidas   : ${chalk.red(failureCount)} (llegaron al servicio)`);
  console.log(`    Solicitudes rechazadas : ${chalk.yellow(rejectedCount)} (fast-fail, NO contactaron)`);
  console.log(`    Tiempo promedio/req    : ${chalk.green(avgTime.toFixed(2))}ms`);
  console.log(`    Llamadas reales        : ${chalk.green(service.callCount)} (evitó ${rejectedCount})`);
  console.log(
    chalk.green(
      `    ✅ VENTAJA: Resp rápida (~1ms). Con 10,000 req/min = PROTEGIDO`
    )
  );

  return { successCount, failureCount, rejectedCount, totalTime };
}

// ════════════════════════════════════════════════════════════════════════════
// COMPARACIÓN FINAL
// ════════════════════════════════════════════════════════════════════════════

async function runComparison() {
  console.log('\n' + chalk.bold('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║     COMPARACIÓN: CON vs SIN Circuit Breaker                    ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝'));

  const resultsWithout = await scenarioWithoutCircuitBreaker();

  await sleep(2000);
  console.log(chalk.cyan('\n  Esperando 2 segundos...\n'));

  const resultsWith = await scenarioWithCircuitBreaker();

  // ═════════════════════════════════════════════════════════════════════════
  // TABLA DE COMPARACIÓN
  // ═════════════════════════════════════════════════════════════════════════

  console.log('\n' + chalk.bold('╔══════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.bold('║                    TABLA COMPARATIVA                             ║'));
  console.log(chalk.bold('╚══════════════════════════════════════════════════════════════════╝\n'));

  console.log(
    '  ' +
      chalk.bold.underline('Métrica'.padEnd(30)) +
      chalk.bold.underline('SIN CB'.padEnd(20)) +
      chalk.bold.underline('CON CB'.padEnd(20))
  );
  console.log('  ' + '─'.repeat(68));

  const metrics = [
    {
      name: 'Solicitudes exitosas',
      without: resultsWithout.successCount,
      with: resultsWith.successCount,
    },
    {
      name: 'Solicitudes fallidas',
      without: resultsWithout.failureCount,
      with: resultsWith.failureCount,
    },
    {
      name: 'Solicitudes rechazadas',
      without: 0,
      with: resultsWith.rejectedCount,
    },
    {
      name: 'Tiempo total (ms)',
      without: resultsWithout.totalTime,
      with: resultsWith.totalTime,
    },
  ];

  metrics.forEach(({ name, without, with: withCB }) => {
    const withoutStr = typeof without === 'number' ? without.toFixed(0) : without;
    const withStr = typeof withCB === 'number' ? withCB.toFixed(0) : withCB;

    const withoutFormatted = chalk.red(String(withoutStr).padEnd(18));
    const withFormatted = chalk.green(String(withStr).padEnd(18));

    console.log(`  ${name.padEnd(30)}${withoutFormatted}${withFormatted}`);
  });

  console.log('  ' + '─'.repeat(68));

  // Cálculo de mejora
  const improvement = (
    ((resultsWithout.totalTime - resultsWith.totalTime) / resultsWithout.totalTime) * 100
  ).toFixed(1);

  console.log(
    `\n  ${chalk.green.bold(`✓ MEJORA: ${improvement}% más rápido con Circuit Breaker`)}`
  );
  console.log(chalk.gray(`  Sin CB: ${resultsWithout.totalTime}ms | Con CB: ${resultsWith.totalTime}ms`));

  console.log(chalk.green.bold(`\n  ✅ Circuit Breaker evitó ${resultsWith.rejectedCount} llamadas innecesarias\n`));
}

// ═════════════════════════════════════════════════════════════════════════
runComparison().catch(err => {
  console.error(chalk.red('[Error]'), err.message);
  process.exit(1);
});
