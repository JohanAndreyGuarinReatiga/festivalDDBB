// ### **Consultas**

// 1. **Expresiones Regulares**
    // - Buscar bandas cuyo nombre **empiece por la letra “A”**.

    db.bandas.find({ "nombre": { "$regex": "^A" } })

    // - Buscar asistentes cuyo **nombre contenga "Gómez"**. 

    db.asistentes.find({ "nombre": { "$regex": "Gómez" } })


// 2. **Operadores de Arreglos**
    // - Buscar asistentes que tengan `"Rock"` dentro de su campo `generos_favoritos`.

    db.asistentes.find({generos_favoritos:{$in: ["Rock"]}})

// 3. **Aggregation Framework**
// - Agrupar presentaciones por `escenario` y contar cuántas presentaciones hay por cada uno.

db.presentaciones.aggregate([{$group: {
    _id: "$escenario",
            total_presentaciones: { $sum: 1 }
          },
        },
        {
          $sort: { total_presentaciones: -1 },
        },
      ])
        
// - Calcular el **promedio de duración** de las presentaciones.
db.presentaciones.aggregate([
    {
      $group: {
        _id: null,
        duracion_promedio: { $avg: "$duracion_minutos" },
        duracion_total: { $sum: "$duracion_minutos" },
        total_presentaciones: { $sum: 1 },
      },
    },
  ])