# Checklist de Calidad Editorial IDB

Este checklist debe aplicarse antes de crear, actualizar o publicar cualquier contenido de la Knowledge Base.

## Bloqueo Critico

Si cualquiera de estos puntos falla, el contenido no debe publicarse:

- [ ] No indica dosis.
- [ ] No prescribe tratamientos.
- [ ] No diagnostica al usuario.
- [ ] No recomienda marcas comerciales.
- [ ] No promete curacion ni resultados.
- [ ] No minimiza sintomas potencialmente graves.
- [ ] No copia texto literal de fuentes externas.
- [ ] No usa parrafos genericos intercambiables.
- [ ] Incluye cuando consultar.
- [ ] Incluye senales de alarma cuando corresponde.
- [ ] Incluye fuentes reconocidas.
- [ ] Cumple `knowledge/schema/tema.schema.json`.

## Intencion del Paciente

- [ ] Responde que espera saber una persona al buscar este tema.
- [ ] La respuesta rapida se entiende en menos de 15 segundos.
- [ ] El contenido orienta sin generar miedo.
- [ ] El contenido no se siente como Wikipedia, blog, vademecum ni chatbot.

## Diferenciacion

- [ ] El texto fue escrito especificamente para este tema.
- [ ] No funcionaria igual si se cambia solamente el titulo.
- [ ] Incluye precauciones, causas, relaciones o ejemplos propios del tema.
- [ ] Evita frases repetidas de otros registros.

## Medicamentos

Aplicar si `tipo` es `medicamento`:

- [ ] Explica que es.
- [ ] Explica para que sirve realmente.
- [ ] Explica como actua de forma sencilla.
- [ ] Explica cuando suele utilizarse.
- [ ] Incluye precauciones importantes.
- [ ] Indica quienes deben consultar antes de usarlo.
- [ ] No incluye dosis.
- [ ] No promueve automedicacion.
- [ ] No usa marcas comerciales.

## Sintomas

Aplicar si `tipo` es `sintoma`:

- [ ] Comienza indicando que puede tener multiples causas.
- [ ] No inicia asociando el sintoma con una enfermedad especifica.
- [ ] Explica causas frecuentes o situaciones habituales.
- [ ] Diferencia observacion, consulta y urgencia.
- [ ] Relaciona enfermedades solo como posibilidades generales.
- [ ] No presenta enfermedades relacionadas como diagnostico.

## Enfermedades

Aplicar si `tipo` es `enfermedad`:

- [ ] Explica que ocurre en el organismo.
- [ ] Explica por que aparece o como se desarrolla.
- [ ] Incluye factores de riesgo.
- [ ] Incluye sintomas frecuentes.
- [ ] Explica diagnostico o seguimiento de forma general.
- [ ] Incluye complicaciones posibles cuando corresponde.
- [ ] Incluye prevencion.
- [ ] Indica cuando consultar.

## Estilo y Lectura

- [ ] Usa lenguaje claro para pacientes.
- [ ] Usa frases cortas.
- [ ] Usa parrafos pequenos.
- [ ] Evita tecnicismos innecesarios.
- [ ] Explica terminos tecnicos indispensables.
- [ ] Se lee comodamente en celular.
- [ ] Mantiene tono sereno, profesional y humano.

## Compatibilidad Tecnica

- [ ] Usa solamente campos permitidos por `tema.schema.json`.
- [ ] Mantiene `slug` normalizado.
- [ ] Mantiene `tipo` valido.
- [ ] Mantiene `ultima_revision` en formato `YYYY-MM`.
- [ ] Mantiene `version`.
- [ ] Es compatible con `consulta.html`.
- [ ] Es compatible con VITA.
- [ ] Es reutilizable por futuras APIs.

## Fuentes

- [ ] Usa fuentes oficiales, cientificas o institucionales.
- [ ] Las fuentes respaldan la orientacion general.
- [ ] La redaccion final es original.
- [ ] No traslada lenguaje tecnico de la fuente sin adaptarlo al paciente.
