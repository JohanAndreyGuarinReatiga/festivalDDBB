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
  
  
  // Funciones en system.js
// Crear una función llamada escenariosPorCiudad(ciudad) que devuelva todos los escenarios en esa ciudad.
  db.system.js.insertOne({_id:"escenariosPorCiudad", value: new Code("function(ciudad) {return db.escenarios.find({ ciudad: ciudad });}")})

//Crear una función llamada bandasPorGenero(genero) que devuelva todas las bandas activas de ese género.
db.system.js.insertOne({_id: "bandasPorGenero", value: new Code("function(genero) {return db.bandas.find({ genero: genero, activa: true });}")});

// ### **Transacciones (requiere replica set)**

//1. Simular compra de un boleto:
//    - Insertar nuevo boleto en `boletos_comprados` de un asistente.
//    - Disminuir en 1 la capacidad del escenario correspondiente.

// 1. TRANSACCIÓN: Simular compra de un boleto
function comprarBoleto(nombreAsistente, escenarioNombre, dia) {
  const session = db.getMongo().startSession();
  
  try {
    session.startTransaction();
    
    // Verificar que el escenario existe y tiene capacidad disponible
    const escenario = db.escenarios.findOne(
      { nombre: escenarioNombre },
      { session: session }
    );
    
    if (!escenario) {
      throw new Error("Escenario no encontrado");
    }
    
    if (escenario.capacidad <= 0) {
      throw new Error("No hay capacidad disponible en el escenario");
    }
    
    // Verificar que el asistente existe
    const asistente = db.asistentes.findOne(
      { nombre: nombreAsistente },
      { session: session }
    );
    
    if (!asistente) {
      throw new Error("Asistente no encontrado");
    }
    
    // Crear el nuevo boleto
    const nuevoBoleto = {
      escenario: escenarioNombre,
      dia: dia
    };
    
    // Insertar boleto en el array de boletos_comprados del asistente
    const resultadoAsistente = db.asistentes.updateOne(
      { nombre: nombreAsistente },
      { $push: { boletos_comprados: nuevoBoleto } },
      { session: session }
    );
    
    if (resultadoAsistente.modifiedCount === 0) {
      throw new Error("No se pudo agregar el boleto al asistente");
    }
    
    // Disminuir la capacidad del escenario en 1
    const resultadoEscenario = db.escenarios.updateOne(
      { nombre: escenarioNombre },
      { $inc: { capacidad: -1 } },
      { session: session }
    );
    
    if (resultadoEscenario.modifiedCount === 0) {
      throw new Error("No se pudo actualizar la capacidad del escenario");
    }
    
    // Confirmar la transacción
    session.commitTransaction();
    
    console.log(`Boleto comprado exitosamente para ${nombreAsistente}`);
    console.log(`   Escenario: ${escenarioNombre}`);
    console.log(`   Día: ${dia}`);
    console.log(`   Nueva capacidad del escenario: ${escenario.capacidad - 1}`);
    
    return { success: true, message: "Boleto comprado exitosamente" };
    
  } catch (error) {
    // Reversar la transacción en caso de error
    session.abortTransaction();
    console.log(` Error en la compra: ${error.message}`);
    return { success: false, message: error.message };
    
  } finally {
    session.endSession();
  }
}


//2. Reversar la compra:
//    - Eliminar el boleto insertado anteriormente.
//    - Incrementar la capacidad del escenario.

function reversarCompraBoleto(nombreAsistente, escenarioNombre, dia) {
  const session = db.getMongo().startSession();
  
  try {
    session.startTransaction();
    
    // Verificar que el asistente existe y tiene el boleto
    const asistente = db.asistentes.findOne(
      { 
        nombre: nombreAsistente,
        boletos_comprados: { 
          $elemMatch: { 
            escenario: escenarioNombre, 
            dia: dia 
          } 
        }
      },
      { session: session }
    );
    
    if (!asistente) {
      throw new Error("Asistente no encontrado o no tiene este boleto");
    }
    
    // Eliminar el boleto del array de boletos_comprados del asistente
    const resultadoAsistente = db.asistentes.updateOne(
      { nombre: nombreAsistente },
      { 
        $pull: { 
          boletos_comprados: { 
            escenario: escenarioNombre, 
            dia: dia 
          } 
        } 
      },
      { session: session }
    );
    
    if (resultadoAsistente.modifiedCount === 0) {
      throw new Error("No se pudo eliminar el boleto del asistente");
    }
    
    // Incrementar la capacidad del escenario en 1
    const resultadoEscenario = db.escenarios.updateOne(
      { nombre: escenarioNombre },
      { $inc: { capacidad: 1 } },
      { session: session }
    );
    
    if (resultadoEscenario.modifiedCount === 0) {
      throw new Error("No se pudo actualizar la capacidad del escenario");
    }
    
    // Confirmar la transacción
    session.commitTransaction();
    
    console.log(`Compra reversada exitosamente para ${nombreAsistente}`);
    console.log(`   Escenario: ${escenarioNombre}`);
    console.log(`   Día: ${dia}`);
    
    return { success: true, message: "Compra reversada exitosamente" };
    
  } catch (error) {
    // Reversar la transacción en caso de error
    session.abortTransaction();
    console.log(` Error al reversar la compra: ${error.message}`);
    return { success: false, message: error.message };
    
  } finally {
    session.endSession();
  }
}


//1. Crear un índice en bandas.nombre y buscar una banda específica por nombre.

//Creación índicen en bandas.nombre.
db.bandas.createIndex({ nombre: 1 })

//Búsqueda de una banda específica por nombre.
db.bandas.find({ nombre: "Bomba Estéreo" })


//2. Crear un índice en presentaciones.escenario y hacer una consulta para contar presentaciones de un escenario.

//Creación índice en presentacion.escenario.
db.presentaciones.createIndex({ escenario: 1 });

//conteo de presentaciones en "Escenario Principal"
db.presentaciones.countDocuments({ escenario: "Escenario Principal" });


//Contar presentaciones de un escenario.
db.presentaciones.aggregate([
  { $match: { escenario: "Escenario Principal" } },
  { $count: "total_presentaciones" }
]);



//3.Crear un índice compuesto en asistentes.ciudad y edad, luego consultar asistentes de Bogotá menores de 27.


//Creación índice compuesto en asistentes.ciudad.
db.asistentes.createIndex({ ciudad: 1, edad: 1 });


//Consultar asistentes de Bogotá menores de 27.
db.asistentes.find(
  {
    ciudad: "Bogotá",
    edad: { $lt: 30 }
  },
  {
    _id: 0,
    nombre: 1,
    ciudad: 1,
    edad: 1
  }
);
