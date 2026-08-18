# Palabra Torneo

Juego diario de palabras de cinco letras, al estilo de *lapalabradeldia.com*, con
torneos privados para jugar contra tu familia y amigos. Hecho con Expo (React
Native) y Firebase, pensado para publicarse en Google Play.

## Cómo funciona

- **Cada torneo tiene su propia palabra secreta** de cinco letras al día, y
  **seis intentos** para acertarla. Todos los del mismo torneo comparten
  palabra; dos torneos distintos nunca juegan la misma, así que no sirve de
  nada preguntársela a alguien de otro grupo.
- Se entra **con la cuenta de Google**. Así cada uno conserva su historial y sus
  torneos aunque cambie de móvil.
- Al enviar una palabra, cada letra se pinta: **verde** si está y va en esa
  posición, **amarillo** si está en la palabra pero en otro sitio, **gris** si no
  está. Las letras descartadas se apagan en el teclado, pero se pueden seguir
  usando.
- Se escribe **sin tildes** y la **Ñ** tiene su propia tecla.
- Se juega **una partida al día en cada torneo**. Quien esté en tres torneos
  tiene tres palabras que adivinar. La palabra cambia a medianoche, hora de
  España, para que la jornada empiece y acabe a la vez para todos.
- Quien no esté en ningún torneo puede jugar en **modo libre**, que no puntúa.

### Puntuación del torneo

| Acierto | Puntos |
|---|---|
| 1.er intento | 7 |
| 2.º intento | 5 |
| 3.er intento | 4 |
| 4.º intento | 3 |
| 5.º intento | 2 |
| 6.º intento | 1 |
| No acertar | 0 |

### La regla del líder

Quien termine una jornada **primero en solitario** (sin empatar a puntos con el
segundo) arranca la jornada siguiente **obligado a usar una de estas cinco
palabras** como primer intento:

```
VIVIR   PELEE   AMADA   COCOS   TUTUS
```

Las cinco repiten letras, así que gastan un intento dando muy poca información:
es el lastre por ir ganando. Si hay empate en lo alto de la tabla, nadie lleva
penalización. La app lo comprueba sola y no deja enviar otra palabra.

Se cuenta **por separado en cada torneo**: puedes ir líder en el de la familia y
arrastrar la penalización sólo ahí, mientras en el del curro juegas normal.

## Poner en marcha el proyecto

```bash
npm install
npm start
```

Para abrirlo en el navegador, `npm run web`.

> **Expo Go ya no vale.** Entrar con Google necesita el esquema propio de la
> app, que Expo Go no tiene. Para probar en el móvil hace falta una build de
> desarrollo, y se instala una sola vez:
>
> ```bash
> eas build --platform android --profile development
> ```
>
> A partir de ahí, `npm start` recarga el código en esa build igual que hacía
> Expo Go.

### Conectar Firebase (necesario para los torneos)

Sin esto la app funciona igual, pero sólo en **modo libre**: se juega una palabra
al día y se guardan tus estadísticas, sin torneos ni clasificación.

