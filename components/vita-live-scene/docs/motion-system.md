# Motion System

## Filosofía

El movimiento debe hacer que la escena se sienta viva, no animada. Sigue una sensibilidad editorial próxima a Apple Health, Vision Pro, Stripe y Linear: cambios lentos, mínimos, legibles y subordinados a la narrativa humana. VITA permanece completamente estable.

## Estado permanente

Los seis pacientes realizan desplazamientos independientes con `transform`, de hasta 3 px por eje y microinclinaciones inferiores a 0.2 grados. Las duraciones varían entre 8.8 y 13.6 segundos, con retrasos negativos distintos para evitar sincronización. Las fotografías, recortes, tamaños y posiciones base no cambian.

## Conversaciones secuenciales

En desktop se activa un único microelemento cada 12–18 segundos. La selección es aleatoria y nunca hay dos conversaciones activas simultáneamente. Burbujas, puntos, checks y líneas usan `opacity` y `transform` durante 2.6 segundos; las fotografías no participan.

## Desktop

Con cursor preciso, entrar al módulo activa una presencia contextual. El paciente más cercano recibe un ajuste apenas perceptible de brillo, saturación y sombra; la línea ambiental gana contraste. El cálculo cambia solo el estado visual del paciente más cercano y nunca desplaza la escena.

## Mobile

No existen eventos de hover o touch. Un `IntersectionObserver` inicia una única secuencia al alcanzar 35% de visibilidad: tres microconversaciones breves y consecutivas, seguidas por el retorno al estado permanente. La secuencia no vuelve a ejecutarse mientras el usuario permanece en la escena.

## Tiempos y easing

- Flotaciones ambientales: 8.8–13.6 s.
- Intervalo de conversación desktop: aleatorio entre 12–18 s.
- Conversación activa desktop: 2.6 s.
- Secuencia mobile: tres pasos de 1.5 s, separados por 1.8 s.
- Easing ambiental: `cubic-bezier(0.45, 0, 0.55, 1)`.
- Easing de presencia: `cubic-bezier(0.22, 1, 0.36, 1)`.

## Reduced motion

`prefers-reduced-motion: reduce` desactiva flotaciones, pulsos, conversaciones y transiciones. JavaScript cancela temporizadores, observación de viewport y estados activos. La composición estática conserva exactamente sus rotaciones y funciona sin movimiento.

## Rendimiento

Las animaciones continuas usan exclusivamente `transform`; los microelementos combinan `transform` y `opacity`. `will-change` se limita a pacientes y microelementos durante actividad. No se modifican dimensiones ni flujo, evitando CLS. No se usan librerías, animación por scroll ni parallax.
