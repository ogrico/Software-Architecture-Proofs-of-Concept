# Patrón Circuit Breaker — Prueba de Concepto

> **Repositorio:** Software-Architecture-Proofs-of-Concept  
> **Carpeta:** `CircuitBreaker/`  
> **Rama:** integration

---

## Descripción de la prueba

Esta prueba de concepto implementa el **patrón Circuit Breaker** (Disyuntor) en Node.js, aplicado a un escenario realista: una aplicación de e-commerce que procesa pagos a través de un servicio externo de terceros.

El Circuit Breaker actúa como un **interruptor automático** que se interpone entre la aplicación y el servicio externo. Su función es detectar fallas repetidas y evitar que el sistema siga enviando peticiones a un servicio caído, protegiéndolo de fallos en cascada (*cascading failures*) y permitiendo su recuperación grácil.

El patrón opera como una máquina de estados con tres estados posibles:

```
  ┌──────────────┐    N fallos consecutivos    ┌─────────────┐
  │   CLOSED     │ ─────────────────────────► │    OPEN     │
  │  (Cerrado)   │                             │  (Abierto)  │
  │              │                             │             │
  │ Tráfico      │                             │ Fast-fail   │
  │ normal       │                             │ (sin llamar │
  └──────▲───────┘                             │ al servicio)│
         │                                     └──────┬──────┘
         │   M éxitos en prueba                       │
         │                                            │ Timeout
         │                                            │ expirado
         │                                            ▼
         │                                   ┌────────────────┐
         └─────────────────────────────────  │   HALF_OPEN    │
                                             │ (Semi-abierto) │
                                             │                │
                                             │ Solicitudes    │
                                             │ de prueba      │
                                             └────────────────┘

  CLOSED    → Operación normal. Todo el tráfico pasa al servicio externo.
  OPEN      → Circuito abierto. Las peticiones se rechazan inmediatamente (fast-fail).
  HALF_OPEN → Período de prueba. Pasa un número limitado de peticiones para
              verificar si el servicio se recuperó.
```

---

## Objetivo(s) de la prueba

1. **Demostrar el funcionamiento completo** del patrón Circuit Breaker pasando por los tres estados: `CLOSED`, `OPEN` y `HALF_OPEN`.

2. **Evidenciar el beneficio del fast-fail**: mostrar que cuando el circuito está abierto, las peticiones se rechazan *sin contactar al servicio externo*, ahorrando tiempo de respuesta y recursos del sistema.

3. **Mostrar la recuperación automática**: demostrar cómo el circuito detecta, por sí solo, que un servicio se ha recuperado y vuelve a la operación normal sin intervención manual.

4. **Presentar métricas comparativas**: cuantificar la diferencia entre las llamadas que *realmente llegaron* al servicio versus las que *fueron interceptadas* por el circuit breaker.

5. **Proveer una implementación reutilizable y genérica**: la clase `CircuitBreaker` es independiente del dominio y puede envolver cualquier llamada asíncrona (`fn`) que se desee proteger.

---

## Pasos implementados para llevar a cabo la prueba

### Estructura del proyecto

```
CircuitBreaker/
├── package.json
├── src/
│   ├── CircuitBreaker.js    ← Implementación del patrón (genérica, reutilizable)
│   ├── PaymentService.js    ← Servicio externo simulado (puede fallar a demanda)
│   └── demo.js              ← Script del demo con 6 fases secuenciales
└── README.md
```

### Paso 1 — Implementación del Circuit Breaker (`CircuitBreaker.js`)

Se implementó la clase `CircuitBreaker` con los siguientes elementos:

- **Tres estados** definidos como constantes (`CLOSED`, `OPEN`, `HALF_OPEN`).
- **Método `execute(fn)`**: punto de entrada único. Recibe cualquier función asíncrona y decide si dejarla pasar, ejecutarla o rechazarla según el estado actual.
- **Lógica de transición automática**:
  - `_onSuccess()` → reinicia el contador de fallos en `CLOSED`; en `HALF_OPEN` acumula éxitos y cierra el circuito al alcanzar el umbral.
  - `_onFailure()` → incrementa el contador de fallos; abre el circuito al superar el umbral, o lo re-abre si falla en `HALF_OPEN`.
  - `_transitionTo(state)` → gestiona el cambio de estado, actualiza temporizadores e invoca el callback `onStateChange`.