1. Entra en [console.firebase.google.com](https://console.firebase.google.com) y
   crea un proyecto.
2. Dentro del proyecto, **Compilación > Firestore Database > Crear base de
   datos** (modo producción, región `eur3` si estáis en España).
3. **Compilación > Authentication > Sign-in method** y activa **Google**.
4. **Configuración del proyecto > Tus apps > Web (`</>`)**, registra una app y
   copia el objeto `firebaseConfig`.
5. Copia `.env.example` a `.env` y pega ahí cada valor:

   ```
   EXPO_PUBLIC_FIREBASE_API_KEY=AIza...
   EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
   EXPO_PUBLIC_FIREBASE_PROJECT_ID=tu-proyecto
   EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
   EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
   EXPO_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

6. Copia el contenido de `firestore.rules` en **Firestore Database > Reglas** y
   publícalo. Sin esas reglas, cualquiera con la app podría escribir puntos
   ajenos.
7. Reinicia el servidor (`npm start`), porque las variables se leen al arrancar.

### Credenciales para entrar con Google

En [console.cloud.google.com](https://console.cloud.google.com), dentro del
proyecto que ha creado Firebase: **APIs y servicios > Credenciales > Crear
credenciales > ID de cliente de OAuth**. Hacen falta dos:

- **Aplicación web.** Es el que valida Firebase, y es obligatorio aunque la app
  sea de móvil. Va en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
- **Android.** Nombre del paquete `com.darwincruz.palabratorneo` y la huella
  SHA-1 de tu clave de firma, que te la da `eas credentials`. Va en
  `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.

Si te saltas esto, la pantalla de entrada lo dice y la app se queda en modo
libre en vez de romperse.

### Cómo se invita a alguien

Desde la clasificación de un torneo hay tres formas, y las tres llevan el mismo
código de seis caracteres:

- **Compartir enlace**, que abre el diálogo del móvil para mandarlo por WhatsApp
  o donde sea. El enlace apunta a la página `unirse.html` de tu web, que enseña
  el código y ofrece abrir la app.
- **Ver QR**, para cuando estáis juntos y basta con que enfoquen con la cámara.
- **Tocar el código** para copiarlo y dictarlo a mano.

Para que el enlace y el QR funcionen hay que publicar la web (`npm run deploy`) y
poner esa dirección en `EXPO_PUBLIC_URL_BASE`. Sin eso se reparte el código a
secas, que también sirve.

## Enseñárselo a alguien antes de publicar (Cloudflare Pages)

La misma app se exporta como web estática y se sube a Cloudflare Pages gratis.
Sale una dirección tipo `https://palabra-torneo.pages.dev` que se abre en
cualquier móvil desde el navegador, sin instalar nada.

```bash
npm run build:web    # genera dist/
npm run preview:web  # míralo en http://localhost:8099 antes de subirlo
npm run deploy       # construye y sube a Cloudflare Pages
```

La primera vez, `npm run deploy` abre el navegador para que entres en tu cuenta
de Cloudflare y te preguntará si quieres crear el proyecto `palabra-torneo`: di
que sí y elige `main` como rama de producción. A partir de ahí, cada `npm run
deploy` actualiza la misma dirección.

Dos cosas a tener en cuenta:

- **Las variables de Firebase se congelan al construir.** Si quieres que en la
  web funcionen también los torneos, ten el `.env` puesto *antes* de lanzar
  `npm run build:web`. Sin él la web funciona igual, pero en modo local: se juega
  la palabra del día y nada más, que para enseñarlo suele bastar.
- Si sí usas Firebase, añade el dominio en **Authentication > Settings > Dominios
  autorizados** (`palabra-torneo.pages.dev`), o la sesión anónima fallará.

Como la web guarda la partida en el navegador y la app en el móvil, son dos
partidas distintas: la misma persona podría jugar la misma palabra en las dos.
Para una demo da igual, pero no repartas el enlace entre los del torneo una vez
esté en Google Play.

> Ojo: en la web no se puede entrar con Google con el mismo flujo que en el
> móvil, así que la versión web sirve para enseñar el juego, no los torneos.

## Publicar en Google Play

No hace falta Android Studio: se compila en la nube con EAS.

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android --profile production
```

Eso genera un `.aab` que se sube a Play Console.

**Los textos de la ficha, las respuestas al formulario de seguridad de los datos
y la lista de comprobación previa están en [docs/google-play.md](docs/google-play.md).**

La política de privacidad está en `public/privacidad.html` y se publica sola con
el despliegue web, así que la URL que pide Play sale de ahí. Sustituye antes el
correo de contacto, que va como marcador.

Los gráficos se generan por código, sin abrir ningún editor:

```bash
npm run build:icons  # iconos de la app -> assets/
npm run build:play   # icono 512 y cabecera de la ficha -> play/
```

La marca son las fichas del juego apiladas como un podio, con la paleta de
`src/tema.ts`. Si quieres cambiarla, se toca en `scripts/build-icons.mjs`.

## Las palabras

Las listas se generan a partir de fuentes públicas y se guardan ya procesadas en
`src/data/`:

- `allowed.json` — **10.836 palabras** de cinco letras que el juego acepta como
  intento, sacadas del diccionario español de `an-array-of-spanish-words`.
- `solutions.json` — **2.500 palabras corrientes** de las que sale la solución
  diaria, filtradas por frecuencia de uso real (lista de OpenSubtitles) para que
  nunca toque una palabra rarísima.

Al crear un torneo se le genera una **semilla** aleatoria, que se guarda en su
documento y decide cómo recorre ese torneo la lista: de la semilla salen un punto
de partida y un salto, y el salto se elige primo respecto de las 2.500 palabras,
que es lo que hace que pase por todas **sin repetir ninguna durante casi siete
años**. Dos torneos con semillas distintas llevan calendarios distintos.

No hay servidor que reparta la palabra: cada móvil la calcula a partir de la
fecha y la semilla. Por eso las reglas de Firestore sólo dejan leer el documento
del torneo a sus miembros — quien tenga la semilla puede calcular la palabra de
cualquier día. El código de invitación vive aparte, en la colección `codigos`,
que sí puede leer cualquiera pero no contiene la semilla.

Dos torneos pueden coincidir en palabra algún día suelto, por puro azar: son dos
sucesiones independientes sobre la misma lista, y toca una vez cada siete años de
media. Evitarlo del todo obligaría a coordinar los torneos entre sí, que es peor
remedio que la enfermedad.

> **Importante:** no regeneres `solutions.json` una vez publicada la app. Si la
> lista cambia de orden o de tamaño, cambia también la palabra que le toca a cada
> día, y quien tenga la versión vieja jugará otra distinta.

Para regenerarlas antes de publicar:

```bash
npm pack an-array-of-spanish-words --pack-destination scripts/tmp
tar -xzf scripts/tmp/an-array-of-spanish-words-*.tgz -C scripts/tmp
curl -L -o scripts/tmp/es_50k.txt https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/es/es_50k.txt
npm run build:words
```

## Comprobaciones

```bash
npm test     # lógica del juego, puntuación y clasificación
npm run tipos  # TypeScript
```

## Cómo está organizado

```
src/
  game/          reglas puras: evaluación, fechas, palabras, semillas,
                 clasificación, avatares e invitaciones
  components/    tablero, casillas, teclado, avatar, selector de torneo
  screens/       acceso, juego, torneos, clasificación, perfil
  estado/        contexto de la app y hook de la partida
  firebase/      cliente, sesión de Google y acceso a Firestore
  almacen/       partida y estadísticas guardadas en el móvil
  data/          listas de palabras generadas
public/          web: política de privacidad y página de invitación
tests/           tests de la lógica
firestore.rules  reglas de seguridad de la base de datos
```

Todo lo de `src/game/` son funciones puras sin dependencias de React ni de
Firebase, que es lo que permite probar las reglas del torneo con `npm test`.

## Límites conocidos

- **La semilla la lee la app.** Las reglas impiden que un extraño lea el
  documento del torneo, pero un miembro sí puede: si alguien inspecciona el
  tráfico de la app, saca la semilla de su propio torneo y con ella calcula las
  palabras de todos los días. Contra un tramposo con conocimientos, la única
  defensa real es servir la palabra desde Cloud Functions y no mandar nunca la
  semilla al móvil. Para jugar en familia, sobra con lo que hay.
- **Cualquiera con un código puede entrar** en el torneo al que apunta. Los
  códigos son de seis caracteres sobre un alfabeto de 31, así que adivinar uno a
  ciegas es improbable, pero un enlace reenviado sin querer sirve para entrar.
  El fundador puede echar a alguien sólo borrando el torneo.
- **No hay notificaciones.** Si las quieres ("ya han jugado todos menos tú"), el
  siguiente paso sería `expo-notifications` con Cloud Functions.
- **El acceso con Google está escrito pero sin probar de punta a punta**, porque
  hace falta tu proyecto de Google Cloud y una build de desarrollo. Lo que sí
  está comprobado es que la app arranca y se juega cuando no está configurado.
