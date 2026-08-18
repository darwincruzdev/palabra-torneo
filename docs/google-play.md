# Ficha de Google Play

Todo lo que hay que rellenar en Play Console para publicar Palabra Torneo, con
los textos ya escritos. Copia y pega.

---

## Datos de la ficha

**Nombre de la aplicación** (máx. 30 caracteres) — 14 usados

```
Palabra Torneo
```

**Descripción breve** (máx. 80 caracteres) — 68 usados

```
Adivina la palabra del día en seis intentos y compite con los tuyos.
```

**Descripción completa** (máx. 4000 caracteres)

```
Una palabra secreta de cinco letras al día y seis intentos para acertarla. Hasta
ahí, el juego de siempre. La diferencia es que aquí se juega en torneo, y cada
torneo tiene su propia palabra.

CREA UN TORNEO Y REPARTE LA INVITACIÓN

Monta un torneo para tu familia, tu cuadrilla o la gente de la oficina y mándales
el enlace por WhatsApp, o enséñales el código QR si los tienes delante. Se entra
con la cuenta de Google, sin contraseñas nuevas que recordar, y eliges el nombre
y el avatar con los que quieres aparecer en la clasificación.

CADA TORNEO, SU PALABRA

La palabra de tu torneo no es la de ningún otro. No sirve de nada preguntarle a
un amigo de otro grupo qué le ha salido hoy: a él le ha tocado otra.

PUNTOS SEGÚN LO QUE TE CUESTE

Acertar a la primera vale 7 puntos. A la segunda, 5. Después 4, 3, 2 y 1. Si se
te acaban los intentos, cero. Cada jornada suma, y la clasificación se actualiza
al momento para que veas cómo va la cosa.

LA REGLA DEL LÍDER

Aquí está la gracia. Quien termine una jornada primero en solitario arranca la
siguiente obligado a empezar con una de estas cinco palabras: VIVIR, PELEE,
AMADA, COCOS o TUTUS. Las cinco repiten letras, así que gastan un intento sin
apenas dar información. Es el lastre por ir ganando, y hace que nadie se escape
en la general. Si hay empate arriba, nadie lleva penalización.

CÓMO SE JUEGA

Escribe cualquier palabra de cinco letras y mira los colores:

• Verde: la letra está y va en esa posición.
• Amarillo: la letra está en la palabra, pero en otro sitio.
• Gris: la letra no está.

Las letras descartadas se apagan en el teclado, pero se pueden seguir usando: a
veces repetir una letra gastada es justo lo que hace falta para colocar el resto.

EN CASTELLANO DE VERDAD

Más de diez mil palabras admitidas como intento, y la solución sale siempre de un
grupo de palabras de uso corriente, para que nadie pierda una jornada con un
término que no ha oído en su vida. Se escribe sin tildes y la Ñ tiene su tecla.

SIN NADA QUE MOLESTE

Sin publicidad. Sin compras dentro de la aplicación. Sin contraseñas nuevas. Sin
notificaciones que no hayas pedido. Una partida al día y a otra cosa.

La palabra cambia a medianoche, hora peninsular española, para que la jornada
empiece y acabe a la vez para todos los del torneo.
```

**Categoría:** Juegos → Palabras
**Etiquetas:** juego de palabras, puzle, multijugador por turnos
**Correo de contacto:** el mismo que pongas en la política de privacidad
**Política de privacidad:** `https://<tu-dominio>/privacidad.html`

> La política ya está escrita en `public/privacidad.html` y se publica sola al
> hacer `npm run deploy`. **Antes de subirla, sustituye `[TU CORREO DE CONTACTO]`
> por la dirección que quieras hacer pública.** Play comprueba que la URL
> funcione y que mencione la aplicación.

---

## Gráficos

Se generan con `npm run build:play` y quedan en `play/`:

| Fichero | Tamaño | Para qué |
|---|---|---|
| `play/icono-512.png` | 512×512 | Icono de la ficha |
| `play/cabecera-1024x500.png` | 1024×500 | Gráfico de cabecera |

Los iconos que van dentro de la app se generan aparte con `npm run build:icons`
y quedan en `assets/`.

---

## Capturas de pantalla

Play exige **un mínimo de 2 y admite hasta 8**, con el lado corto entre 320 y
3840 píxeles y una proporción no superior a 2:1. Hazlas con el móvil, que es
donde mejor se ven: instala la aplicación con `npm start` + Expo Go, o con una
build de EAS, y usa la captura de pantalla del propio teléfono.