- **Parámetros configurables**: `failureThreshold`, `successThreshold`, `timeout`.
- **Callback `onStateChange`**: permite al consumidor reaccionar ante cada transición (logs, alertas, métricas externas, etc.).
- **Error específico `CircuitBreakerOpenError`**: diferencia claramente el rechazo por fast-fail de una falla real del servicio.
- **Métricas acumuladas**: `totalRequests`, `successfulRequests`, `failedRequests`, `rejectedRequests`, historial de transiciones.

```javascript
// Uso mínimo del Circuit Breaker
const breaker = new CircuitBreaker({ failureThreshold: 3, timeout: 5000 });

try {
  const result = await breaker.execute(() => paymentService.processPayment(amount));
  console.log('Pago procesado:', result.transactionId);
} catch (err) {
  if (err instanceof CircuitBreakerOpenError) {
    console.log('Servicio temporalmente no disponible (circuit breaker abierto)');
  } else {
    console.log('Error del servicio:', err.message);
  }
}
```

### Paso 2 — Implementación del servicio externo simulado (`PaymentService.js`)

Se creó la clase `PaymentService` que simula una API de pagos de terceros:

- Simula **latencia de red** (~80ms) en cada llamada.
- Tiene un método `processPayment(amount, orderId)` que retorna una transacción exitosa cuando el servicio está sano.
- Métodos `setUnhealthy()` y `setHealthy()` permiten simular la caída y recuperación del servidor externo durante el demo.
- Lleva un contador de `callCount` para verificar cuántas veces fue realmente contactado.

### Paso 3 — Demo de 6 fases (`demo.js`)

El demo ejecuta un escenario narrativo con 6 fases secuenciales, cada una mostrando con claridad el estado del circuito y el comportamiento del sistema:

| Fase | Título | Descripción |
|------|--------|-------------|
| **1** | Operación Normal | 5 pagos exitosos con circuito `CERRADO`. El servicio externo funciona. |
| **2** | El Servicio Falla | 3 pagos fallan consecutivamente. Al 3er fallo se supera el umbral y el circuito se `ABRE`. |
| **3** | Fast-Fail Activo | 3 solicitudes son rechazadas por el circuit breaker **sin contactar al servicio**. |
| **4** | Período de Espera | Cuenta regresiva de 5 segundos. El equipo repara el servicio. |
| **5** | Prueba de Recuperación | El timeout expira → circuito pasa a `SEMI-ABIERTO`. 2 solicitudes de prueba tienen éxito → circuito se `CIERRA`. |
| **6** | Operación Restaurada | 3 pagos exitosos. El circuito está `CERRADO` y el servicio funciona normalmente. |

Al finalizar, el demo muestra métricas consolidadas con el total de llamadas reales al servicio vs. las interceptadas por el circuit breaker.

### Paso 4 — Ejecución

```bash
# Desde la carpeta CircuitBreaker/
npm install
npm start
```

---

## Tecnologías usadas en la prueba (Stack Tecnológico)

| Tecnología | Versión | Rol |
|---|---|---|
| **Node.js** | ≥ 18 (LTS) | Runtime de JavaScript para el servidor |
| **JavaScript (ES2020+)** | — | Lenguaje de implementación |
| **chalk** | ^4.1.2 | Salida en consola con colores para visualización del demo |
| **npm** | ≥ 9 | Gestión de dependencias |

> La implementación del patrón (`CircuitBreaker.js`) es **zero-dependency** y no requiere ninguna librería externa. `chalk` se usa únicamente para mejorar la visualización del demo en consola.

---

## Resultados

Al ejecutar `npm start`, el demo produce la siguiente salida que evidencia el funcionamiento completo del patrón:

### Fase 1 — Operación normal (CERRADO)

```
  ✓  CERRADO   Req #1   $ 100 procesado  TXN-001-V4MK4
  ✓  CERRADO   Req #2   $ 250 procesado  TXN-002-CB7S3
  ✓  CERRADO   Req #3   $  75 procesado  TXN-003-WC46B
  ✓  CERRADO   Req #4   $ 500 procesado  TXN-004-5ADGE
  ✓  CERRADO   Req #5   $ 180 procesado  TXN-005-JHQU7
```
→ Las 5 solicitudes pasan normalmente al servicio y se procesan con éxito.

### Fase 2 — El servicio falla, el circuito se abre

