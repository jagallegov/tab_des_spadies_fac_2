/* Diccionario de definiciones institucionales de los indicadores SPADIES 3.0.
   Fuente: Ministerio de Educación Nacional, documento de presentación del
   SPADIES 3.0. Este archivo es editable: el texto que aquí se declare es el
   que muestran el bloque de definición, el recuadro de tipo de cálculo y los
   tooltips de cada gráfico.

   Por indicador:
     titulo    encabezado del bloque superior
     texto     definición que se muestra de forma visible
     nota      interpretación; es lo que aparece en el ícono de información
     graficos  interpretación adaptada a cada gráfico de la pestaña
     enfoques  qué significa cada tipo de cálculo para ese indicador
*/
window.SPADIES = window.SPADIES || {};

window.SPADIES.definiciones = {

  enfoques: {
    "sistema": {
      "nombre": "Sistema"
    },
    "ies": {
      "nombre": "Institución"
    },
    "programa": {
      "nombre": "Programa"
    }
  },

  indicadores: {
    "desercionAnual": {
      "titulo": "Tasa de deserción anual",
      "texto": "Mide el comportamiento de la deserción en el corto plazo y permite evidenciar el efecto de las estrategias institucionales y de la política pública. Corresponde al porcentaje de estudiantes identificados como desertores en el período t que estuvieron matriculados en el período t−2, es decir, un año antes.",
      "nota": "El indicador compara dos momentos distintos: el numerador corresponde a los desertores del período observado y el denominador a los estudiantes que estaban matriculados un año antes. Por esa razón una tasa alta puede provenir tanto de un aumento de la deserción como de una matrícula pequeña dos períodos atrás. Conviene leerla junto con la evolución de la matrícula.",
      "graficos": {
        "tasa": "Muestra qué proporción de los estudiantes que estaban matriculados un año antes terminó abandonando. Los períodos impares y pares no son comparables entre sí, porque el calendario académico concentra las salidas en el segundo semestre; la lectura correcta es comparar cada período con el mismo semestre del año anterior.",
        "den": "Evolución de la matrícula del período. Sirve como referencia de tamaño: un mismo número de desertores significa cosas muy distintas según cuántos estudiantes haya. Una caída brusca al final de la serie suele indicar un cierre estadístico todavía incompleto, no una pérdida real de estudiantes.",
        "num": "Cantidad de estudiantes que dejaron de matricularse durante dos o más períodos consecutivos sin haberse graduado ni haber sido retirados por motivos disciplinarios. Es una condición reversible: quien vuelve a matricularse deja de contarse como desertor en los períodos siguientes."
      },
      "enfoques": {
        "sistema": "Se cuenta como desertor a quien deja de matricularse en cualquier programa de cualquier institución del país. Los traslados de programa o de universidad no suman a la deserción.",
        "ies": "Se cuenta como desertor a quien deja de matricularse en la sede. El estudiante que se traslada a otra universidad suma a la deserción; el que cambia de programa dentro de la sede, no.",
        "programa": "Se cuenta como desertor a quien deja de matricularse en el mismo programa. El cambio de programa dentro de la sede ya suma a la deserción, por lo que la tasa es más alta que en los otros dos enfoques."
      }
    },
    "desercionCohorte": {
      "titulo": "Tasa de deserción por cohorte",
      "texto": "Permite observar el fenómeno de la deserción en el grupo de estudiantes que ingresó en un mismo período de tiempo. Corresponde al número acumulado de desertores de una cohorte hasta un semestre determinado, sobre el total de estudiantes que ingresaron por primera vez en esa cohorte.",
      "nota": "Cada fila sigue a un grupo de ingreso a lo largo del tiempo, de modo que las cifras de una misma fila solo pueden crecer. Las celdas vacías corresponden a semestres que esa cohorte todavía no ha alcanzado y no deben leerse como ausencia de deserción. Comparar dos cohortes exige mirar la misma columna, es decir, el mismo semestre desde el ingreso.",
      "graficos": {
        "matriz": "Las filas son grupos de ingreso y las columnas los semestres transcurridos desde ese ingreso. Leer una fila de izquierda a derecha muestra cómo se fue perdiendo esa cohorte; leer una columna de arriba abajo permite comparar cohortes distintas en el mismo momento de su trayectoria. Los tonos más intensos señalan mayor deserción acumulada."
      },
      "enfoques": {
        "sistema": "La cohorte se sigue en todo el sistema de educación superior: solo desertan quienes abandonan cualquier estudio de pregrado en el país.",
        "ies": "La cohorte se sigue dentro de la sede: quien se traslada a otra universidad cuenta como desertor de la cohorte.",
        "programa": "La cohorte se sigue dentro del programa de ingreso: quien cambia de programa cuenta como desertor de la cohorte, aunque siga en la sede."
      }
    },
    "desercionPromedioAcumulada": {
      "titulo": "Tasa de deserción promedio acumulada",
      "texto": "Evidencia la tendencia estructural del sistema educativo y refleja, en el largo plazo, en qué semestre abandonan los estudiantes. Corresponde al conteo acumulado de desertores hasta un semestre determinado, sumado sobre todas las cohortes que han alcanzado ese semestre, dividido por el total de primíparos de esas mismas cohortes.",
      "nota": "El indicador resume en una sola curva la experiencia de todas las cohortes disponibles y por eso describe el comportamiento estructural, no la coyuntura de un año. El número de cohortes que alimenta cada punto disminuye a medida que avanza el eje, porque las cohortes recientes todavía no han completado esa trayectoria; los últimos semestres descansan entonces sobre menos observaciones.",
      "graficos": {
        "tasa": "Indica qué proporción de quienes ingresan ha abandonado al llegar a cada semestre. La pendiente importa más que el nivel: los tramos donde la curva sube con fuerza señalan los momentos críticos de la trayectoria académica, que suelen concentrarse en los primeros semestres.",
        "cantidad": "Número de estudiantes que ya habían abandonado al llegar a cada semestre, sumando todas las cohortes observadas. La serie desciende en los semestres finales no porque se recupere gente, sino porque cada vez menos cohortes han llegado hasta allí."
      },
      "enfoques": {
        "sistema": "Acumula solo a quienes abandonan cualquier programa de pregrado del país.",
        "ies": "Acumula a quienes dejan de matricularse en la sede, incluidos los traslados a otras universidades.",
        "programa": "Acumula a quienes dejan de matricularse en el programa de ingreso, incluidos los cambios de programa dentro de la sede."
      }
    },
    "graduacionAcumulada": {
      "titulo": "Tasa de graduación acumulada",
      "texto": "Contabiliza el porcentaje acumulado de estudiantes que se gradúan semestre a semestre. Corresponde al número de graduados hasta un semestre determinado sobre el total de primíparos de todas las cohortes que han alcanzado ese semestre.",
      "nota": "La curva permanece cerca de cero durante los primeros semestres y se dispara alrededor de la duración teórica de los programas, que en la Sede se ubica cerca del semestre trece. Debe leerse junto con la deserción acumulada, porque ambos indicadores reparten el mismo grupo de ingreso: lo que no se gradúa y no permanece matriculado es lo que se perdió por el camino.",
      "graficos": {
        "tasa": "Proporción del grupo de ingreso que ya obtuvo título al llegar a cada semestre. El semestre en que la curva se empina revela la duración real de los programas, que suele exceder la duración teórica; la distancia entre ambos momentos es una medida directa del rezago académico.",
        "cantidad": "Número de titulados acumulados al llegar a cada semestre, sumando las cohortes observadas. Permite dimensionar el volumen de egreso detrás del porcentaje, que por sí solo no distingue entre programas grandes y pequeños."
      },
      "enfoques": {
        "sistema": "Cuenta como graduado a quien obtiene título en cualquier programa del país, sin importar dónde ingresó.",
        "ies": "Cuenta como graduado a quien obtiene título en la sede donde ingresó, aunque haya cambiado de programa dentro de ella.",
        "programa": "Cuenta como graduado únicamente a quien obtiene título en el mismo programa en que ingresó, por lo que la tasa es más baja."
      }
    },
    "ausenciaIntersemestral": {
      "titulo": "Ausencia intersemestral",
      "texto": "Proporción de estudiantes que, estando matriculados un semestre atrás, son clasificados como ausentes un período después. El ausente es el estudiante que lleva un semestre sin matricularse y que, por lo tanto, se encuentra en riesgo de desertar.",
      "nota": "La ausencia es un estado reversible y funciona como señal temprana: el estudiante lleva un semestre sin matrícula pero todavía no cumple la condición de desertor, y puede regresar. Un repunte de este indicador anticipa, con aproximadamente un año de anticipación, el comportamiento de la deserción anual, por lo que resulta útil para focalizar acciones de permanencia.",
      "graficos": {
        "tasa": "Proporción de los estudiantes matriculados el semestre anterior que quedaron sin matrícula. Es el indicador más sensible del conjunto y reacciona de inmediato a cambios de calendario, paros o modificaciones en los procesos de inscripción, de modo que un pico aislado no siempre refleja un problema de permanencia.",
        "den": "Matrícula del período que sirve de referencia para calcular la proporción de ausentes. Su evolución conviene mirarla en paralelo, porque una tasa estable sobre una matrícula creciente implica más estudiantes en riesgo en términos absolutos.",
        "num": "Cantidad de estudiantes que llevan un semestre sin matricularse. Es la población sobre la que tiene sentido intervenir: todavía no han abandonado formalmente y una parte de ellos regresa por sí sola, pero el resto se convertirá en desertor al cumplirse el segundo período sin matrícula."
      },
      "enfoques": {
        "sistema": "Se considera ausente a quien no aparece matriculado en ningún programa del país.",
        "ies": "Se considera ausente a quien no aparece matriculado en la sede, aunque esté estudiando en otra universidad.",
        "programa": "Se considera ausente a quien no aparece matriculado en el mismo programa, aunque siga en la sede en otro programa."
      }
    },
    "supervivencia": {
      "titulo": "Análisis de supervivencia",
      "texto": "Proporción de estudiantes que permanecen matriculados en cada semestre después de haber ingresado por primera vez a un programa académico. La curva parte del total de la cohorte y desciende a medida que los estudiantes desertan o se gradúan.",
      "nota": "La curva desciende por dos razones que no conviene confundir: durante los primeros semestres la salida es deserción, mientras que a partir de la duración teórica del programa buena parte corresponde a titulación. Interpretarla como una medida de abandono en todo su recorrido sobreestima el problema; su lectura correcta exige contrastarla con la tasa de graduación acumulada.",
      "graficos": {
        "tasa": "Proporción del grupo de ingreso que continúa matriculada en cada semestre. La caída más pronunciada se concentra entre el primero y el tercer semestre, que es donde las estrategias de acompañamiento tienen mayor margen de acción.",
        "cantidad": "Número de estudiantes que siguen matriculados en cada semestre, sumando las cohortes observadas. Traduce el porcentaje a personas, que es la unidad en la que se planean cupos, docentes y espacios."
      },
      "enfoques": {
        "sistema": "Permanece quien siga matriculado en cualquier programa de pregrado del país.",
        "ies": "Permanece quien siga matriculado en la sede, aunque haya cambiado de programa dentro de ella.",
        "programa": "Permanece únicamente quien siga matriculado en el mismo programa de ingreso."
      }
    },
    "desercion28": {
      "titulo": "Tasa de deserción período SPADIES 2.8",
      "texto": "Proporción de estudiantes que, estando matriculados dos semestres atrás, son clasificados como desertores un año después. Corresponde al número de desertores del período sobre los matriculados dos períodos atrás que no se graduaron en t−2, t−1 ni en t. Es el indicador de la versión anterior del sistema y se conserva para comparación histórica.",
      "nota": "Este indicador conserva la definición vigente hasta la versión 2.8 del SPADIES, cuyo denominador excluye a quienes ya se habían graduado. Por esa razón arroja tasas más altas que la deserción anual de la versión 3.0 y ambas cifras no deben compararse ni combinarse en una misma serie; su utilidad está en dar continuidad a los reportes históricos anteriores a 2018.",
      "graficos": {
        "tasa": "Proporción de desertores calculada sobre los matriculados de dos períodos atrás que aún no se habían graduado. Al retirar del denominador a los graduados, el resultado es sistemáticamente superior al de la deserción anual vigente, y esa diferencia crece en programas con alta titulación.",
        "den": "Estudiantes matriculados dos períodos atrás que no registran graduación. Difiere de la matrícula total precisamente porque excluye a los titulados, y esa es la única fuente de discrepancia frente al denominador de la deserción anual.",
        "num": "Cantidad de estudiantes clasificados como desertores del programa en el período. El conteo coincide en su definición con el de la deserción anual; lo que cambia entre ambos indicadores es el denominador, no el numerador."
      },
      "enfoques": {
        "sistema": "No disponible: la versión 2.8 del SPADIES solo calculaba el indicador con el enfoque de programa.",
        "ies": "No disponible: la versión 2.8 del SPADIES solo calculaba el indicador con el enfoque de programa.",
        "programa": "Se cuenta como desertor a quien deja de matricularse en el mismo programa durante dos o más períodos, excluyendo del denominador a quienes ya se graduaron."
      }
    }
  },

  entidades: {
    "1101": {
      "nombre": "Bogotá",
      "corto": "Bogotá",
      "color": "#2ba6cb"
    },
    "1102": {
      "nombre": "Medellín",
      "corto": "Medellín",
      "color": "#677d29"
    },
    "1103": {
      "nombre": "Manizales",
      "corto": "Manizales",
      "color": "#d49d00"
    },
    "1104": {
      "nombre": "Palmira",
      "corto": "Palmira",
      "color": "#289a64"
    },
    "1124": {
      "nombre": "Sede con código 1124",
      "corto": "1124",
      "color": "#a2a3a4"
    },
    "1125": {
      "nombre": "Sede con código 1125",
      "corto": "1125",
      "color": "#c4c5c6"
    },
    "9933": {
      "nombre": "La Paz",
      "corto": "La Paz",
      "color": "#4fc5e9"
    },
    "UNAL": {
      "nombre": "Universidad Nacional de Colombia",
      "corto": "UNAL",
      "color": "#3d4041"
    },
    "NACIONAL": {
      "nombre": "Total nacional",
      "corto": "Nacional",
      "color": "#a2a3a4"
    }
  },

  /* Título de la consulta por facultad y programa. Solo aparece con el tipo
     de cálculo de programa, que es el único que sigue al estudiante dentro
     del programa en el que ingresó. */
  facultadPrograma: {
    titulo: 'Consulta por facultad y programa'
  },

  /* Sedes que se ofrecen como serie individual en los filtros. */
  sedesVisibles: ['1101', '1102', '1103', '1104', '9933'],

  /* Códigos que componen el agregado de la Universidad Nacional de Colombia. */
  codigosUnal: ['1101', '1102', '1103', '1104', '1124', '1125', '9933'],

  /* Códigos solicitados por el área que no están presentes en las bases. */
  codigosUnalAusentes: ['1126', '9920'],

  nota: 'Fuente: Sistema para la Prevención y Análisis de la Deserción en las Instituciones de Educación Superior (SPADIES 3.0).'
};
