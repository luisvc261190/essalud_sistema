import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Input, type InputProps } from "./Input";
import {
  NIT_GRUPO_A,
  NIT_GRUPO_B,
  NIT_PLANTILLA,
  anioActualNIT,
  completarNITEnmascarado,
  enmascararNIT,
} from "../../utils/masks";

/**
 * NIT con la mascara fija XXXX-XXXX-NIT-XXXXXXX, en un solo input.
 *
 * Requerimiento del cliente:
 *  - El cursor arranca en la primera X del lado izquierdo.
 *  - Los 4 primeros digitos son obligatorios.
 *  - Al terminarlos, el anio se pone solo con el anio actual y el cursor pasa
 *    de largo a los 7 ultimos digitos.
 *  - Los guiones y el texto "NIT" son fijos: no se escriben ni se borran.
 *  - En los 7 ultimos se teclea el numero corto y se completa con ceros a la
 *    izquierda (740 -> 0000740, 1 -> 0000001).
 */

export interface NITInputHandle {
  /** Coloca el cursor en la primera X, como pide el requerimiento. */
  focusInicio: () => void;
}

const digitos = (v: string) => v.replace(/\D/g, "");

/** Cantidad de digitos que hay por delante de la posicion `indice` del texto. */
const digitosAntes = (texto: string, indice: number): number =>
  (texto.slice(0, indice).match(/\d/g) || []).length;

interface NITInputProps
  extends Omit<InputProps, "onChange" | "value" | "maxLength" | "placeholder"> {
  value?: string;
  /** Recibe el NIT enmascarado; al salir del campo, ya completado con ceros. */
  onValueChange?: (value: string) => void;
  onComplete?: (value: string) => void;
  nitRef?: React.Ref<NITInputHandle>;
}

export const NITInput = forwardRef<HTMLInputElement, NITInputProps>(
  (
    {
      value = "",
      onValueChange,
      onComplete,
      nitRef,
      label = "NIT",
      helperText = "Formato: XXXX-XXXX-NIT-XXXXXXX",
      error,
      ...props
    },
    ref
  ) => {
    const interno = useRef<HTMLInputElement | null>(null);
    /** El error se muestra desde el primer blur, no mientras se teclea. */
    const [tocado, setTocado] = useState(false);
    /** En cuanto el usuario corrige el anio a mano, deja de imponerse. */
    const anioEditado = useRef(false);

    const asignar = useCallback(
      (nodo: HTMLInputElement | null) => {
        interno.current = nodo;
        if (typeof ref === "function") ref(nodo);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = nodo;
      },
      [ref]
    );

    useImperativeHandle(
      nitRef,
      () => ({
        focusInicio: () => {
          interno.current?.focus();
          interno.current?.setSelectionRange(0, 0);
        },
      }),
      []
    );

    /** Lleva el cursor al digito `objetivo`, saltando los separadores fijos. */
    const moverCursor = (objetivo: number, alFinal: boolean) => {
      const nodo = interno.current;
      if (!nodo) return;
      if (alFinal) {
        nodo.setSelectionRange(nodo.value.length, nodo.value.length);
        return;
      }
      const total = digitos(nodo.value).length;
      const destino = Math.min(objetivo, total);
      if (destino >= total) {
        nodo.setSelectionRange(nodo.value.length, nodo.value.length);
        return;
      }
      let vistos = 0;
      for (let i = 0; i < nodo.value.length; i += 1) {
        if (/\d/.test(nodo.value[i])) {
          vistos += 1;
          if (vistos === destino) {
            nodo.setSelectionRange(i, i);
            return;
          }
        }
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const antes = digitosAntes(e.target.value, e.target.selectionStart ?? 0);
      let d = digitos(e.target.value).slice(0, 15);

      // Si el cursor estaba dentro del anio, el usuario lo esta corrigiendo a
      // mano y ya no se le impone el anio actual.
      if (antes > NIT_GRUPO_A && antes < NIT_GRUPO_A + NIT_GRUPO_B) {
        anioEditado.current = true;
      }

      // Al cerrar los 4 digitos obligatorios entra el anio solo, y el cursor se
      // va al ultimo grupo. Si el anio ya esta, no se toca nada.
      let insertoAnio = false;
      if (!anioEditado.current && d.length >= NIT_GRUPO_A && d.length < NIT_GRUPO_A + NIT_GRUPO_B) {
        d = `${d.slice(0, NIT_GRUPO_A)}${anioActualNIT()}${d.slice(NIT_GRUPO_A)}`;
        insertoAnio = true;
      }

      onValueChange?.(enmascararNIT(d));
      // React repinta despues, asi que el cursor se reposiciona en el siguiente
      // frame; si no, se quedaria antes de los separadores nuevos.
      requestAnimationFrame(() => moverCursor(antes + 1, insertoAnio));
    };

    const handleBlur = () => {
      setTocado(true);
      const texto = completarNITEnmascarado(value);
      onValueChange?.(texto);
      onComplete?.(texto);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Los guiones y el texto "NIT" son fijos: no se pueden escribir ni borrar.
      if (e.key === "Backspace" || e.key === "Delete") {
        const nodo = e.currentTarget;
        const desde = nodo.selectionStart ?? 0;
        const hasta = nodo.selectionEnd ?? 0;
        const objetivo = e.key === "Backspace" ? desde - 1 : desde;
        const caracter = nodo.value[objetivo];
        if (caracter !== undefined && /\D/.test(caracter)) {
          e.preventDefault();
          const restantes = digitos(nodo.value.slice(0, objetivo) + nodo.value.slice(hasta)).slice(0, 15);
          onValueChange?.(enmascararNIT(restantes));
          requestAnimationFrame(() => {
            const n2 = interno.current;
            if (n2) n2.setSelectionRange(objetivo, objetivo);
          });
        }
      }
      props.onKeyDown?.(e);
    };

    // Si el NIT llega desde fuera (editar una solicitud ya registrada) se
    // respeta tal cual, con su anio, sin completarlo.
    useEffect(() => {
      if (/^\d{4}-\d{4}-NIT-\d{7}$/.test(value)) anioEditado.current = true;
    }, [value]);

    return (
      <Input
        {...props}
        ref={asignar}
        label={label}
        helperText={helperText}
        error={tocado ? error : undefined}
        value={value}
        placeholder={NIT_PLANTILLA}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        inputMode="numeric"
        autoComplete="off"
      />
    );
  }
);

NITInput.displayName = "NITInput";
