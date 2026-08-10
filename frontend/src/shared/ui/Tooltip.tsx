import { Tooltip as TooltipPrimitive } from 'radix-ui'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <TooltipPrimitive.Provider delayDuration={250}>{children}</TooltipPrimitive.Provider>
}

interface Props {
  texto: string
  children: React.ReactNode
}

/** Tooltip de una sola linea para botones de solo-icono: pasa el texto que
 * describe la accion y envuelve el boton/elemento disparador. */
export function Tooltip({ texto, children }: Props) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="top"
          sideOffset={6}
          className="z-50 rounded-md bg-marca-900 px-2.5 py-1.5 text-xs font-medium text-marca-50 shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
        >
          {texto}
          <TooltipPrimitive.Arrow className="fill-marca-900" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  )
}