```
  ✗  CERRADO   Req #6   FALLO del servicio  [fallos: 1/3]
  ✗  CERRADO   Req #7   FALLO del servicio  [fallos: 2/3]

  ┌── TRANSICIÓN ──────────────────────────────────────────────┐
  │   CERRADO  ──►  ABIERTO                                     │
  │  ⚠  CIRCUITO ABIERTO — el sistema deja de llamar al servicio│
  └─────────────────────────────────────────────────────────────┘

  ✗  CERRADO   Req #8   FALLO del servicio  [umbral superado → circuito abierto]
```
→ Tras el 3er fallo consecutivo, el circuit breaker transiciona a `OPEN` automáticamente.

### Fase 3 — Fast-fail (ABIERTO)

```
  ⚡  ABIERTO   Req #9   RECHAZADA — fast fail  ← el servicio NO fue contactado
  ⚡  ABIERTO   Req #10  RECHAZADA — fast fail  ← el servicio NO fue contactado
  ⚡  ABIERTO   Req #11  RECHAZADA — fast fail  ← el servicio NO fue contactado
```
→ Las 3 solicitudes son rechazadas **en microsegundos** sin llamar al servicio.

### Fase 5 — Recuperación (SEMI-ABIERTO → CERRADO)

```
  ┌── TRANSICIÓN ──────────────────────────────────────────────┐
  │   ABIERTO  ──►  SEMI-AB.                                    │
  │  ↻  CIRCUITO SEMI-ABIERTO — probando recuperación           │
  └─────────────────────────────────────────────────────────────┘

  ✓  SEMI-AB.  Req #12  $ 200 procesado  TXN-012-XTCSX  [prueba 1/2]

  ┌── TRANSICIÓN ──────────────────────────────────────────────┐
  │   SEMI-AB. ──►  CERRADO                                     │
  │  ✅ CIRCUITO CERRADO — servicio verificado, operación normal │
  └─────────────────────────────────────────────────────────────┘

  ✓  SEMI-AB.  Req #13  $ 350 procesado  TXN-013-KLKBJ  [prueba 2/2]
```
→ El circuito detecta la recuperación del servicio y regresa a `CLOSED` sin intervención manual.

### Métricas finales

```
  Total de solicitudes recibidas         : 16
  ✓ Procesadas exitosamente            : 10
  ✗ Fallidas (llegaron al servicio)    :  3  ← el servicio sí fue contactado
  ⚡ Bloqueadas por fast-fail           :  3  ← el servicio NO fue contactado

  Llamadas reales al servicio externo    : 13
  Sin circuit breaker habría habido 16 llamadas;
  el circuit breaker evitó 3 llamadas innecesarias a un servidor caído.

  Historial de transiciones:
    CERRADO  ──►  ABIERTO     (al 3er fallo)
    ABIERTO  ──►  SEMI-AB.    (tras timeout de 5s)
    SEMI-AB. ──►  CERRADO     (tras 2 éxitos en prueba)
```

---

## Conclusiones

1. **El patrón Circuit Breaker protege el sistema de fallos en cascada.** Cuando un servicio externo falla, sin el disyuntor cada petición esperaría su propio timeout (ej: 30 segundos), bloqueando hilos y agotando recursos. Con el Circuit Breaker, las peticiones se rechazan en microsegundos una vez que el circuito se abre.

2. **La recuperación es completamente automática.** El circuito detecta por sí mismo que el servicio volvió a estar disponible (a través del período `HALF_OPEN`) sin necesidad de intervención operativa manual. Esto reduce el tiempo de restauración del servicio (*MTTR*).

3. **El estado `HALF_OPEN` es clave para evitar recuperaciones prematuras.** No cierra el circuito de forma abrupta tras el timeout, sino que verifica primero con solicitudes de prueba. Si el servicio falla nuevamente en este estado, el circuito vuelve a abrirse, protegiendo al sistema de una recuperación falsa.

4. **Las métricas evidencian el ahorro de recursos.** En el demo, 3 de 16 solicitudes fueron bloqueadas sin contactar al servicio. En un sistema de producción con miles de peticiones por segundo, esto puede significar la diferencia entre una degradación controlada y un colapso total del sistema.

5. **La implementación es genérica y composable.** La clase `CircuitBreaker` no está acoplada a ningún dominio específico; puede envolver cualquier llamada asíncrona (`await breaker.execute(fn)`), lo que la hace aplicable a llamadas HTTP, consultas a bases de datos, mensajería, etc.

6. **Es una pieza fundamental en arquitecturas de microservicios y sistemas distribuidos**, donde las dependencias entre servicios son inevitables y las fallas parciales son un escenario esperado, no excepcional. Librerías de producción como [opossum](https://github.com/nodeshift/opossum) (Node.js), Resilience4j (Java) o Polly (.NET) implementan este mismo patrón con características adicionales.
