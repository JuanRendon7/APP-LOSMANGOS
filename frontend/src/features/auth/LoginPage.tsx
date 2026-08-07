import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { useAuth } from '@/shared/auth/AuthContext'
import { BrandBackdrop } from '@/shared/layout/BrandBackdrop'
import { MangoIcon } from '@/shared/ui/MangoIcon'

const loginSchema = z.object({
  email: z.string().email({ error: 'Ingresa un correo valido' }),
  password: z.string().min(1, { error: 'La contrasena es requerida' }),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (datos: LoginForm) => {
    setErrorGeneral(null)
    try {
      await login(datos.email, datos.password)
      navigate('/', { replace: true })
    } catch {
      setErrorGeneral('Credenciales invalidas. Verifica tu correo y contrasena.')
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4">
      <BrandBackdrop opacidadImagen={0.6} opacidadVelo={0.32} desenfoquePx={2} />

      <div className="relative w-full max-w-sm rounded-2xl border border-marca-200/70 bg-card/95 p-10 shadow-xl shadow-marca-900/10 backdrop-blur-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <MangoIcon size={44} className="mb-4 text-primary" />
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-card-foreground">
            Hotel Los Mangos
          </h1>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.25em] text-muted-foreground">
            Hotel &amp; Restaurante
          </p>
          <div className="mt-5 h-px w-12 bg-oro-500" />
          <p className="mt-5 text-sm text-muted-foreground">Ingresa a tu cuenta para continuar</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Correo
            </label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="email"
                  type="email"
                  autoComplete="username"
                  className="w-full border-b-2 border-input bg-transparent px-0.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              )}
            />
            {errors.email && (
              <p className="mt-1.5 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground"
            >
              Contrasena
            </label>
            <Controller
              name="password"
              control={control}
              render={({ field }) => (
                <input
                  {...field}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  className="w-full border-b-2 border-input bg-transparent px-0.5 py-2.5 text-sm outline-none transition-colors focus:border-primary"
                />
              )}
            />
            {errors.password && (
              <p className="mt-1.5 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="mt-2 w-full rounded-md bg-primary px-3 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
