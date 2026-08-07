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

      <div className="relative w-full max-w-sm rounded-xl border border-border bg-card/90 p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <MangoIcon size={40} className="mb-3 text-primary" />
          <h1 className="text-xl font-bold tracking-tight text-card-foreground">
            Hotel Los Mangos
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
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
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                />
              )}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          {errorGeneral && <p className="text-sm text-destructive">{errorGeneral}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