Orden recomendado, de más a menos vendedor:

1. **La clasificación del torneo**, con varios nombres y puntos. Es lo que
   diferencia esta aplicación de cualquier otro juego de palabras, así que va
   primero. Necesita Firebase conectado y un par de jornadas jugadas en familia.
2. **Una partida a medias**, con verdes y amarillos en el tablero y el teclado ya
   marcado. Se entiende el juego de un vistazo.
3. **El final de una partida ganada**, con la palabra y los puntos conseguidos.
4. **La regla del líder**, desde Perfil → La regla del líder, con las cinco
   palabras de penalización a la vista.

Un par de avisos:

- Espera a que desaparezca el mensajito flotante de «¡4 puntos!» antes de
  disparar la captura de la pantalla final, que si no tapa la primera fila.
- No retoques las capturas ni les montes texto encima prometiendo cosas que la
  aplicación no hace: Play rechaza las fichas con capturas engañosas.

---

## Clasificación de contenido (cuestionario IARC)

Respuestas honestas para este juego:

| Pregunta | Respuesta |
|---|---|
| Categoría | Juego |
| Violencia, sexo, drogas, lenguaje soez, juego de azar | No a todo |
| ¿Los usuarios pueden interactuar entre ellos? | **Sí** |
| ¿Hay chat o mensajería? | No |
| ¿Se comparte la ubicación? | No |
| ¿Se comparte información personal con otros usuarios? | **Sí**: el nombre que cada uno elige y sus resultados diarios, sólo dentro de su torneo |
| ¿Compras dentro de la aplicación? | No |
| ¿Publicidad? | No |

Con esto suele salir **PEGI 3 / Para todos**, con el aviso de que los usuarios
interactúan. No escondas el «sí» de la interacción: los torneos enseñan nombres
elegidos por personas, y si luego se detecta, se retira la aplicación.

---

## Formulario de Seguridad de los datos

| Apartado | Respuesta |
|---|---|
| ¿Se recopilan datos? | Sí |
| ¿Se comparten con terceros? | No. Firebase es proveedor de infraestructura, no un tercero con el que se compartan datos |
| ¿Se cifran en tránsito? | Sí, Firebase va por HTTPS |
| ¿Se pueden solicitar la eliminación? | Sí, por correo a la dirección de contacto |

Datos que hay que declarar:

| Tipo | Categoría de Play | Obligatorio | Para qué |
|---|---|---|---|
| Correo electrónico | Información personal → Direcciones de correo | Sí | Gestión de la cuenta: identificar al jugador entre dispositivos |
| Nombre visible | Información personal → Nombre | Sí | Funciones de la app: identificar al jugador en la clasificación |
| Identificador de usuario | Identificadores → ID de usuario | Sí | Funciones de la app: vincular las partidas a un jugador |
| Resultados diarios | Actividad en la app → Otras acciones | Sí | Funciones de la app: calcular la clasificación |

Nada de esto se usa para publicidad ni para analítica, y así hay que marcarlo.

El correo llega del acceso con Google. No se enseña a los demás jugadores, pero
se recoge y se almacena, así que **hay que declararlo**: si Play detecta que la
app pide una cuenta de Google y el formulario no menciona el correo, rechaza la
ficha.

---

## Antes de darle a publicar

- [ ] Sustituir `[TU CORREO DE CONTACTO]` en `public/privacidad.html`
- [ ] Publicar la política y comprobar que la URL abre
- [ ] Rellenar el `.env` con los datos de Firebase **antes** de compilar, o los
      torneos no funcionarán en la versión publicada
- [ ] Publicar las reglas de `firestore.rules` en la consola de Firebase
- [ ] Confirmar el identificador `com.darwincruz.palabratorneo` en `app.json`;
      una vez publicado ya no se puede cambiar
- [ ] Subir `android.versionCode` en `app.json` en cada envío
- [ ] `npm test` y `npm run tipos` en verde
- [ ] `eas build --platform android --profile production`
- [ ] Hacer las capturas en el móvil
- [ ] Cuenta de desarrollador de Play pagada (25 $, pago único)

> **Lo que más tarda:** si tu cuenta de desarrollador es personal y la creaste
> después de noviembre de 2023, Google exige una prueba cerrada con **20 testers
> apuntados y 14 días seguidos** antes de dejarte publicar en abierto. Móntala
> cuanto antes: la familia del torneo vale como testers, y así estrenáis el juego
> mientras corre el plazo.
