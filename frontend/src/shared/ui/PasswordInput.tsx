import { Eye, EyeOff } from 'lucide-react'
import { useState, type InputHTMLAttributes } from 'react'
import { Tooltip } from './Tooltip'

/** Input de clave con boton para mostrar/ocultar el texto -- usar donde se
 * cree o cambie una contrasena (el campo nunca es de solo lectura). */
export function PasswordInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? 'text' : 'password'}
        className={
          className ??
          'w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-ring'
        }
      />
      <Tooltip texto={visible ? 'Ocultar clave' : 'Ver clave'}>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Ocultar clave' : 'Ver clave'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </Tooltip>
    </div>
  )
}
