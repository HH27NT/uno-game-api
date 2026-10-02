# principios SOLID - UNO backend

el mismo refactor de esta semana pero aplicado al capstone en vez de un ejemplo chiquito.
cada seccion apunta al archivo donde esta el tag en el codigo (`// srp: ...`, `// ocp: ...`, etc).

## SRP - authValidators.js, gameValidators.js

antes los controllers validaban el body, llamaban al service y armaban la respuesta, todo
junto. ahora la validacion de forma vive aparte en `src/validators/`. el controller ya
nomas orquesta: valida, llama al service, responde.

## OCP - cardFactoryRegistry.js, deckUtils.js

`generateDeck` ya no tiene los tipos de carta harcodeados. cada tipo (numeros, especiales,
wild, wild4) es una fabrica que se registra en `cardFactoryRegistry.js`. si se necesita un
tipo de carta nuevo, se registra otra fabrica desde afuera y `generateDeck` no se toca.

## LSP - PlayerRepository.js, GameRepository.js, ScoreRepository.js

las tres se arman con las mismas 4 capacidades (Readable, Creatable, Updatable, Deletable),
entonces exponen exactamente las mismas firmas: `findById`, `findAll`, `create`, `update`,
`delete`. cualquiera de las tres se puede usar donde se espere "un repo con esa forma" sin
que nada se rompa.

## ISP - traits.js, CardRepository.js

en vez de una interfaz gorda de CRUD forzada para todos, `traits.js` tiene mixins chiquitos
(uno por capacidad). `CardRepository` no agarra el mixin `Creatable` porque las cartas nunca
se crean una por una desde la api, siempre es bulk. hay un test que prueba justo eso
(`tests/unit/repositories.test.js`).

## DIP - playerService.js y los demas services

antes los services hacian `require('../models')` y le hablaban directo a sequelize. ahora
cada service recibe su repositorio por el constructor (con un default para no romper nada
en produccion). el service ya no depende de sequelize, depende de la abstraccion del repo.
esto se aprovecha en los tests unitarios nuevos: se inyecta un repo falso (jest mocks) y se
prueba la logica de negocio sin tocar sqlite para nada.

## manejo de errores con un monad

`src/utils/result.js` tiene un `Result` chiquito (`Result.ok(value)` / `Result.fail(message,
status)`) parecido al Ok/Err que se uso en el intento funcional de la semana 3. los services
que pueden fallar regresan un `Result` en vez de un `throw` o un `{ error }` suelto, y los
controllers responden con `resultado.match({ ok, fail })` (o el ayudante `sendResult`).

## middleware de tracking - trackUsage.js, requestTrackingService.js

`trackUsage(handler)` es una funcion de orden superior: recibe un handler de express y
regresa otro que guarda endpoint, metodo, status y tiempo de respuesta cuando termina la
respuesta. `wrapController` aplica eso a todos los metodos de un controller de una sola vez.
Tambien se envuelven `requireAuth` y el `cache` de `playerRoutes.js`/`cardRoutes.js` (no solo
el controller final), si no un 401 o un cache HIT se pierden del tracking; `res.locals.tracked`
evita contar dos veces cuando una ruta tiene mas de una capa envuelta. Las 4 agregaciones se
calculan recorriendo los logs en memoria dentro de `requestTrackingService.js`, sin usar SQL
de agregacion para no mezclar esa logica con la capa de datos.

## tests

`npm test` corre `tests/*.test.js` (integracion, contra sqlite en memoria) y `tests/unit/`
(unitario, con repos mockeados). `npm run test:coverage` da el reporte, esta arriba del 70%
que pide la consigna.
