import React from 'react';
import { colorDeTorneo, inicialesDe } from '../game/emblema';
import { Ficha } from './Ficha';

type Props = {
  nombre: string;
  /** Id del torneo: de aquí sale el color, siempre el mismo. */
  id: string;
  lado?: number;
};

/** Ficha con las iniciales del torneo y su color. */
export function Emblema({ nombre, id, lado = 36 }: Props) {
  return <Ficha letra={inicialesDe(nombre)} color={colorDeTorneo(id)} lado={lado} />;
}
