import React, { createContext, useContext } from 'react';

/**
 * Cuánto se agrandan las letras con el modo de letra grande.
 *
 * Un 25%: se nota de verdad y todavía cabe todo. Con un 50% los nombres de la
 * clasificación empiezan a partirse en dos líneas.
 */
export const FACTOR_LETRA_GRANDE = 1.25;

/**
 * El multiplicador de tamaño de letra.
 *
 * Va en su propio contexto, y no en el de la app, por dos motivos: lo consulta
 * cada trozo de texto de la pantalla, y tiene un valor por defecto sensato, así
 * que nada revienta si algo se dibuja fuera del proveedor.
 */
const Contexto = createContext(1);

export function ProveedorEscala({
  factor,
  children,
}: {
  factor: number;
  children: React.ReactNode;
}) {
  return <Contexto.Provider value={factor}>{children}</Contexto.Provider>;
}

export function useFactorTexto(): number {
  return useContext(Contexto);
}
