// ### **Consultas**

// 1. **Expresiones Regulares**
    // - Buscar bandas cuyo nombre **empiece por la letra “A”**.

    db.bandas.find({ "nombre": { "$regex": "^A" } })

    // - Buscar asistentes cuyo **nombre contenga "Gómez"**. 

    db.asistentes.find({ "nombre": { "$regex": "Gómez" } })     