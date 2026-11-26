import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Texto } from '../components/Texto';
import { Desplegable } from '../components/Desplegable';
import { Sutil, Tarjeta } from '../components/ui';
import { BLUESHELLS_POR_MES, MAX_VOCALES_AL_ABRIR } from '../game/reglas';
import {
  PALABRAS_POR_RONDA,
  SEGUNDOS_NULO,
  SEGUNDOS_PLENO,
} from '../game/arcade';
import {
  MAX_INTENTOS,
  PALABRAS_PENALIZACION,
  PUNTOS_POR_INTENTO,
} from '../game/constantes';
import { totalAceptadas, totalSoluciones } from '../game/palabras';
import { colores, espaciado, fuentes, texto as escala } from '../tema';

/** Cómo se juega y las normas de la casa. Antes vivía dentro del perfil. */
export function PantallaNormas() {
  return (
    <ScrollView contentContainerStyle={estilos.contenido}>
      <Tarjeta>
        <Sutil>
          Cada torneo tiene su propia palabra secreta de cinco letras al día, distinta de la
          de los demás, y {MAX_INTENTOS} intentos para acertarla. Al enviar una palabra, cada
          letra se pinta:
        </Sutil>
        <Leyenda color={colores.correcta} texto="La letra está y va en esa posición." />
        <Leyenda color={colores.presente} texto="La letra está en la palabra, pero en otro sitio." />
        <Leyenda
          color={colores.ausente}
          texto="La letra no está. En el teclado se apaga, pero puedes seguir usándola."
        />
        <Sutil>
          Se escribe sin tildes y la Ñ tiene su tecla. Valen {totalAceptadas.toLocaleString('es-ES')}{' '}
          palabras como intento, y la solución sale de {totalSoluciones.toLocaleString('es-ES')}{' '}
          palabras de uso corriente.
        </Sutil>
      </Tarjeta>

      <Tarjeta>
        <Sutil>
          <Texto style={estilos.fuerte}>El torneo.</Texto> Una palabra al día, con tabla y trofeo
          a fin de mes.
        </Sutil>
        <Sutil>
          <Texto style={estilos.fuerte}>La diaria.</Texto> La misma palabra para quien juega sin
          torneo. No puntúa.
        </Sutil>
        <Sutil>
          <Texto style={estilos.fuerte}>El arcade.</Texto> {PALABRAS_POR_RONDA} palabras contra el
          reloj. De cada ronda queda la mejor marca. Cada palabra vale sus puntos de siempre por
          diez, y el tiempo suma de {SEGUNDOS_PLENO / 60} minutos para abajo hasta{' '}
          {SEGUNDOS_NULO / 60}, donde ya no da nada. Correr no puede pagar una palabra: la más
          barata vale 10 y el reloj llega como mucho a 9.
        </Sutil>
        <Sutil>
          <Texto style={estilos.fuerte}>El duelo.</Texto> Diez palabras, uno contra uno, en directo.
        </Sutil>
      </Tarjeta>

      <Tarjeta>
        {PUNTOS_POR_INTENTO.map((puntos, i) => (
          <View key={i} style={estilos.fila}>
            <Texto style={estilos.texto}>
              Acertar al {i + 1}
              {i === 0 ? 'er' : 'º'} intento
            </Texto>
            <Texto style={estilos.valor}>{puntos}</Texto>
          </View>
        ))}
        <View style={estilos.fila}>
          <Texto style={estilos.texto}>No acertar</Texto>
          <Texto style={[estilos.valor, { color: colores.textoSuave }]}>0</Texto>
        </View>
      </Tarjeta>

      <Desplegable titulo="La regla del líder" resumen="Ir primero cuesta abrir con una de cinco palabras.">
        <Sutil>
          Quien termina una jornada primero en solitario abre la siguiente con una de estas:
        </Sutil>
        <Texto style={estilos.palabras}>
          {PALABRAS_PENALIZACION.map((p) => p.toUpperCase()).join('   ')}
        </Texto>
        <Sutil>
          Repiten letras, así que gastan un intento dando poca información. Si hay empate arriba,
          nadie lleva penalización. Cuenta por separado en cada torneo.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="La temporada" resumen="Cada mes empieza de cero y reparte un trofeo.">
        <Sutil>
          El día 1 la tabla vuelve a cero y quien va primero al cerrarse el mes se lleva el trofeo.
          A final de año gana quien más trofeos junte. Las balas y los escudos también se recargan
          ese día.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Faltar tiene precio" resumen="Saltarse una jornada cerrada resta un punto.">
        <Sutil>
          Sólo cuentan las ya cerradas. Se empieza desde tu primera partida del mes, así que entrar
          tarde no te cobra lo anterior. Cada torneo decide si juega con esta norma.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Abrir la jornada" resumen={`La primera palabra, máximo ${MAX_VOCALES_AL_ABRIR} vocales.`}>
        <Sutil>
          Con cuatro vocales se barre medio abecedario de un tirón. Del segundo intento en adelante
          valen todas, porque alguna puede ser la solución.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="Una mano al último" resumen="Al que va último se le chiva una letra.">
        <Sutil>
          Sale la misma letra toda la jornada. Se acaba en cuanto deja de ir último solo.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="La ulti" resumen="Una al mes: tú eliges la palabra de los demás.">
        <Sutil>
          Mañana la juega todo el torneo menos tú, que juegas la normal. Tiene que ser una palabra
          de las que el juego usa como solución. Sólo cabe una por jornada: vale la primera.
        </Sutil>
      </Desplegable>

      <Desplegable titulo="La blueshell" resumen={`${BLUESHELLS_POR_MES} balas y ${BLUESHELLS_POR_MES} escudos al mes.`}>
        <Sutil>
          La bala se le tira a quien va primero: al día siguiente usa tu palabra en el segundo
          intento. Varias se acumulan. El escudo, desde el tablero, las anula todas de golpe.
        </Sutil>
      </Desplegable>
    </ScrollView>
  );
}

function Leyenda({ color, texto }: { color: string; texto: string }) {
  return (
    <View style={estilos.leyenda}>
      <View style={[estilos.muestra, { backgroundColor: color }]} />
      <Texto style={estilos.texto}>{texto}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.lg, gap: espaciado.md, paddingBottom: espaciado.xl * 2 },
  fuerte: { color: colores.texto, fontFamily: fuentes.cuerpoFuerte },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  texto: {
    color: colores.textoSuave,
    fontFamily: fuentes.cuerpo,
    fontSize: escala.pequeno,
    flex: 1,
  },
  valor: { color: colores.oro, fontFamily: fuentes.titularNegro, fontSize: escala.medio },
  palabras: {
    color: colores.penalizacion,
    fontFamily: fuentes.titularNegro,
    fontSize: escala.normal,
    letterSpacing: 1,
    marginVertical: espaciado.sm,
  },
  leyenda: { flexDirection: 'row', alignItems: 'center', gap: espaciado.sm, marginTop: 8 },
  muestra: { width: 22, height: 22, borderRadius: 4 },
});
